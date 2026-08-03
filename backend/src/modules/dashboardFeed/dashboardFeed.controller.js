// dashboardFeed.controller.js — HTTP handling only. Calls service, sends response.
const { fetchRecentActivity, fetchRecentRedemptions } = require('./dashboardFeed.service');
const { paginationSchema } = require('./dashboardFeed.validation');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Validate & coerce the limit/offset query params via the Joi schema.
function parsePagination(req, res) {
  const { error, value } = paginationSchema.validate(req.query, { stripUnknown: true });
  if (error) {
    res.status(400).json(fail(error.details[0].message));
    return null;
  }
  return value;
}

const getRecentActivityHandler = asyncHandler(async (req, res) => {
  const page = parsePagination(req, res);
  if (!page) return;
  try {
    const items = await fetchRecentActivity(req.user.userId, page.limit, page.offset);
    res.status(200).json(ok(items));
  } catch (err) {
    if (err.status === 404) return res.status(404).json(fail(err.message));
    throw err;
  }
});

const getRecentRedemptionsHandler = asyncHandler(async (req, res) => {
  const page = parsePagination(req, res);
  if (!page) return;
  try {
    const items = await fetchRecentRedemptions(req.user.userId, page.limit, page.offset);
    res.status(200).json(ok(items));
  } catch (err) {
    if (err.status === 404) return res.status(404).json(fail(err.message));
    throw err;
  }
});

module.exports = { getRecentActivityHandler, getRecentRedemptionsHandler };
