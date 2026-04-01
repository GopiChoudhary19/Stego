package com.stego.backend.service;

import com.stego.backend.entity.Order;
import com.stego.backend.entity.Restaurant;
import com.stego.backend.enums.OrderStatus;
import com.stego.backend.repository.OrderRepository;
import com.stego.backend.repository.PaymentRepository;
import com.stego.backend.entity.Payment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ActiveProfiles("test")
public class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private EstimationService estimationService;

    @InjectMocks
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testHandlePaymentSuccess_Idempotency_AlreadyPaid() {
        // Arrange
        String orderId = "ORD123";
        String transactionId = "TXN_456";
        Order existingOrder = new Order();
        existingOrder.setStatus(OrderStatus.PAID);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(existingOrder));

        // Act
        orderService.handlePaymentSuccess(orderId, transactionId);

        // Assert
        verify(paymentRepository, never()).save(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void testHandlePaymentSuccess_Idempotency_DuplicateTransaction() {
        // Arrange
        String orderId = "ORD123";
        String transactionId = "TXN_456";
        Order existingOrder = new Order();
        existingOrder.setStatus(OrderStatus.PENDING);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(existingOrder));
        when(paymentRepository.findByTransactionId(transactionId)).thenReturn(Optional.of(new Payment()));

        // Act
        orderService.handlePaymentSuccess(orderId, transactionId);

        // Assert
        verify(paymentRepository, never()).save(any());
        verify(orderRepository, times(0)).save(any()); // Should return early
    }

    @Test
    void testHandlePaymentSuccess_NewPayment() {
        // Arrange
        String orderId = "ORD123";
        String transactionId = "TXN_456";
        Order existingOrder = new Order();
        existingOrder.setStatus(OrderStatus.PENDING);
        existingOrder.setTotalAmount(500.0);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(existingOrder));
        when(paymentRepository.findByTransactionId(transactionId)).thenReturn(Optional.empty());

        // Act
        orderService.handlePaymentSuccess(orderId, transactionId);

        // Assert
        verify(paymentRepository, times(1)).save(any(Payment.class));
        verify(orderRepository, atLeastOnce()).save(existingOrder);
        assertEquals(OrderStatus.PAID, existingOrder.getStatus());
    }
}
