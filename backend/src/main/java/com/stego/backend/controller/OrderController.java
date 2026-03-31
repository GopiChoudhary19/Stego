package com.stego.backend.controller;

import com.stego.backend.dto.request.OrderRequest;
import com.stego.backend.dto.response.ApiResponse;
import com.stego.backend.dto.response.OrderResponse;
import com.stego.backend.security.UserDetailsImpl;
import com.stego.backend.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import com.stripe.exception.StripeException;

@RestController
@RequestMapping("/api/orders")
@Tag(name = "Orders", description = "Order management and tracking")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping
    @Operation(summary = "Create a new pre-order")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody OrderRequest request) {
        OrderResponse response = orderService.createOrder(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Order placed successfully", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get specific order details")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrder(id, userDetails.getId())));
    }

    @GetMapping
    @Operation(summary = "Get current user's order history")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getUserOrders(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getUserOrders(userDetails.getId())));
    }

    @GetMapping("/live")
    @Operation(summary = "Get current user's active/live orders")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getActiveOrders(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getActiveOrders(userDetails.getId())));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel an order")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Order cancelled", orderService.cancelOrder(id, userDetails.getId())));
    }

    // ── Restaurant Owner Endpoints ──

    @GetMapping("/restaurant/{restaurantId}")
    @Operation(summary = "Get all orders for a restaurant (Owner only)")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getRestaurantOrders(
            @PathVariable Long restaurantId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                orderService.getRestaurantOrders(restaurantId, userDetails.getId())));
    }

    @GetMapping("/restaurant/{restaurantId}/queue")
    @Operation(summary = "Get active order queue for a restaurant (Owner only)")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getRestaurantQueue(
            @PathVariable Long restaurantId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                orderService.getRestaurantQueue(restaurantId, userDetails.getId())));
    }

    @PatchMapping("/{id}/accept")
    @Operation(summary = "Accept a pending order (Owner only)")
    public ResponseEntity<ApiResponse<OrderResponse>> acceptOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Order accepted", orderService.acceptOrder(id, userDetails.getId())));
    }

    @PatchMapping("/{id}/prepare")
    @Operation(summary = "Mark order as preparing (Owner only)")
    public ResponseEntity<ApiResponse<OrderResponse>> prepareOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Order is being prepared", orderService.prepareOrder(id, userDetails.getId())));
    }

    @PatchMapping("/{id}/ready")
    @Operation(summary = "Mark order as ready for pickup (Owner only)")
    public ResponseEntity<ApiResponse<OrderResponse>> readyOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Order is ready for pickup", orderService.readyOrder(id, userDetails.getId())));
    }

    @PatchMapping("/{id}/complete")
    @Operation(summary = "Mark order as completed (Owner only)")
    public ResponseEntity<ApiResponse<OrderResponse>> completeOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Order completed", orderService.completeOrder(id, userDetails.getId())));
    }

    @PostMapping("/estimate")
    @Operation(summary = "Get a live estimation for a potential order")
    public ResponseEntity<ApiResponse<Map<String, String>>> estimateOrder(
            @Valid @RequestBody OrderRequest request) {
        String estimatedTime = orderService.estimateOrderReadyTime(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Estimation calculated", 
                Collections.singletonMap("estimatedReadyTime", estimatedTime)
        ));
    }

    @PostMapping("/{id}/payment-intent")
    @Operation(summary = "Create Stripe Payment Intent (User only)")
    public ResponseEntity<ApiResponse<Map<String, String>>> createPaymentIntent(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws StripeException {
        String clientSecret = orderService.createPaymentIntent(id, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(
                "Payment intent created", 
                Collections.singletonMap("clientSecret", clientSecret)
        ));
    }
}
