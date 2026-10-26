package com.stego.backend.service;

import com.stego.backend.dto.request.ReviewRequest;
import com.stego.backend.dto.response.ReviewResponse;
import com.stego.backend.entity.Order;
import com.stego.backend.entity.Restaurant;
import com.stego.backend.entity.Review;
import com.stego.backend.entity.User;
import com.stego.backend.enums.OrderStatus;
import com.stego.backend.exception.BadRequestException;
import com.stego.backend.exception.ResourceNotFoundException;
import com.stego.backend.repository.OrderRepository;
import com.stego.backend.repository.RestaurantRepository;
import com.stego.backend.repository.ReviewRepository;
import com.stego.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Transactional
    public ReviewResponse createReview(Long userId, ReviewRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", request.getOrderId()));

        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("You can only review your own orders");
        }

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new BadRequestException("You can only review completed orders");
        }

        if (reviewRepository.existsByOrderId(order.getId())) {
            throw new BadRequestException("You have already reviewed this order");
        }

        Review review = Review.builder()
                .user(user)
                .restaurant(order.getRestaurant())
                .order(order)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        review = reviewRepository.save(review);

        // Update restaurant avg rating
        updateRestaurantRating(order.getRestaurant().getId());

        return mapToResponse(review);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getRestaurantReviews(Long restaurantId) {
        return reviewRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getUserReviews(Long userId) {
        return reviewRepository.findByUserId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private void updateRestaurantRating(Long restaurantId) {
        Double avgRating = reviewRepository.findAverageRatingByRestaurant(restaurantId);
        long count = reviewRepository.countByRestaurantId(restaurantId);

        Restaurant restaurant = restaurantRepository.findById(restaurantId).orElse(null);
        if (restaurant != null) {
            restaurant.setAvgRating(avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0);
            restaurant.setTotalReviews((int) count);
            restaurantRepository.save(restaurant);
        }
    }

    private ReviewResponse mapToResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .userId(review.getUser().getId())
                .userName(review.getUser().getName())
                .restaurantId(review.getRestaurant().getId())
                .orderId(review.getOrder().getId())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
