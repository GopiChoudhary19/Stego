package com.stego.backend.config;

import com.stego.backend.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Duration;

@Configuration
@EnableScheduling
public class SchedulingConfig {

    // how long a customer has to finish an online payment before the order is dropped from the queue
    static final Duration UNPAID_ORDER_TIMEOUT = Duration.ofMinutes(30);

    @Autowired
    private OrderService orderService;

    @Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT1M")
    public void cancelAbandonedOnlineOrders() {
        orderService.cancelAbandonedOnlineOrders(UNPAID_ORDER_TIMEOUT);
    }
}
