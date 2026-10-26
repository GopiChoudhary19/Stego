-- V2__Add_Reviews.sql
-- The Review entity was added after V1, so production (ddl-auto: validate) could not start.

CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    restaurant_id BIGINT NOT NULL REFERENCES restaurants(id),
    order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
