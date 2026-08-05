// analytics.model.js — raw SQL only for the business analytics summary/charts.
const { query } = require('../../config/database');

// Resolve the business owned by a user via the same profile_type='business' JOIN
// used across the offers/events/rewardConfig/dashboardFeed modules. Returns null for non-owners.
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

// One row of scalar subqueries — avoids a parallel-JOIN cross-product across unrelated tables.
async function getSummaryCounts(businessId, startDate, endDate) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*) FROM subscriptions
         WHERE business_id = $1 AND subscribed_at >= $2 AND subscribed_at < $3)::int AS new_subscribers,
       (SELECT COUNT(*) FROM shares s
         JOIN offers o ON o.id = s.content_id AND s.content_type = 'offer'
         WHERE o.business_id = $1 AND s.created_at >= $2 AND s.created_at < $3)::int AS offers_shared,
       (SELECT COALESCE(SUM(points), 0) FROM points_transactions
         WHERE business_id = $1 AND points > 0 AND created_at >= $2 AND created_at < $3)::int AS points_awarded,
       (SELECT COUNT(*) FROM coupons
         WHERE business_id = $1 AND status = 'used' AND used_at >= $2 AND used_at < $3)::int AS coupons_redeemed`,
    [businessId, startDate, endDate]
  );
  return rows[0];
}

async function getRedemptionTrend(businessId, startDate, endDate) {
  const { rows } = await query(
    `SELECT DATE(used_at) AS day, COUNT(*)::int AS count
     FROM coupons
     WHERE business_id = $1 AND status = 'used' AND used_at >= $2 AND used_at < $3
     GROUP BY DATE(used_at)
     ORDER BY day`,
    [businessId, startDate, endDate]
  );
  return rows;
}

async function getSubscriberGrowth(businessId, startDate, endDate) {
  const { rows } = await query(
    `SELECT DATE(subscribed_at) AS day, COUNT(*)::int AS count
     FROM subscriptions
     WHERE business_id = $1 AND subscribed_at >= $2 AND subscribed_at < $3
     GROUP BY DATE(subscribed_at)
     ORDER BY day`,
    [businessId, startDate, endDate]
  );
  return rows;
}

// Only types that actually have positive rows show up — no hardcoded category list.
async function getPointsBreakdown(businessId, startDate, endDate) {
  const { rows } = await query(
    `SELECT type, COALESCE(SUM(points), 0)::int AS total
     FROM points_transactions
     WHERE business_id = $1 AND points > 0 AND created_at >= $2 AND created_at < $3
     GROUP BY type
     ORDER BY total DESC`,
    [businessId, startDate, endDate]
  );
  return rows;
}

async function getTopSharedOffers(businessId, startDate, endDate, limit) {
  const { rows } = await query(
    `SELECT o.id, o.title, COUNT(s.id)::int AS share_count
     FROM shares s
     JOIN offers o ON o.id = s.content_id AND s.content_type = 'offer'
     WHERE o.business_id = $1 AND s.created_at >= $2 AND s.created_at < $3
     GROUP BY o.id, o.title
     ORDER BY share_count DESC
     LIMIT $4`,
    [businessId, startDate, endDate, limit]
  );
  return rows;
}

module.exports = {
  getBusinessIdByUserId,
  getSummaryCounts,
  getRedemptionTrend,
  getSubscriberGrowth,
  getPointsBreakdown,
  getTopSharedOffers,
};
