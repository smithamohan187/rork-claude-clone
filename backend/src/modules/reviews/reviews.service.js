const reviewModel = require('./reviews.model');
const { query } = require('../../config/database');

async function submitReview(profileId, businessId, rating, reviewText) {
  const { rows } = await query(
    'SELECT id FROM subscriptions WHERE profile_id = $1 AND business_id = $2 AND is_active = true',
    [profileId, businessId]
  );
  if (rows.length === 0) {
    const err = new Error('Must be subscribed to review this business');
    err.statusCode = 403;
    throw err;
  }

  await reviewModel.upsertReview(profileId, businessId, rating, reviewText);
  return reviewModel.getBusinessRatingSummary(businessId);
}

async function deleteReview(profileId, businessId) {
  const deleted = await reviewModel.deleteReview(profileId, businessId);
  if (!deleted) {
    const err = new Error('No review found to delete');
    err.statusCode = 404;
    throw err;
  }
  return reviewModel.getBusinessRatingSummary(businessId);
}

async function getRatingSummary(businessId) {
  return reviewModel.getBusinessRatingSummary(businessId);
}

async function getUserReview(profileId, businessId) {
  return reviewModel.getByProfileAndBusiness(profileId, businessId);
}

async function getBusinessReviews(businessId, limit, offset) {
  return reviewModel.getReviewsByBusiness(businessId, limit, offset);
}

async function getRatingBreakdown(businessId) {
  const breakdown = await reviewModel.getRatingBreakdown(businessId);
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return Object.entries(breakdown).map(([rating, count]) => ({
    rating: Number(rating),
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
}

module.exports = {
  submitReview,
  deleteReview,
  getRatingSummary,
  getUserReview,
  getBusinessReviews,
  getRatingBreakdown,
};
