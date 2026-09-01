const reviewsService = require('./reviews.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const submitReviewHandler = asyncHandler(async (req, res) => {
  const { business_id, rating, review_text } = req.body;
  try {
    const summary = await reviewsService.submitReview(req.user.userId, business_id, rating, review_text);
    res.status(201).json(ok(summary));
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json(fail(err.message));
    }
    throw err;
  }
});

const deleteReviewHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.query;
  if (!business_id) {
    return res.status(400).json(fail('business_id query param is required'));
  }
  try {
    const summary = await reviewsService.deleteReview(req.user.userId, business_id);
    res.json(ok(summary));
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

const getRatingSummaryHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.query;
  if (!business_id) {
    return res.status(400).json(fail('business_id query param is required'));
  }
  const summary = await reviewsService.getRatingSummary(business_id);
  res.json(ok(summary));
});

const getMyReviewHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.query;
  if (!business_id) {
    return res.status(400).json(fail('business_id query param is required'));
  }
  const review = await reviewsService.getUserReview(req.user.userId, business_id);
  res.json(ok({ review }));
});

const getBusinessReviewsHandler = asyncHandler(async (req, res) => {
  const { business_id, limit = 20, offset = 0 } = req.query;
  if (!business_id) {
    return res.status(400).json(fail('business_id query param is required'));
  }
  const reviews = await reviewsService.getBusinessReviews(business_id, Number(limit), Number(offset));
  res.json(ok({ reviews }));
});

const getRatingBreakdownHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.query;
  if (!business_id) {
    return res.status(400).json(fail('business_id query param is required'));
  }
  const breakdown = await reviewsService.getRatingBreakdown(business_id);
  res.json(ok({ breakdown }));
});

module.exports = {
  submitReviewHandler,
  deleteReviewHandler,
  getRatingSummaryHandler,
  getMyReviewHandler,
  getBusinessReviewsHandler,
  getRatingBreakdownHandler,
};
