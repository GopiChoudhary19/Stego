package com.stego.backend.service;

import com.stego.backend.entity.Order;
import com.stego.backend.entity.OrderItem;
import com.stego.backend.entity.Restaurant;
import com.stego.backend.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.*;

public class EstimationServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private EstimationService estimationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testEstimateReadyTime_EmptyQueue_BaseCase() {
        // Arrange
        Restaurant restaurant = new Restaurant();
        restaurant.setId(1L);
        int maxItemPrepTime = 20;

        when(orderRepository.findByRestaurantIdAndStatusInOrderByQueuePositionAsc(anyLong(), any()))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findRecentCompletedOrders(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        // Act
        LocalDateTime estimatedTime = estimationService.estimateReadyTime(restaurant, maxItemPrepTime);

        // Assert
        long diff = java.time.Duration.between(LocalDateTime.now(), estimatedTime).toMinutes();
        
        // Base case: (20 base + 0 queue) * 1.0 peak (assuming non-peak hours) = 20 mins
        // Note: The time-of-day peak check (12-2, 7-9) may vary during testing.
        assertTrue(diff >= 20 && diff <= 30, "Estimated time should be around base prep time");
    }

    @Test
    void testEstimateReadyTime_BusyQueue_IncreasedTime() {
        // Arrange
        Restaurant restaurant = new Restaurant();
        restaurant.setId(1L);
        int maxItemPrepTime = 20;

        // Mock 2 active orders, each with 2 items (Total 4 items @ 2.5 mins each = 10 mins delay)
        Order order1 = new Order();
        OrderItem item1 = new OrderItem(); item1.setQuantity(2);
        order1.setItems(List.of(item1));

        Order order2 = new Order();
        OrderItem item2 = new OrderItem(); item2.setQuantity(2);
        order2.setItems(List.of(item2));

        when(orderRepository.findByRestaurantIdAndStatusInOrderByQueuePositionAsc(anyLong(), any()))
                .thenReturn(List.of(order1, order2));
        when(orderRepository.findRecentCompletedOrders(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        // Act
        LocalDateTime estimatedTime = estimationService.estimateReadyTime(restaurant, maxItemPrepTime);

        // Assert
        long diff = java.time.Duration.between(LocalDateTime.now(), estimatedTime).toMinutes();
        
        // Calculation: (20 base + 10 queue delay) * 1.0 peak = 30 mins
        assertTrue(diff >= 30, "Estimated time should account for queue density");
    }
}
