const { query } = require('../../config/database');

async function getWelcomeBonusWithClient(client, businessId) {
  const { rows } = await client.query(
    'SELECT welcome_bonus_points FROM reward_config WHERE business_id = $1',
    [businessId]
  );
  return rows[0]?.welcome_bonus_points ?? null;
}

async function insertJoinBonusWithClient(client, profileId, businessId, points) {
  await client.query(
    `INSERT INTO points_transactions (profile_id, business_id, type, points)
     VALUES ($1, $2, 'earn_welcome', $3)
     ON CONFLICT DO NOTHING`,
    [profileId, businessId, points]
  );
}

async function getTotalPointsByProfile(profileId) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(points), 0)::int AS total
     FROM points_transactions
     WHERE profile_id = $1`,
    [profileId]
  );
  return rows[0]?.total ?? 0;
}

async function getPointsSplitByProfile(profileId) {
  const { rows } = await query(
    `SELECT
       b.id        AS business_id,
       b.name      AS business_name,
       b.logo_url,
       COALESCE(SUM(pt.points), 0)::int AS points
     FROM points_transactions pt
     JOIN businesses b ON b.id = pt.business_id
     WHERE pt.profile_id = $1
     GROUP BY b.id, b.name, b.logo_url
     ORDER BY points DESC`,
    [profileId]
  );
  return rows;
}

module.exports = {
  getWelcomeBonusWithClient,
  insertJoinBonusWithClient,
  getTotalPointsByProfile,
  getPointsSplitByProfile,
};
