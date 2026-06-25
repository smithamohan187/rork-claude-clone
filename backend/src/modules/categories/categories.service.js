const { getAllCategories, getAllBusinessCategories } = require('./categories.model');

async function fetchAllCategories() {
  return getAllCategories();
}

async function fetchAllBusinessCategories() {
  return getAllBusinessCategories();
}

module.exports = { fetchAllCategories, fetchAllBusinessCategories };