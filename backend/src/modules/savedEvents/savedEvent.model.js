const { query } = require('../../config/database');

async function getActiveProfileId(userId) {
  const { rows } = await query(
    'SELECT active_profile_id FROM users WHERE id = $1',
    [userId]
  );
  return rows[0]?.active_profile_id ?? null;
}

async function toggleSaveEvent(profileId, eventId) {
  const { rows: existing } = await query(
    'SELECT id FROM saved_events WHERE profile_id = $1 AND event_id = $2',
    [profileId, eventId]
  );
  if (existing.length > 0) {
    await query(
      'DELETE FROM saved_events WHERE profile_id = $1 AND event_id = $2',
      [profileId, eventId]
    );
    return { saved: false };
  }
  await query(
    `INSERT INTO saved_events (profile_id, event_id)
     VALUES ($1, $2)
     ON CONFLICT (profile_id, event_id) DO NOTHING`,
    [profileId, eventId]
  );
  return { saved: true };
}

async function getSavedEvents(profileId) {
  const { rows } = await query(
    `SELECT
       e.id,
       e.title,
       e.description,
       e.image_url,
       e.location,
       e.starts_at,
       e.ends_at,
       e.status,
       e.event_type,
       b.name     AS business_name,
       b.logo_url AS business_logo,
       se.created_at AS saved_at
     FROM saved_events se
     INNER JOIN events      e ON e.id = se.event_id
     INNER JOIN businesses  b ON b.id = e.business_id
     WHERE se.profile_id = $1
       AND e.status != 'cancelled'
     ORDER BY se.created_at DESC`,
    [profileId]
  );
  return rows;
}

module.exports = { getActiveProfileId, toggleSaveEvent, getSavedEvents };
