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

async function insertMedia(businessId, imageUrl) {
  const { rows } = await query(
    `INSERT INTO business_media (business_id, image_url)
     VALUES ($1, $2)
     RETURNING *`,
    [businessId, imageUrl]
  );
  return rows[0];
}

async function listMedia(businessId, limit, offset) {
  const { rows } = await query(
    `SELECT * FROM business_media
     WHERE business_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [businessId, limit, offset]
  );
  return rows;
}

async function deleteMedia(id, businessId) {
  const { rows } = await query(
    `DELETE FROM business_media WHERE id = $1 AND business_id = $2 RETURNING id`,
    [id, businessId]
  );
  return rows[0] ?? null;
}

module.exports = {
  getBusinessIdByUserId,
  insertMedia,
  listMedia,
  deleteMedia,
};
