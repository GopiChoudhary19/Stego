package com.stego.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stego.backend.repository.VerificationCodeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// The whole pre-order flow over HTTP against PostgreSQL: owner sets up a restaurant, a customer orders,
// the owner moves the order through the kitchen states, and the customer reviews it.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class OrderFlowIntegrationTest {

    @Autowired
    private TestRestTemplate http;

    @Autowired
    private VerificationCodeRepository codes;

    @Autowired
    private com.stego.backend.service.OrderService orderService;

    private final ObjectMapper json = new ObjectMapper();

    private JsonNode send(HttpMethod method, String path, Object body, String token, HttpStatus expected) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) headers.setBearerAuth(token);
        ResponseEntity<String> response = http.exchange(path, method, new HttpEntity<>(body, headers), String.class);
        assertEquals(expected, response.getStatusCode(), method + " " + path + " -> " + response.getBody());
        return json.readTree(response.getBody()).path("data");
    }

    private String signUp(String email, String role) throws Exception {
        send(HttpMethod.POST, "/api/auth/register",
                Map.of("name", "Flow " + role, "email", email, "password", "password123", "phone", "9999999999", "role", role),
                null, HttpStatus.CREATED);
        JsonNode challenge = send(HttpMethod.POST, "/api/auth/login", Map.of("email", email, "password", "password123"),
                null, HttpStatus.OK);
        assertTrue(challenge.path("accessToken").isMissingNode(), "no tokens before the emailed code is verified");

        // the test reads the emailed code straight from the database
        String code = codes.findTopByEmailAndTypeOrderByCreatedAtDesc(email, "AUTH").orElseThrow().getCode();
        return send(HttpMethod.POST, "/api/auth/verify-otp", Map.of("email", email, "code", code),
                null, HttpStatus.OK).path("accessToken").asText();
    }

    @Test
    void wrongCodeIsRejectedAndIssuesNoTokens() throws Exception {
        send(HttpMethod.POST, "/api/auth/register", Map.of("name", "Guess", "email", "guess@example.test",
                "password", "password123", "phone", "9999999999"), null, HttpStatus.CREATED);
        JsonNode body = send(HttpMethod.POST, "/api/auth/verify-otp", Map.of("email", "guess@example.test", "code", "000000"),
                null, HttpStatus.BAD_REQUEST);
        assertTrue(body.path("accessToken").isMissingNode());
    }

    @Test
    void logoutRevokesTheRefreshToken() throws Exception {
        String email = "logout@example.test";
        send(HttpMethod.POST, "/api/auth/register", Map.of("name", "Leaving", "email", email,
                "password", "password123", "phone", "9999999999"), null, HttpStatus.CREATED);
        String code = codes.findTopByEmailAndTypeOrderByCreatedAtDesc(email, "AUTH").orElseThrow().getCode();
        JsonNode tokens = send(HttpMethod.POST, "/api/auth/verify-otp", Map.of("email", email, "code", code),
                null, HttpStatus.OK);
        String refresh = tokens.path("refreshToken").asText();

        send(HttpMethod.POST, "/api/auth/refresh", Map.of("refreshToken", refresh), null, HttpStatus.OK);
        send(HttpMethod.POST, "/api/auth/logout", null, tokens.path("accessToken").asText(), HttpStatus.OK);
        send(HttpMethod.POST, "/api/auth/refresh", Map.of("refreshToken", refresh), null, HttpStatus.BAD_REQUEST);
        send(HttpMethod.POST, "/api/auth/logout", null, null, HttpStatus.UNAUTHORIZED);
    }

    @Test
    void profileUpdateRejectsBlankNames() throws Exception {
        String token = signUp("profile@example.test", "USER");
        // raw JSON strings: TestRestTemplate's default client sent an empty body for PUT with a Map
        send(HttpMethod.PUT, "/api/users/me", "{\"name\": \"   \"}", token, HttpStatus.BAD_REQUEST);
        send(HttpMethod.PUT, "/api/users/me", "{\"name\": null}", token, HttpStatus.BAD_REQUEST);
        assertEquals("New Name", send(HttpMethod.PUT, "/api/users/me", "{\"name\": \" New Name \"}", token, HttpStatus.OK)
                .path("name").asText());
    }

    @Test
    void unpaidCardOrdersExpireButCashOrdersStay() throws Exception {
        String owner = signUp("expiry-owner@example.test", "RESTAURANT_OWNER");
        String customer = signUp("expiry-customer@example.test", "USER");
        long restaurant = send(HttpMethod.POST, "/api/restaurants",
                Map.of("name", "Expiry Kitchen", "address", "2 Test Street"), owner, HttpStatus.CREATED).path("id").asLong();
        long item = send(HttpMethod.POST, "/api/restaurants/" + restaurant + "/menu",
                Map.of("name", "Dosa", "category", "VEG", "price", 80, "prepTimeMinutes", 10),
                owner, HttpStatus.CREATED).path("id").asLong();
        long card = send(HttpMethod.POST, "/api/orders", Map.of("restaurantId", restaurant, "paymentMethod", "CARD",
                "items", List.of(Map.of("menuItemId", item, "quantity", 1))), customer, HttpStatus.CREATED).path("id").asLong();
        long cash = send(HttpMethod.POST, "/api/orders", Map.of("restaurantId", restaurant, "paymentMethod", "COD",
                "items", List.of(Map.of("menuItemId", item, "quantity", 1))), customer, HttpStatus.CREATED).path("id").asLong();

        // the kitchen cannot start on the unpaid card order
        send(HttpMethod.PATCH, "/api/orders/" + card + "/accept", null, owner, HttpStatus.BAD_REQUEST);

        // a negative age puts the cutoff in the future, so the order just created counts as abandoned
        orderService.cancelAbandonedOnlineOrders(java.time.Duration.ofMinutes(-1));

        assertEquals("CANCELLED", send(HttpMethod.GET, "/api/orders/" + card, null, customer, HttpStatus.OK).path("status").asText());
        assertEquals("PENDING", send(HttpMethod.GET, "/api/orders/" + cash, null, customer, HttpStatus.OK).path("status").asText());
    }

    @Test
    void customerOrdersAndOwnerServesTheOrder() throws Exception {
        String owner = signUp("flow-owner@example.test", "RESTAURANT_OWNER");
        String customer = signUp("flow-customer@example.test", "USER");

        long restaurant = send(HttpMethod.POST, "/api/restaurants",
                Map.of("name", "Flow Kitchen", "address", "1 Test Street"), owner, HttpStatus.CREATED).path("id").asLong();
        long item = send(HttpMethod.POST, "/api/restaurants/" + restaurant + "/menu",
                Map.of("name", "Paneer Wrap", "category", "VEG", "price", 120, "prepTimeMinutes", 10),
                owner, HttpStatus.CREATED).path("id").asLong();

        long order = send(HttpMethod.POST, "/api/orders", Map.of("restaurantId", restaurant, "paymentMethod", "COD",
                "items", List.of(Map.of("menuItemId", item, "quantity", 2))), customer, HttpStatus.CREATED).path("id").asLong();

        // read endpoints map orders with their items, user and restaurant
        assertEquals(1, send(HttpMethod.GET, "/api/orders", null, customer, HttpStatus.OK).size());
        assertEquals(2, send(HttpMethod.GET, "/api/orders/" + order, null, customer, HttpStatus.OK).path("items").get(0).path("quantity").asInt());
        assertEquals(1, send(HttpMethod.GET, "/api/orders/restaurant/" + restaurant, null, owner, HttpStatus.OK).size());

        for (String action : List.of("accept", "prepare", "ready")) {
            send(HttpMethod.PATCH, "/api/orders/" + order + "/" + action, null, owner, HttpStatus.OK);
        }
        JsonNode queue = send(HttpMethod.GET, "/api/orders/restaurant/" + restaurant + "/queue", null, owner, HttpStatus.OK);
        assertEquals("READY", queue.get(0).path("status").asText(), "a READY order must stay in the owner's queue");

        assertEquals("COMPLETED", send(HttpMethod.PATCH, "/api/orders/" + order + "/complete", null, owner, HttpStatus.OK)
                .path("status").asText());

        send(HttpMethod.POST, "/api/reviews", Map.of("orderId", order, "rating", 5, "comment", "Hot and fast"),
                customer, HttpStatus.CREATED);
        assertEquals(1, send(HttpMethod.GET, "/api/reviews/my", null, customer, HttpStatus.OK).size());
        assertEquals(1, send(HttpMethod.GET, "/api/reviews/restaurant/" + restaurant, null, null, HttpStatus.OK).size(),
                "restaurant reviews are public");
    }
}
