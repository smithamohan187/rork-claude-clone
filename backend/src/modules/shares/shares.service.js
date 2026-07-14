const sharesModel = require('./shares.model');
const { query } = require('../../config/database');

async function logShare({ userId, content_type, content_id, channel }) {
  const { rows } = await query(
    'SELECT active_profile_id FROM users WHERE id = $1',
    [userId]
  );
  const sharer_profile_id = rows[0]?.active_profile_id ?? null;
  if (!sharer_profile_id) {
    throw Object.assign(new Error('No active profile found'), { status: 400 });
  }
  return sharesModel.logShare({ content_type, content_id, sharer_profile_id, channel });
}

module.exports = { logShare };
