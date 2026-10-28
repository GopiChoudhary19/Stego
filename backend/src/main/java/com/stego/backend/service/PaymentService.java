package com.stego.backend.service;

import com.stego.backend.entity.Order;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

@Service
public class PaymentService {

    @Value("${stripe.secret.key:sk_test_51Pxxxxxxxxxx}")
    private String stripeSecretKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    /**
     * Creates a Stripe Payment Intent for an order.
     * Returns the client_secret which the frontend uses to complete the payment.
     */
    public String createPaymentIntent(Order order) throws StripeException {
        // Stripe wants the smallest currency unit; round instead of truncating fractional paise
        long amountInCents = order.getTotalAmount().setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency("inr")
                .setDescription("Stego Order #" + order.getId())
                .putMetadata("order_id", String.valueOf(order.getId()))
                .putMetadata("user_email", order.getUser().getEmail())
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                )
                .build();

        PaymentIntent intent = PaymentIntent.create(params);
        return intent.getClientSecret();
    }

    /** Refunds a captured PaymentIntent in full. */
    public void refund(String paymentIntentId) throws StripeException {
        Refund.create(RefundCreateParams.builder().setPaymentIntent(paymentIntentId).build());
    }
}
