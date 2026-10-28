package com.stego.backend.dto.request;

import com.stego.backend.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class OrderRequest {

    @NotNull(message = "Restaurant ID is required")
    private Long restaurantId;

    @NotEmpty(message = "Order must contain at least one item")
    @Size(max = 50, message = "An order can have at most 50 different items")
    @Valid
    private List<OrderItemRequest> items;

    private LocalDateTime scheduledPickupTime;

    private String specialInstructions;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    @Data
    public static class OrderItemRequest {
        @NotNull(message = "Menu item ID is required")
        private Long menuItemId;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = 50, message = "Quantity must be at most 50")
        private Integer quantity;
    }
}
