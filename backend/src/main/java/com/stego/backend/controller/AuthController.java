package com.stego.backend.controller;

import com.stego.backend.dto.request.LoginRequest;
import com.stego.backend.dto.request.RegisterRequest;
import com.stego.backend.dto.request.TokenRefreshRequest;
import com.stego.backend.dto.response.ApiResponse;
import com.stego.backend.dto.response.AuthResponse;
import com.stego.backend.dto.response.OtpChallengeResponse;
import com.stego.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Auth endpoints for register, login, and token refresh")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify the emailed code and receive JWT tokens (step 2 of login/register)")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOtp(@RequestBody Map<String, String> request) {
        AuthResponse response = authService.completeSignIn(request.get("email"), request.get("code"));
        return ResponseEntity.ok(ApiResponse.success("Verification successful", response));
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user or restaurant owner; emails a verification code")
    public ResponseEntity<ApiResponse<OtpChallengeResponse>> register(@Valid @RequestBody RegisterRequest request) {
        OtpChallengeResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful. Check your email for the code.", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Check credentials and email a verification code (step 1 of login)")
    public ResponseEntity<ApiResponse<OtpChallengeResponse>> login(@Valid @RequestBody LoginRequest request) {
        OtpChallengeResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Code sent. Check your email.", response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using refresh token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
        AuthResponse response = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Token refreshed", response));
    }
}
