package com.stego.backend;

import org.junit.jupiter.api.Test;

import java.time.DateTimeException;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class StegoApplicationTimezoneTest {

    @Test
    void defaultsToIndianTimeWhenNothingIsConfigured() {
        assertEquals(ZoneId.of("Asia/Kolkata"), StegoApplication.resolveZone(null));
        assertEquals(ZoneId.of("Asia/Kolkata"), StegoApplication.resolveZone("  "));
    }

    @Test
    void usesTheConfiguredZone() {
        assertEquals(ZoneId.of("Europe/London"), StegoApplication.resolveZone(" Europe/London "));
    }

    @Test
    void aTypoFailsAtStartupInsteadOfSilentlyFallingBackToUtc() {
        assertThrows(DateTimeException.class, () -> StegoApplication.resolveZone("Asia/Kolkatta"));
    }
}
