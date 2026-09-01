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

// Credits a real referral bonus (type='earn_referral') to the sharer when a friend they referred
// (via an offer-share) subscribes. Mirrors insertJoinBonusWithClient's shape exactly, but keyed by
// reference_type/reference_id so referralBonusAlreadyCredited can guard against double-crediting
// on a resubscribe cycle (points_transactions has no unique constraint to ON CONFLICT against).
async function insertReferralBonusWithClient(client, profileId, businessId, points, { referenceType, referenceId }) {
  await client.query(
    `INSERT INTO points_transactions (profile_id, business_id, type, points, reference_type, reference_id)
     VALUES ($1, $2, 'earn_referral', $3, $4, $5)`,
    [profileId, businessId, points, referenceType, referenceId]
  );
}

async function referralBonusAlreadyCredited(referenceId) {
  const { rows } = await query(
    `SELECT 1 FROM points_transactions
      WHERE type = 'earn_referral' AND reference_type = 'share_recipient' AND reference_id = $1
      LIMIT 1`,
    [referenceId]
  );
  return rows.length > 0;
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

async function getRecentTransactionsByProfile(profileId, limit, offset) {
  const { rows } = await query(
    `SELECT pt.id, pt.type, pt.points, pt.created_at, pt.reference_id, pt.reference_type,
            b.id AS business_id, b.name AS business_name, b.logo_url
     FROM points_transactions pt
     JOIN businesses b ON b.id = pt.business_id
     WHERE pt.profile_id = $1
     ORDER BY pt.created_at DESC
     LIMIT $2 OFFSET $3`,
    [profileId, limit, offset]
  );
  return rows;
}

module.exports = {
  getWelcomeBonusWithClient,
  insertJoinBonusWithClient,
  insertReferralBonusWithClient,
  referralBonusAlreadyCredited,
  getTotalPointsByProfile,
  getPointsSplitByProfile,
  getRecentTransactionsByProfile,
};
