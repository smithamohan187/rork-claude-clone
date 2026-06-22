const { query } = require('../../config/database');

async function getAllCategories() {
  const { rows } = await query(
    'SELECT id, name FROM interest_categories WHERE is_active = true ORDER BY sort_order ASC, name ASC'
  );
  return rows;
}

module.exports = { getAllCategories };