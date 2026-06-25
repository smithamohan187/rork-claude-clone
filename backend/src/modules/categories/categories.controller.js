const { fetchAllCategories, fetchAllBusinessCategories } = require('./categories.service');

async function getCategories(req, res) {
  try {
    const categories = await fetchAllCategories();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
}

async function getBusinessCategories(req, res) {
  try {
    const categories = await fetchAllBusinessCategories();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch business categories' });
  }
}

module.exports = { getCategories, getBusinessCategories };