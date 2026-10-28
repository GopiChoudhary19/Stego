package com.stego.backend.util;

import com.stego.backend.entity.Order;
import com.stego.backend.entity.OrderItem;
import com.stego.backend.entity.Restaurant;
import com.stego.backend.entity.User;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EmailTemplateTest {

    private static final String LINK = "<a href=\"https://evil.example\">Verify your account</a>";

    private Order order() {
        User customer = new User();
        customer.setName(LINK);
        Restaurant restaurant = new Restaurant();
        restaurant.setName("<b>Tasty</b>");
        restaurant.setAddress("<img src=x>");
        Order order = Order.builder().user(customer).restaurant(restaurant).totalAmount(new BigDecimal("80.00")).build();
        order.setId(9L);
        OrderItem item = OrderItem.builder().order(order).itemName("<script>x</script>").quantity(1)
                .priceAtOrder(new BigDecimal("80.00")).build();
        order.setItems(List.of(item));
        return order;
    }

    @Test
    void merchantAlertDoesNotRenderTheCustomersMarkup() {
        String html = EmailTemplate.getMerchantAlertTemplate(order(), "https://stego.example/dashboard");
        assertFalse(html.contains(LINK));
        assertTrue(html.contains("&lt;a href=&quot;https://evil.example&quot;&gt;"));
    }

    @Test
    void confirmationEscapesRestaurantAndItemText() {
        String html = EmailTemplate.getOrderConfirmationTemplate(order(), true);
        assertFalse(html.contains("<script>") || html.contains("<img src=x>") || html.contains("<b>Tasty</b>"));
        assertTrue(html.contains("&lt;script&gt;x&lt;/script&gt;"));
    }

    @Test
    void cashOrderConfirmationDoesNotClaimThePaymentWasMade() {
        assertTrue(EmailTemplate.getOrderConfirmationTemplate(order(), false).contains("TO PAY AT PICKUP"));
        assertFalse(EmailTemplate.getOrderConfirmationTemplate(order(), false).contains("TOTAL PAID"));
        assertTrue(EmailTemplate.getOrderConfirmationTemplate(order(), true).contains("TOTAL PAID"));
    }
}
