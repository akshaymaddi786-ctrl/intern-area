# InternArea — Internshala Clone

A full-stack internship and job platform built with **Next.js** (frontend) and **Express + MongoDB** (backend). This project includes advanced features for multi-language support, secure payments, community engagement, and login security.

---

## Project Structure

```
internarea/          → Next.js frontend (port 3000)
internarea/backend/  → Express API server (port 5000)
backend/             → Legacy backend (internships, jobs, applications)
```

---

## Getting Started

### 1. Backend API

```bash
cd internarea/backend
npm install
npm start
```

Server runs at `http://localhost:5000`

### 2. Frontend

```bash
cd internarea
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

**1. Backend Environment**

Navigate to the backend directory, copy the example file, and then fill in your credentials in the new `.env` file.

```bash
cd internarea/backend
cp .env.example .env
```

Optional frontend env in `internarea/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

---

## Platform Features

### 1. Multi-Language Support

**Route:** `/language`

| Language   | Code |
|-----------|------|
| English   | `en` |
| Spanish   | `es` |
| Hindi     | `hi` |
| Portuguese| `pt` |
| Chinese   | `zh` |
| French    | `fr` |

- Users can select their preferred language from the navbar or the dedicated language page.
- All UI strings are translated consistently across pages via `LanguageContext`.
- **French security rule:** Switching to French requires email OTP verification before the change is applied.

**API Endpoints:**
- `GET /api/language/:userId` — Get current language
- `POST /api/language/change` — Change language (non-French)
- `POST /api/language/sendOTP/french` — Send OTP for French
- `POST /api/language/verifyOTP/french` — Verify OTP and apply French

---

### 2. Resume Creation (Premium)

**Route:** `/resume`

- Students fill a form with name, qualifications, experience, personal info, and photo.
- The system generates a professional HTML resume and attaches it to the profile after payment.
- **Premium only:** Requires an active paid subscription (Bronze, Silver, or Gold).
- **Fee:** ₹50 per resume via Razorpay.
- **OTP verification:** OTP is sent to the registered email before Razorpay checkout.
- **Payment window:** Payments blocked outside 10:00 AM – 11:00 AM IST.

**API Endpoints:**
- `POST /api/resume/create`
- `POST /api/resume/sendOTP`
- `POST /api/resume/verifyOTPAndPay`
- `POST /api/resume/paymentCallback`
- `GET /api/resume/preview/:resumeId`
- `GET /api/resume/user/:userId`

---

### 3. Forgot Password

**Route:** `/forgot-password`

- Dedicated page to reset password using registered **email** or **phone number**.
- **Rate limit:** One reset request per day per user. Exceeding this shows:
  > "You can use this option only once per day."
- Includes a **password generator** that creates random passwords using uppercase and lowercase letters only (no numbers or special characters).

**API Endpoints:**
- `POST /api/password/request`
- `POST /api/password/verifyOTP`
- `POST /api/password/reset`
- `POST /api/password/generate-password`

---

### 4. Public Space (Community)

**Route:** `/public-space`

- Upload photos and videos, comment, like, and share content.
- **Posting limits based on friend count:**

| Friends | Daily Post Limit |
|---------|-----------------|
| 0       | Cannot post     |
| 1       | 1 post/day      |
| 2       | 2 posts/day     |
| 3–10    | Same as friend count |
| 10+     | Unlimited       |

**API Endpoints:**
- `POST /api/posts/upload`
- `GET /api/posts/feed`
- `POST /api/posts/:postId/like`
- `POST /api/posts/:postId/comment`
- `POST /api/posts/:postId/share`

---

### 5. Login History & Security

**Route:** `/login-history` (also accessible from Profile)

Tracks for every login attempt:
- Browser type
- Operating system
- Device type (desktop, laptop, mobile)
- IP address

**Security rules:**

| Condition | Rule |
|-----------|------|
| Google Chrome | OTP email verification required before access |
| Mobile device | Login allowed only 10:00 AM – 1:00 PM IST |

**API Endpoints:**
- `POST /api/login-history/track`
- `POST /api/login-history/sendLoginOTP`
- `POST /api/login-history/verifyLoginOTP`
- `GET /api/login-history/history/:userId`

---

### 6. Subscription Plans

**Route:** `/subscription`

| Plan   | Price      | Internship Applications |
|--------|-----------|------------------------|
| Free   | ₹0/month  | 1 per month            |
| Bronze | ₹100/month| 3 per month            |
| Silver | ₹300/month| 5 per month            |
| Gold   | ₹1000/month| Unlimited             |

- Payments via **Razorpay** (Stripe-compatible architecture).
- After successful payment, an **invoice email** is sent with plan details.
- **Payment window:** Only between **10:00 AM – 11:00 AM IST**. Attempts outside this window are blocked.
- OTP verification required before checkout.

**API Endpoints:**
- `GET /api/subscription/plans`
- `GET /api/subscription/current/:userId`
- `POST /api/subscription/sendOTP`
- `POST /api/subscription/verifyOTPAndPay`
- `POST /api/subscription/paymentCallback`
- `GET /api/subscription/history/:userId`

---

## Page Routes Summary

| Route              | Feature                    |
|--------------------|----------------------------|
| `/`                | Home                       |
| `/internship`      | Browse internships         |
| `/job`             | Browse jobs                |
| `/profile`         | User profile & quick links |
| `/language`        | Language settings          |
| `/resume`          | Resume builder             |
| `/forgot-password` | Password reset             |
| `/public-space`    | Community feed             |
| `/login-history`   | Login security log         |
| `/subscription`    | Plan selection & payment   |

---

## Tech Stack

- **Frontend:** Next.js 15, React 19, Redux Toolkit, Tailwind CSS, Firebase Auth
- **Backend:** Express.js, Mongoose, Nodemailer, Razorpay
- **Database:** MongoDB

---

## Due Date

All features listed above are targeted for completion by **7/5/2026**.
