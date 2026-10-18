# Eutaw Connect — Backend API Reference

**Base URL:** `https://eutaw-backend-8wak.vercel.app/api/v1`  
**Auth:** All protected endpoints require `Authorization: Bearer <access_token>`

---

## 1. Auth (`/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/send-email-otp` | None | Send 6-digit OTP to patient email |
| POST | `/auth/verify-email-otp` | None | Verify OTP → returns tokens or temp_token |
| POST | `/auth/register-patient` | Bearer `temp_token` | Complete patient signup |
| POST | `/auth/send-otp` | None | Send SMS OTP (practitioners) |
| POST | `/auth/verify-otp` | None | Verify SMS OTP (practitioners) |
| POST | `/auth/register` | None | Register practitioner |
| POST | `/auth/login` | None | Email+password login |
| POST | `/auth/refresh` | None | Refresh access token |
| POST | `/auth/logout` | Bearer | Logout / revoke session |

### Email OTP Flow (Patient)
```
POST /auth/send-email-otp
{ "email": "patient@email.com", "purpose": "signup" }

POST /auth/verify-email-otp
{ "email": "patient@email.com", "otp": "123456", "purpose": "signup" }
→ new user: { "is_new_user": true, "temp_token": "..." }
→ existing:  { "is_new_user": false, "access_token": "...", "refresh_token": "..." }

POST /auth/register-patient
Authorization: Bearer <temp_token>
{ "full_name": "John Doe", "phone": "+2348012345678" }
→ { "access_token": "...", "refresh_token": "...", "user": { ... } }
```

---

## 2. Users/Profile (`/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | Bearer | Get own profile + patient_profile |
| PATCH | `/users/me` | Bearer | Update basic profile (name, phone, state) |
| PATCH | `/users/me/health-profile` | Bearer | Update health data (blood group, allergies…) |
| POST | `/users/me/photo` | Bearer | Upload profile photo (multipart/form-data, field: `photo`) |
| GET | `/users/me/care-journey` | Bearer | Unified timeline of all care events |
| GET | `/users/me/notification-prefs` | Bearer | Get notification preferences |
| PATCH | `/users/me/notification-prefs` | Bearer | Update notification preferences |
| GET | `/users/doctors` | Bearer | List available doctors (`?specialty=&state=&limit=`) |
| GET | `/users/doctors/:id/reviews` | Bearer | Get reviews for a doctor |
| GET | `/users/:id` | Bearer | Get any user profile by ID |

### Screens served:
- `profile_screen.dart` → GET /users/me
- `edit_profile_screen.dart` → PATCH /users/me, POST /users/me/photo
- `care_journey_screen.dart` → GET /users/me/care-journey
- `notification_settings_screen.dart` → GET/PATCH /users/me/notification-prefs

---

## 3. Consultations (`/consultations`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/consultations` | Bearer (patient) | Start new consultation |
| GET | `/consultations` | Bearer | List my consultations |
| GET | `/consultations/:id` | Bearer | Get consultation detail |
| PATCH | `/consultations/:id/accept` | Bearer (doctor) | Doctor accepts |
| PATCH | `/consultations/:id/complete` | Bearer (doctor) | Mark complete |
| POST | `/consultations/:id/messages` | Bearer | Send chat message |
| POST | `/consultations/:id/rate` | Bearer (patient) | Rate doctor |
| POST | `/consultations/:id/prescriptions` | Bearer (doctor) | Create prescription |
| GET | `/consultations/prescriptions/mine` | Bearer (patient) | Get all my prescriptions |

### Screens served:
- `new_consultation_screen.dart` → POST /consultations
- `consultation_list_screen.dart` → GET /consultations
- `chat_screen.dart` → GET /consultations/:id, POST /consultations/:id/messages
- `rating_screen.dart` → POST /consultations/:id/rate
- `doctor_matched_screen.dart`, `waiting_screen.dart` → GET /consultations/:id

---

## 4. Prescriptions (`/consultations/prescriptions/mine`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/consultations/prescriptions/mine` | Bearer (patient) | All prescriptions |
| GET | `/consultations/:id/prescriptions` | Bearer | Prescriptions for a consultation |

### Screens served:
- `prescription_list_screen.dart`, `prescriptions_screen.dart`
- `prescription_detail_screen.dart`

---

## 5. Refills (`/refills`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/refills` | Bearer (patient) | List my refill requests |
| GET | `/refills/eligible` | Bearer (patient) | Prescriptions eligible for refill |
| GET | `/refills/:id` | Bearer (patient) | Get refill detail |
| POST | `/refills` | Bearer (patient) | Request a refill |
| DELETE | `/refills/:id` | Bearer (patient) | Cancel a refill |

### Screens served:
- `refill_screen.dart` → POST /refills, GET /refills/eligible
- `refill_detail_screen.dart` → GET /refills/:id

---

## 6. Lab Orders (`/lab`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/lab/orders` | Bearer (doctor) | Create lab order |
| GET | `/lab/orders` | Bearer | My lab orders |
| GET | `/lab/orders/:id` | Bearer | Lab order detail |
| PATCH | `/lab/orders/:id/accept` | Bearer (lab_tech) | Accept lab order |
| PATCH | `/lab/orders/:id/status` | Bearer (lab_tech) | Update status |

### Screens served:
- `lab_result_screen.dart` → GET /lab/orders/:id
- `records_screen.dart` → GET /lab/orders

---

## 7. Pharmacy Orders (`/pharmacy`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/pharmacy/orders` | Bearer (patient) | Place pharmacy order |
| GET | `/pharmacy/orders` | Bearer | My orders |
| GET | `/pharmacy/orders/:id` | Bearer | Order detail |
| PATCH | `/pharmacy/orders/:id/accept` | Bearer (pharmacist) | Accept order |
| PATCH | `/pharmacy/orders/:id/status` | Bearer (pharmacist) | Update status |

### Screens served:
- `order_screen.dart` → POST /pharmacy/orders
- `order_tracking_screen.dart` → GET /pharmacy/orders/:id
- `pharmacist_order_ready_screen.dart`

---

## 8. Subscriptions (`/subscriptions`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/subscriptions/plans` | None | Available plans + pricing |
| GET | `/subscriptions/mine` | Bearer | My active subscription |
| GET | `/subscriptions/billing` | Bearer | Billing history |
| POST | `/subscriptions` | Bearer | Subscribe to a plan |
| DELETE | `/subscriptions` | Bearer | Cancel subscription |
| PATCH | `/subscriptions/downgrade` | Bearer | Schedule a downgrade |

### Plan prices (₦):

| Plan | Monthly | Yearly | Consults |
|------|---------|--------|----------|
| basic | 3,000 | 30,000 | 2 |
| standard | 6,000 | 60,000 | 5 |
| premium | 12,000 | 120,000 | Unlimited |

### Screens served:
- `subscription_screen.dart` → GET /subscriptions/mine
- `choose_plan_screen.dart` → GET /subscriptions/plans, POST /subscriptions
- `billing_history_screen.dart` → GET /subscriptions/billing
- `downgrade_screen.dart` → PATCH /subscriptions/downgrade
- `subscription_success_screen.dart`, `subscription_expired_screen.dart`

---

## 9. Payments (`/payments`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/initialize` | Bearer | Initialize Paystack payment |
| GET | `/payments/verify/:ref` | Bearer | Verify payment by reference |
| POST | `/payments/webhook` | None | Paystack webhook (HMAC-verified) |
| POST | `/payments/payouts` | Bearer (admin) | Process payout |
| GET | `/payments/earnings` | Bearer (practitioner) | My earnings |

### Screens served:
- `payment_screen.dart` → POST /payments/initialize
- `payment_processing_screen.dart` → GET /payments/verify/:ref
- `payment_failed_screen.dart`

---

## 10. Notifications (`/notifications`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Bearer | My notifications |
| PATCH | `/notifications/:id/read` | Bearer | Mark one as read |
| PATCH | `/notifications/read-all` | Bearer | Mark all as read |
| POST | `/notifications/register-device` | Bearer | Register FCM token |

### Screens served:
- `notifications_screen.dart`
- `notification_settings_screen.dart` → /users/me/notification-prefs (separate)

---

## 11. Search (`/search`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/search?q=<query>` | Bearer | Search across doctors, prescriptions, consultations, lab orders |
| GET | `/search/doctors?q=<query>` | Bearer | Search doctors only |

### Screen served:
- `search_screen.dart`

---

## Token Lifecycle

```
Access token:  15 minutes (stored as ec_access_token)
Refresh token: 30 days    (stored as ec_refresh_token)
Temp token:    30 minutes (stored as ec_temp_token, used only for /auth/register-patient)

On 401 → POST /auth/refresh with { "refresh_token": "..." }
On refresh fail → clear storage, redirect to /welcome
```

---

## Error Format

```json
{
  "statusCode": 400,
  "message": "OTP has expired",
  "error": "Bad Request"
}
```

---

## Setup

1. Copy `.env.example` → `.env` and fill all values
2. Run `supabase_migration.sql` in Supabase SQL Editor
3. Create storage bucket `profile-photos` (public) in Supabase Dashboard → Storage
4. `npm install && npm run start:dev`
5. Deploy: `vercel deploy` (env vars set in Vercel dashboard)
