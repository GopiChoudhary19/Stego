package com.stego.backend.service;

import com.stego.backend.entity.Order;
import com.stego.backend.entity.Restaurant;
import com.stego.backend.enums.OrderStatus;
import com.stego.backend.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.PageRequest;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;
import com.stego.backend.entity.OrderItem;

@Service
public class EstimationService {

    @Autowired
    private OrderRepository orderRepository;

    /**
     * Smart wait-time estimation for order ready time.
     * Logic:
     * 1. Base item prep time (max of all items).
     * 2. Current queue weight (each active order adds a dynamic delay).
     * 3. Historical delay factor (actual vs estimated for this restaurant).
     */
    public LocalDateTime estimateReadyTime(Restaurant restaurant, int maxItemPrepTime) {
        LocalDateTime now = LocalDateTime.now();
        LocalTime time = now.toLocalTime();

        // 1. Queue-Item Density Factor
        List<OrderStatus> activeStatuses = List.of(OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING);
        List<Order> activeOrders = orderRepository.findByRestaurantIdAndStatusInOrderByQueuePositionAsc(restaurant.getId(), activeStatuses);
        
        long totalItemsInQueue = activeOrders.stream()
                .flatMap(o -> o.getItems().stream())
                .mapToLong(OrderItem::getQuantity)
                .sum();

        // Each item adds a standard processing delay (e.g., 2.5 mins per item)
        int itemProcessingDelay = (int) (totalItemsInQueue * 2.5);

        // 2. Peak Hour Factor (Dynamic Load Multiplier)
        double peakMultiplier = 1.0;
        if ((time.isAfter(LocalTime.of(12, 0)) && time.isBefore(LocalTime.of(14, 0))) || // Lunch
            (time.isAfter(LocalTime.of(19, 0)) && time.isBefore(LocalTime.of(21, 0)))) { // Dinner
            peakMultiplier = 1.5;
        }

        // 3. Historical Performance (AI Delay Factor)
        List<Order> recentOrders = orderRepository.findRecentCompletedOrders(
                restaurant.getId(), 
                org.springframework.data.domain.PageRequest.of(0, 5)
        );
        double avgDelayMinutes = 0;
        if (!recentOrders.isEmpty()) {
            long totalDelaySec = recentOrders.stream()
                    .filter(o -> o.getActualReadyTime() != null && o.getEstimatedReadyTime() != null)
                    .mapToLong(o -> java.time.Duration.between(o.getEstimatedReadyTime(), o.getActualReadyTime()).getSeconds())
                    .sum();
            avgDelayMinutes = (totalDelaySec / (double) recentOrders.size()) / 60.0;
        }

        // 4. Final Heuristic
        // (base + queue density) * peak_multiplier + historical error margin
        int totalPredictedMinutes = (int) ((maxItemPrepTime + itemProcessingDelay) * peakMultiplier) 
                + (int) Math.max(0, Math.min(15, avgDelayMinutes));

        return now.plusMinutes(totalPredictedMinutes);
    }
}
