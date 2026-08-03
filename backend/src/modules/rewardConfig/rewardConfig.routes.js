const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const {
  upsertConfigSchema,
  createRewardSchema,
  updateRewardSchema,
} = require('./rewardConfig.validation');
const {
  getConfigHandler,
  upsertConfigHandler,
  createRewardHandler,
  deleteRewardHandler,
  updateRewardHandler,
} = require('./rewardConfig.controller');

const router = Router();

// Reward config
router.get('/reward-config/:businessId', authenticate, getConfigHandler);
router.put('/reward-config/:businessId', authenticate, validateRequest(upsertConfigSchema), upsertConfigHandler);

// Rewards catalog
router.post('/rewards-catalog',       authenticate, validateRequest(createRewardSchema), createRewardHandler);
router.put('/rewards-catalog/:id',    authenticate, validateRequest(updateRewardSchema), updateRewardHandler);
router.delete('/rewards-catalog/:id', authenticate, deleteRewardHandler);

module.exports = router;
