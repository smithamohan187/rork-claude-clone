// notifications.model.js — raw SQL queries for the notifications module. No business logic.
const { query } = require('../../config/database');

// Mutating helpers accept an optional `client` so callers can run them inside an
// existing transaction (e.g. subscribe / redeem / offer-create hooks). Falls back to the pool otherwise.
const runner = (client) => (client ? (text, params) => client.query(text, params) : query);

async function insertNotification(client, { profileId, type, title, body, data }) {
  const q = runner(client);
  const { rows } = await q(
    `INSERT INTO notifications (profile_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [profileId, type, title ?? null, body ?? null, data ? JSON.stringify(data) : null],
  );
  return rows[0];
}

async function insertNotificationsBulk(client, profileIds, { type, title, body, data }) {
  if (!profileIds || profileIds.length === 0) return [];
  const q = runner(client);
  const { rows } = await q(
    `INSERT INTO notifications (profile_id, type, title, body, data)
     SELECT unnest($1::uuid[]), $2, $3, $4, $5
     RETURNING *`,
    [profileIds, type, title ?? null, body ?? null, data ? JSON.stringify(data) : null],
  );
  return rows;
}

async function getActiveSubscriberProfileIds(client, businessId) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT profile_id FROM subscriptions WHERE business_id = $1 AND is_active = true`,
    [businessId],
  );
  return rows.map((r) => r.profile_id);
}

async function getNotificationsByProfile(profileId, { unreadOnly, limit, offset }) {
  const { rows } = await query(
    `SELECT * FROM notifications
      WHERE profile_id = $1
        AND ($2::boolean IS NOT TRUE OR is_read = FALSE)
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4`,
    [profileId, unreadOnly ?? false, limit, offset],
  );
  return rows;
}

async function markReadById(profileId, notificationId) {
  const { rows } = await query(
    `UPDATE notifications SET is_read = TRUE
      WHERE id = $1 AND profile_id = $2
      RETURNING *`,
    [notificationId, profileId],
  );
  return rows[0] ?? null;
}

async function markAllRead(profileId) {
  const { rowCount } = await query(
    `UPDATE notifications SET is_read = TRUE WHERE profile_id = $1 AND is_read = FALSE`,
    [profileId],
  );
  return rowCount;
}

async function getUnreadCount(profileId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE profile_id = $1 AND is_read = FALSE`,
    [profileId],
  );
  return rows[0]?.count ?? 0;
}

module.exports = {
  insertNotification,
  insertNotificationsBulk,
  getActiveSubscriberProfileIds,
  getNotificationsByProfile,
  markReadById,
  markAllRead,
  getUnreadCount,
};
