package com.stego.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalTime;

@Data
public class RestaurantRequest {

    @NotBlank(message = "Restaurant name is required")
    @Size(max = 200)
    private String name;

    @Size(max = 1000)
    private String description;

    @NotBlank(message = "Address is required")
    @Size(max = 500)
    private String address;

    @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0")
    private Double latitude;
    @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0")
    private Double longitude;
    private String phone;
    private String imageUrl;
    private LocalTime openingTime;
    private LocalTime closingTime;
}
