package com.stego.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
}
