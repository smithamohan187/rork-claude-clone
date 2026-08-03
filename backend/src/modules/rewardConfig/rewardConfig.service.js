const rewardConfigModel = require('./rewardConfig.model');

async function getRewardConfigFull(businessId) {
  const [config, rewards] = await Promise.all([
    rewardConfigModel.getRewardConfig(businessId),
    rewardConfigModel.getActiveRewards(businessId),
  ]);

  return { config, rewards };
}

async function upsertConfig(userId, payload) {
  const businessId = await rewardConfigModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');
  return rewardConfigModel.upsertRewardConfig(businessId, payload);
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
  createReward,
  deleteReward,
  editReward,
};
