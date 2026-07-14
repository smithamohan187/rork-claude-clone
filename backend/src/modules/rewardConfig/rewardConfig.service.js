const rewardConfigModel = require('./rewardConfig.model');

async function getRewardConfigFull(businessId) {
  const [config, tiers, rewards] = await Promise.all([
    rewardConfigModel.getRewardConfig(businessId),
    rewardConfigModel.getActiveTiers(businessId),
    rewardConfigModel.getActiveRewards(businessId),
  ]);

  const tiersWithPerks = tiers.map((t) => ({
    ...t,
    perks: t.perks ? JSON.parse(t.perks) : [],
  }));

  return { config, tiers: tiersWithPerks, rewards };
}

async function upsertConfig(userId, payload) {
  const businessId = await rewardConfigModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');
  return rewardConfigModel.upsertRewardConfig(businessId, payload);
}

async function createTier(userId, payload) {
  const businessId = await rewardConfigModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');

  const perksJson = Array.isArray(payload.perks)
    ? JSON.stringify(payload.perks)
    : null;

  const tier = await rewardConfigModel.insertTier({ ...payload, business_id: businessId, perks: perksJson });
  return { ...tier, perks: tier.perks ? JSON.parse(tier.perks) : [] };
}

async function editTier(userId, tierId, payload) {
  const businessId = await rewardConfigModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');

  const tier = await rewardConfigModel.getTierById(tierId);
  if (!tier) throw new Error('Tier not found');
  if (tier.business_id !== businessId) throw new Error('Not authorised to modify this tier');

  const perksJson =
    payload.perks !== undefined
      ? Array.isArray(payload.perks)
        ? JSON.stringify(payload.perks)
        : null
      : undefined;

  const updated = await rewardConfigModel.updateTier(tierId, {
    ...payload,
    perks: perksJson,
  });
  if (!updated) throw new Error('Tier not found');
  return { ...updated, perks: updated.perks ? JSON.parse(updated.perks) : [] };
}

async function deleteTier(userId, tierId) {
  const businessId = await rewardConfigModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');

  const tier = await rewardConfigModel.getTierById(tierId);
  if (!tier) throw new Error('Tier not found');
  if (tier.business_id !== businessId) throw new Error('Not authorised to modify this tier');

  const deleted = await rewardConfigModel.softDeleteTier(tierId);
  if (!deleted) throw new Error('Tier not found');
}

async function createReward(userId, payload) {
  const businessId = await rewardConfigModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');
  return rewardConfigModel.insertReward({ ...payload, business_id: businessId });
}

async function deleteReward(userId, rewardId) {
  const businessId = await rewardConfigModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');

  const reward = await rewardConfigModel.getRewardById(rewardId);
  if (!reward) throw new Error('Reward not found');
  if (reward.business_id !== businessId) throw new Error('Not authorised to modify this reward');

  const deleted = await rewardConfigModel.softDeleteReward(rewardId);
  if (!deleted) throw new Error('Reward not found');
}

async function editReward(userId, rewardId, payload) {
  const businessId = await rewardConfigModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');

  const reward = await rewardConfigModel.getRewardById(rewardId);
  if (!reward) throw new Error('Reward not found');
  if (reward.business_id !== businessId) throw new Error('Not authorised to modify this reward');

  const updated = await rewardConfigModel.updateReward(rewardId, payload);
  if (!updated) throw new Error('Reward not found');
  return updated;
}

module.exports = {
  getRewardConfigFull,
  upsertConfig,
  createTier,
  editTier,
  deleteTier,
  createReward,
  deleteReward,
  editReward,
};
