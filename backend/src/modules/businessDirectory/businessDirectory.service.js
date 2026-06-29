// Service layer — business logic only. No pool.query() calls allowed here.
const { getBusinessDirectory, getBusinessCategories } = require('./businessDirectory.model');

/**
 * Fetch a page of the business directory with optional search/category filters.
 * Passes filters straight to the model; no transformation needed at this stage.
 *
 * @param {{ search: string|null, category: string|null, limit: number, offset: number }} filters
 * @returns {{ rows: Object[], total: number }}
 */
async function listBusinesses(filters) {
  return getBusinessDirectory(filters);
}

/**
 * Fetch the list of distinct business types available for filter chips.
 * @returns {string[]}
 */
async function fetchCategories() {
  return getBusinessCategories();
}

module.exports = {
  listBusinesses,
  fetchCategories,
};
