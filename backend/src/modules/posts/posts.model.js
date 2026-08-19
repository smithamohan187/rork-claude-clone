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

async function insertPost(businessId, { title, content, image_url }) {
  const { rows } = await query(
    `INSERT INTO posts (business_id, title, content, image_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [businessId, title, content, image_url ?? null]
  );
  return rows[0];
}

async function getPostById(id, profileId) {
  const { rows } = await query(
    `SELECT posts.*,
       (SELECT COUNT(*)::int FROM likes l WHERE l.content_type = 'post' AND l.content_id = posts.id) AS like_count,
       (SELECT EXISTS(SELECT 1 FROM likes l WHERE l.content_type = 'post' AND l.content_id = posts.id AND l.profile_id = $2::uuid)) AS liked_by_me,
       (SELECT COUNT(*)::int FROM comments c WHERE c.content_type = 'post' AND c.content_id = posts.id AND c.is_deleted = FALSE) AS comment_count,
       (SELECT EXISTS(SELECT 1 FROM businesses b WHERE b.id = posts.business_id AND b.profile_id = $2::uuid)) AS is_owner
     FROM posts WHERE id = $1`,
    [id, profileId ?? null]
  );
  return rows[0] ?? null;
}

async function isBusinessOwnedByProfile(businessId, profileId) {
  if (!profileId) return false;
  const { rows } = await query(
    'SELECT 1 FROM businesses WHERE id = $1 AND profile_id = $2',
    [businessId, profileId]
  );
  return rows.length > 0;
}

async function getPostsByBusinessId(businessId, isActive, profileId) {
  const hasActiveFilter = isActive !== undefined;
  const profileParamNum = hasActiveFilter ? 3 : 2;
  const params = hasActiveFilter
    ? [businessId, isActive, profileId ?? null]
    : [businessId, profileId ?? null];

  const { rows } = await query(
    `SELECT *,
       (SELECT COUNT(*)::int FROM likes l WHERE l.content_type = 'post' AND l.content_id = posts.id) AS like_count,
       (SELECT EXISTS(SELECT 1 FROM likes l WHERE l.content_type = 'post' AND l.content_id = posts.id AND l.profile_id = $${profileParamNum}::uuid)) AS liked_by_me,
       (SELECT COUNT(*)::int FROM comments c WHERE c.content_type = 'post' AND c.content_id = posts.id AND c.is_deleted = FALSE) AS comment_count
     FROM posts
     WHERE business_id = $1
       ${hasActiveFilter ? 'AND is_active = $2' : ''}
     ORDER BY created_at DESC`,
    params
  );
  return rows;
}

async function updatePost(id, { title, content, image_url, is_active }, hasImageUrl = false) {
  const { rows } = await query(
    `UPDATE posts SET
       title      = COALESCE($1, title),
       content    = COALESCE($2, content),
       image_url  = CASE WHEN $3 THEN $4 ELSE image_url END,
       is_active  = COALESCE($5, is_active),
       updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [
      title    ?? null,
      content  ?? null,
      hasImageUrl,
      image_url ?? null,
      is_active !== undefined ? is_active : null,
      id,
    ]
  );
  return rows[0] ?? null;
}

async function updatePostImageUrl(id, imageUrl) {
  const { rows } = await query(
    `UPDATE posts SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [imageUrl, id]
  );
  return rows[0] ?? null;
}

async function deletePost(id) {
  const { rows } = await query(
    `DELETE FROM posts WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] ?? null;
}

module.exports = {
  getBusinessIdByUserId,
  isBusinessOwnedByProfile,
  insertPost,
  getPostById,
  getPostsByBusinessId,
  updatePost,
  updatePostImageUrl,
  deletePost,
};
