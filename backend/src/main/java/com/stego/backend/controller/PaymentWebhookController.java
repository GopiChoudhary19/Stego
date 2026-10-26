package com.stego.backend.controller;

import com.stego.backend.service.OrderService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/webhook")
public class PaymentWebhookController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentWebhookController.class);

    // no default: a known placeholder secret would let anyone sign fake "payment succeeded" events
    @Value("${stripe.webhook.secret:}")
    private String endpointSecret;

    @Autowired
    private OrderService orderService;

    @PostMapping
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        if (endpointSecret == null || endpointSecret.isBlank()) {
            logger.error("Rejected Stripe webhook: STRIPE_WEBHOOK_SECRET is not configured");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("Webhooks are not configured");
        }

        Event event;

        try {
            event = Webhook.constructEvent(payload, sigHeader, endpointSecret);
        } catch (SignatureVerificationException e) {
            logger.error("Invalid signature: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        }

        // Handle the event
        logger.info("Received event: {}", event.getType());

        try {
            switch (event.getType()) {
                case "payment_intent.succeeded":
                    handlePaymentSucceeded(event);
                    break;
                case "payment_intent.payment_failed":
                    handlePaymentFailed(event);
                    break;
                default:
                    logger.info("Unhandled event type: {}", event.getType());
            }
        } catch (Exception e) {
            logger.error("Error processing webhook: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook");
        }

        return ResponseEntity.ok("Received");
    }

    private void handlePaymentSucceeded(Event event) {
        PaymentIntent paymentIntent = (PaymentIntent) event.getDataObjectDeserializer().getObject()
                .orElseThrow(() -> new RuntimeException("Could not deserialize PaymentIntent"));

        String orderIdStr = paymentIntent.getMetadata().get("order_id");
        if (orderIdStr != null) {
            Long orderId = Long.parseLong(orderIdStr);
            logger.info("Payment succeeded for Order ID: {}", orderId);
            orderService.handlePaymentSuccess(orderId, paymentIntent.getId());
        }
    }

    private void handlePaymentFailed(Event event) {
        PaymentIntent paymentIntent = (PaymentIntent) event.getDataObjectDeserializer().getObject()
                .orElseThrow(() -> new RuntimeException("Could not deserialize PaymentIntent"));

        String orderIdStr = paymentIntent.getMetadata().get("order_id");
        if (orderIdStr != null) {
            Long orderId = Long.parseLong(orderIdStr);
            logger.error("Payment failed for Order ID: {}", orderId);
            orderService.handlePaymentFailure(orderId);
        }
    }
}
