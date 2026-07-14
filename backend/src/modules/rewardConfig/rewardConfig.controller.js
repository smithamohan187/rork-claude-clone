const rewardConfigService = require('./rewardConfig.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getConfigHandler = asyncHandler(async (req, res) => {
  const { businessId } = req.params;
  const data = await rewardConfigService.getRewardConfigFull(businessId);
  res.json(ok(data));
});

const upsertConfigHandler = asyncHandler(async (req, res) => {
  try {
    const config = await rewardConfigService.upsertConfig(req.user.userId, req.body);
    res.json(ok({ config }));
  } catch (err) {
    if (err.message === 'No business found for this user') {
      return res.status(403).json(fail(err.message));
    }
    throw err;
  }
});

const createTierHandler = asyncHandler(async (req, res) => {
  try {
    const tier = await rewardConfigService.createTier(req.user.userId, req.body);
    res.status(201).json(ok({ tier }));
  } catch (err) {
    if (err.message === 'No business found for this user') {
      return res.status(403).json(fail(err.message));
    }
    throw err;
  }
});

const updateTierHandler = asyncHandler(async (req, res) => {
  try {
    const tier = await rewardConfigService.editTier(req.user.userId, req.params.id, req.body);
    res.json(ok({ tier }));
  } catch (err) {
    if (err.message === 'Tier not found') return res.status(404).json(fail(err.message));
    if (err.message === 'No business found for this user' ||
        err.message === 'Not authorised to modify this tier') {
      return res.status(403).json(fail(err.message));
    }
    throw err;
  }
});

const deleteTierHandler = asyncHandler(async (req, res) => {
  try {
    await rewardConfigService.deleteTier(req.user.userId, req.params.id);
    res.json(ok({ id: req.params.id }));
  } catch (err) {
    if (err.message === 'Tier not found') return res.status(404).json(fail(err.message));
    if (err.message === 'No business found for this user' ||
        err.message === 'Not authorised to modify this tier') {
      return res.status(403).json(fail(err.message));
    }
    throw err;
  }
});

const createRewardHandler = asyncHandler(async (req, res) => {
  try {
    const reward = await rewardConfigService.createReward(req.user.userId, req.body);
    res.status(201).json(ok({ reward }));
  } catch (err) {
    if (err.message === 'No business found for this user') {
      return res.status(403).json(fail(err.message));
    }
    throw err;
  }
});

const deleteRewardHandler = asyncHandler(async (req, res) => {
  try {
    await rewardConfigService.deleteReward(req.user.userId, req.params.id);
    res.json(ok({ id: req.params.id }));
  } catch (err) {
    if (err.message === 'Reward not found') return res.status(404).json(fail(err.message));
    if (err.message === 'No business found for this user' ||
        err.message === 'Not authorised to modify this reward') {
      return res.status(403).json(fail(err.message));
    }
    throw err;
  }
});

const updateRewardHandler = asyncHandler(async (req, res) => {
  try {
    const reward = await rewardConfigService.editReward(req.user.userId, req.params.id, req.body);
    res.json(ok({ reward }));
  } catch (err) {
    if (err.message === 'Reward not found') return res.status(404).json(fail(err.message));
    if (err.message === 'No business found for this user' ||
        err.message === 'Not authorised to modify this reward') {
      return res.status(403).json(fail(err.message));
    }
    throw err;
  }
});

module.exports = {
  getConfigHandler,
  upsertConfigHandler,
  createTierHandler,
  updateTierHandler,
  deleteTierHandler,
  createRewardHandler,
  deleteRewardHandler,
  updateRewardHandler,
};
