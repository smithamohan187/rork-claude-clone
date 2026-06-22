const { fetchAllCategories } = require('./categories.service');

async function getCategories(req, res) {
  try {
    const categories = await fetchAllCategories();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
}

module.exports = { getCategories };