package com.stego.backend.dto.request;

import com.stego.backend.enums.PaymentMethod;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OrderRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private OrderRequest requestWithQuantity(int quantity) {
        OrderRequest.OrderItemRequest item = new OrderRequest.OrderItemRequest();
        item.setMenuItemId(1L);
        item.setQuantity(quantity);
        OrderRequest request = new OrderRequest();
        request.setRestaurantId(1L);
        request.setPaymentMethod(PaymentMethod.CARD);
        request.setItems(List.of(item));
        return request;
    }

    @Test
    void positiveQuantityIsAccepted() {
        assertTrue(validator.validate(requestWithQuantity(2)).isEmpty());
    }

    @Test
    void zeroOrNegativeQuantityIsRejected() {
        // a negative line would otherwise subtract from the total and let customers underpay
        assertFalse(validator.validate(requestWithQuantity(0)).isEmpty());
        assertFalse(validator.validate(requestWithQuantity(-3)).isEmpty());
    }

    @Test
    void absurdQuantityIsRejected() {
        assertFalse(validator.validate(requestWithQuantity(10_000)).isEmpty());
    }
}
