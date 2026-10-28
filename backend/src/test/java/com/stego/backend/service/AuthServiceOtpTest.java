package com.stego.backend.service;

import com.stego.backend.entity.VerificationCode;
import com.stego.backend.exception.BadRequestException;
import com.stego.backend.exception.RateLimitExceededException;
import com.stego.backend.repository.VerificationCodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuthServiceOtpTest {

    private static final String EMAIL = "victim@example.test";

    @Mock private VerificationCodeRepository codes;
    @Mock private OtpProvider otpProvider;
    @InjectMocks private AuthService authService;

    // a tiny in-memory table standing in for verification_codes
    private final List<VerificationCode> rows = new ArrayList<>();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(codes.save(any())).thenAnswer(inv -> {
            VerificationCode c = inv.getArgument(0);
            if (c.getCreatedAt() == null) {
                c.setCreatedAt(LocalDateTime.now().plusNanos(rows.size()));
                rows.add(c);
            }
            return c;
        });
        when(codes.countByEmailAndCreatedAtAfter(eq(EMAIL), any()))
                .thenAnswer(inv -> rows.stream().filter(r -> r.getCreatedAt().isAfter(inv.getArgument(1))).count());
        doAnswer(inv -> rows.removeIf(r -> r.getCreatedAt().isBefore(inv.getArgument(2))))
                .when(codes).deleteByEmailAndTypeAndCreatedAtBefore(eq(EMAIL), eq("AUTH"), any());
        doAnswer(inv -> rows.remove(inv.<VerificationCode>getArgument(0))).when(codes).delete(any());
        when(codes.findTopByEmailAndTypeOrderByCreatedAtDesc(EMAIL, "AUTH"))
                .thenAnswer(inv -> rows.stream().max(Comparator.comparing(VerificationCode::getCreatedAt)));
    }

    private void issue() throws Exception {
        var m = AuthService.class.getDeclaredMethod("sendAndStoreOtp", String.class, String.class);
        m.setAccessible(true);
        try {
            m.invoke(authService, EMAIL, "AUTH");
        } catch (java.lang.reflect.InvocationTargetException e) {
            throw (Exception) e.getCause();
        }
    }

    @Test
    void fourthCodeInsideTheWindowIsRefused() throws Exception {
        issue();
        issue();
        issue();
        assertThrows(RateLimitExceededException.class, this::issue);
        verify(otpProvider, times(3)).sendOtp(eq(EMAIL), anyString());
    }

    @Test
    void exhaustedCodeStillCountsTowardTheLimit() throws Exception {
        issue();
        for (int i = 0; i < 5; i++) {
            assertThrows(BadRequestException.class, () -> authService.verifyOtp(EMAIL, "000000", "AUTH"));
        }
        assertEquals(1, rows.size(), "the burned code must stay so it is counted");
        // even the right code no longer works once the attempts are used up
        String right = rows.get(0).getCode();
        assertThrows(BadRequestException.class, () -> authService.verifyOtp(EMAIL, right, "AUTH"));
        issue();
        issue();
        assertThrows(RateLimitExceededException.class, this::issue);
    }

    @Test
    void onlyTheNewestCodeIsAccepted() throws Exception {
        issue();
        String first = rows.get(0).getCode();
        issue();
        String second = rows.get(1).getCode();
        if (!first.equals(second)) {
            assertThrows(BadRequestException.class, () -> authService.verifyOtp(EMAIL, first, "AUTH"));
        }
        authService.verifyOtp(EMAIL, second, "AUTH");
    }

    @Test
    void codesOlderThanTheWindowAreCleanedUp() throws Exception {
        VerificationCode old = VerificationCode.builder().email(EMAIL).code("123456").type("AUTH")
                .expiryTime(LocalDateTime.now().minusHours(1)).build();
        old.setCreatedAt(LocalDateTime.now().minusHours(2));
        rows.add(old);
        issue();
        assertFalse(rows.contains(old));
        assertEquals(1, rows.size());
        assertEquals(Optional.of(rows.get(0)), codes.findTopByEmailAndTypeOrderByCreatedAtDesc(EMAIL, "AUTH"));
    }
}
