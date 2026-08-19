const { query } = require('../../config/database');

async function getActiveProfileId(userId) {
  const { rows } = await query(
    'SELECT active_profile_id FROM users WHERE id = $1',
    [userId]
  );
  return rows[0]?.active_profile_id ?? null;
}

async function saveBusiness(profileId, businessId) {
  const { rows } = await query(
    `INSERT INTO saved_businesses (profile_id, business_id)
     VALUES ($1, $2)
     ON CONFLICT (profile_id, business_id) DO NOTHING
     RETURNING *`,
    [profileId, businessId]
  );
  return rows[0] ?? null;
}

async function unsaveBusiness(profileId, businessId) {
  await query(
    'DELETE FROM saved_businesses WHERE profile_id = $1 AND business_id = $2',
    [profileId, businessId]
  );
}

async function isSaved(profileId, businessId) {
  const { rows } = await query(
    'SELECT EXISTS(SELECT 1 FROM saved_businesses WHERE profile_id = $1 AND business_id = $2)::bool AS saved',
    [profileId, businessId]
  );
  return rows[0]?.saved ?? false;
}

async function isSavedByUserId(userId, businessId) {
  const { rows } = await query(
    `SELECT 1 FROM saved_businesses sb
     JOIN profiles p ON p.id = sb.profile_id
     WHERE p.user_id = $1 AND sb.business_id = $2
     LIMIT 1`,
    [userId, businessId]
  );
  return rows.length > 0;
}

async function getSavedBusinesses(profileId) {
  const { rows } = await query(
    `SELECT
       b.id,
       b.name,
       b.city,
       b.logo_url,
       bc.name  AS category_name,
       COUNT(DISTINCT s.id) FILTER (WHERE s.is_active = TRUE) AS subscriber_count,
       ROUND(AVG(br.rating)::numeric, 1)                       AS avg_rating,
       sb.created_at AS saved_at
     FROM saved_businesses sb
     INNER JOIN businesses b          ON b.id = sb.business_id
     LEFT  JOIN business_categories bc ON bc.id = b.category_id
     LEFT  JOIN subscriptions s        ON s.business_id = b.id
     LEFT  JOIN business_reviews br    ON br.business_id = b.id
     WHERE sb.profile_id = $1
     GROUP BY b.id, bc.name, sb.created_at
     ORDER BY sb.created_at DESC`,
    [profileId]
  );
  return rows;
}

module.exports = { getActiveProfileId, saveBusiness, unsaveBusiness, isSaved, isSavedByUserId, getSavedBusinesses };
