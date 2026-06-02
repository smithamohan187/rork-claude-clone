-- ============================================================
-- TouchPoints App - Production-Ready PostgreSQL Schema
-- ============================================================
-- Designed for scalability (1M+ users), read-heavy operations,
-- and Supabase compatibility with Row-Level Security.
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE profile_type AS ENUM ('personal', 'business');
CREATE TYPE business_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'expired');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE offer_type AS ENUM ('promotion', 'discount', 'flash_sale');
CREATE TYPE event_type AS ENUM ('in_person', 'online', 'hybrid');
CREATE TYPE transaction_type AS ENUM ('earn', 'redeem', 'bonus', 'referral', 'expire', 'adjustment');
CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'expired', 'cancelled');
CREATE TYPE coupon_status AS ENUM ('active', 'used', 'expired', 'cancelled');
CREATE TYPE reward_type AS ENUM ('discount', 'freebie', 'voucher', 'experience', 'cashback');
CREATE TYPE admin_role AS ENUM ('super_admin', 'moderator', 'support');
CREATE TYPE user_sub_status AS ENUM ('active', 'inactive');
CREATE TYPE redemption_channel AS ENUM ('in_store', 'online', 'app');

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fuzzy text search

-- ============================================================
-- 1. USERS (auth)
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    full_name       VARCHAR(255),
    auth_provider   VARCHAR(50) DEFAULT 'email',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    referred_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_referred_by ON users (referred_by);
CREATE INDEX idx_users_created_at ON users (created_at DESC);

-- ============================================================
-- 2. ADMIN USERS
-- ============================================================

CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    role            admin_role NOT NULL DEFAULT 'support',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_admin_email ON admin_users (email);

-- ============================================================
-- 3. PROFILES
-- ============================================================

CREATE TABLE profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_type    profile_type NOT NULL DEFAULT 'personal',
    display_name    VARCHAR(255),
    avatar_url      TEXT,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles (user_id);
CREATE INDEX idx_profiles_type ON profiles (profile_type);
CREATE UNIQUE INDEX idx_profiles_user_default
    ON profiles (user_id) WHERE is_default = TRUE;

-- ============================================================
-- 4. USER SESSIONS
-- ============================================================

CREATE TABLE user_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_profile_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
    device_id           VARCHAR(255),
    platform            VARCHAR(50),
    last_seen_at        TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON user_sessions (user_id);
CREATE INDEX idx_sessions_last_seen ON user_sessions (last_seen_at DESC);

-- ============================================================
-- 5. PROFILE PERMISSIONS
-- ============================================================

CREATE TABLE profile_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission      VARCHAR(100) NOT NULL,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profile_perm_unique
    ON profile_permissions (profile_id, permission);

-- ============================================================
-- 6. BUSINESSES
-- ============================================================

CREATE TABLE businesses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    owner_name      VARCHAR(255),
    business_name   VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    category        VARCHAR(100),
    description     TEXT,
    logo_url        TEXT,
    cover_url       TEXT,
    address         TEXT,
    city            VARCHAR(100),
    country         VARCHAR(100),
    website_url     TEXT,
    business_type   VARCHAR(20) NOT NULL DEFAULT 'points_based' CHECK (business_type IN ('goodwill', 'points_based')),
    referral_opted_out BOOLEAN NOT NULL DEFAULT FALSE,
    inhouse_referral_url TEXT,
    status          business_status NOT NULL DEFAULT 'pending',
    approved_by     UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_business_email ON businesses (email) WHERE email IS NOT NULL;
CREATE INDEX idx_business_profile ON businesses (profile_id);
CREATE INDEX idx_business_status ON businesses (status);
CREATE INDEX idx_business_category ON businesses (category);
CREATE INDEX idx_business_city ON businesses (city);
CREATE INDEX idx_business_name_trgm ON businesses
    USING gin (business_name gin_trgm_ops);

-- ============================================================
-- 7. SUBSCRIPTION PLANS
-- ============================================================

CREATE TABLE subscription_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    price_monthly   NUMERIC(10,2) NOT NULL DEFAULT 0,
    price_yearly    NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_offers      INT NOT NULL DEFAULT 5,
    max_events      INT NOT NULL DEFAULT 5,
    max_tiers       INT NOT NULL DEFAULT 3,
    features        JSONB DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_plans_active ON subscription_plans (is_active);

-- ============================================================
-- 8. BUSINESS SUBSCRIPTIONS
-- ============================================================

CREATE TABLE business_subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    plan_id             UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    status              subscription_status NOT NULL DEFAULT 'active',
    billing_cycle       billing_cycle NOT NULL DEFAULT 'monthly',
    starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at             TIMESTAMPTZ,
    auto_renew          BOOLEAN NOT NULL DEFAULT TRUE,
    payment_reference   VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bsub_business ON business_subscriptions (business_id);
CREATE INDEX idx_bsub_status ON business_subscriptions (status);
CREATE INDEX idx_bsub_ends_at ON business_subscriptions (ends_at);

-- ============================================================
-- 9. REWARD CONFIG (1:1 per business)
-- ============================================================

CREATE TABLE reward_config (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    welcome_points          INT NOT NULL DEFAULT 0,
    referral_points         INT NOT NULL DEFAULT 0,
    sharing_points          INT NOT NULL DEFAULT 0,
    purchase_points_per_unit NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    points_expiry_days      INT DEFAULT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_reward_config_business ON reward_config (business_id);

-- ============================================================
-- 10. REWARD TIERS
-- ============================================================

CREATE TABLE reward_tiers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    tier_name       VARCHAR(100) NOT NULL,
    min_points      INT NOT NULL DEFAULT 0,
    benefits        TEXT,
    badge_color     VARCHAR(20),
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rtiers_business ON reward_tiers (business_id);
CREATE UNIQUE INDEX idx_rtiers_business_order
    ON reward_tiers (business_id, sort_order);

-- ============================================================
-- 11. REWARDS CATALOG
-- ============================================================

CREATE TABLE rewards_catalog (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    reward_name     VARCHAR(255) NOT NULL,
    description     TEXT,
    reward_type     reward_type NOT NULL DEFAULT 'discount',
    required_points INT NOT NULL DEFAULT 0,
    discount_value  NUMERIC(12,2) DEFAULT 0,
    stock_limit     INT,
    redeemed_count  INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rcatalog_business ON rewards_catalog (business_id);
CREATE INDEX idx_rcatalog_active ON rewards_catalog (is_active, business_id);
CREATE INDEX idx_rcatalog_points ON rewards_catalog (required_points);

-- ============================================================
-- 12. SUBSCRIPTIONS (user subscribes to business)
-- ============================================================

CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    status                  user_sub_status NOT NULL DEFAULT 'active',
    welcome_points_awarded  BOOLEAN NOT NULL DEFAULT FALSE,
    subscribed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at         TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_sub_profile_business
    ON subscriptions (profile_id, business_id);
CREATE INDEX idx_sub_business ON subscriptions (business_id);
CREATE INDEX idx_sub_status ON subscriptions (status);

-- ============================================================
-- 13. USER POINTS (balance per user per business)
-- ============================================================

CREATE TABLE user_points (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    total_points        INT NOT NULL DEFAULT 0,
    lifetime_points     INT NOT NULL DEFAULT 0,
    current_tier_id     UUID REFERENCES reward_tiers(id) ON DELETE SET NULL,
    last_activity_at    TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_points_non_negative CHECK (total_points >= 0),
    CONSTRAINT chk_lifetime_non_negative CHECK (lifetime_points >= 0)
);

CREATE UNIQUE INDEX idx_upoints_profile_business
    ON user_points (profile_id, business_id);
CREATE INDEX idx_upoints_tier ON user_points (current_tier_id);
CREATE INDEX idx_upoints_total ON user_points (business_id, total_points DESC);

-- ============================================================
-- 14. POINTS TRANSACTIONS (immutable ledger)
-- ============================================================

CREATE TABLE points_transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    transaction_type    transaction_type NOT NULL,
    points              INT NOT NULL,
    balance_after       INT NOT NULL,
    reference_id        UUID,
    reference_type      VARCHAR(50),
    note                TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ptxn_profile_business
    ON points_transactions (profile_id, business_id);
CREATE INDEX idx_ptxn_type ON points_transactions (transaction_type);
CREATE INDEX idx_ptxn_created ON points_transactions (created_at DESC);
CREATE INDEX idx_ptxn_reference
    ON points_transactions (reference_type, reference_id);

-- ============================================================
-- 15. OFFERS
-- ============================================================

CREATE TABLE offers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    image_url           TEXT,
    offer_type          offer_type NOT NULL DEFAULT 'promotion',
    discount_percent    NUMERIC(5,2) DEFAULT 0
                        CONSTRAINT chk_discount_range CHECK (
                            discount_percent >= 0 AND discount_percent <= 100
                        ),
    starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    view_count          INT NOT NULL DEFAULT 0,
    share_count         INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_offers_business ON offers (business_id);
CREATE INDEX idx_offers_active ON offers (is_active, starts_at, expires_at);
CREATE INDEX idx_offers_type ON offers (offer_type);

-- ============================================================
-- 16. EVENTS
-- ============================================================

CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    image_url       TEXT,
    location        TEXT,
    event_type      event_type NOT NULL DEFAULT 'in_person',
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ,
    max_attendees   INT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_business ON events (business_id);
CREATE INDEX idx_events_active ON events (is_active, starts_at);
CREATE INDEX idx_events_type ON events (event_type);

-- ============================================================
-- 17. COUPONS
-- ============================================================

CREATE TABLE coupons (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    catalog_item_id     UUID REFERENCES rewards_catalog(id) ON DELETE SET NULL,
    coupon_code         VARCHAR(50) NOT NULL,
    status              coupon_status NOT NULL DEFAULT 'active',
    points_deducted     INT NOT NULL DEFAULT 0,
    expires_at          TIMESTAMPTZ,
    used_at             TIMESTAMPTZ,
    validated_by        UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_coupon_code ON coupons (coupon_code);
CREATE INDEX idx_coupon_profile ON coupons (profile_id);
CREATE INDEX idx_coupon_business ON coupons (business_id);
CREATE INDEX idx_coupon_status ON coupons (status);
CREATE INDEX idx_coupon_expires ON coupons (expires_at)
    WHERE status = 'active';

-- ============================================================
-- 18. REFERRALS
-- ============================================================

CREATE TABLE referrals (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_id                 UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    status                      referral_status NOT NULL DEFAULT 'pending',
    referral_code               VARCHAR(50),
    signup_points_awarded       INT NOT NULL DEFAULT 0,
    purchase_points_awarded     INT NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_no_self_referral CHECK (referrer_id <> referred_id)
);

CREATE UNIQUE INDEX idx_referral_unique
    ON referrals (referrer_id, referred_id, business_id);
CREATE INDEX idx_referral_referrer ON referrals (referrer_id);
CREATE INDEX idx_referral_referred ON referrals (referred_id);
CREATE INDEX idx_referral_business ON referrals (business_id);
CREATE INDEX idx_referral_code ON referrals (referral_code);

-- ============================================================
-- 19. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    type            VARCHAR(50) NOT NULL DEFAULT 'general',
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_id ON notifications (user_id);
CREATE INDEX idx_notif_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notif_created ON notifications (created_at DESC);

-- ============================================================
-- 20. REDEMPTIONS
-- ============================================================

CREATE TABLE redemptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id           UUID REFERENCES coupons(id) ON DELETE SET NULL,
    profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    catalog_item_id     UUID REFERENCES rewards_catalog(id) ON DELETE SET NULL,
    points_used         INT NOT NULL DEFAULT 0,
    redeemed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    channel             redemption_channel NOT NULL DEFAULT 'app',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_redemp_profile ON redemptions (profile_id);
CREATE INDEX idx_redemp_business ON redemptions (business_id);
CREATE INDEX idx_redemp_coupon ON redemptions (coupon_id);
CREATE INDEX idx_redemp_date ON redemptions (redeemed_at DESC);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();', t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- ROW-LEVEL SECURITY (Supabase-ready)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
