// Controller layer — reads req, calls service, sends res. No SQL or business logic here.
const { listBusinesses, fetchCategories } = require('./businessDirectory.service');
const { ok } = require('../../utils/apiResponse');

// Wraps async handlers so thrown errors propagate to the global error handler via next(err)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * GET /business-directory
 * Reads search, category, page from query string.
 * Returns paginated businesses with subscriber counts and ratings.
 */
const listBusinessesHandler = asyncHandler(async (req, res) => {
  const { search = null, category = null, page = 1 } = req.query;

  // Calculate pagination — Joi validates page is an integer >= 1
  const limit  = 20;
  const offset = (Number(page) - 1) * limit;

  const { rows: businesses, total } = await listBusinesses({
    search:   search   || null,
    category: category || null,
    limit,
    offset,
  });

  // Return businesses alongside pagination metadata so the client knows when to stop loading more
  res.status(200).json(ok({ businesses, total, page: Number(page) }));
});

/**
 * GET /business-directory/categories
 * Returns the distinct business_type values for populating filter chips.
 */
const getCategoriesHandler = asyncHandler(async (req, res) => {
  console.log('Fetching business categories...');
  const categories = await fetchCategories();
  res.status(200).json(ok({ categories }));
});

module.exports = {
  listBusinessesHandler,
  getCategoriesHandler,
};
