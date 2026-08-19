const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { scanSchema } = require('./coupons.validation');
const { getRewardsHandler, redeemHandler, scanHandler, expireCheckHandler, markUsedHandler } = require('./coupons.controller');

// Mounted at /businesses — handles reward listing and redemption for a business
const businessRouter = express.Router();
businessRouter.get('/:businessId/rewards',                    authenticate, getRewardsHandler);
businessRouter.post('/:businessId/rewards/:rewardId/redeem', authenticate, redeemHandler);

// Mounted at /coupons — handles coupon lifecycle operations by coupon ID
const couponRouter = express.Router();
// Scanning business's own businessId is resolved server-side from the JWT (never trust a
// caller-supplied businessId for an ownership check) — no :businessId param needed here.
couponRouter.post('/scan',             authenticate, validateRequest(scanSchema), scanHandler);
couponRouter.post('/:id/expire-check', authenticate, expireCheckHandler);
couponRouter.post('/:id/use',          authenticate, markUsedHandler);

module.exports = { businessRouter, couponRouter };
