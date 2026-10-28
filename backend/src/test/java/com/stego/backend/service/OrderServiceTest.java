package com.stego.backend.service;

import com.stego.backend.entity.Order;
import com.stego.backend.entity.Payment;
import com.stego.backend.entity.Restaurant;
import com.stego.backend.entity.User;
import com.stego.backend.enums.OrderStatus;
import com.stego.backend.enums.PaymentMethod;
import com.stego.backend.enums.PaymentStatus;
import com.stego.backend.exception.BadRequestException;
import com.stego.backend.repository.OrderRepository;
import com.stego.backend.repository.PaymentRepository;
import com.stego.backend.repository.RestaurantRepository;
import com.stripe.exception.ApiConnectionException;
import com.stripe.exception.StripeException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class OrderServiceTest {

    private static final Long ORDER_ID = 42L;
    private static final String TXN = "pi_test_123";

    @Mock private OrderRepository orderRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private RestaurantRepository restaurantRepository;
    @Mock private EstimationService estimationService;
    @Mock private PaymentService paymentService;
    @Mock private EmailService emailService;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks private OrderService orderService;

    private Order order;
    private Payment payment;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        User user = new User();
        user.setId(7L);
        Restaurant restaurant = new Restaurant();
        restaurant.setId(3L);
        User owner = new User();
        owner.setId(5L);
        restaurant.setOwner(owner);
        order = Order.builder().user(user).restaurant(restaurant).totalAmount(new BigDecimal("500.00")).build();
        order.setId(ORDER_ID);
        payment = Payment.builder().order(order).amount(new BigDecimal("500.00")).paymentMethod(PaymentMethod.CARD).build();
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.findByOrderId(ORDER_ID)).thenReturn(Optional.of(payment));
        when(paymentRepository.findByTransactionId(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void paymentSuccessMarksPaymentAndNotifies() {
        orderService.handlePaymentSuccess(ORDER_ID, TXN);

        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        assertEquals(TXN, payment.getTransactionId());
        assertNotNull(payment.getPaidAt());
        verify(paymentRepository).save(payment);
        verify(emailService).sendOrderConfirmation(order);
        verify(messagingTemplate).convertAndSend(eq("/topic/user/7/orders"), any(Object.class));
    }

    @Test
    void duplicateTransactionIsIgnored() {
        when(paymentRepository.findByTransactionId(TXN)).thenReturn(Optional.of(payment));

        orderService.handlePaymentSuccess(ORDER_ID, TXN);

        verify(paymentRepository, never()).save(any());
        verifyNoInteractions(emailService, messagingTemplate);
    }

    @Test
    void alreadySuccessfulPaymentIsNotProcessedTwice() {
        payment.setStatus(PaymentStatus.SUCCESS);

        orderService.handlePaymentSuccess(ORDER_ID, "pi_other");

        verify(paymentRepository, never()).save(any());
        verifyNoInteractions(emailService);
    }

    @Test
    void paymentFailureKeepsOrderOpenSoTheCustomerCanRetry() {
        orderService.handlePaymentFailure(ORDER_ID);

        assertEquals(PaymentStatus.FAILED, payment.getStatus());
        assertEquals(OrderStatus.PENDING, order.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void retryAfterDeclinedCardStillCompletesThePayment() {
        orderService.handlePaymentFailure(ORDER_ID);
        orderService.handlePaymentSuccess(ORDER_ID, TXN);

        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        assertEquals(OrderStatus.PENDING, order.getStatus());
        verify(emailService).sendOrderConfirmation(order);
    }

    @Test
    void paymentArrivingForCancelledOrderIsRefunded() throws StripeException {
        order.setStatus(OrderStatus.CANCELLED);

        orderService.handlePaymentSuccess(ORDER_ID, TXN);

        verify(paymentService).refund(TXN);
        assertEquals(PaymentStatus.REFUNDED, payment.getStatus());
        verifyNoInteractions(emailService);
    }

    @Test
    void cancellingPaidOrderRefundsThroughStripe() throws StripeException {
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId(TXN);

        orderService.cancelOrder(ORDER_ID, 7L);

        verify(paymentService).refund(TXN);
        assertEquals(PaymentStatus.REFUNDED, payment.getStatus());
        assertEquals(OrderStatus.CANCELLED, order.getStatus());
    }

    @Test
    void failedStripeRefundIsNotRecordedAsRefunded() throws StripeException {
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId(TXN);
        doThrow(new ApiConnectionException("stripe down")).when(paymentService).refund(TXN);

        assertThrows(BadRequestException.class, () -> orderService.cancelOrder(ORDER_ID, 7L));
        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
    }

    @Test
    void paidOrderCannotGetASecondPaymentIntent() throws StripeException {
        payment.setStatus(PaymentStatus.SUCCESS);

        assertThrows(BadRequestException.class, () -> orderService.createPaymentIntent(ORDER_ID, 7L));
        verify(paymentService, never()).createPaymentIntent(any());
    }

    @Test
    void cashOrderCannotGetAPaymentIntent() throws StripeException {
        payment.setPaymentMethod(PaymentMethod.COD);

        assertThrows(BadRequestException.class, () -> orderService.createPaymentIntent(ORDER_ID, 7L));
        verify(paymentService, never()).createPaymentIntent(any());
    }

    @Test
    void unpaidCardOrderGetsAPaymentIntent() throws StripeException {
        when(paymentService.createPaymentIntent(order)).thenReturn("secret");

        assertEquals("secret", orderService.createPaymentIntent(ORDER_ID, 7L));
    }

    @Test
    void lateFailureEventDoesNotCancelPaidOrder() {
        payment.setStatus(PaymentStatus.SUCCESS);

        orderService.handlePaymentFailure(ORDER_ID);

        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        assertEquals(OrderStatus.PENDING, order.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void unknownOrderIsIgnored() {
        when(orderRepository.findById(99L)).thenReturn(Optional.empty());

        orderService.handlePaymentFailure(99L);
        orderService.handlePaymentSuccess(99L, TXN);

        verify(paymentRepository, never()).save(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void ownerQueueIncludesReadyOrdersSoTheyCanBeCompleted() {
        User owner = new User();
        owner.setId(5L);
        order.getRestaurant().setOwner(owner);
        when(restaurantRepository.findById(3L)).thenReturn(Optional.of(order.getRestaurant()));
        when(orderRepository.findByRestaurantIdAndStatusInOrderByQueuePositionAsc(eq(3L), any())).thenReturn(List.of());

        orderService.getRestaurantQueue(3L, 5L);

        ArgumentCaptor<List<OrderStatus>> statuses = ArgumentCaptor.forClass(List.class);
        verify(orderRepository).findByRestaurantIdAndStatusInOrderByQueuePositionAsc(eq(3L), statuses.capture());
        assertTrue(statuses.getValue().contains(OrderStatus.READY));
    }

    @Test
    void openingHoursWithinOneDay() {
        LocalTime open = LocalTime.of(10, 0), close = LocalTime.of(22, 0);
        assertTrue(OrderService.isWithinOpeningHours(LocalTime.of(10, 0), open, close));
        assertTrue(OrderService.isWithinOpeningHours(LocalTime.of(15, 30), open, close));
        assertFalse(OrderService.isWithinOpeningHours(LocalTime.of(9, 59), open, close));
        assertFalse(OrderService.isWithinOpeningHours(LocalTime.of(22, 1), open, close));
    }

    @Test
    void openingHoursPastMidnight() {
        LocalTime open = LocalTime.of(18, 0), close = LocalTime.of(2, 0);
        assertTrue(OrderService.isWithinOpeningHours(LocalTime.of(23, 0), open, close));
        assertTrue(OrderService.isWithinOpeningHours(LocalTime.of(1, 30), open, close));
        assertFalse(OrderService.isWithinOpeningHours(LocalTime.of(12, 0), open, close));
        assertFalse(OrderService.isWithinOpeningHours(LocalTime.of(2, 1), open, close));
    }
}
