package com.stego.backend.util;

import com.stego.backend.entity.Order;
import com.stego.backend.entity.OrderItem;
import java.time.format.DateTimeFormatter;

public class EmailTemplate {

    private static final String BRAND_COLOR = "#ff5a1f";
    private static final String BG_COLOR = "#f8f9fa";

    public static String getOtpTemplate(String otp) {
        return "<html><body style='font-family: sans-serif; background-color: " + BG_COLOR + "; padding: 40px;'>" +
                "<div style='max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);'>" +
                "  <h2 style='color: " + BRAND_COLOR + "; margin-bottom: 5px;'>Stego</h2>" +
                "  <p style='color: #6c757d; font-size: 14px; margin-top: 0;'>Your Verification Code</p>" +
                "  <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>" +
                "  <p>Welcome to Stego! Your one-time password (OTP) is:</p>" +
                "  <div style='background: " + BRAND_COLOR + "10; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;'>" +
                "    <h1 style='color: " + BRAND_COLOR + "; letter-spacing: 5px; margin: 0;'>" + otp + "</h1>" +
                "  </div>" +
                "  <p style='color: #6c757d; font-size: 12px;'>This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>" +
                "  <p style='font-weight: bold; margin-top: 30px;'>Save Time, Eat & Go.</p>" +
                "</div></body></html>";
    }

    public static String getOrderConfirmationTemplate(Order order) {
        StringBuilder itemsHtml = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            itemsHtml.append("<tr>")
                    .append("<td style='padding: 10px 0; border-bottom: 1px solid #f1f1f1;'>")
                    .append(item.getQuantity()).append("x ").append(item.getItemName())
                    .append("</td>")
                    .append("<td style='padding: 10px 0; border-bottom: 1px solid #f1f1f1; text-align: right;'>")
                    .append("₹").append(item.getPriceAtOrder().multiply(java.math.BigDecimal.valueOf(item.getQuantity())))
                    .append("</td>")
                    .append("</tr>");
        }

        String readyTime = order.getEstimatedReadyTime() != null 
                ? order.getEstimatedReadyTime().format(DateTimeFormatter.ofPattern("hh:mm a")) 
                : "N/A";

        return "<html><body style='font-family: sans-serif; background-color: " + BG_COLOR + "; padding: 20px;'>" +
                "<div style='max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 24px;'>" +
                "  <div style='text-align: center; margin-bottom: 30px;'>" +
                "    <h2 style='color: " + BRAND_COLOR + "; margin: 0;'>Stego</h2>" +
                "    <p style='color: #28a745; font-weight: bold;'>ORDER CONFIRMED</p>" +
                "  </div>" +
                "  <p>Hi " + order.getUser().getName() + ",</p>" +
                "  <p>Your order from <strong>" + order.getRestaurant().getName() + "</strong> has been confirmed!</p>" +
                "  <div style='background: #fff9f6; border: 1px dashed " + BRAND_COLOR + "; padding: 15px; border-radius: 12px; margin: 20px 0; text-align: center;'>" +
                "    <p style='margin: 0; font-size: 12px; color: " + BRAND_COLOR + "; font-weight: bold;'>ARRIVE FOR PICKUP BY</p>" +
                "    <h2 style='margin: 5px 0; color: #333;'>" + readyTime + "</h2>" +
                "  </div>" +
                "  <table style='width: 100%; border-collapse: collapse; margin-bottom: 20px;'>" +
                "    <thead><tr><th style='text-align: left; color: #6c757d; font-size: 12px;'>ITEM</th><th style='text-align: right; color: #6c757d; font-size: 12px;'>PRICE</th></tr></thead>" +
                "    <tbody>" + itemsHtml.toString() + "</tbody>" +
                "  </table>" +
                "  <div style='display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 2px solid #333; pt: 15px;'>" +
                "    <span>TOTAL PAID</span>" +
                "    <span style='color: " + BRAND_COLOR + ";'>₹" + order.getTotalAmount() + "</span>" +
                "  </div>" +
                "  <p style='margin-top: 30px; font-size: 13px; color: #6c757d; text-align: center;'>" +
                "    Restaurant Address: " + order.getRestaurant().getAddress() + "<br>Order ID: #" + order.getId() +
                "  </p>" +
                "</div></body></html>";
    }

    public static String getMerchantAlertTemplate(Order order) {
        return "<html><body style='font-family: sans-serif; background-color: #333; padding: 20px;'>" +
                "<div style='max-width: 500px; margin: auto; background: white; padding: 25px; border-radius: 15px;'>" +
                "  <h3 style='color: #333; margin-top: 0;'>New Order Received! 🍱</h3>" +
                "  <p>You have a new incoming order from <strong>" + order.getUser().getName() + "</strong>.</p>" +
                "  <div style='background: #f1f1f1; padding: 15px; border-radius: 8px; margin: 15px 0;'>" +
                "    <p style='margin: 0;'><strong>Order ID:</strong> #" + order.getId() + "</p>" +
                "    <p style='margin: 5px 0;'><strong>Items:</strong> " + order.getItems().size() + "</p>" +
                "    <p style='margin: 0;'><strong>Total:</strong> ₹" + order.getTotalAmount() + "</p>" +
                "  </div>" +
                "  <p>Please log in to your dashboard to <strong>ACCEPT</strong> and begin preparation.</p>" +
                "  <a href='http://localhost:3000/dashboard' style='display: inline-block; background: #333; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;'>Open Dashboard</a>" +
                "</div></body></html>";
    }
}
