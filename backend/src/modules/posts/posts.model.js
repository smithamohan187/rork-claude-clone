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

async function getPostById(id) {
  const { rows } = await query(
    `SELECT * FROM posts WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

async function getPostsByBusinessId(businessId, isActive) {
  const { rows } = await query(
    `SELECT * FROM posts
     WHERE business_id = $1
       ${isActive !== undefined ? 'AND is_active = $2' : ''}
     ORDER BY created_at DESC`,
    isActive !== undefined ? [businessId, isActive] : [businessId]
  );
  return rows;
}

async function updatePost(id, { title, content, image_url, is_active }) {
  const { rows } = await query(
    `UPDATE posts SET
       title      = COALESCE($1, title),
       content    = COALESCE($2, content),
       image_url  = $3,
       is_active  = COALESCE($4, is_active),
       updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      title    ?? null,
      content  ?? null,
      image_url !== undefined ? (image_url ?? null) : undefined,
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
  insertPost,
  getPostById,
  getPostsByBusinessId,
  updatePost,
  updatePostImageUrl,
  deletePost,
};
