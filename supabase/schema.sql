-- ============================================================
-- TouchPoints App — Complete Supabase SQL Schema
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================

-- 0. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  avatar_url    TEXT,
  user_type     TEXT NOT NULL DEFAULT 'personal' CHECK (user_type IN ('personal', 'business')),
  interests     TEXT[] DEFAULT '{}',
  bio           TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. BUSINESSES
-- ============================================================
CREATE TABLE public.businesses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE,
  description     TEXT,
  category        TEXT,
  logo_url        TEXT,
  cover_url       TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  zip_code        TEXT,
  country         TEXT DEFAULT 'IN',
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX idx_businesses_category ON public.businesses(category);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active businesses"
  ON public.businesses FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Business owners can insert their business"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Business owners can update their business"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Business owners can delete their business"
  ON public.businesses FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================
-- 3. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'growth', 'premium')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at       TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_business ON public.subscriptions(business_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage own subscriptions"
  ON public.subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 4. OFFERS
-- ============================================================
CREATE TABLE public.offers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  offer_type      TEXT NOT NULL DEFAULT 'discount' CHECK (offer_type IN ('discount', 'bogo', 'freebie', 'cashback', 'custom')),
  discount_value  NUMERIC(10,2),
  discount_unit   TEXT CHECK (discount_unit IN ('percent', 'flat')),
  min_purchase    NUMERIC(10,2) DEFAULT 0,
  max_redemptions INTEGER,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  points_required INTEGER DEFAULT 0,
  start_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date        TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_business ON public.offers(business_id);
CREATE INDEX idx_offers_active ON public.offers(is_active, start_date, end_date);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active offers"
  ON public.offers FOR SELECT
  USING (is_active = TRUE AND start_date <= now() AND (end_date IS NULL OR end_date > now()));

CREATE POLICY "Business owners can manage own offers"
  ON public.offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 5. EVENTS
-- ============================================================
CREATE TABLE public.events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  venue           TEXT,
  address         TEXT,
  event_date      TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ,
  max_attendees   INTEGER,
  attendee_count  INTEGER NOT NULL DEFAULT 0,
  points_reward   INTEGER DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_business ON public.events(business_id);
CREATE INDEX idx_events_date ON public.events(event_date);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active events"
  ON public.events FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Business owners can manage own events"
  ON public.events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 6. REWARD_TIERS
-- ============================================================
CREATE TABLE public.reward_tiers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  min_points      INTEGER NOT NULL DEFAULT 0,
  max_points      INTEGER,
  multiplier      NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  perks           TEXT,
  color           TEXT DEFAULT '#5334B7',
  icon            TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reward_tiers_business ON public.reward_tiers(business_id);

ALTER TABLE public.reward_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reward tiers"
  ON public.reward_tiers FOR SELECT
  USING (TRUE);

CREATE POLICY "Business owners can manage own tiers"
  ON public.reward_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 7. BUSINESS_REWARD_CONFIG
-- ============================================================
CREATE TABLE public.business_reward_config (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  points_per_currency NUMERIC(10,2) NOT NULL DEFAULT 1.0,
  currency_symbol     TEXT NOT NULL DEFAULT '₹',
  welcome_bonus       INTEGER NOT NULL DEFAULT 0,
  referral_bonus      INTEGER NOT NULL DEFAULT 0,
  birthday_bonus      INTEGER NOT NULL DEFAULT 0,
  expiry_days         INTEGER,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_reward_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reward config"
  ON public.business_reward_config FOR SELECT
  USING (TRUE);

CREATE POLICY "Business owners can manage own config"
  ON public.business_reward_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 8. REWARD_POINTS (balance per user per business)
-- ============================================================
CREATE TABLE public.reward_points (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  balance         INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  tier_id         UUID REFERENCES public.reward_tiers(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);

CREATE INDEX idx_reward_points_user ON public.reward_points(user_id);
CREATE INDEX idx_reward_points_business ON public.reward_points(business_id);

ALTER TABLE public.reward_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reward points"
  ON public.reward_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Business owners can read their customers' points"
  ON public.reward_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage points for their business"
  ON public.reward_points FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 9. USER_POINTS_LOG
-- ============================================================
CREATE TABLE public.user_points_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN ('earn', 'redeem', 'expire', 'bonus', 'adjust', 'referral')),
  points          INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL DEFAULT 0,
  description     TEXT,
  reference_type  TEXT,
  reference_id    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_points_log_user ON public.user_points_log(user_id);
CREATE INDEX idx_points_log_business ON public.user_points_log(business_id);
CREATE INDEX idx_points_log_created ON public.user_points_log(created_at DESC);

ALTER TABLE public.user_points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own points log"
  ON public.user_points_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Business owners can read their customers' logs"
  ON public.user_points_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert logs for their business"
  ON public.user_points_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 10. REFERRALS
-- ============================================================
CREATE TABLE public.referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  referral_code   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  points_awarded  INTEGER NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX idx_referrals_business ON public.referrals(business_id);
CREATE UNIQUE INDEX idx_referrals_code ON public.referrals(referral_code);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals (as referrer)"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can read own referrals (as referred)"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referred_id);

CREATE POLICY "Business owners can read referrals for their business"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Business owners can update referrals for their business"
  ON public.referrals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 11. COUPONS
-- ============================================================
CREATE TABLE public.coupons (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  offer_id          UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  code              TEXT NOT NULL,
  discount_value    NUMERIC(10,2) NOT NULL,
  discount_unit     TEXT NOT NULL DEFAULT 'percent' CHECK (discount_unit IN ('percent', 'flat')),
  min_purchase      NUMERIC(10,2) DEFAULT 0,
  max_uses          INTEGER,
  used_count        INTEGER NOT NULL DEFAULT 0,
  is_single_use     BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from        TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until       TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_business ON public.coupons(business_id);
CREATE UNIQUE INDEX idx_coupons_code_business ON public.coupons(business_id, code);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = TRUE AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now()));

CREATE POLICY "Business owners can manage own coupons"
  ON public.coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 12. TRANSACTIONS
-- ============================================================
CREATE TABLE public.transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('purchase', 'redemption', 'refund', 'coupon_use')),
  amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  points_earned     INTEGER NOT NULL DEFAULT 0,
  points_redeemed   INTEGER NOT NULL DEFAULT 0,
  coupon_id         UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  offer_id          UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes             TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_business ON public.transactions(business_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Business owners can read their transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'businesses', 'subscriptions', 'offers',
    'events', 'reward_points', 'business_reward_config', 'coupons'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- TRIGGER: auto-create user row on auth sign-up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'personal')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Done! All 12 tables created with RLS policies and indexes.
-- ============================================================
