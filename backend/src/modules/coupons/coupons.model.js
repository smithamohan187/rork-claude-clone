const { query } = require('../../config/database');

// Resolves the business owned by the authenticated user — same profile_type='business' JOIN
// convention as rewardConfig/dashboardFeed/analytics/offers (kept local per that convention,
// not shared across modules).
async function getBusinessIdByUserId(userId) {
  const { rows } = await query(
    `SELECT b.id AS business_id
     FROM businesses b
     JOIN profiles p ON p.id = b.profile_id
     WHERE p.user_id = $1
       AND p.profile_type = 'business'
       AND p.is_active = TRUE
     LIMIT 1`,
    [userId]
  );
  return rows[0]?.business_id ?? null;
}

// Locks the coupon row for the duration of the scan transaction (prevents a double-scan race),
// joined with the customer's display name and the reward's name/type for the scan-result UI.
async function getCouponByCodeForScan(client, code) {
  const { rows } = await client.query(
    `SELECT c.*, p.display_name AS customer_name, r.name AS reward_name, r.type AS reward_type
     FROM coupons c
     JOIN profiles p ON p.id = c.profile_id
     JOIN rewards_catalog r ON r.id = c.reward_id
     WHERE c.code = $1
     FOR UPDATE OF c`,
    [code]
  );
  return rows[0] ?? null;
}

async function markCouponUsedWithClient(client, couponId) {
  await client.query(
    `UPDATE coupons SET status = 'used', used_at = NOW() WHERE id = $1`,
    [couponId]
  );
}

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
  getBusinessIdByUserId,
  getCouponByCodeForScan,
  markCouponUsedWithClient,
  getActiveRewardsByBusiness,
  getBusinessPointsForProfile,
  createCouponWithClient,
  insertRedemptionTransactionWithClient,
  getCouponById,
  markCouponExpiredWithClient,
  insertRefundTransactionWithClient,
  markCouponUsed,
};
