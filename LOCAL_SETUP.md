# 🚀 Stego Local Setup Guide

Follow these steps to get the **Stego** platform (Backend & Frontend) running on your local machine.

## 📋 Prerequisites
- **Java 17 or 21+** (The project uses modern Spring Boot)
- **Node.js 18+** & **npm**
- **Docker** (for PostgreSQL)

---

## 1. Database Setup
We use Docker to quickly spin up a PostgreSQL instance.

```bash
# In the root 'Stego' directory
docker-compose up -d
```
*This will start a database on port `5432` with user `stego_admin`.*

---

## 2. Backend Configuration
1.  Navigate to the `backend` folder: `cd backend`
2.  Copy `.env.example` to `.env`: `cp .env.example .env`
3.  Open `.env` and fill in your details:
    - `STRIPE_SECRET_KEY`: Get from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys).
    - `JWT_SECRET`: You can use the default or generate a new one.

### Run the Backend
- macOS / Linux (Maven Wrapper):
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

*The backend will be live at `http://localhost:8080`.*

Note: PowerShell may block script execution by default. To allow running `stego_start.ps1` temporarily, use the `-ExecutionPolicy Bypass` flag shown above, or set a persistent policy for the current user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## 3. Frontend Configuration
1.  Navigate to the `frontend` folder: `cd ../frontend`
2.  Copy `.env.example` to `.env.local`: `cp .env.example .env.local`
3.  Open `.env.local` and fill in:
    - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe public key.
    - `NEXT_PUBLIC_API_URL`: `http://localhost:8080`

### Install & Run
```bash
npm install
npm run dev
```
*The frontend will be live at `http://localhost:3000`.*

---

## 🧪 Testing the Flow
1.  **Register**: Go to `http://localhost:3000/register`.
2.  **Verify OTP**: Since we are in dev mode, check the **Backend Console Logs**. You will see the generated OTP printed there (e.g., `OTP Generated for user@example.com: 123456`).
3.  **Order Food**: Add items to your cart. You should see the **Live AI Estimation** pulse in the cart.
4.  **Secure Checkout**: Select 'Card' and complete the payment using the test cards provided by Stripe (e.g., `4242 4242 4242 4242`).

---

## 🔒 Pro-Tip: GitHub Sync
All these changes have been pushed to your repository. If you are on another machine, simply run:
```bash
git pull origin master
```
