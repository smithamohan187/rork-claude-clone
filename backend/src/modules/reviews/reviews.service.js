const reviewModel = require('./reviews.model');
const subscriptionModel = require('../subscriptions/subscription.model');
const { query } = require('../../config/database');

async function submitReview(userId, businessId, rating, reviewText) {
  // Resolve the caller's active profile live from the DB rather than trusting the JWT's
  // activeProfileId claim, which is baked in at login/refresh time and goes stale the moment
  // the user switches profiles (switchProfileHandler updates users.active_profile_id but does
  // not reissue a token) — same fix already applied in the chat module.
  const profileId = await subscriptionModel.getActiveProfileId(userId);
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

async function deleteReview(userId, businessId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
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

async function getUserReview(userId, businessId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
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
