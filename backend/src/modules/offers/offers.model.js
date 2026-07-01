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

async function insertOffer(data) {
  const {
    business_id, title, description, image_url,
    discount_type, discount_value, original_price,
    terms, max_redemptions, starts_at, expires_at, status,
  } = data;

  const { rows } = await query(
    `INSERT INTO offers
       (business_id, title, description, image_url,
        discount_type, discount_value, original_price,
        terms, max_redemptions, starts_at, expires_at, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      business_id, title, description ?? null, image_url ?? null,
      discount_type ?? null, discount_value ?? null, original_price ?? null,
      terms ?? null, max_redemptions ?? null,
      starts_at ?? null, expires_at ?? null,
      status ?? 'active',
    ]
  );
  return rows[0];
}

async function updateOffer(offerId, data) {
  const {
    title, description, image_url, discount_type, discount_value,
    original_price, terms, max_redemptions, starts_at, expires_at, status,
  } = data;

  const { rows } = await query(
    `UPDATE offers SET
       title           = COALESCE($1, title),
       description     = COALESCE($2, description),
       image_url       = $3,
       discount_type   = $4,
       discount_value  = $5,
       original_price  = $6,
       terms           = $7,
       max_redemptions = $8,
       starts_at       = $9,
       expires_at      = $10,
       status          = COALESCE($11, status),
       updated_at      = NOW()
     WHERE id = $12
     RETURNING *`,
    [
      title ?? null, description ?? null, image_url ?? null,
      discount_type ?? null, discount_value ?? null, original_price ?? null,
      terms ?? null, max_redemptions ?? null,
      starts_at ?? null, expires_at ?? null,
      status ?? null, offerId,
    ]
  );
  return rows[0] ?? null;
}

async function toggleOfferStatus(offerId, newStatus) {
  // Cannot re-enable if the offer has expired (either stored or natural expiry)
  if (newStatus === 'active') {
    const { rows: check } = await query(
      `SELECT id FROM offers
       WHERE id = $1
         AND (status = 'expired'
           OR (expires_at IS NOT NULL AND expires_at < NOW()))`,
      [offerId]
    );
    if (check.length > 0) {
      throw new Error('Cannot re-enable an expired offer');
    }
  }

  const { rows } = await query(
    `UPDATE offers
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *,
       CASE
         WHEN $1 = 'expired' THEN 'expired'
         WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'expired'
         ELSE $1
       END AS effective_status`,
    [newStatus, offerId]
  );
  return rows[0] ?? null;
}

async function getOffersByBusinessId(businessId) {
  const { rows } = await query(
    `SELECT *,
       CASE
         WHEN status = 'expired' THEN 'expired'
         WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'expired'
         ELSE status
       END AS effective_status
     FROM offers
     WHERE business_id = $1
     ORDER BY created_at DESC`,
    [businessId]
  );
  return rows;
}

async function getOfferById(offerId) {
  const { rows } = await query(
    `SELECT *,
       CASE
         WHEN status = 'expired' THEN 'expired'
         WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'expired'
         ELSE status
       END AS effective_status
     FROM offers
     WHERE id = $1`,
    [offerId]
  );
  return rows[0] ?? null;
}

async function deleteOffer(offerId) {
  const { rows } = await query(
    `DELETE FROM offers WHERE id = $1 RETURNING id`,
    [offerId]
  );
  return rows[0] ?? null;
}

async function getActiveOffersByBusinessId(businessId) {
  const { rows } = await query(
    `SELECT *,
       CASE
         WHEN status = 'expired' THEN 'expired'
         WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'expired'
         ELSE status
       END AS effective_status
     FROM offers
     WHERE business_id = $1
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC`,
    [businessId]
  );
  return rows;
}

async function updateOfferImageUrl(offerId, imageUrl) {
  const { rows } = await query(
    `UPDATE offers SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [imageUrl, offerId]
  );
  return rows[0] ?? null;
}

module.exports = {
  getBusinessIdByUserId,
  insertOffer,
  updateOffer,
  updateOfferImageUrl,
  deleteOffer,
  toggleOfferStatus,
  getOffersByBusinessId,
  getOfferById,
  getActiveOffersByBusinessId,
};
