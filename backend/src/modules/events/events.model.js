// events.model.js — raw SQL queries for the events module. No business logic.
const { query } = require('../../config/database');

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

// Derived status expression reused in every SELECT
const EFFECTIVE_STATUS_CASE = `
  CASE
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN starts_at < NOW() THEN 'past'
    ELSE 'upcoming'
  END AS effective_status
`;

async function insertEvent(data) {
  const { business_id, title, description, location, starts_at, ends_at, image_url } = data;
  const { rows } = await query(
    `INSERT INTO events
       (business_id, title, description, location, starts_at, ends_at, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *, ${EFFECTIVE_STATUS_CASE}`,
    [
      business_id,
      title,
      description ?? null,
      location ?? null,
      starts_at,
      ends_at ?? null,
      image_url ?? null,
    ]
  );
  return rows[0];
}

async function getEventsByBusiness(businessId, filter) {
  let whereClause = 'WHERE business_id = $1';
  if (filter === 'upcoming') {
    whereClause += " AND status != 'cancelled' AND starts_at > NOW()";
  } else if (filter === 'past') {
    whereClause += " AND status != 'cancelled' AND starts_at < NOW()";
  } else if (filter === 'cancelled') {
    whereClause += " AND status = 'cancelled'";
  }

  // Upcoming ordered soonest first; past/cancelled most recent first
  const order =
    filter === 'upcoming' ? 'ORDER BY starts_at ASC' : 'ORDER BY starts_at DESC';

  const { rows } = await query(
    `SELECT *, ${EFFECTIVE_STATUS_CASE}
     FROM events
     ${whereClause}
     ${order}`,
    [businessId]
  );
  return rows;
}

async function getEventById(eventId) {
  const { rows } = await query(
    `SELECT *, ${EFFECTIVE_STATUS_CASE}
     FROM events
     WHERE id = $1`,
    [eventId]
  );
  return rows[0] ?? null;
}

async function updateEvent(eventId, data) {
  const { title, description, location, starts_at, ends_at, image_url } = data;
  const { rows } = await query(
    `UPDATE events SET
       title       = COALESCE($1, title),
       description = COALESCE($2, description),
       location    = COALESCE($3, location),
       starts_at   = COALESCE($4, starts_at),
       ends_at     = $5,
       image_url   = COALESCE($6, image_url),
       updated_at  = NOW()
     WHERE id = $7
     RETURNING *, ${EFFECTIVE_STATUS_CASE}`,
    [
      title ?? null,
      description ?? null,
      location ?? null,
      starts_at ?? null,
      ends_at ?? null,
      image_url ?? null,
      eventId,
    ]
  );
  return rows[0] ?? null;
}

async function cancelEvent(eventId) {
  const { rows } = await query(
    `UPDATE events
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1
     RETURNING *, ${EFFECTIVE_STATUS_CASE}`,
    [eventId]
  );
  return rows[0] ?? null;
}

async function updateEventImageUrl(eventId, imageUrl) {
  const { rows } = await query(
    `UPDATE events SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *, ${EFFECTIVE_STATUS_CASE}`,
    [imageUrl, eventId]
  );
  return rows[0] ?? null;
}

module.exports = {
  getBusinessIdByUserId,
  insertEvent,
  getEventsByBusiness,
  getEventById,
  updateEvent,
  cancelEvent,
  updateEventImageUrl,
};
