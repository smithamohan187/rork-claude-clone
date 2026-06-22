const { getAllCategories } = require('./categories.model');

async function fetchAllCategories() {
  return getAllCategories();
}

module.exports = { fetchAllCategories };