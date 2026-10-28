package com.stego.backend.repository;

import com.stego.backend.entity.Payment;
import com.stego.backend.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByOrderId(Long orderId);

    Optional<Payment> findByTransactionId(String transactionId);

    Optional<Payment> findByGatewayOrderId(String gatewayOrderId);

    long countByStatus(PaymentStatus status);

    // online payments whose order is still waiting in the queue although the customer never finished paying
    @Query("SELECT p FROM Payment p WHERE p.paymentMethod <> com.stego.backend.enums.PaymentMethod.COD"
            + " AND p.status <> com.stego.backend.enums.PaymentStatus.SUCCESS"
            + " AND p.order.status = com.stego.backend.enums.OrderStatus.PENDING AND p.order.createdAt < :cutoff")
    List<Payment> findAbandonedOnlinePayments(@Param("cutoff") LocalDateTime cutoff);
}
