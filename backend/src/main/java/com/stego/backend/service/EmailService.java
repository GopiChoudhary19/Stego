package com.stego.backend.service;

import com.stego.backend.entity.Order;
import com.stego.backend.util.EmailTemplate;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@stego.com}")
    private String fromEmail;

    @Async
    public void sendEmail(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true);

            mailSender.send(message);
            logger.info("Email sent successfully to {}", to);
        } catch (MessagingException e) {
            logger.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    public void sendOtpEmail(String email, String otp) {
        String subject = "Stego — Your Verification Code";
        String body = EmailTemplate.getOtpTemplate(otp);
        sendEmail(email, subject, body);
    }

    public void sendOrderConfirmation(Order order) {
        String subject = "Stego — Order Confirmed #" + order.getId();
        String body = EmailTemplate.getOrderConfirmationTemplate(order);
        sendEmail(order.getUser().getEmail(), subject, body);
    }

    public void sendMerchantAlert(Order order) {
        String subject = "🍱 Stego — New Order Alert #" + order.getId();
        String body = EmailTemplate.getMerchantAlertTemplate(order);
        sendEmail(order.getRestaurant().getOwner().getEmail(), subject, body);
    }
}
