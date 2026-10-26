package com.stego.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Step 1 of sign-in: the password was accepted and a one-time code was emailed. No tokens yet. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OtpChallengeResponse {
    private String email;
    private boolean otpRequired;
}
