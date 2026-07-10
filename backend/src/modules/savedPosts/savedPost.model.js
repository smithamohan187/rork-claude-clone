const { query } = require('../../config/database');

async function getActiveProfileId(userId) {
  const { rows } = await query(
    'SELECT active_profile_id FROM users WHERE id = $1',
    [userId]
  );
  return rows[0]?.active_profile_id ?? null;
}

async function toggleSavePost(profileId, postId) {
  const { rows: existing } = await query(
    'SELECT id FROM saved_posts WHERE profile_id = $1 AND post_id = $2',
    [profileId, postId]
  );
  if (existing.length > 0) {
    await query(
      'DELETE FROM saved_posts WHERE profile_id = $1 AND post_id = $2',
      [profileId, postId]
    );
    return { saved: false };
  }
  await query(
    `INSERT INTO saved_posts (profile_id, post_id)
     VALUES ($1, $2)
     ON CONFLICT (profile_id, post_id) DO NOTHING`,
    [profileId, postId]
  );
  return { saved: true };
}

async function getSavedPosts(profileId) {
  const { rows } = await query(
    `SELECT
       p.id,
       p.title,
       p.content,
       p.image_url,
       b.name     AS business_name,
       b.logo_url AS business_logo,
       sp.created_at AS saved_at
     FROM saved_posts sp
     INNER JOIN posts       p ON p.id = sp.post_id
     INNER JOIN businesses  b ON b.id = p.business_id
     WHERE sp.profile_id = $1
       AND p.is_active = true
     ORDER BY sp.created_at DESC`,
    [profileId]
  );
  return rows;
}

module.exports = { getActiveProfileId, toggleSavePost, getSavedPosts };
