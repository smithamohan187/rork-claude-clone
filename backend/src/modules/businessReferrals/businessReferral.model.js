// Model layer — raw SQL only. No business logic lives here.
const { query } = require('../../config/database');

// Race-safe get-or-create: try the insert first (cheap, usually succeeds once per
// business+sharer), fall back to a plain select on the unique-constraint conflict. Mirrors the
// ON CONFLICT DO NOTHING + re-select pattern used elsewhere in this codebase for lazily-created
// per-profile rows (e.g. marketplace's personal business-referral codes).
async function getOrCreateReferralCode(businessId, sharerProfileId, referralCode) {
  const { rows } = await query(
    `INSERT INTO business_referrals (business_id, sharer_profile_id, referral_code)
     VALUES ($1, $2, $3)
     ON CONFLICT (business_id, sharer_profile_id) DO NOTHING
     RETURNING id, referral_code`,
    [businessId, sharerProfileId, referralCode]
  );
  if (rows[0]) return rows[0];

  const existing = await query(
    `SELECT id, referral_code FROM business_referrals WHERE business_id = $1 AND sharer_profile_id = $2`,
    [businessId, sharerProfileId]
  );
  return existing.rows[0];
}

async function findByReferralCode(referralCode) {
  const { rows } = await query(
    `SELECT id, business_id, sharer_profile_id, referral_code FROM business_referrals WHERE referral_code = $1`,
    [referralCode]
  );
  return rows[0] ?? null;
}

async function getStats(businessReferralId) {
  const { rows } = await query(
    `SELECT
       COUNT(*)::int AS referred_count,
       COUNT(*) FILTER (WHERE subscribed = TRUE)::int AS completed_count
     FROM business_referral_joins
     WHERE business_referral_id = $1`,
    [businessReferralId]
  );
  return rows[0] ?? { referred_count: 0, completed_count: 0 };
}

// Idempotent — a friend re-opening the same link doesn't create a second join row.
async function markJoined(businessReferralId, referredProfileId) {
  const { rows } = await query(
    `INSERT INTO business_referral_joins (business_referral_id, referred_profile_id)
     VALUES ($1, $2)
     ON CONFLICT (business_referral_id, referred_profile_id) DO NOTHING
     RETURNING id`,
    [businessReferralId, referredProfileId]
  );
  if (rows[0]) return rows[0];
  const existing = await query(
    `SELECT id FROM business_referral_joins WHERE business_referral_id = $1 AND referred_profile_id = $2`,
    [businessReferralId, referredProfileId]
  );
  return existing.rows[0];
}

// Flips subscribed=true exactly once — the WHERE subscribed = FALSE guard means a resubscribe
// (unsubscribe then subscribe again) never re-triggers the sharer's bonus.
async function markSubscribed(joinId) {
  const { rows } = await query(
    `UPDATE business_referral_joins
     SET subscribed = TRUE, subscribed_at = NOW()
     WHERE id = $1 AND subscribed = FALSE
     RETURNING id, business_referral_id, referred_profile_id, bonus_awarded`,
    [joinId]
  );
  return rows[0] ?? null;
}

async function markBonusAwarded(joinId) {
  await query(`UPDATE business_referral_joins SET bonus_awarded = TRUE WHERE id = $1`, [joinId]);
}

module.exports = {
  getOrCreateReferralCode,
  findByReferralCode,
  getStats,
  markJoined,
  markSubscribed,
  markBonusAwarded,
};
