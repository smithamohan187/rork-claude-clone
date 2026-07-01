const { query, getClient } = require('../../config/database');

async function getActiveProfileId(userId) {
  const { rows } = await query(
    'SELECT active_profile_id FROM users WHERE id = $1',
    [userId]
  );
  return rows[0]?.active_profile_id ?? null;
}

async function getBusinessByProfileId(profileId) {
  const { rows } = await query(
    'SELECT * FROM businesses WHERE profile_id = $1',
    [profileId]
  );
  return rows[0] ?? null;
}

async function getFreePlanId() {
  const { rows } = await query(
    'SELECT id FROM subscription_plans WHERE price_monthly = 0 LIMIT 1'
  );
  return rows[0]?.id ?? null;
}

async function insertBusiness(client, data) {
  const {
    profile_id, category_id, name, slug, description,
    phone, website, address, city, state, country,
    business_type, inhouse_referral, inhouse_referral_url,
  } = data;
  const { rows } = await client.query(
    `INSERT INTO businesses
       (profile_id, category_id, name, slug, description, phone, website,
        address, city, state, country, business_type, inhouse_referral, inhouse_referral_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      profile_id, category_id ?? null, name, slug, description ?? null,
      phone ?? null, website ?? null, address ?? null, city ?? null,
      state ?? null, country ?? null, business_type,
      inhouse_referral ?? false, inhouse_referral_url ?? null,
    ]
  );
  return rows[0];
}

async function updateBusiness(client, businessId, data) {
  const {
    category_id, name, description, phone, website,
    address, city, state, country, business_type,
    inhouse_referral, inhouse_referral_url,
  } = data;
  const { rows } = await client.query(
    `UPDATE businesses
     SET category_id=$1, name=$2, description=$3, phone=$4, website=$5,
         address=$6, city=$7, state=$8, country=$9, business_type=$10,
         inhouse_referral=$11, inhouse_referral_url=$12, updated_at=NOW()
     WHERE id=$13
     RETURNING *`,
    [
      category_id ?? null, name, description ?? null, phone ?? null,
      website ?? null, address ?? null, city ?? null, state ?? null,
      country ?? null, business_type, inhouse_referral ?? false,
      inhouse_referral_url ?? null, businessId,
    ]
  );
  return rows[0];
}

async function insertBusinessHours(client, businessId, hours) {
  for (const h of hours) {
    await client.query(
      `INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
       VALUES ($1, $2, $3, $4, $5)`,
      [businessId, h.day_of_week, h.open_time || null, h.close_time || null, h.is_closed ?? false]
    );
  }
}

async function deleteBusinessHours(client, businessId) {
  await client.query('DELETE FROM business_hours WHERE business_id = $1', [businessId]);
}

async function getBusinessHours(businessId) {
  const { rows } = await query(
    'SELECT * FROM business_hours WHERE business_id = $1 ORDER BY day_of_week',
    [businessId]
  );
  return rows;
}

async function insertBusinessSubscription(client, businessId, planId) {
  const { rows } = await client.query(
    `INSERT INTO business_subscriptions (business_id, plan_id, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT (business_id) DO NOTHING
     RETURNING *`,
    [businessId, planId]
  );
  return rows[0] ?? null;
}

async function findBusinessByUserId(userId) {
  const { rows } = await query(
    `SELECT b.*
     FROM businesses b
     JOIN profiles p ON p.id = b.profile_id
     WHERE p.user_id = $1
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

async function updateBusinessLogo(businessId, logoUrl) {
  const { rows } = await query(
    `UPDATE businesses SET logo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING logo_url`,
    [logoUrl, businessId]
  );
  return rows[0] ?? null;
}

async function updateBusinessCoverPhoto(businessId, photoUrl) {
  const { rows } = await query(
    `UPDATE businesses SET cover_url = $1, updated_at = NOW() WHERE id = $2 RETURNING cover_url`,
    [photoUrl, businessId]
  );
  return rows[0] ?? null;
}

async function setOnboardingComplete(businessId) {
  await query(
    `UPDATE businesses SET onboarding_complete = TRUE, updated_at = NOW() WHERE id = $1`,
    [businessId]
  );
}

/**
 * Fetch a single business by its primary-key id for the public profile view.
 * JOINs category name, subscriber count, and rating aggregates in one query
 * so the service layer never needs multiple round-trips.
 * All LEFT JOINs ensure a row is returned even when there are no ratings or subscribers.
 */
async function getBusinessById(businessId) {
  const { rows } = await query(
    `SELECT
       b.id,
       b.name,
       b.description,
       b.business_type,
       b.phone,
       b.website,
       b.address,
       b.city,
       b.state,
       b.country,
       b.logo_url,
       b.cover_url,
       b.inhouse_referral,
       b.inhouse_referral_url,
       b.onboarding_complete,
       b.created_at,
       bc.name AS category_name,
       COALESCE(sub.subscriber_count, 0) AS subscriber_count,
       COALESCE(rat.avg_rating, 0)       AS avg_rating,
       COALESCE(rat.rating_count, 0)     AS rating_count
     FROM businesses b
     LEFT JOIN business_categories bc ON bc.id = b.category_id
     LEFT JOIN (
       SELECT business_id, COUNT(*) AS subscriber_count
       FROM subscriptions
       GROUP BY business_id
     ) sub ON sub.business_id = b.id
     LEFT JOIN (
       SELECT business_id,
              ROUND(AVG(rating)::numeric, 1) AS avg_rating,
              COUNT(*) AS rating_count
       FROM business_ratings
       GROUP BY business_id
     ) rat ON rat.business_id = b.id
     WHERE b.id = $1`,
    [businessId]
  );
  return rows[0] ?? null;
}

/**
 * Insert a new business profile row into the profiles table.
 * Must run inside the same transaction as insertBusiness.
 */
async function insertBusinessProfile(client, { userId, displayName, avatarUrl, city, state, country }) {
  const { rows } = await client.query(
    `INSERT INTO profiles
       (user_id, profile_type, display_name, avatar_url, city, state, country)
     VALUES ($1, 'business', $2, $3, $4, $5, $6)
     RETURNING id, user_id, profile_type, display_name, avatar_url, city, state, country`,
    [userId, displayName, avatarUrl ?? null, city ?? '', state ?? '', country ?? 'IN']
  );
  return rows[0];
}

/**
 * Find an existing business profile for a user.
 * Used during registration to avoid creating duplicate profile rows.
 */
async function getBusinessProfileByUserId(userId) {
  const { rows } = await query(
    `SELECT p.id, p.display_name, p.avatar_url
     FROM profiles p
     WHERE p.user_id = $1
       AND p.profile_type = 'business'
       AND p.is_active = TRUE
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Get the personal profile for a user.
 * Used to copy avatar/location defaults when creating a business profile row.
 */
async function getPersonalProfileByUserId(userId) {
  const { rows } = await query(
    `SELECT id, display_name, avatar_url, city, state, country
     FROM profiles
     WHERE user_id = $1
       AND profile_type = 'personal'
       AND is_active = TRUE
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Update users.active_profile_id to the given profile.
 * Called after creating/editing a business so the user is switched into business mode.
 * Must run inside the caller's transaction.
 */
async function setUserActiveProfile(client, userId, profileId) {
  await client.query(
    'UPDATE users SET active_profile_id = $1, updated_at = NOW() WHERE id = $2',
    [profileId, userId]
  );
}

module.exports = {
  getActiveProfileId,
  getFreePlanId,
  insertBusiness,
  updateBusiness,
  insertBusinessHours,
  deleteBusinessHours,
  getBusinessHours,
  insertBusinessSubscription,
  findBusinessByUserId,
  updateBusinessLogo,
  updateBusinessCoverPhoto,
  setOnboardingComplete,
  getBusinessByProfileId,
  getBusinessById,
  insertBusinessProfile,
  getBusinessProfileByUserId,
  getPersonalProfileByUserId,
  setUserActiveProfile,
};
