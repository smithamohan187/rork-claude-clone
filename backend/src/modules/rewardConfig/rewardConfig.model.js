const { query } = require('../../config/database');

async function getBusinessIdByUserId(userId) {
  const { rows } = await query(
    `SELECT b.id AS business_id
     FROM businesses b
     JOIN profiles p ON p.id = b.profile_id
     WHERE p.user_id = $1
       AND p.profile_type = 'business'
       AND p.is_active = TRUE
     LIMIT 1`,
    [userId]
  );
  return rows[0]?.business_id ?? null;
}

async function getRewardConfig(businessId) {
  const { rows } = await query(
    `SELECT * FROM reward_config WHERE business_id = $1`,
    [businessId]
  );
  return rows[0] ?? null;
}

async function upsertRewardConfig(businessId, data) {
  const {
    welcome_bonus_points,
    referral_bonus_points,
    share_points,
    purchase_enabled,
    points_per_rupee,
  } = data;

  const { rows } = await query(
    `INSERT INTO reward_config
       (business_id, welcome_bonus_points, referral_bonus_points, share_points,
        purchase_enabled, points_per_rupee)
     VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), $6)
     ON CONFLICT (business_id) DO UPDATE SET
       welcome_bonus_points  = COALESCE(EXCLUDED.welcome_bonus_points,  reward_config.welcome_bonus_points),
       referral_bonus_points = COALESCE(EXCLUDED.referral_bonus_points, reward_config.referral_bonus_points),
       share_points          = COALESCE(EXCLUDED.share_points,          reward_config.share_points),
       purchase_enabled      = COALESCE(EXCLUDED.purchase_enabled,      reward_config.purchase_enabled),
       points_per_rupee      = COALESCE(EXCLUDED.points_per_rupee,      reward_config.points_per_rupee),
       updated_at            = NOW()
     RETURNING *`,
    [
      businessId,
      welcome_bonus_points ?? null,
      referral_bonus_points ?? null,
      share_points ?? null,
      purchase_enabled ?? null,
      points_per_rupee ?? null,
    ]
  );
  return rows[0];
}

async function getActiveRewards(businessId) {
  const { rows } = await query(
    `SELECT * FROM rewards_catalog
     WHERE business_id = $1 AND is_active = TRUE
     ORDER BY points_required ASC`,
    [businessId]
  );
  return rows;
}

async function getRewardById(id) {
  const { rows } = await query(
    `SELECT * FROM rewards_catalog WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

async function insertReward(data) {
  const { business_id, name, description, type, points_required, quantity_available } = data;
  const { rows } = await query(
    `INSERT INTO rewards_catalog
       (business_id, name, description, type, points_required, quantity_available)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      business_id,
      name,
      description ?? null,
      type ?? 'perk',
      points_required,
      quantity_available ?? null,
    ]
  );
  return rows[0];
}

async function softDeleteReward(id) {
  const { rows } = await query(
    `UPDATE rewards_catalog
     SET is_active = FALSE
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return rows[0] ?? null;
}

async function updateReward(id, data) {
  const { name, description, type, points_required, quantity_available } = data;
  const { rows } = await query(
    `UPDATE rewards_catalog
     SET name               = COALESCE($2, name),
         description        = COALESCE($3, description),
         type               = COALESCE($4, type),
         points_required    = COALESCE($5, points_required),
         quantity_available = COALESCE($6, quantity_available)
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [id, name ?? null, description ?? null, type ?? null,
     points_required ?? null, quantity_available ?? null]
  );
  return rows[0] ?? null;
}

module.exports = {
  getBusinessIdByUserId,
  getRewardConfig,
  upsertRewardConfig,
  getActiveRewards,
  getRewardById,
  insertReward,
  softDeleteReward,
  updateReward,
};
