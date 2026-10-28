package com.stego.backend.controller;

import com.stego.backend.dto.response.ApiResponse;
import com.stego.backend.entity.User;
import com.stego.backend.exception.BadRequestException;
import com.stego.backend.exception.ResourceNotFoundException;
import com.stego.backend.repository.UserRepository;
import com.stego.backend.security.UserDetailsImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "User profile management")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/me")
    @Operation(summary = "Get current user profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userDetails.getId()));

        Map<String, Object> profile = Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "role", user.getRole().name(),
                "createdAt", user.getCreatedAt().toString()
        );

        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping("/me")
    @Operation(summary = "Update current user profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, String> updates) {

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userDetails.getId()));

        // same rules as registration; a null name used to fail on the NOT NULL column (or Map.of) with a 500
        if (updates.containsKey("name")) {
            String name = updates.get("name") == null ? "" : updates.get("name").trim();
            if (name.isEmpty() || name.length() > 100) {
                throw new BadRequestException("Name must be 1-100 characters");
            }
            user.setName(name);
        }
        if (updates.containsKey("phone")) {
            String phone = updates.get("phone") == null ? "" : updates.get("phone").trim();
            if (!phone.isEmpty() && (phone.length() < 10 || phone.length() > 20)) {
                throw new BadRequestException("Phone must be 10-20 characters");
            }
            user.setPhone(phone.isEmpty() ? null : phone);
        }

        user = userRepository.save(user);

        Map<String, Object> profile = Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "role", user.getRole().name()
        );

        return ResponseEntity.ok(ApiResponse.success("Profile updated", profile));
    }
}
