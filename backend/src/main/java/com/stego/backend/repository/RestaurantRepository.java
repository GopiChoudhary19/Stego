package com.stego.backend.repository;

import com.stego.backend.entity.Restaurant;
import com.stego.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    List<Restaurant> findByOwner(User owner);

    List<Restaurant> findByIsActiveTrue();

    // the cosine is clamped to [-1, 1]: rounding can push it to 1.0000000000000002 for a point at (or next to)
    // a restaurant, and Postgres' acos rejects that with "input is out of range", failing the whole search
    @Query(value = """
            SELECT r.* FROM restaurants r
            WHERE r.is_active = true
              AND (6371 * acos(LEAST(1.0, GREATEST(-1.0,
                  cos(radians(:lat)) * cos(radians(r.latitude))
                * cos(radians(r.longitude) - radians(:lng))
                + sin(radians(:lat)) * sin(radians(r.latitude))
              )))) <= :radiusKm
            ORDER BY (6371 * acos(LEAST(1.0, GREATEST(-1.0,
                  cos(radians(:lat)) * cos(radians(r.latitude))
                * cos(radians(r.longitude) - radians(:lng))
                + sin(radians(:lat)) * sin(radians(r.latitude))
              )))) ASC
            """, nativeQuery = true)
    List<Restaurant> findNearbyRestaurants(
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("radiusKm") double radiusKm
    );

    @Query("SELECT r FROM Restaurant r WHERE LOWER(r.name) LIKE LOWER(CONCAT('%', :query, '%')) AND r.isActive = true")
    List<Restaurant> searchByName(@Param("query") String query);
}
