# Stego — Smart Food Pre-Ordering Platform

> **Save Time, Eat & Go** — Reduce waiting time in restaurants by allowing users to pre-order food and pick it up when they arrive.

![CI](https://github.com/GopiChoudhary19/Stego/actions/workflows/ci.yml/badge.svg)

---

## 🏗️ Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Backend   | Spring Boot 3.4, Java 17, Spring Security      |
| Database  | PostgreSQL 16, Flyway migrations               |
| Auth      | JWT (access + refresh tokens), BCrypt, email OTP |
| Payments  | Stripe Payment Intents + signed webhooks       |
| Realtime  | WebSocket (STOMP + SockJS)                     |
| API Docs  | Swagger / OpenAPI 3 (springdoc)                |
| Frontend  | Next.js 16, React 19, Tailwind CSS, Zustand    |
| DevOps    | Docker, GitHub Actions, Render blueprint       |

---

## 📁 Project Structure

```
backend/
├── src/main/java/com/stego/backend/
│   ├── config/          # Security, WebSocket config
│   ├── controller/      # REST API controllers
│   ├── dto/             # Request/Response DTOs
│   ├── entity/          # JPA domain entities
│   ├── enums/           # Role, OrderStatus, etc.
│   ├── exception/       # Global exception handling
│   ├── repository/      # Spring Data JPA repositories
│   ├── security/        # JWT utilities, filters
│   └── service/         # Business logic
├── src/main/resources/
│   └── application.yml
├── Dockerfile
├── pom.xml
└── .env.example
```

---

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Maven 3.9+
- Docker & Docker Compose

### 1. Configure secrets
```bash
cp .env.example .env              # docker compose reads this file
cp backend/.env.example backend/.env
```
Set `DB_PASSWORD` and `JWT_SECRET` (generate one with `openssl rand -base64 32`). There are no built-in
defaults: the app and `docker compose` refuse to start without them. Stripe and SMTP settings are optional
for local runs; Stripe webhooks are rejected until `STRIPE_WEBHOOK_SECRET` is set.

For a quick look without PostgreSQL, run the backend with the in-memory profile:
`./mvnw spring-boot:run -Dspring-boot.run.profiles=h2`.

### 2. Start PostgreSQL
```bash
docker compose up -d stego-db
```

### 3. Run the Backend
Export the variables from `backend/.env` into your shell first (Spring does not read `.env` files).
- macOS / Linux:
```bash
cd backend
./mvnw spring-boot:run
```

- Windows (PowerShell - recommended):
```powershell
powershell -ExecutionPolicy Bypass -File .\stego_start.ps1
```

- Windows (CMD):
```
cd backend
mvnw.cmd spring-boot:run
```

### 4. Open Swagger UI
```
http://localhost:8080/swagger-ui.html
```

---

## 🔑 API Endpoints

### Authentication
| Method | Endpoint             | Description              | Auth |
|--------|----------------------|--------------------------|------|
| POST   | `/api/auth/register` | Register user/owner      | ❌   |
| POST   | `/api/auth/login`    | Login & get JWT tokens   | ❌   |
| POST   | `/api/auth/refresh`  | Refresh access token     | ❌   |

### Users
| Method | Endpoint         | Description        | Auth |
|--------|------------------|--------------------|------|
| GET    | `/api/users/me`  | Get current profile| ✅   |
| PUT    | `/api/users/me`  | Update profile     | ✅   |

### Restaurants
| Method | Endpoint                       | Description                  | Auth    |
|--------|--------------------------------|------------------------------|---------|
| GET    | `/api/restaurants`             | List all restaurants         | ❌      |
| GET    | `/api/restaurants/{id}`        | Get restaurant details       | ❌      |
| GET    | `/api/restaurants/nearby`      | Find nearby (lat, lng)       | ❌      |
| GET    | `/api/restaurants/search`      | Search by name               | ❌      |
| POST   | `/api/restaurants`             | Create restaurant            | 🔒 Owner|
| PUT    | `/api/restaurants/{id}`        | Update restaurant            | 🔒 Owner|
| PATCH  | `/api/restaurants/{id}/toggle` | Toggle open/closed           | 🔒 Owner|

### Menu Items
| Method | Endpoint                                    | Description        | Auth    |
|--------|---------------------------------------------|--------------------|---------|
| GET    | `/api/restaurants/{id}/menu`                | Get restaurant menu| ❌      |
| GET    | `/api/restaurants/{id}/menu/filter`         | Filter by category | ❌      |
| POST   | `/api/restaurants/{id}/menu`                | Add menu item      | 🔒 Owner|
| PUT    | `/api/menu/{itemId}`                        | Update menu item   | 🔒 Owner|
| DELETE | `/api/menu/{itemId}`                        | Delete menu item   | 🔒 Owner|

### Orders
| Method | Endpoint                                | Description              | Auth    |
|--------|-----------------------------------------|--------------------------|---------|
| POST   | `/api/orders`                           | Create pre-order         | ✅      |
| GET    | `/api/orders`                           | User order history       | ✅      |
| GET    | `/api/orders/live`                      | Active orders only       | ✅      |
| GET    | `/api/orders/{id}`                      | Order details            | ✅      |
| POST   | `/api/orders/{id}/cancel`               | Cancel order             | ✅      |
| GET    | `/api/orders/restaurant/{id}`           | Restaurant orders        | 🔒 Owner|
| GET    | `/api/orders/restaurant/{id}/queue`     | Active order queue       | 🔒 Owner|
| PATCH  | `/api/orders/{id}/accept`               | Accept order             | 🔒 Owner|
| PATCH  | `/api/orders/{id}/prepare`              | Mark as preparing        | 🔒 Owner|
| PATCH  | `/api/orders/{id}/ready`                | Mark as ready            | 🔒 Owner|
| PATCH  | `/api/orders/{id}/complete`             | Mark as completed        | 🔒 Owner|

### Reviews
| Method | Endpoint                          | Description            | Auth |
|--------|-----------------------------------|------------------------|------|
| POST   | `/api/reviews`                    | Submit review          | ✅   |
| GET    | `/api/reviews/restaurant/{id}`    | Restaurant reviews     | ❌   |
| GET    | `/api/reviews/my`                 | User's own reviews     | ✅   |

---

## 📊 Database Schema

```
Users ──┐
        ├──< Restaurants ──< Menu_Items
        │        │
        ├──< Orders ──< Order_Items
        │     │  │
        │     │  └──── Payments
        │     │
        └──< Reviews
```

### Key Indexes
- `users.email` (unique)
- `restaurants.owner_id`, `restaurants.lat/lng`
- `orders.user_id`, `orders.restaurant_id`, `orders.status`, `orders.scheduled_pickup_time`
- `payments.order_id`
- `reviews.restaurant_id`, `reviews.order_id` (unique)

---

## 🧠 Queue & Prep Time Logic

**Heuristic formula:**
```
estimated_minutes = max_item_prep_time + (active_orders_in_queue × 3 min)
```

This simple model powers the "Order now to save time" feature and will later be upgraded to an ML model.

---

## 🔒 Security Features
- BCrypt password hashing
- JWT access tokens (15 min) + database-backed refresh tokens (7 days)
- Role-based access control (USER, RESTAURANT_OWNER, ADMIN)
- Per-email rate limiting on login (10 attempts/minute via Bucket4j)
- CORS configured for frontend origins

---

## 📡 Real-Time Updates
WebSocket endpoints (STOMP over SockJS):
- `/topic/restaurant/{id}/orders` — Restaurant receives new/updated orders
- `/topic/user/{id}/orders` — User receives order status changes

---

## 🧪 Tests

```bash
cd backend
./mvnw verify        # needs PostgreSQL; set DB_HOST / DB_PASSWORD as in CI
```

- Unit tests for order payment handling (duplicate and late Stripe events), the Stripe webhook signature
  check and the prep-time estimator.
- An application-context test that starts the app against PostgreSQL with Flyway migrations and
  `ddl-auto: validate`, exactly as production does, so a migration that drifts from the entities fails CI.

CI runs the backend tests against a PostgreSQL service, lints and builds the frontend, and builds both Docker
images. The deploy workflow is manual (`workflow_dispatch`).

---

## 🐳 Docker Deployment

```bash
# Build & run everything (database, backend, frontend) using the values in .env
docker compose up -d --build
```

On Render, `render.yaml` provisions the database and generates `JWT_SECRET`; add the Stripe and SMTP
variables in the dashboard.
