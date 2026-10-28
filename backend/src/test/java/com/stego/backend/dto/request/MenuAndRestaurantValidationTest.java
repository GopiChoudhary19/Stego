package com.stego.backend.dto.request;

import com.stego.backend.enums.MenuCategory;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MenuAndRestaurantValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private MenuItemRequest item(String price, Integer prepTime) {
        MenuItemRequest r = new MenuItemRequest();
        r.setName("Paneer Wrap");
        r.setCategory(MenuCategory.values()[0]);
        r.setPrice(new BigDecimal(price));
        r.setPrepTimeMinutes(prepTime);
        return r;
    }

    @Test
    void ordinaryMenuItemIsValid() {
        assertTrue(validator.validate(item("120.50", 10)).isEmpty());
        assertTrue(validator.validate(item("120", null)).isEmpty(), "prep time is optional and defaults to 15");
    }

    @Test
    void priceMustFitTheMoneyColumns() {
        assertFalse(validator.validate(item("10000.01", 10)).isEmpty());
        assertFalse(validator.validate(item("99.999", 10)).isEmpty(), "sub-paisa prices would be rounded by the database");
    }

    @Test
    void prepTimeMustBePositiveAndSane() {
        assertFalse(validator.validate(item("100", 0)).isEmpty());
        assertFalse(validator.validate(item("100", -5)).isEmpty(), "a negative prep time made wait estimates negative");
        assertFalse(validator.validate(item("100", 100000)).isEmpty());
    }

    @Test
    void coordinatesMustBeOnEarth() {
        RestaurantRequest r = new RestaurantRequest();
        r.setName("Flow Kitchen");
        r.setAddress("1 Test Street");
        r.setLatitude(27.3);
        r.setLongitude(88.6);
        assertTrue(validator.validate(r).isEmpty());
        r.setLatitude(127.3);
        assertFalse(validator.validate(r).isEmpty());
        r.setLatitude(27.3);
        r.setLongitude(-200.0);
        assertFalse(validator.validate(r).isEmpty());
    }
}
