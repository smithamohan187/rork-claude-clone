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
};
