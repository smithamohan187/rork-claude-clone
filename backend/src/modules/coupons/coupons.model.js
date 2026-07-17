const { query } = require('../../config/database');

async function getActiveRewardsByBusiness(businessId) {
  const { rows } = await query(
    `SELECT id, name, description, image_url, type, points_required, quantity_available
     FROM rewards_catalog
     WHERE business_id = $1 AND is_active = TRUE
     ORDER BY points_required ASC`,
    [businessId]
  );
  return rows;
}

async function getBusinessPointsForProfile(profileId, businessId) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(points), 0)::int AS balance
     FROM points_transactions
     WHERE profile_id = $1 AND business_id = $2`,
    [profileId, businessId]
  );
  return rows[0]?.balance ?? 0;
}

async function createCouponWithClient(client, { profileId, businessId, rewardId, code, expiresAt, pointsCost }) {
  const { rows } = await client.query(
    `INSERT INTO coupons (profile_id, business_id, reward_id, code, expires_at, points_cost)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [profileId, businessId, rewardId, code, expiresAt, pointsCost]
  );
  return rows[0];
}

async function insertRedemptionTransactionWithClient(client, { profileId, businessId, couponId, pointsCost }) {
  await client.query(
    `INSERT INTO points_transactions
       (profile_id, business_id, type, points, reference_id, reference_type)
     VALUES ($1, $2, 'redeem_reward', $3, $4, 'coupon')`,
    [profileId, businessId, -pointsCost, couponId]
  );
}

async function getCouponById(couponId) {
  const { rows } = await query(
    'SELECT * FROM coupons WHERE id = $1',
    [couponId]
  );
  return rows[0] ?? null;
}

async function markCouponExpiredWithClient(client, couponId) {
  await client.query(
    `UPDATE coupons SET status = 'expired' WHERE id = $1`,
    [couponId]
  );
}

async function insertRefundTransactionWithClient(client, { profileId, businessId, couponId, pointsCost }) {
  await client.query(
    `INSERT INTO points_transactions
       (profile_id, business_id, type, points, reference_id, reference_type)
     VALUES ($1, $2, 'redemption_refund', $3, $4, 'coupon')`,
    [profileId, businessId, pointsCost, couponId]
  );
}

async function markCouponUsed(couponId) {
  await query(
    `UPDATE coupons SET status = 'used', used_at = NOW() WHERE id = $1`,
    [couponId]
  );
}

module.exports = {
  getActiveRewardsByBusiness,
  getBusinessPointsForProfile,
  createCouponWithClient,
  insertRedemptionTransactionWithClient,
  getCouponById,
  markCouponExpiredWithClient,
  insertRefundTransactionWithClient,
  markCouponUsed,
};
