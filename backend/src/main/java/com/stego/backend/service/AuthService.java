package com.stego.backend.service;

import com.stego.backend.dto.request.LoginRequest;
import com.stego.backend.dto.request.RegisterRequest;
import com.stego.backend.dto.response.AuthResponse;
import com.stego.backend.dto.response.OtpChallengeResponse;
import com.stego.backend.entity.RefreshToken;
import com.stego.backend.entity.User;
import com.stego.backend.entity.VerificationCode;
import com.stego.backend.enums.Role;
import com.stego.backend.exception.BadRequestException;
import com.stego.backend.exception.RateLimitExceededException;
import com.stego.backend.repository.UserRepository;
import com.stego.backend.repository.VerificationCodeRepository;
import com.stego.backend.security.JwtUtils;
import com.stego.backend.security.UserDetailsImpl;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private static final SecureRandom OTP_RANDOM = new SecureRandom();

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private OtpProvider otpProvider;

    @Autowired
    private VerificationCodeRepository verificationCodeRepository;

    // Rate limiting: per-email buckets (10 attempts per minute)
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();

    private Bucket resolveBucket(String key) {
        return loginBuckets.computeIfAbsent(key, k -> {
            Bandwidth limit = Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1)));
            return Bucket.builder().addLimit(limit).build();
        });
    }

    public OtpChallengeResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered");
        }

        Role role = Role.ROLE_USER;
        if (request.getRole() != null && request.getRole().equalsIgnoreCase("RESTAURANT_OWNER")) {
            role = Role.ROLE_RESTAURANT_OWNER;
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        user = userRepository.save(user);

        sendAndStoreOtp(user.getEmail(), "AUTH");
        return new OtpChallengeResponse(user.getEmail(), true);
    }

    public OtpChallengeResponse login(LoginRequest request) {
        Bucket bucket = resolveBucket(request.getEmail());
        if (!bucket.tryConsume(1)) {
            throw new RateLimitExceededException("Too many login attempts. Please try again later.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // tokens are only issued after the emailed code is verified (completeSignIn)
        sendAndStoreOtp(userDetails.getEmail(), "AUTH");
        return new OtpChallengeResponse(userDetails.getEmail(), true);
    }

    /** Step 2 of sign-in: a correct one-time code is exchanged for access and refresh tokens. */
    public AuthResponse completeSignIn(String email, String code) {
        if (email == null || code == null) {
            throw new BadRequestException("Email and code are required");
        }
        verifyOtp(email, code, "AUTH");
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("No account found for this email"));
        String jwt = jwtUtils.generateTokenFromEmail(user.getEmail());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());
        return new AuthResponse(jwt, refreshToken.getToken(), user.getId(),
                user.getName(), user.getEmail(), user.getRole().name());
    }

    public AuthResponse refreshToken(String requestRefreshToken) {
        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String token = jwtUtils.generateTokenFromEmail(user.getEmail());
                    return new AuthResponse(token, requestRefreshToken, user.getId(),
                            user.getName(), user.getEmail(), user.getRole().name());
                })
                .orElseThrow(() -> new BadRequestException("Refresh token not found"));
    }

    private void sendAndStoreOtp(String email, String type) {
        // Anti-abuse: limit to 3 OTPs every 15 minutes
        long count = verificationCodeRepository.countByEmailAndCreatedAtAfter(email, LocalDateTime.now().minusMinutes(15));
        if (count >= 3) {
            throw new RateLimitExceededException("Too many OTP requests. Please wait a few minutes.");
        }

        String otp = String.valueOf(100000 + OTP_RANDOM.nextInt(900000));
        
        // Save to DB
        verificationCodeRepository.deleteByEmailAndType(email, type);
        VerificationCode vCode = VerificationCode.builder()
                .email(email)
                .code(otp)
                .type(type)
                .expiryTime(LocalDateTime.now().plusMinutes(10))
                .build();
        verificationCodeRepository.save(vCode);

        // Send via pluggable provider
        otpProvider.sendOtp(email, otp);
    }

    public void verifyOtp(String email, String code, String type) {
        VerificationCode vCode = verificationCodeRepository.findTopByEmailAndTypeOrderByCreatedAtDesc(email, type)
                .orElseThrow(() -> new BadRequestException("No verification code found"));

        if (vCode.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Verification code has expired");
        }

        if (!vCode.getCode().equals(code)) {
            vCode.setAttemptsCount(vCode.getAttemptsCount() + 1);
            verificationCodeRepository.save(vCode);
            
            if (vCode.getAttemptsCount() >= 5) {
                verificationCodeRepository.delete(vCode);
                throw new BadRequestException("Too many failed attempts. Please request a new code.");
            }
            throw new BadRequestException("Invalid verification code");
        }

        // Success - consume code
        verificationCodeRepository.delete(vCode);
    }
}
