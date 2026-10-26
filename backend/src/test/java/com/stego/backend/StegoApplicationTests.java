package com.stego.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

// Starts the whole app on PostgreSQL with Flyway and schema validation, as production does.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class StegoApplicationTests {

    @Autowired
    private TestRestTemplate http;

    @Test
    void healthEndpointIsPublicForContainerChecks() {
        ResponseEntity<String> response = http.getForEntity("/actuator/health", String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("\"UP\""));
    }

    @Test
    void otherActuatorEndpointsStayProtected() {
        assertEquals(HttpStatus.UNAUTHORIZED, http.getForEntity("/actuator/metrics", String.class).getStatusCode());
    }

    @Test
    void publicRestaurantListingWorks() {
        assertEquals(HttpStatus.OK, http.getForEntity("/api/restaurants", String.class).getStatusCode());
    }

    @Test
    void aUserCanLogInMoreThanOnce() {
        HttpHeaders json = new HttpHeaders();
        json.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> account = Map.of("name", "Repeat User", "email", "repeat@example.test",
                "password", "password123", "phone", "9999999999");
        http.postForEntity("/api/auth/register", new HttpEntity<>(account, json), String.class);

        Map<String, String> credentials = Map.of("email", "repeat@example.test", "password", "password123");
        for (int attempt = 1; attempt <= 2; attempt++) {
            ResponseEntity<String> login = http.postForEntity("/api/auth/login", new HttpEntity<>(credentials, json), String.class);
            assertEquals(HttpStatus.OK, login.getStatusCode(), "login attempt " + attempt + ": " + login.getBody());
        }
    }
}
