package com.stego.backend.repository;

import com.stego.backend.entity.Order;
import com.stego.backend.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Order> findByRestaurantIdOrderByCreatedAtDesc(Long restaurantId);

    List<Order> findByRestaurantIdAndStatusInOrderByQueuePositionAsc(Long restaurantId, List<OrderStatus> statuses);

    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND o.status IN :statuses ORDER BY o.createdAt DESC")
    List<Order> findActiveOrdersByUser(@Param("userId") Long userId, @Param("statuses") List<OrderStatus> statuses);

    @Query("SELECT o FROM Order o WHERE o.restaurant.id = :restaurantId AND o.status = com.stego.backend.enums.OrderStatus.COMPLETED ORDER BY o.createdAt DESC")
    List<Order> findRecentCompletedOrders(@Param("restaurantId") Long restaurantId, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT COALESCE(MAX(o.queuePosition), 0) FROM Order o WHERE o.restaurant.id = :restaurantId AND o.status IN :statuses")
    int findMaxQueuePosition(@Param("restaurantId") Long restaurantId, @Param("statuses") List<OrderStatus> statuses);
}
