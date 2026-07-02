const { query } = require('../../config/database');

async function getBusinessRatingSummary(businessId) {
  const { rows } = await query(
    `SELECT
       COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average_rating,
       COUNT(*)::int AS review_count
     FROM business_reviews
     WHERE business_id = $1`,
    [businessId]
  );
  return rows[0];
}

async function getByProfileAndBusiness(profileId, businessId) {
  const { rows } = await query(
    'SELECT * FROM business_reviews WHERE profile_id = $1 AND business_id = $2',
    [profileId, businessId]
  );
  return rows[0] ?? null;
}

async function upsertReview(profileId, businessId, rating, reviewText) {
  const { rows } = await query(
    `INSERT INTO business_reviews (profile_id, business_id, rating, review_text)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (profile_id, business_id)
     DO UPDATE SET rating = $3, review_text = $4, updated_at = NOW()
     RETURNING *`,
    [profileId, businessId, rating, reviewText ?? null]
  );
  return rows[0];
}

async function getReviewsByBusiness(businessId, limit = 20, offset = 0) {
  const { rows } = await query(
    `SELECT br.id, br.rating, br.review_text, br.created_at, br.updated_at,
            p.display_name, p.avatar_url
     FROM business_reviews br
     JOIN profiles p ON p.id = br.profile_id
     WHERE br.business_id = $1
     ORDER BY br.created_at DESC
     LIMIT $2 OFFSET $3`,
    [businessId, limit, offset]
  );
  return rows;
}

async function getRatingBreakdown(businessId) {
  const { rows } = await query(
    `SELECT rating::int, COUNT(*)::int AS count
     FROM business_reviews
     WHERE business_id = $1
     GROUP BY rating`,
    [businessId]
  );
  const result = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const row of rows) result[row.rating] = Number(row.count);
  return result;
}

module.exports = {
  getBusinessRatingSummary,
  getByProfileAndBusiness,
  upsertReview,
  getReviewsByBusiness,
  getRatingBreakdown,
};
