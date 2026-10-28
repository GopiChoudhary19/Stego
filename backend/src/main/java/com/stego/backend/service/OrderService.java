package com.stego.backend.service;

import com.stego.backend.dto.request.OrderRequest;
import com.stego.backend.dto.response.OrderResponse;
import com.stego.backend.entity.*;
import com.stego.backend.enums.OrderStatus;
import com.stego.backend.enums.PaymentMethod;
import com.stego.backend.enums.PaymentStatus;
import com.stego.backend.exception.BadRequestException;
import com.stego.backend.exception.ResourceNotFoundException;
import com.stego.backend.exception.UnauthorizedException;
import com.stego.backend.repository.*;
import com.stripe.exception.StripeException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private EstimationService estimationService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private EmailService emailService;

    @Transactional
    public OrderResponse createOrder(Long userId, OrderRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Restaurant restaurant = restaurantRepository.findById(request.getRestaurantId())
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant", "id", request.getRestaurantId()));

        // Check if restaurant is open
        if (!restaurant.getIsOpen()) {
            throw new BadRequestException("Restaurant is currently closed");
        }

        // Check working hours
        LocalTime now = LocalTime.now();
        if (restaurant.getOpeningTime() != null && restaurant.getClosingTime() != null) {
            if (!isWithinOpeningHours(now, restaurant.getOpeningTime(), restaurant.getClosingTime())) {
                throw new BadRequestException("Restaurant is outside of working hours ("
                        + restaurant.getOpeningTime() + " - " + restaurant.getClosingTime() + ")");
            }
        }

        Order order = Order.builder()
                .user(user)
                .restaurant(restaurant)
                .scheduledPickupTime(request.getScheduledPickupTime())
                .specialInstructions(request.getSpecialInstructions())
                .build();

        BigDecimal total = BigDecimal.ZERO;
        int maxPrepTime = 0;

        for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            MenuItem menuItem = menuItemRepository.findById(itemReq.getMenuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", itemReq.getMenuItemId()));

            if (!menuItem.getIsAvailable()) {
                throw new BadRequestException("Menu item '" + menuItem.getName() + "' is unavailable");
            }

            if (!menuItem.getRestaurant().getId().equals(restaurant.getId())) {
                throw new BadRequestException("Menu item '" + menuItem.getName() + "' does not belong to this restaurant");
            }

            BigDecimal itemTotal = menuItem.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            total = total.add(itemTotal);

            maxPrepTime = Math.max(maxPrepTime, menuItem.getPrepTimeMinutes());

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(itemReq.getQuantity())
                    .priceAtOrder(menuItem.getPrice())
                    .itemName(menuItem.getName())
                    .build();
            order.getItems().add(orderItem);
        }

        if (total.signum() <= 0) {
            throw new BadRequestException("Order total must be greater than zero");
        }
        order.setTotalAmount(total);

        // Queue logic: heuristic-based wait time
        List<OrderStatus> activeStatuses = List.of(OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING);
        int queuePosition = orderRepository.findMaxQueuePosition(restaurant.getId(), activeStatuses) + 1;

        // Smart Estimation: Prediction based on active queue + historical delay
        LocalDateTime aiPredictedTime = estimationService.estimateReadyTime(restaurant, maxPrepTime);
        order.setQueuePosition(queuePosition);
        order.setEstimatedReadyTime(aiPredictedTime);

        order = orderRepository.save(order);

        // Create payment record
        Payment payment = Payment.builder()
                .order(order)
                .amount(total)
                .paymentMethod(request.getPaymentMethod())
                .status(PaymentStatus.PENDING)
                .build();
        paymentRepository.save(payment);

        OrderResponse response = mapToResponse(order, payment);

        // Notify restaurant via WebSocket
        messagingTemplate.convertAndSend(
                "/topic/restaurant/" + restaurant.getId() + "/orders", response);

        // Phase 5: Send immediate email for COD orders
        if (request.getPaymentMethod() == PaymentMethod.COD) {
            emailService.sendOrderConfirmation(order, false);
            emailService.sendMerchantAlert(order);
            logger.info("COD Order {} confirmation emails sent.", order.getId());
        }

        return response;
    }

    // read inside a transaction: mapToResponse touches lazy associations (items, user, restaurant)
    @Transactional(readOnly = true)
    public OrderResponse getOrder(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // User can see own orders, restaurant owner can see their restaurant orders
        if (!order.getUser().getId().equals(userId)
                && !order.getRestaurant().getOwner().getId().equals(userId)) {
            throw new UnauthorizedException("You don't have access to this order");
        }

        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
        return mapToResponse(order, payment);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getUserOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(order -> {
                    Payment payment = paymentRepository.findByOrderId(order.getId()).orElse(null);
                    return mapToResponse(order, payment);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getActiveOrders(Long userId) {
        List<OrderStatus> activeStatuses = List.of(
                OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY);
        return orderRepository.findActiveOrdersByUser(userId, activeStatuses).stream()
                .map(order -> {
                    Payment payment = paymentRepository.findByOrderId(order.getId()).orElse(null);
                    return mapToResponse(order, payment);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getRestaurantOrders(Long restaurantId, Long ownerId) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant", "id", restaurantId));

        if (!restaurant.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedException("You can only view orders for your own restaurants");
        }

        return orderRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId).stream()
                .map(order -> {
                    Payment payment = paymentRepository.findByOrderId(order.getId()).orElse(null);
                    return mapToResponse(order, payment);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getRestaurantQueue(Long restaurantId, Long ownerId) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant", "id", restaurantId));

        if (!restaurant.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedException("You can only view orders for your own restaurants");
        }

        // READY orders stay visible until the customer picks them up and the owner completes them
        List<OrderStatus> activeStatuses = List.of(OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY);
        return orderRepository.findByRestaurantIdAndStatusInOrderByQueuePositionAsc(restaurantId, activeStatuses).stream()
                .map(order -> {
                    Payment payment = paymentRepository.findByOrderId(order.getId()).orElse(null);
                    return mapToResponse(order, payment);
                })
                .collect(Collectors.toList());
    }

    // ── State transition endpoints ──

    @Transactional
    public OrderResponse acceptOrder(Long orderId, Long ownerId) {
        // online orders join the queue as soon as they are created; the kitchen must not start on one that
        // was never paid (the customer may have abandoned the payment page)
        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
        if (payment != null && payment.getPaymentMethod() != PaymentMethod.COD
                && payment.getStatus() != PaymentStatus.SUCCESS) {
            getOrderForOwner(orderId, ownerId);
            throw new BadRequestException("Waiting for the customer's online payment before this order can be accepted");
        }
        return transitionOrder(orderId, ownerId, OrderStatus.PENDING, OrderStatus.ACCEPTED);
    }

    @Transactional
    public OrderResponse prepareOrder(Long orderId, Long ownerId) {
        return transitionOrder(orderId, ownerId, OrderStatus.ACCEPTED, OrderStatus.PREPARING);
    }

    @Transactional
    public OrderResponse readyOrder(Long orderId, Long ownerId) {
        Order order = getOrderForOwner(orderId, ownerId);
        if (order.getStatus() != OrderStatus.PREPARING) {
            throw new BadRequestException("Order must be in PREPARING status to mark as ready");
        }
        order.setStatus(OrderStatus.READY);
        order.setActualReadyTime(LocalDateTime.now());
        order = orderRepository.save(order);
        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
        OrderResponse response = mapToResponse(order, payment);

        // Notify user
        messagingTemplate.convertAndSend("/topic/user/" + order.getUser().getId() + "/orders", response);
        messagingTemplate.convertAndSend("/topic/restaurant/" + order.getRestaurant().getId() + "/orders", response);

        return response;
    }

    @Transactional
    public OrderResponse completeOrder(Long orderId, Long ownerId) {
        Order order = getOrderForOwner(orderId, ownerId);
        if (order.getStatus() != OrderStatus.READY) {
            throw new BadRequestException("Order must be in READY status to complete");
        }
        order.setStatus(OrderStatus.COMPLETED);
        order = orderRepository.save(order);

        // Mark COD payment as success upon completion
        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
        if (payment != null && payment.getPaymentMethod() == PaymentMethod.COD) {
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setPaidAt(LocalDateTime.now());
            paymentRepository.save(payment);
        }

        return mapToResponse(order, payment);
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Both user and restaurant owner can cancel
        boolean isUser = order.getUser().getId().equals(userId);
        boolean isOwner = order.getRestaurant().getOwner().getId().equals(userId);
        if (!isUser && !isOwner) {
            throw new UnauthorizedException("You don't have permission to cancel this order");
        }

        if (order.getStatus() == OrderStatus.COMPLETED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Cannot cancel a " + order.getStatus() + " order");
        }

        // Users can only cancel PENDING orders
        if (isUser && order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("You can only cancel pending orders. Contact the restaurant for further assistance.");
        }

        order.setStatus(OrderStatus.CANCELLED);
        order = orderRepository.save(order);

        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
        if (payment != null && payment.getStatus() == PaymentStatus.SUCCESS) {
            refundPayment(payment);
        }

        OrderResponse response = mapToResponse(order, payment);
        messagingTemplate.convertAndSend("/topic/user/" + order.getUser().getId() + "/orders", response);
        return response;
    }

    // ── Helpers ──

    // Marks the payment REFUNDED only after Stripe accepted the refund; a Stripe error rolls the whole transaction back.
    private void refundPayment(Payment payment) {
        if (payment.getPaymentMethod() != PaymentMethod.COD) {
            if (payment.getTransactionId() == null) {
                throw new BadRequestException("Payment has no Stripe transaction to refund");
            }
            try {
                paymentService.refund(payment.getTransactionId());
            } catch (StripeException e) {
                logger.error("Refund failed for payment {}: {}", payment.getId(), e.getMessage());
                throw new BadRequestException("The refund could not be issued, please try again");
            }
        }
        payment.setStatus(PaymentStatus.REFUNDED);
        paymentRepository.save(payment);
    }

    private OrderResponse transitionOrder(Long orderId, Long ownerId, OrderStatus expectedCurrent, OrderStatus newStatus) {
        Order order = getOrderForOwner(orderId, ownerId);
        if (order.getStatus() != expectedCurrent) {
            throw new BadRequestException("Order must be in " + expectedCurrent + " status, but is " + order.getStatus());
        }
        order.setStatus(newStatus);
        order = orderRepository.save(order);
        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
        OrderResponse response = mapToResponse(order, payment);

        messagingTemplate.convertAndSend("/topic/user/" + order.getUser().getId() + "/orders", response);
        messagingTemplate.convertAndSend("/topic/restaurant/" + order.getRestaurant().getId() + "/orders", response);

        return response;
    }

    private Order getOrderForOwner(Long orderId, Long ownerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        if (!order.getRestaurant().getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedException("You can only manage orders for your own restaurants");
        }
        return order;
    }

    private OrderResponse mapToResponse(Order order, Payment payment) {
        List<OrderResponse.OrderItemResponse> items = order.getItems().stream()
                .map(item -> OrderResponse.OrderItemResponse.builder()
                        .id(item.getId())
                        .menuItemId(item.getMenuItem().getId())
                        .itemName(item.getItemName())
                        .quantity(item.getQuantity())
                        .priceAtOrder(item.getPriceAtOrder())
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUser().getId())
                .userName(order.getUser().getName())
                .restaurantId(order.getRestaurant().getId())
                .restaurantName(order.getRestaurant().getName())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .scheduledPickupTime(order.getScheduledPickupTime())
                .estimatedReadyTime(order.getEstimatedReadyTime())
                .actualReadyTime(order.getActualReadyTime())
                .queuePosition(order.getQueuePosition())
                .specialInstructions(order.getSpecialInstructions())
                .paymentMethod(payment != null ? payment.getPaymentMethod() : null)
                .paymentStatus(payment != null ? payment.getStatus() : null)
                .items(items)
                .createdAt(order.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public String createPaymentIntent(Long orderId, Long userId) throws StripeException {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!order.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only pay for your own orders");
        }

        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.COMPLETED) {
            throw new BadRequestException("Cannot pay for a " + order.getStatus() + " order");
        }

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", "orderId", orderId));
        if (payment.getPaymentMethod() == PaymentMethod.COD) {
            throw new BadRequestException("This order is paid in cash on pickup");
        }
        if (payment.getStatus() == PaymentStatus.SUCCESS || payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new BadRequestException("This order has already been paid");
        }

        return paymentService.createPaymentIntent(order);
    }

    @Transactional
    public void handlePaymentSuccess(Long orderId, String transactionId) {
        // Idempotency check: Already processed this transaction?
        if (paymentRepository.findByTransactionId(transactionId).isPresent()) {
            logger.info("Transaction {} already processed, skipping.", transactionId);
            return;
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return;

        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
        if (payment != null) {
            // Already SUCCESS?
            if (payment.getStatus() == PaymentStatus.SUCCESS) {
                logger.info("Payment already SUCCESS for order: {}, skipping.", orderId);
                return;
            }

            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setTransactionId(transactionId);
            payment.setPaidAt(LocalDateTime.now());
            paymentRepository.save(payment);
            logger.info("Payment SUCCESS for order: {}, transaction: {}", orderId, transactionId);
            
            // the customer paid for an order that was cancelled meanwhile: give the money back
            if (order.getStatus() == OrderStatus.CANCELLED) {
                logger.warn("Order {} was cancelled before payment {} arrived, refunding", orderId, transactionId);
                refundPayment(payment);
            } else {
                // Phase 5: Send confirmation only after online payment success
                emailService.sendOrderConfirmation(order, true);
                emailService.sendMerchantAlert(order);
            }
        }

        // Auto-accept if payment is success (or keep PENDING for restaurant to manual accept)
        // Here we keep it PENDING, but notify restaurant
        OrderResponse response = mapToResponse(order, payment);
        messagingTemplate.convertAndSend("/topic/restaurant/" + order.getRestaurant().getId() + "/orders", response);
        messagingTemplate.convertAndSend("/topic/user/" + order.getUser().getId() + "/orders", response);
    }

    @Transactional
    public void handlePaymentFailure(Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return;

        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);
        // webhooks can arrive late or out of order; never cancel an order that has already been paid
        if (payment != null && payment.getStatus() == PaymentStatus.SUCCESS) {
            logger.warn("Ignoring payment failure for order {}: payment already succeeded", orderId);
            return;
        }
        if (payment != null) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            logger.error("Payment FAILED for order: {}", orderId);
        }

        // A declined attempt leaves the PaymentIntent open and the customer can retry on the same checkout,
        // so the order stays as it is; cancelling here would leave a later successful retry paid but cancelled.
        OrderResponse response = mapToResponse(order, payment);
        messagingTemplate.convertAndSend("/topic/user/" + order.getUser().getId() + "/orders", response);
    }

    /**
     * Cancels card/UPI orders whose payment was never completed within {@code maxAge}, so abandoned checkouts do
     * not sit in the kitchen queue and the customer's live orders forever. If the customer does pay later anyway,
     * handlePaymentSuccess refunds the payment because the order is cancelled.
     */
    @Transactional
    public int cancelAbandonedOnlineOrders(java.time.Duration maxAge) {
        List<Payment> abandoned = paymentRepository.findAbandonedOnlinePayments(LocalDateTime.now().minus(maxAge));
        for (Payment payment : abandoned) {
            Order order = payment.getOrder();
            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);
            if (payment.getStatus() == PaymentStatus.PENDING) {
                payment.setStatus(PaymentStatus.FAILED);
                paymentRepository.save(payment);
            }
            OrderResponse response = mapToResponse(order, payment);
            messagingTemplate.convertAndSend("/topic/user/" + order.getUser().getId() + "/orders", response);
            messagingTemplate.convertAndSend("/topic/restaurant/" + order.getRestaurant().getId() + "/orders", response);
            logger.info("Cancelled order {}: online payment not completed within {}", order.getId(), maxAge);
        }
        return abandoned.size();
    }

    /** True if {@code now} falls inside the opening hours, including hours that run past midnight (e.g. 18:00-02:00). */
    static boolean isWithinOpeningHours(LocalTime now, LocalTime opening, LocalTime closing) {
        if (!closing.isBefore(opening)) {
            return !now.isBefore(opening) && !now.isAfter(closing);
        }
        return !now.isBefore(opening) || !now.isAfter(closing);
    }

    public String estimateOrderReadyTime(OrderRequest request) {
        Restaurant restaurant = restaurantRepository.findById(request.getRestaurantId())
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant", "id", request.getRestaurantId()));

        int maxPrepTime = 0;
        for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            MenuItem menuItem = menuItemRepository.findById(itemReq.getMenuItemId())
                    .orElse(null);
            if (menuItem != null) {
                maxPrepTime = Math.max(maxPrepTime, menuItem.getPrepTimeMinutes());
            }
        }

        LocalDateTime aiPredictedTime = estimationService.estimateReadyTime(restaurant, maxPrepTime);
        return aiPredictedTime.atZone(java.time.ZoneId.systemDefault()).format(java.time.format.DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }
}
