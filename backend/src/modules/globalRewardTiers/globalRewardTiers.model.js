const { query } = require('../../config/database');

async function getActiveTiers() {
  const { rows } = await query(
    `SELECT * FROM global_reward_tiers
     WHERE is_active = TRUE
     ORDER BY sort_order ASC`
  );
  return rows;
}

module.exports = { getActiveTiers };
