-- ============================================================
-- TouchPoints Database Migration
-- Full Schema v1.0
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "earthdistance" CASCADE;

-- ============================================================
-- DOMAIN 1: IDENTITY & AUTH
-- ============================================================

-- users: FK to active_profile_id added after profiles is created
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR(255) UNIQUE NOT NULL,
  phone                 VARCHAR(20) UNIQUE,
  password_hash         TEXT NOT NULL,
  pending_referral_code VARCHAR(30),
  active_profile_id     UUID,                        -- FK constraint added below after profiles
  is_verified           BOOLEAN DEFAULT FALSE,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- -------------------------------------------------------

CREATE TABLE profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_type   VARCHAR(20) NOT NULL CHECK (profile_type IN ('personal', 'business', 'admin')),
  display_name   VARCHAR(100) NOT NULL,
  avatar_url     TEXT,
  bio            TEXT,
  city           VARCHAR(100) NOT NULL,
  state          VARCHAR(100) NOT NULL,
  country        VARCHAR(100) NOT NULL DEFAULT 'IN',
  latitude       DECIMAL(10, 8),
  longitude      DECIMAL(11, 8),
  location_label TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_type ON profiles(profile_type);
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_location ON profiles USING GIST (ll_to_earth(latitude, longitude));

-- Circular FK: users.active_profile_id → profiles.id
-- Defaults to personal profile set during registration transaction
ALTER TABLE users
  ADD CONSTRAINT fk_users_active_profile
  FOREIGN KEY (active_profile_id)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

CREATE INDEX idx_users_active_profile ON users(active_profile_id);

-- -------------------------------------------------------

CREATE TABLE refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  device_info  TEXT,
  ip_address   INET,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- -------------------------------------------------------

CREATE TABLE otp_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  identifier  VARCHAR(255) NOT NULL,
  otp_hash    TEXT NOT NULL,
  purpose     VARCHAR(30) NOT NULL CHECK (purpose IN (
                'email_verify', 'phone_verify', 'password_reset', 'login_otp'
              )),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_identifier ON otp_verifications(identifier);
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);

-- ============================================================
-- DOMAIN 2: INTERESTS (needed before profiles join table)
-- ============================================================

CREATE TABLE interest_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) UNIQUE NOT NULL,
  icon       VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE
);

-- -------------------------------------------------------

CREATE TABLE profile_interests (
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES interest_categories(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (profile_id, interest_id)
);

CREATE INDEX idx_profile_interests_profile  ON profile_interests(profile_id);
CREATE INDEX idx_profile_interests_interest ON profile_interests(interest_id);

-- ============================================================
-- DOMAIN 3: BUSINESSES
-- ============================================================

CREATE TABLE business_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) UNIQUE NOT NULL,
  icon       VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE
);

-- -------------------------------------------------------

CREATE TABLE businesses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES business_categories(id) ON DELETE SET NULL,
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(200) UNIQUE NOT NULL,
  description  TEXT,
  logo_url     TEXT,
  cover_url    TEXT,
  address      TEXT,
  city         VARCHAR(100),
  state        VARCHAR(100),
  country      VARCHAR(100) DEFAULT 'IN',
  latitude     DECIMAL(10, 8),
  longitude    DECIMAL(11, 8),
  phone        VARCHAR(20),
  email        VARCHAR(255),
  website      VARCHAR(500),
  is_verified  BOOLEAN DEFAULT FALSE,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_businesses_profile_id ON businesses(profile_id);
CREATE INDEX idx_businesses_slug       ON businesses(slug);
CREATE INDEX idx_businesses_category   ON businesses(category_id);
CREATE INDEX idx_businesses_city       ON businesses(city);
CREATE INDEX idx_businesses_location   ON businesses USING GIST (ll_to_earth(latitude, longitude));
-- -------------------------------------------------------
ALTER TABLE businesses
  ADD COLUMN business_type VARCHAR(20) NOT NULL DEFAULT 'incentivised'
    CHECK (business_type IN ('goodwill', 'incentivised')),
  ADD COLUMN inhouse_referral BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN inhouse_referral_url TEXT;

  ALTER TABLE businesses
  ADD CONSTRAINT chk_inhouse_referral_url
    CHECK (inhouse_referral = false OR inhouse_referral_url IS NOT NULL);
 ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- -------------------------------------------------------

CREATE TABLE business_hours (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time    TIME,
  close_time   TIME,
  is_closed    BOOLEAN DEFAULT FALSE,

  UNIQUE(business_id, day_of_week)
);

CREATE INDEX idx_business_hours_business_id ON business_hours(business_id);

-- ============================================================
-- DOMAIN 4: PLATFORM SUBSCRIPTIONS (Business → Plan)
-- ============================================================

CREATE TABLE subscription_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  price_monthly     DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_yearly      DECIMAL(10, 2),
  max_offers        INT DEFAULT 3,
  max_events        INT DEFAULT 2,
  can_broadcast     BOOLEAN DEFAULT FALSE,
  can_run_rewards   BOOLEAN DEFAULT FALSE,
  priority_listing  BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------

CREATE TABLE business_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id      UUID NOT NULL REFERENCES subscription_plans(id),
  status       VARCHAR(20) DEFAULT 'active' CHECK (status IN (
                 'active', 'cancelled', 'expired', 'trial'
               )),
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  auto_renew   BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_biz_subs_business_id ON business_subscriptions(business_id);
CREATE INDEX idx_biz_subs_status      ON business_subscriptions(status);

ALTER TABLE business_subscriptions
  ADD CONSTRAINT uq_business_subscriptions_business_id 
  UNIQUE (business_id);

-- ============================================================
-- DOMAIN 5: CUSTOMER SUBSCRIPTIONS (Customer → Business)
-- ============================================================

CREATE TABLE subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  subscribed_at    TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at  TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT TRUE,

  UNIQUE(profile_id, business_id)
);

CREATE INDEX idx_subscriptions_profile_id ON subscriptions(profile_id);
CREATE INDEX idx_subscriptions_business_id ON subscriptions(business_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(business_id, is_active);

-- Rating given by a customer to a business
CREATE TABLE business_ratings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One rating per customer profile per business
  CONSTRAINT uq_business_rating UNIQUE (business_id, profile_id)
);

CREATE INDEX idx_business_ratings_business_id ON business_ratings(business_id);
CREATE INDEX idx_business_ratings_profile_id  ON business_ratings(profile_id);

-- ============================================================
-- DOMAIN 6: OFFERS & EVENTS
-- ============================================================

CREATE TABLE offers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title              VARCHAR(200) NOT NULL,
  description        TEXT,
  image_url          TEXT,
  discount_type      VARCHAR(20) CHECK (discount_type IN ('percent', 'flat', 'bogo', 'freebie')),
  discount_value     DECIMAL(10, 2),
  original_price     DECIMAL(10, 2),
  terms              TEXT,
  status             VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled')),
  starts_at          TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ,
  max_redemptions    INT,
  total_redemptions  INT DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_business_id ON offers(business_id);
CREATE INDEX idx_offers_status      ON offers(status);
CREATE INDEX idx_offers_expires     ON offers(expires_at);

-- -------------------------------------------------------

CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  image_url     TEXT,
  location      TEXT,
  latitude      DECIMAL(10, 8),
  longitude     DECIMAL(11, 8),
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ,
  max_attendees INT,
  status        VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN (
                  'upcoming', 'ongoing', 'past', 'cancelled'
                )),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_business_id ON events(business_id);
CREATE INDEX idx_events_starts_at   ON events(starts_at);
CREATE INDEX idx_events_status      ON events(status);

-- -------------------------------------------------------

CREATE TABLE event_rsvps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      VARCHAR(20) DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, profile_id)
);

CREATE INDEX idx_rsvps_event_id   ON event_rsvps(event_id);
CREATE INDEX idx_rsvps_profile_id ON event_rsvps(profile_id);

-- ============================================================
-- DOMAIN 7: POINTS & REWARDS
-- ============================================================

CREATE TABLE reward_config (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id            UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  points_per_visit       INT DEFAULT 10,
  points_per_rupee       DECIMAL(10, 4) DEFAULT 1,
  referral_bonus_points  INT DEFAULT 50,
  welcome_bonus_points   INT DEFAULT 25,
  points_validity_days   INT DEFAULT 365,
  is_active              BOOLEAN DEFAULT TRUE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------

CREATE TABLE reward_tiers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  min_points   INT NOT NULL,
  max_points   INT,
  color        VARCHAR(20),
  icon         VARCHAR(50),
  perks        TEXT,
  sort_order   INT DEFAULT 0
);

CREATE INDEX idx_reward_tiers_business_id ON reward_tiers(business_id);

-- -------------------------------------------------------

CREATE TABLE rewards_catalog (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name               VARCHAR(200) NOT NULL,
  description        TEXT,
  image_url          TEXT,
  points_required    INT NOT NULL,
  quantity_available INT,
  quantity_redeemed  INT DEFAULT 0,
  valid_until        TIMESTAMPTZ,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rewards_catalog_business_id ON rewards_catalog(business_id);

-- -------------------------------------------------------

CREATE TABLE user_points (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  total_earned    INT DEFAULT 0,
  total_redeemed  INT DEFAULT 0,
  current_balance INT DEFAULT 0,
  tier_id         UUID REFERENCES reward_tiers(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(profile_id, business_id)
);

CREATE INDEX idx_user_points_profile_id  ON user_points(profile_id);
CREATE INDEX idx_user_points_business_id ON user_points(business_id);

-- -------------------------------------------------------

CREATE TABLE points_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type            VARCHAR(30) NOT NULL CHECK (type IN (
                    'earn_visit', 'earn_purchase', 'earn_referral', 'earn_welcome',
                    'earn_event', 'redeem_reward', 'expire', 'adjust'
                  )),
  points          INT NOT NULL,
  reference_id    UUID,
  reference_type  VARCHAR(50),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_tx_profile_business ON points_transactions(profile_id, business_id);
CREATE INDEX idx_points_tx_created          ON points_transactions(created_at DESC);

-- ============================================================
-- DOMAIN 8: COUPONS & REDEMPTIONS
-- ============================================================

CREATE TABLE coupons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reward_id   UUID NOT NULL REFERENCES rewards_catalog(id),
  code        VARCHAR(20) UNIQUE NOT NULL,
  status      VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coupons_profile_id ON coupons(profile_id);
CREATE INDEX idx_coupons_code       ON coupons(code);
CREATE INDEX idx_coupons_expires    ON coupons(expires_at);

-- ============================================================
-- DOMAIN 9: REFERRALS
-- ============================================================

CREATE TABLE referral_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  code        VARCHAR(30) UNIQUE NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('app', 'business')),
  total_uses  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(profile_id, type, business_id)
);

CREATE INDEX idx_referral_codes_code       ON referral_codes(code);
CREATE INDEX idx_referral_codes_profile_id ON referral_codes(profile_id);

-- -------------------------------------------------------

CREATE TABLE referrals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_profile_id UUID NOT NULL REFERENCES profiles(id),
  referred_profile_id UUID NOT NULL REFERENCES profiles(id),
  referral_code_id    UUID NOT NULL REFERENCES referral_codes(id),
  business_id         UUID REFERENCES businesses(id),
  type                VARCHAR(20) NOT NULL CHECK (type IN ('app', 'business')),
  status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
                        'pending', 'completed', 'rejected'
                      )),
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_profile_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_profile_id);

-- -------------------------------------------------------

CREATE TABLE pending_invites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id  UUID NOT NULL REFERENCES referral_codes(id),
  phone             VARCHAR(20),
  email             VARCHAR(255),
  invite_code       VARCHAR(30) NOT NULL,
  expires_at        TIMESTAMPTZ,
  claimed_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pending_invites_invite_code ON pending_invites(invite_code);
CREATE INDEX idx_pending_invites_phone       ON pending_invites(phone);
CREATE INDEX idx_pending_invites_email       ON pending_invites(email);

-- ============================================================
-- DOMAIN 10: SAVED ITEMS
-- ============================================================

CREATE TABLE saved_businesses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(profile_id, business_id)
);

CREATE INDEX idx_saved_businesses_profile_id ON saved_businesses(profile_id);

-- -------------------------------------------------------

CREATE TABLE saved_offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offer_id    UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(profile_id, offer_id)
);

CREATE INDEX idx_saved_offers_profile_id ON saved_offers(profile_id);

-- ============================================================
-- DOMAIN 11: CHAT
-- ============================================================

CREATE TABLE chat_rooms (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type                VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'broadcast')),
  customer_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  last_message_at     TIMESTAMPTZ,

  UNIQUE(business_id, customer_profile_id, type)
);

CREATE INDEX idx_chat_rooms_business_id   ON chat_rooms(business_id);
CREATE INDEX idx_chat_rooms_customer      ON chat_rooms(customer_profile_id);
CREATE INDEX idx_chat_rooms_last_message  ON chat_rooms(last_message_at DESC);

-- -------------------------------------------------------

CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id           UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES profiles(id),
  body              TEXT,
  media_url         TEXT,
  media_type        VARCHAR(20) CHECK (media_type IN ('image', 'video', 'file')),
  is_deleted        BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_room_id ON messages(room_id, created_at DESC);
CREATE INDEX idx_messages_sender  ON messages(sender_profile_id);

-- -------------------------------------------------------

CREATE TABLE message_reads (
  profile_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id              UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  last_read_at         TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY(profile_id, room_id)
);

-- ============================================================
-- DOMAIN 12: NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(200),
  body        TEXT,
  data        JSONB,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_profile_id ON notifications(profile_id, is_read, created_at DESC);

-- -------------------------------------------------------

CREATE TABLE push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    VARCHAR(10) CHECK (platform IN ('ios', 'android', 'web')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Interest categories (shown as multi-select on registration)
INSERT INTO interest_categories (name, icon, sort_order) VALUES
  ('Food & Dining',     'food-fork-drink',    1),
  ('Fitness & Wellness','dumbbell',            2),
  ('Retail & Shopping', 'shopping',            3),
  ('Beauty & Grooming', 'scissors-cutting',   4),
  ('Entertainment',     'theater',             5),
  ('Education',         'school',              6),
  ('Travel & Stay',     'airplane',            7),
  ('Health & Medical',  'hospital-box',        8),
  ('Automotive',        'car',                 9),
  ('Home & Living',     'home',               10);

-- Business categories
INSERT INTO business_categories (name, icon, sort_order) VALUES
  ('Food & Dining',     'food-fork-drink',    1),
  ('Fitness & Wellness','dumbbell',            2),
  ('Retail & Shopping', 'shopping',            3),
  ('Beauty & Grooming', 'scissors-cutting',   4),
  ('Entertainment',     'theater',             5),
  ('Education',         'school',              6),
  ('Travel & Stay',     'airplane',            7),
  ('Health & Medical',  'hospital-box',        8),
  ('Automotive',        'car',                 9),
  ('Home & Living',     'home',               10);

-- Default subscription plan (Free tier every business starts on)
INSERT INTO subscription_plans (name, price_monthly, max_offers, max_events, can_broadcast, can_run_rewards, priority_listing) VALUES
  ('Free',       0,    3,  2, FALSE, FALSE, FALSE),
  ('Basic',    499,   10,  5, TRUE,  FALSE, FALSE),
  ('Pro',     1299,   NULL, NULL, TRUE, TRUE, TRUE);

  CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  content     TEXT NOT NULL,
  image_url   TEXT,
  -- is_active stored as a boolean column (not derived).
  -- Posts have no time-based expiry, so there is no need for a CASE-computed
  -- effective_status. This differs intentionally from the offers module which
  -- derives 'expired' status from the expires_at timestamp.
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_posts_business_id ON posts(business_id);
CREATE INDEX idx_posts_is_active ON posts(is_active);