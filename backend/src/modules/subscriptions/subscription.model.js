const { query } = require('../../config/database');

async function getActiveProfileId(userId) {
  const { rows } = await query(
    'SELECT active_profile_id FROM users WHERE id = $1',
    [userId]
  );
  return rows[0]?.active_profile_id ?? null;
}

async function getSubscription(profileId, businessId) {
  const { rows } = await query(
    'SELECT * FROM subscriptions WHERE profile_id = $1 AND business_id = $2',
    [profileId, businessId]
  );
  return rows[0] ?? null;
}

async function subscribe(profileId, businessId) {
  const { rows } = await query(
    `INSERT INTO subscriptions (profile_id, business_id)
     VALUES ($1, $2)
     ON CONFLICT (profile_id, business_id)
       DO UPDATE SET is_active = true, subscribed_at = NOW(), unsubscribed_at = NULL
     RETURNING *`,
    [profileId, businessId]
  );
  return rows[0];
}

async function subscribeWithClient(client, profileId, businessId) {
  const { rows } = await client.query(
    `INSERT INTO subscriptions (profile_id, business_id)
     VALUES ($1, $2)
     ON CONFLICT (profile_id, business_id)
       DO UPDATE SET is_active = true, subscribed_at = NOW(), unsubscribed_at = NULL
     RETURNING *`,
    [profileId, businessId]
  );
  return rows[0];
}

async function unsubscribe(profileId, businessId) {
  const { rows } = await query(
    `UPDATE subscriptions
     SET is_active = false, unsubscribed_at = NOW()
     WHERE profile_id = $1 AND business_id = $2
     RETURNING *`,
    [profileId, businessId]
  );
  return rows[0] ?? null;
}

async function getSubscriberCount(businessId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS count FROM subscriptions WHERE business_id = $1 AND is_active = true',
    [businessId]
  );
  return rows[0]?.count ?? 0;
}

async function getSubscribedBusinesses(profileId) {
  const { rows } = await query(
    `SELECT
       b.id,
       b.profile_id AS business_profile_id,
       b.name,
       b.description,
       b.cover_url,
       b.logo_url,
       bc.name AS category_name,
       s.subscribed_at,
       COALESCE(
         (SELECT ROUND(AVG(rating)::numeric, 1)
          FROM business_reviews WHERE business_id = b.id), 0
       ) AS avg_rating,
       COALESCE(
         (SELECT COUNT(*)::int FROM offers
          WHERE business_id = b.id
            AND status = 'active'
            AND (expires_at IS NULL OR expires_at > NOW())), 0
       ) AS active_offer_count,
       COALESCE(
         (SELECT SUM(points)::int FROM points_transactions
          WHERE profile_id = s.profile_id AND business_id = b.id), 0
       ) AS points
     FROM subscriptions s
     JOIN businesses b ON b.id = s.business_id
     LEFT JOIN business_categories bc ON bc.id = b.category_id
     WHERE s.profile_id = $1 AND s.is_active = true
     ORDER BY s.subscribed_at DESC`,
    [profileId]
  );
  return rows;
}

async function getSubscriptionByUserId(userId, businessId) {
  const { rows } = await query(
    `SELECT s.is_active FROM subscriptions s
     JOIN profiles p ON s.profile_id = p.id
     WHERE p.user_id = $1 AND s.business_id = $2 AND s.is_active = true
     LIMIT 1`,
    [userId, businessId]
  );
  return rows[0] ?? null;
}

async function getBusinessIdByUserId(userId) {
  const { rows } = await query(
    `SELECT b.id AS business_id FROM businesses b
     JOIN profiles p ON p.id = b.profile_id
     WHERE p.user_id = $1 AND p.profile_type = 'business' AND p.is_active = TRUE LIMIT 1`,
    [userId]
  );
  return rows[0]?.business_id ?? null;
}

async function getBusinessMembers(businessId) {
  const { rows } = await query(
    `SELECT
       p.id           AS profile_id,
       p.display_name,
       p.avatar_url,
       p.city,
       s.subscribed_at,
       up.current_balance
     FROM subscriptions s
     INNER JOIN profiles p   ON p.id = s.profile_id
     LEFT  JOIN user_points up
           ON up.profile_id = s.profile_id AND up.business_id = s.business_id
     WHERE s.business_id = $1 AND s.is_active = true
     ORDER BY s.subscribed_at DESC`,
    [businessId]
  );
  return rows;
}

async function removeSubscriber(businessId, memberProfileId) {
  await query(
    `UPDATE subscriptions SET is_active = false, unsubscribed_at = NOW()
     WHERE business_id = $1 AND profile_id = $2`,
    [businessId, memberProfileId]
  );
}

module.exports = {
  getActiveProfileId,
  getSubscription,
  getSubscriptionByUserId,
  subscribe,
  subscribeWithClient,
  unsubscribe,
  getSubscriberCount,
  getSubscribedBusinesses,
  getBusinessIdByUserId,
  getBusinessMembers,
  removeSubscriber,
};
