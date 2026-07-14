const { query } = require('../../config/database');

async function logShare({ content_type, content_id, sharer_profile_id, channel }) {
  const { rows } = await query(
    `INSERT INTO shares (content_type, content_id, sharer_profile_id, channel)
     VALUES ($1, $2, $3, $4)
     RETURNING id, content_type, content_id, sharer_profile_id, channel, created_at`,
    [content_type, content_id, sharer_profile_id, channel]
  );
  return rows[0];
}

async function getShareCount(content_type, content_id) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS share_count
     FROM shares WHERE content_type = $1 AND content_id = $2`,
    [content_type, content_id]
  );
  return rows[0].share_count;
}

module.exports = { logShare, getShareCount };
