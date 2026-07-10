const { query } = require('../../config/database');

async function getActiveProfileId(userId) {
  const { rows } = await query(
    'SELECT active_profile_id FROM users WHERE id = $1',
    [userId]
  );
  return rows[0]?.active_profile_id ?? null;
}

async function toggleSaveOffer(profileId, offerId) {
  const { rows: existing } = await query(
    'SELECT id FROM saved_offers WHERE profile_id = $1 AND offer_id = $2',
    [profileId, offerId]
  );
  if (existing.length > 0) {
    await query(
      'DELETE FROM saved_offers WHERE profile_id = $1 AND offer_id = $2',
      [profileId, offerId]
    );
    return { saved: false };
  }
  await query(
    `INSERT INTO saved_offers (profile_id, offer_id)
     VALUES ($1, $2)
     ON CONFLICT (profile_id, offer_id) DO NOTHING`,
    [profileId, offerId]
  );
  return { saved: true };
}

async function getSavedOffers(profileId) {
  const { rows } = await query(
    `SELECT
       o.id,
       o.title,
       o.description,
       o.image_url,
       o.expires_at,
       o.status,
       b.name     AS business_name,
       b.logo_url AS business_logo,
       so.created_at AS saved_at
     FROM saved_offers so
     INNER JOIN offers     o ON o.id = so.offer_id
     INNER JOIN businesses b ON b.id = o.business_id
     WHERE so.profile_id = $1
     ORDER BY so.created_at DESC`,
    [profileId]
  );
  return rows;
}

module.exports = { getActiveProfileId, toggleSaveOffer, getSavedOffers };
