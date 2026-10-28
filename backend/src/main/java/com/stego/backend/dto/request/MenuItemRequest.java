package com.stego.backend.dto.request;

import com.stego.backend.enums.MenuCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class MenuItemRequest {

    @NotBlank(message = "Item name is required")
    @Size(max = 200)
    private String name;

    @Size(max = 500)
    private String description;

    @NotNull(message = "Category is required")
    private MenuCategory category;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be > 0")
    // price is DECIMAL(10,2); capping a single item keeps 50 lines x quantity 50 inside the order total column
    @DecimalMax(value = "10000.00", message = "Price must be at most 10000")
    @Digits(integer = 5, fraction = 2, message = "Price can have at most 2 decimal places")
    private BigDecimal price;

    @Min(value = 1, message = "Prep time must be at least 1 minute")
    @Max(value = 240, message = "Prep time must be at most 240 minutes")
    private Integer prepTimeMinutes;
    private String imageUrl;
    private Boolean isAvailable;
}
