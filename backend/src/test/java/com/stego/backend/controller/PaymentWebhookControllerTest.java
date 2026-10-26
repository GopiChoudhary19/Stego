package com.stego.backend.controller;

import com.stego.backend.service.OrderService;
import com.stripe.Stripe;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class PaymentWebhookControllerTest {

    private static final String SECRET = "whsec_test_real_secret";

    @Mock private OrderService orderService;
    @InjectMocks private PaymentWebhookController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(controller, "endpointSecret", SECRET);
    }

    private static String paymentSucceeded(long orderId) {
        return "{\"id\":\"evt_1\",\"object\":\"event\",\"api_version\":\"" + Stripe.API_VERSION + "\","
                + "\"type\":\"payment_intent.succeeded\",\"data\":{\"object\":{\"id\":\"pi_123\",\"object\":\"payment_intent\","
                + "\"metadata\":{\"order_id\":\"" + orderId + "\"}}}}";
    }

    // same scheme Stripe uses: HMAC-SHA256 of "<timestamp>.<payload>"
    private static String sign(String payload, String secret) throws Exception {
        long t = System.currentTimeMillis() / 1000;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String sig = HexFormat.of().formatHex(mac.doFinal((t + "." + payload).getBytes(StandardCharsets.UTF_8)));
        return "t=" + t + ",v1=" + sig;
    }

    @Test
    void validlySignedEventMarksOrderPaid() throws Exception {
        String payload = paymentSucceeded(42);
        var response = controller.handleStripeWebhook(payload, sign(payload, SECRET));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(orderService).handlePaymentSuccess(42L, "pi_123");
    }

    @Test
    void eventSignedWithTheOldPlaceholderSecretIsRejected() throws Exception {
        String payload = paymentSucceeded(42);
        var response = controller.handleStripeWebhook(payload, sign(payload, "whsec_xxxxxxxx"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(orderService, never()).handlePaymentSuccess(anyLong(), anyString());
    }

    @Test
    void webhooksAreRefusedWhenNoSecretIsConfigured() throws Exception {
        ReflectionTestUtils.setField(controller, "endpointSecret", "");
        String payload = paymentSucceeded(42);
        var response = controller.handleStripeWebhook(payload, sign(payload, "whsec_xxxxxxxx"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        verifyNoInteractions(orderService);
    }
}
