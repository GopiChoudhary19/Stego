package com.stego.backend.service;

import com.stego.backend.dto.request.RestaurantRequest;
import com.stego.backend.dto.response.RestaurantResponse;
import com.stego.backend.entity.Restaurant;
import com.stego.backend.entity.User;
import com.stego.backend.exception.ResourceNotFoundException;
import com.stego.backend.exception.UnauthorizedException;
import com.stego.backend.repository.RestaurantRepository;
import com.stego.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RestaurantService {

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public RestaurantResponse createRestaurant(Long ownerId, RestaurantRequest request) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", ownerId));

        Restaurant restaurant = Restaurant.builder()
                .owner(owner)
                .name(request.getName())
                .description(request.getDescription())
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .phone(request.getPhone())
                .imageUrl(request.getImageUrl())
                .openingTime(request.getOpeningTime())
                .closingTime(request.getClosingTime())
                .build();

        restaurant = restaurantRepository.save(restaurant);
        return mapToResponse(restaurant);
    }

    @Transactional
    public RestaurantResponse updateRestaurant(Long restaurantId, Long ownerId, RestaurantRequest request) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant", "id", restaurantId));

        if (!restaurant.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedException("You can only edit your own restaurants");
        }

        restaurant.setName(request.getName());
        restaurant.setDescription(request.getDescription());
        restaurant.setAddress(request.getAddress());
        restaurant.setLatitude(request.getLatitude());
        restaurant.setLongitude(request.getLongitude());
        restaurant.setPhone(request.getPhone());
        restaurant.setImageUrl(request.getImageUrl());
        restaurant.setOpeningTime(request.getOpeningTime());
        restaurant.setClosingTime(request.getClosingTime());

        restaurant = restaurantRepository.save(restaurant);
        return mapToResponse(restaurant);
    }

    public RestaurantResponse getRestaurant(Long id) {
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant", "id", id));
        return mapToResponse(restaurant);
    }

    public List<RestaurantResponse> getAllRestaurants() {
        return restaurantRepository.findByIsActiveTrue().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<RestaurantResponse> getNearbyRestaurants(double lat, double lng, double radiusKm) {
        return restaurantRepository.findNearbyRestaurants(lat, lng, radiusKm).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<RestaurantResponse> searchRestaurants(String query) {
        // '%' and '_' are LIKE wildcards: unescaped, a search for "_" or "%" returned every restaurant
        String literal = query.trim().replace("!", "!!").replace("%", "!%").replace("_", "!_");
        return restaurantRepository.searchByName(literal).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<RestaurantResponse> getOwnerRestaurants(Long ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", ownerId));
        return restaurantRepository.findByOwner(owner).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void toggleOpen(Long restaurantId, Long ownerId, boolean isOpen) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant", "id", restaurantId));
        if (!restaurant.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedException("You can only manage your own restaurants");
        }
        restaurant.setIsOpen(isOpen);
        restaurantRepository.save(restaurant);
    }

    private RestaurantResponse mapToResponse(Restaurant r) {
        return RestaurantResponse.builder()
                .id(r.getId())
                .name(r.getName())
                .description(r.getDescription())
                .address(r.getAddress())
                .latitude(r.getLatitude())
                .longitude(r.getLongitude())
                .phone(r.getPhone())
                .imageUrl(r.getImageUrl())
                .openingTime(r.getOpeningTime())
                .closingTime(r.getClosingTime())
                .isOpen(r.getIsOpen())
                .avgRating(r.getAvgRating())
                .totalReviews(r.getTotalReviews())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
