// dashboardFeed.model.js — raw SQL only for the business dashboard activity/redemptions feed.
const { query } = require('../../config/database');

// Resolve the business owned by a user via the same profile_type='business' JOIN
// used across the offers/events/rewardConfig modules. Returns null for non-owners.
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

// Unified activity feed: five activity types merged with UNION ALL, each normalized to the
// same column shape, then ordered/paginated in an outer query. Likes/comments join through
// their polymorphic content_id to the owning business (mirrors likes.model.js). Referrals
// come from BOTH customer_invites and the legacy referrals table.
async function getRecentActivity(businessId, limit, offset) {
  const { rows } = await query(
    `SELECT activity_type, actor_profile_id, actor_name, actor_avatar, content_type, reference_id, created_at
     FROM (
       SELECT 'redemption'::text AS activity_type, p.id AS actor_profile_id,
              p.display_name AS actor_name, p.avatar_url AS actor_avatar,
              NULL::text AS content_type, c.id AS reference_id, c.used_at AS created_at
       FROM coupons c
       JOIN rewards_catalog rc ON rc.id = c.reward_id
       JOIN profiles p ON p.id = c.profile_id
       WHERE c.business_id = $1 AND c.status = 'used'

       UNION ALL

       SELECT 'subscriber'::text, p.id, p.display_name, p.avatar_url,
              NULL::text, s.id, s.subscribed_at
       FROM subscriptions s
       JOIN profiles p ON p.id = s.profile_id
       WHERE s.business_id = $1 AND s.is_active = true

       UNION ALL

       SELECT 'like'::text, p.id, p.display_name, p.avatar_url,
              l.content_type, l.id, l.created_at
       FROM likes l
       JOIN offers o ON o.id = l.content_id AND l.content_type = 'offer'
       JOIN profiles p ON p.id = l.profile_id
       WHERE o.business_id = $1

       UNION ALL

       SELECT 'like'::text, p.id, p.display_name, p.avatar_url,
              l.content_type, l.id, l.created_at
       FROM likes l
       JOIN events e ON e.id = l.content_id AND l.content_type = 'event'
       JOIN profiles p ON p.id = l.profile_id
       WHERE e.business_id = $1

       UNION ALL

       SELECT 'like'::text, p.id, p.display_name, p.avatar_url,
              l.content_type, l.id, l.created_at
       FROM likes l
       JOIN posts po ON po.id = l.content_id AND l.content_type = 'post'
       JOIN profiles p ON p.id = l.profile_id
       WHERE po.business_id = $1

       UNION ALL

       SELECT 'comment'::text, p.id, p.display_name, p.avatar_url,
              cm.content_type, cm.id, cm.created_at
       FROM comments cm
       JOIN offers o ON o.id = cm.content_id AND cm.content_type = 'offer'
       JOIN profiles p ON p.id = cm.profile_id
       WHERE o.business_id = $1 AND cm.is_deleted = false

       UNION ALL

       SELECT 'comment'::text, p.id, p.display_name, p.avatar_url,
              cm.content_type, cm.id, cm.created_at
       FROM comments cm
       JOIN events e ON e.id = cm.content_id AND cm.content_type = 'event'
       JOIN profiles p ON p.id = cm.profile_id
       WHERE e.business_id = $1 AND cm.is_deleted = false

       UNION ALL

       SELECT 'comment'::text, p.id, p.display_name, p.avatar_url,
              cm.content_type, cm.id, cm.created_at
       FROM comments cm
       JOIN posts po ON po.id = cm.content_id AND cm.content_type = 'post'
       JOIN profiles p ON p.id = cm.profile_id
       WHERE po.business_id = $1 AND cm.is_deleted = false

       UNION ALL

       SELECT 'referral'::text, p.id, p.display_name, p.avatar_url,
              NULL::text, ci.id, COALESCE(ci.subscribed_at, ci.registered_at)
       FROM customer_invites ci
       JOIN profiles p ON p.id = ci.registered_profile_id
       WHERE ci.business_id = $1 AND ci.status IN ('registered', 'subscribed')

       UNION ALL

       SELECT 'referral'::text, p.id, p.display_name, p.avatar_url,
              NULL::text, r.id, COALESCE(r.completed_at, r.created_at)
       FROM referrals r
       JOIN profiles p ON p.id = r.referred_profile_id
       WHERE r.business_id = $1 AND r.type = 'business'
     ) activity
     WHERE created_at IS NOT NULL
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [businessId, limit, offset]
  );
  return rows;
}

// Detailed redemptions list: coupons marked 'used' joined to the redeemed reward and the
// customer profile. Ordered newest-first, paginated.
async function getRecentRedemptions(businessId, limit, offset) {
  const { rows } = await query(
    `SELECT c.id AS reference_id,
            p.display_name AS customer_name,
            p.avatar_url AS customer_avatar,
            rc.name AS reward_name,
            c.points_cost,
            c.used_at
     FROM coupons c
     JOIN rewards_catalog rc ON rc.id = c.reward_id
     JOIN profiles p ON p.id = c.profile_id
     WHERE c.business_id = $1 AND c.status = 'used'
     ORDER BY c.used_at DESC
     LIMIT $2 OFFSET $3`,
    [businessId, limit, offset]
  );
  return rows;
}

module.exports = {
  getBusinessIdByUserId,
  getRecentActivity,
  getRecentRedemptions,
};
