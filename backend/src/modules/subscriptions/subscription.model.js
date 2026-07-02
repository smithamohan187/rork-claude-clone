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

module.exports = {
  getActiveProfileId,
  getSubscription,
  subscribe,
  unsubscribe,
  getSubscriberCount,
};
