package com.stego.backend.config;

import com.stego.backend.entity.*;
import com.stego.backend.enums.Role;
import com.stego.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@Profile("h2")
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private MenuItemRepository menuItemRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;

        // 1. Create a Default Restaurant Owner
        User owner = User.builder()
                .name("Luigi Rossi")
                .email("owner@stego.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.ROLE_RESTAURANT_OWNER)
                .build();
        owner = userRepository.save(owner);

        // 2. Create Restaurants linked with generated image names
        Restaurant italian = Restaurant.builder()
                .name("Vincenzo's Italian")
                .description("Authentic wood-fired pizzas and homemade pasta.")
                .address("123 Pizza Lane, Food City")
                .imageUrl("/images/restaurant_italian.png")
                .owner(owner)
                .isOpen(true)
                .isActive(true)
                .avgRating(4.8)
                .totalReviews(120)
                .build();

        Restaurant healthy = Restaurant.builder()
                .name("Green Garden")
                .description("Fresh, organic Buddha bowls and healthy salads.")
                .address("456 Leafy Way, Health District")
                .imageUrl("/images/restaurant_healthy.png")
                .owner(owner)
                .isOpen(true)
                .isActive(true)
                .avgRating(4.9)
                .totalReviews(85)
                .build();

        Restaurant burger = Restaurant.builder()
                .name("The Daily Burger")
                .description("Thick, juicy burgers on artisanal brioche buns.")
                .address("789 Grille St, Downtown")
                .imageUrl("/images/restaurant_burger.png")
                .owner(owner)
                .isOpen(true)
                .isActive(true)
                .avgRating(4.6)
                .totalReviews(310)
                .build();

        restaurantRepository.saveAll(List.of(italian, healthy, burger));

        // 3. Add Menu Items
        menuItemRepository.save(MenuItem.builder()
                .restaurant(italian)
                .name("Margherita Pizza")
                .description("Classic San Marzano sauce, fresh mozzarella, and basil.")
                .price(new BigDecimal("14.99"))
                .category("Main")
                .prepTimeMinutes(15)
                .isAvailable(true)
                .build());

        menuItemRepository.save(MenuItem.builder()
                .restaurant(healthy)
                .name("Salmon Buddha Bowl")
                .description("Quinoa, roasted sweet potato, kale, and fresh salmon.")
                .price(new BigDecimal("16.50"))
                .category("Health")
                .prepTimeMinutes(12)
                .isAvailable(true)
                .build());

        menuItemRepository.save(MenuItem.builder()
                .restaurant(burger)
                .name("Double Trouble Cheeseburger")
                .description("Two wagyu patties, aged cheddar, and special sauce.")
                .price(new BigDecimal("18.00"))
                .category("Burgers")
                .prepTimeMinutes(10)
                .isAvailable(true)
                .build());

        System.out.println("✅ H2 Database Seeded with Sample Data");
    }
}
