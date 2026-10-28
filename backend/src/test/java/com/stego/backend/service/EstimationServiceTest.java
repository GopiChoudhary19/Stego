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

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

public class EstimationServiceTest {

    private static final ZoneId ZONE = ZoneOffset.UTC;

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private EstimationService estimationService;

    private Restaurant restaurant;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        restaurant = new Restaurant();
        restaurant.setId(1L);
        when(orderRepository.findByRestaurantIdAndStatusInOrderByQueuePositionAsc(anyLong(), any()))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findRecentCompletedOrders(anyLong(), any(Pageable.class)))
                .thenReturn(Collections.emptyList());
    }

    private LocalDateTime at(int hour, int minute) {
        LocalDateTime now = LocalDateTime.of(2026, 1, 15, hour, minute);
        estimationService.clock = Clock.fixed(now.atZone(ZONE).toInstant(), ZONE);
        return now;
    }

    private long minutesFrom(LocalDateTime now, LocalDateTime estimate) {
        return Duration.between(now, estimate).toMinutes();
    }

    private static Order orderWithItems(int quantity) {
        Order order = new Order();
        OrderItem item = new OrderItem();
        item.setQuantity(quantity);
        order.setItems(List.of(item));
        return order;
    }

    @Test
    void emptyQueueOffPeakIsJustThePrepTime() {
        LocalDateTime now = at(10, 30);

        assertEquals(20, minutesFrom(now, estimationService.estimateReadyTime(restaurant, 20)));
    }

    @Test
    void queuedItemsAddTwoAndAHalfMinutesEach() {
        LocalDateTime now = at(10, 30);
        when(orderRepository.findByRestaurantIdAndStatusInOrderByQueuePositionAsc(anyLong(), any()))
                .thenReturn(List.of(orderWithItems(2), orderWithItems(2)));

        // 20 prep + 4 items * 2.5
        assertEquals(30, minutesFrom(now, estimationService.estimateReadyTime(restaurant, 20)));
    }

    @Test
    void lunchAndDinnerRushMultiplyTheEstimate() {
        assertEquals(30, minutesFrom(at(12, 30), estimationService.estimateReadyTime(restaurant, 20)));
        assertEquals(30, minutesFrom(at(20, 0), estimationService.estimateReadyTime(restaurant, 20)));
    }

    @Test
    void historicalDelayAveragesOnlyOrdersWithBothTimestamps() {
        LocalDateTime now = at(10, 30);
        Order late = new Order();
        late.setEstimatedReadyTime(now.minusHours(1));
        late.setActualReadyTime(now.minusHours(1).plusMinutes(10));
        Order missing = new Order();
        when(orderRepository.findRecentCompletedOrders(anyLong(), any(Pageable.class)))
                .thenReturn(List.of(late, missing));

        // the one measured order ran 10 minutes late; the order without timestamps must not halve that
        assertEquals(30, minutesFrom(now, estimationService.estimateReadyTime(restaurant, 20)));
    }
}
