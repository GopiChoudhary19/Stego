package com.stego.backend.service;

import com.stego.backend.entity.Order;
import com.stego.backend.entity.Payment;
import com.stego.backend.entity.Restaurant;
import com.stego.backend.entity.User;
import com.stego.backend.enums.OrderStatus;
import com.stego.backend.enums.PaymentMethod;
import com.stego.backend.enums.PaymentStatus;
import com.stego.backend.repository.OrderRepository;
import com.stego.backend.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
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
        order = Order.builder().user(user).restaurant(restaurant).totalAmount(new BigDecimal("500.00")).build();
        order.setId(ORDER_ID);
        payment = Payment.builder().order(order).amount(new BigDecimal("500.00")).paymentMethod(PaymentMethod.CARD).build();
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
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
    void paymentFailureCancelsUnpaidOrder() {
        orderService.handlePaymentFailure(ORDER_ID);

        assertEquals(PaymentStatus.FAILED, payment.getStatus());
        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        verify(orderRepository).save(order);
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
}
