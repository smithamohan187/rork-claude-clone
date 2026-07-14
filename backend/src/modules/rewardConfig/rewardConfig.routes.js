const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const {
  upsertConfigSchema,
  createTierSchema,
  updateTierSchema,
  createRewardSchema,
  updateRewardSchema,
} = require('./rewardConfig.validation');
const {
  getConfigHandler,
  upsertConfigHandler,
  createTierHandler,
  updateTierHandler,
  deleteTierHandler,
  createRewardHandler,
  deleteRewardHandler,
  updateRewardHandler,
} = require('./rewardConfig.controller');

const router = Router();

// Reward config
router.get('/reward-config/:businessId', authenticate, getConfigHandler);
router.put('/reward-config/:businessId', authenticate, validateRequest(upsertConfigSchema), upsertConfigHandler);

// Reward tiers
router.post('/reward-tiers',     authenticate, validateRequest(createTierSchema), createTierHandler);
router.put('/reward-tiers/:id',  authenticate, validateRequest(updateTierSchema), updateTierHandler);
router.delete('/reward-tiers/:id', authenticate, deleteTierHandler);

// Rewards catalog
router.post('/rewards-catalog',       authenticate, validateRequest(createRewardSchema), createRewardHandler);
router.put('/rewards-catalog/:id',    authenticate, validateRequest(updateRewardSchema), updateRewardHandler);
router.delete('/rewards-catalog/:id', authenticate, deleteRewardHandler);

module.exports = router;
