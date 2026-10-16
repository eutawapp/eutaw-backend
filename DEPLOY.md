# Eutaw Connect — Backend Deployment Guide

## Stack
- **Framework:** NestJS (Node.js / TypeScript)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** OTP via Termii → JWT (15min access + 30d refresh)
- **Payments:** Paystack
- **Push:** Firebase FCM
- **Deploy:** Railway

---

## Step 1 — Set up your .env file

Copy `.env.example` to `.env` and fill in every value:

```
SUPABASE_URL=https://pmppxgsqrjqytwlladbj.supabase.co
SUPABASE_ANON_KEY=<from Supabase dashboard → Project Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Project Settings → API>
JWT_SECRET=<generate with: openssl rand -base64 64>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
TERMII_API_KEY=<from termii.com dashboard>
TERMII_SENDER_ID=Eutaw
PAYSTACK_SECRET_KEY=<from paystack.com dashboard>
PAYSTACK_PUBLIC_KEY=<from paystack.com dashboard>
FIREBASE_PROJECT_ID=<your Firebase project ID>
FIREBASE_ACCESS_TOKEN=<service account bearer token>
APP_URL=https://your-railway-url.up.railway.app
PORT=3000
NODE_ENV=production
```

> ⚠️ NEVER paste your service role key or secret keys in chat or commit them to git.

---

## Step 2 — Run database schema

In Supabase SQL Editor, run these two files in order:
1. `eutaw_schema_v3_part1_tables.sql`
2. `eutaw_schema_v3_part2_rls.sql`

---

## Step 3 — Deploy to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Connect this repo
3. Add all environment variables from your `.env` (Settings → Variables)
4. Railway auto-detects `railway.toml` and builds/deploys

Your API will be live at: `https://<project>.up.railway.app/api/v1`

---

## Step 4 — Set Paystack Webhook

In your Paystack dashboard:
- Webhook URL: `https://<your-railway-url>/api/v1/payments/webhook`
- Events: `charge.success`, `transfer.success`, `transfer.failed`

---

## Step 5 — Connect Flutter apps

Update each Flutter app's API base URL:
```dart
const String kBaseUrl = 'https://<your-railway-url>/api/v1';
```

---

## API Routes Summary

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /health | Public | Health check |
| POST | /auth/send-otp | Public | Send OTP to phone |
| POST | /auth/verify-otp | Public | Verify OTP |
| POST | /auth/register | Public (temp token) | Complete registration |
| POST | /auth/refresh | Public | Refresh JWT tokens |
| GET | /users/me | Any | Get my profile |
| PATCH | /users/me | Any | Update my profile |
| PATCH | /users/me/health | Patient | Update health profile |
| GET | /users/doctors | Any | List available doctors |
| POST | /consultations | Patient | Create consultation |
| GET | /consultations | Patient/Doctor | List my consultations |
| PATCH | /consultations/:id/accept | Doctor | Accept consultation |
| PATCH | /consultations/:id/complete | Doctor | Complete + add notes |
| POST | /consultations/:id/messages | Patient/Doctor | Send chat message |
| POST | /consultations/:id/rate | Patient | Rate doctor |
| POST | /consultations/:id/prescriptions | Doctor | Write prescription |
| POST | /pharmacy/orders | Patient | Place pharmacy order |
| PATCH | /pharmacy/orders/:id/accept | Pharmacist | Claim order |
| PATCH | /pharmacy/orders/:id/status | Pharmacist | Update order status |
| POST | /lab/orders | Patient | Request lab test |
| PATCH | /lab/orders/:id/accept | Lab Tech | Claim lab order |
| PATCH | /lab/orders/:id/status | Lab Tech | Update + upload results |
| POST | /payments/initialize | Any | Start Paystack payment |
| GET | /payments/verify/:ref | Any | Verify payment |
| POST | /payments/webhook | Paystack | Webhook (no auth) |
| GET | /payments/earnings | Practitioner | View earnings |
| POST | /notifications/register-device | Any | Register FCM token |
| GET | /notifications | Any | List my notifications |
| GET | /admin/dashboard | Admin | Platform stats |
| GET | /admin/users | Admin | List all users |
| PATCH | /admin/users/:id/verify | Admin | Verify practitioner |
| GET | /admin/payout-rates | Admin | View payout rates |
| PATCH | /admin/payout-rates/:id | Admin | Update payout rate |
| GET | /admin/settings | Admin | Platform settings |
| PATCH | /admin/settings/:key | Admin | Update setting |
| GET | /admin/payouts | Admin | List payouts |
| PATCH | /admin/payouts/:id/approve | Admin | Approve payout |
| GET | /admin/audit-logs | Admin | View audit trail |
