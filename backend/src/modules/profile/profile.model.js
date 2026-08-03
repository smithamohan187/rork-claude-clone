const { query, getClient } = require('../../config/database');

async function getProfileByUserId(userId) {
  const { rows } = await query(
    `SELECT
       u.email,
       u.phone,
       p.id          AS profile_id,
       p.display_name,
       p.avatar_url,
       p.bio,
       p.city,
       p.state,
       p.country,
       p.profile_type,
       p.is_active,
       p.created_at
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     WHERE u.id = $1 AND p.profile_type = 'personal'
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

async function getProfileInterests(profileId) {
  const { rows } = await query(
    `SELECT ic.id, ic.name, ic.icon
     FROM profile_interests pi
     JOIN interest_categories ic ON ic.id = pi.interest_id
     WHERE pi.profile_id = $1`,
    [profileId]
  );
  return rows;
}

async function updateProfileByUserId(userId, { display_name, bio, city, state, country }) {
  const { rows } = await query(
    `UPDATE profiles
     SET display_name = COALESCE($1, display_name),
         bio          = COALESCE($2, bio),
         city         = COALESCE($3, city),
         state        = COALESCE($4, state),
         country      = COALESCE($5, country),
         updated_at   = NOW()
     WHERE user_id = $6 AND profile_type = 'personal'
     RETURNING id, display_name, bio, city, state, country, avatar_url, updated_at`,
    [display_name ?? null, bio ?? null, city ?? null, state ?? null, country ?? null, userId]
  );
  return rows[0] ?? null;
}

async function updateUserPhone(userId, phone) {
  const { rows } = await query(
    `UPDATE users
     SET phone = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, phone`,
    [phone ?? null, userId]
  );
  return rows[0] ?? null;
}

async function getInterestCategories() {
  const { rows } = await query(
    `SELECT id, name, icon
     FROM interest_categories
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, name ASC`
  );
  return rows;
}

async function deleteProfileInterests(client, profileId) {
  await client.query(
    'DELETE FROM profile_interests WHERE profile_id = $1',
    [profileId]
  );
}

async function insertProfileInterests(client, profileId, interestIds) {
  if (!interestIds || interestIds.length === 0) return;
  await client.query(
    `INSERT INTO profile_interests (profile_id, interest_id)
     SELECT $1, unnest($2::uuid[])`,
    [profileId, interestIds]
  );
}

async function updateAvatarUrl(userId, avatarUrl) {
  const { rows } = await query(
    `UPDATE profiles
     SET avatar_url = $1, updated_at = NOW()
     WHERE user_id = $2 AND profile_type = 'personal'
     RETURNING avatar_url`,
    [avatarUrl, userId]
  );
  return rows[0] ?? null;
}

async function getPublicProfileBase(profileId) {
  const { rows } = await query(
    `SELECT id, display_name, avatar_url, created_at
       FROM profiles
      WHERE id = $1 AND profile_type = 'personal' AND is_active = TRUE`,
    [profileId]
  );
  return rows[0] ?? null;
}

async function getSubscribedBusinessCount(profileId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM subscriptions WHERE profile_id = $1 AND is_active = TRUE`,
    [profileId]
  );
  return rows[0]?.count ?? 0;
}

async function getRedeemedRewardCount(profileId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM coupons WHERE profile_id = $1 AND status = 'used'`,
    [profileId]
  );
  return rows[0]?.count ?? 0;
}

async function getMutualBusinesses(targetProfileId, viewerProfileId) {
  const { rows } = await query(
    `SELECT b.id, b.name, b.logo_url
       FROM subscriptions s_target
       JOIN subscriptions s_viewer
         ON s_viewer.business_id = s_target.business_id
        AND s_viewer.profile_id = $2
        AND s_viewer.is_active = TRUE
       JOIN businesses b ON b.id = s_target.business_id
      WHERE s_target.profile_id = $1 AND s_target.is_active = TRUE
      ORDER BY s_target.subscribed_at DESC`,
    [targetProfileId, viewerProfileId]
  );
  return rows;
}

module.exports = {
  getProfileByUserId,
  getProfileInterests,
  updateProfileByUserId,
  updateUserPhone,
  getInterestCategories,
  deleteProfileInterests,
  insertProfileInterests,
  updateAvatarUrl,
  getPublicProfileBase,
  getSubscribedBusinessCount,
  getRedeemedRewardCount,
  getMutualBusinesses,
};
