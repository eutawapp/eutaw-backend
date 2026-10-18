-- ============================================================
-- EUTAW CONNECT — Complete Database Migration
-- Run this in your Supabase SQL editor (Project → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  role          TEXT NOT NULL CHECK (role IN ('patient','doctor','pharmacist','lab_tech','admin')),
  gender        TEXT CHECK (gender IN ('male','female','other')),
  date_of_birth DATE,
  state         TEXT,
  profile_photo_url TEXT,
  password_hash TEXT,
  is_verified   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  onboarding_done BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── OTP LOGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT,
  phone       TEXT,
  otp_hash    TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  attempts    INT DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_otp_logs_email ON otp_logs(email);
CREATE INDEX IF NOT EXISTS idx_otp_logs_phone ON otp_logs(phone);

-- ── PATIENT PROFILES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  blood_group             TEXT,
  genotype                TEXT,
  allergies               TEXT[],
  chronic_conditions      TEXT[],
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  weight_kg               NUMERIC(5,1),
  height_cm               NUMERIC(5,1),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── PRACTITIONER PROFILES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS practitioner_profiles (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialty                 TEXT,
  years_experience          INT,
  bio                       TEXT,
  consultation_fee          NUMERIC(10,2) DEFAULT 3500,
  available_for_consult     BOOLEAN DEFAULT FALSE,
  languages                 TEXT[],
  hospital_name             TEXT,
  hospital_address          TEXT,
  medical_license_number    TEXT,
  license_number            TEXT,
  verification_status       TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  average_rating            NUMERIC(3,1) DEFAULT 0,
  total_reviews             INT DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ── DEVICE SESSIONS (FCM tokens) ──────────────────────────────
CREATE TABLE IF NOT EXISTS device_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  fcm_token    TEXT UNIQUE,
  device_type  TEXT,
  device_model TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  last_seen    TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONSULTATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID REFERENCES users(id),
  doctor_id       UUID REFERENCES users(id),
  symptoms        TEXT NOT NULL,
  severity        TEXT DEFAULT 'mild' CHECK (severity IN ('mild','moderate','severe')),
  type            TEXT DEFAULT 'chat' CHECK (type IN ('chat','video','audio')),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','completed','cancelled')),
  payment_status  TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded')),
  amount          NUMERIC(10,2),
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  doctor_notes    TEXT,
  diagnosis       TEXT,
  follow_up_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);

-- ── CONSULTATION MESSAGES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultation_messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id  UUID REFERENCES consultations(id) ON DELETE CASCADE,
  sender_id        UUID REFERENCES users(id),
  content          TEXT NOT NULL,
  message_type     TEXT DEFAULT 'text' CHECK (message_type IN ('text','image','file','voice')),
  file_url         TEXT,
  is_read          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── PRACTITIONER REVIEWS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS practitioner_reviews (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practitioner_id  UUID REFERENCES users(id),
  patient_id       UUID REFERENCES users(id),
  consultation_id  UUID REFERENCES consultations(id),
  rating           INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── PRESCRIPTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id  UUID REFERENCES consultations(id),
  doctor_id        UUID REFERENCES users(id),
  patient_id       UUID REFERENCES users(id),
  notes            TEXT,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active','filled','expired','cancelled')),
  refills_allowed  INT DEFAULT 0,
  refills_remaining INT DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);

-- ── PRESCRIPTION ITEMS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescription_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id  UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  drug_name        TEXT NOT NULL,
  dosage           TEXT NOT NULL,
  frequency        TEXT NOT NULL,
  duration_days    INT,
  instructions     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── PRESCRIPTION REFILLS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescription_refills (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID REFERENCES users(id),
  prescription_id UUID REFERENCES prescriptions(id),
  delivery_type   TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery','pickup')),
  delivery_address TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','dispensed','delivered','cancelled')),
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refills_patient ON prescription_refills(patient_id);

-- ── PHARMACY ORDERS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID REFERENCES users(id),
  pharmacist_id    UUID REFERENCES users(id),
  prescription_id  UUID REFERENCES prescriptions(id),
  delivery_address TEXT,
  delivery_type    TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery','pickup')),
  total_amount     NUMERIC(10,2) NOT NULL,
  delivery_fee     NUMERIC(10,2) DEFAULT 0,
  payment_status   TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded')),
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','dispatched','delivered','cancelled')),
  tracking_info    TEXT,
  notes            TEXT,
  delivered_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_patient ON pharmacy_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacist ON pharmacy_orders(pharmacist_id);

-- ── PHARMACY ORDER ITEMS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  drug_name   TEXT NOT NULL,
  quantity    INT NOT NULL,
  unit_price  NUMERIC(10,2) NOT NULL,
  subtotal    NUMERIC(10,2) NOT NULL,
  instructions TEXT
);

-- ── LAB ORDERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         UUID REFERENCES users(id),
  lab_tech_id        UUID REFERENCES users(id),
  prescription_id    UUID REFERENCES prescriptions(id),
  test_names         TEXT[] NOT NULL,
  test_amounts       NUMERIC[] NOT NULL,
  total_amount       NUMERIC(10,2) NOT NULL,
  collection_fee     NUMERIC(10,2) DEFAULT 0,
  sample_type        TEXT,
  collection_type    TEXT DEFAULT 'walk_in' CHECK (collection_type IN ('home_collection','walk_in')),
  collection_address TEXT,
  scheduled_at       TIMESTAMPTZ,
  notes              TEXT,
  status             TEXT DEFAULT 'pending' CHECK (status IN ('pending','sample_collection','processing','completed','cancelled')),
  payment_status     TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded')),
  result_summary     TEXT,
  result_file_url    TEXT,
  result_notes       TEXT,
  result_released_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL,
  data        JSONB DEFAULT '{}',
  resource_id TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- ── NOTIFICATION PREFERENCES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  push_consultations    BOOLEAN DEFAULT TRUE,
  push_prescriptions    BOOLEAN DEFAULT TRUE,
  push_lab_results      BOOLEAN DEFAULT TRUE,
  push_orders           BOOLEAN DEFAULT TRUE,
  email_consultations   BOOLEAN DEFAULT FALSE,
  email_prescriptions   BOOLEAN DEFAULT FALSE,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES users(id),
  plan                  TEXT NOT NULL CHECK (plan IN ('basic','standard','premium')),
  billing_cycle         TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  amount                NUMERIC(10,2) NOT NULL,
  status                TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','paused')),
  starts_at             TIMESTAMPTZ DEFAULT NOW(),
  ends_at               TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  payment_reference     TEXT,
  consult_limit         INT,
  consult_used          INT DEFAULT 0,
  pending_downgrade_plan TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- ── TRANSACTIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID REFERENCES users(id),
  resource_type            TEXT NOT NULL,
  resource_id              UUID,
  amount                   NUMERIC(10,2) NOT NULL,
  paystack_reference       TEXT UNIQUE,
  paystack_transaction_id  TEXT,
  status                   TEXT DEFAULT 'pending' CHECK (status IN ('pending','successful','failed','reversed')),
  created_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- ── PAYOUTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practitioner_id  UUID REFERENCES users(id),
  resource_type    TEXT,
  resource_id      UUID,
  amount           NUMERIC(10,2) NOT NULL,
  platform_fee     NUMERIC(10,2) DEFAULT 0,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── PAYOUT RATES (Admin) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_rates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practitioner_role TEXT NOT NULL,
  rate_naira        NUMERIC(10,2) NOT NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO payout_rates (practitioner_role, rate_naira) VALUES
  ('doctor', 2500), ('pharmacist', 800), ('lab_tech', 600)
ON CONFLICT DO NOTHING;

-- ── AUDIT LOGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID REFERENCES users(id),
  actor_role    TEXT,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   UUID,
  patient_id    UUID,
  entry_hash    TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;

-- Drop policies first so re-running is safe
DROP POLICY IF EXISTS "users_own_row"          ON users;
DROP POLICY IF EXISTS "patient_own_profile"    ON patient_profiles;
DROP POLICY IF EXISTS "consultation_participant" ON consultations;
DROP POLICY IF EXISTS "own_notifications"      ON notifications;
DROP POLICY IF EXISTS "prescription_access"    ON prescriptions;
DROP POLICY IF EXISTS "pharmacy_order_access"  ON pharmacy_orders;
DROP POLICY IF EXISTS "lab_order_access"       ON lab_orders;

-- Users can read/write their own row
CREATE POLICY "users_own_row" ON users
  FOR ALL USING (auth.uid() = id);

-- Patients can read/write their own patient_profiles
CREATE POLICY "patient_own_profile" ON patient_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Patients see their own consultations; doctors see theirs
CREATE POLICY "consultation_participant" ON consultations
  FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- Notifications: own only
CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Prescriptions: patient and doctor can see
CREATE POLICY "prescription_access" ON prescriptions
  FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- Pharmacy orders: patient and pharmacist
CREATE POLICY "pharmacy_order_access" ON pharmacy_orders
  FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = pharmacist_id);

-- Lab orders: patient and lab tech
CREATE POLICY "lab_order_access" ON lab_orders
  FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = lab_tech_id);

-- ── STORAGE BUCKET ────────────────────────────────────────────
-- Run this separately in Supabase Dashboard → Storage
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

