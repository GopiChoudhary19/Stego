package com.stego.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailOtpProvider implements OtpProvider {

    private static final Logger logger = LoggerFactory.getLogger(EmailOtpProvider.class);

    @Autowired
    private EmailService emailService;

    // only enabled in the in-memory h2 dev profile, where no mail server is configured
    @Value("${app.otp.log-codes:false}")
    private boolean logCodes;

    @Override
    public void sendOtp(String email, String otp) {
        if (logCodes) {
            logger.warn("DEV ONLY - verification code for {}: {}", email, otp);
        }
        emailService.sendOtpEmail(email, otp);
    }
}
