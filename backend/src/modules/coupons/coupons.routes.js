const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { getRewardsHandler, redeemHandler, expireCheckHandler, markUsedHandler } = require('./coupons.controller');

// Mounted at /businesses — handles reward listing and redemption for a business
const businessRouter = express.Router();
businessRouter.get('/:businessId/rewards',                    authenticate, getRewardsHandler);
businessRouter.post('/:businessId/rewards/:rewardId/redeem', authenticate, redeemHandler);

// Mounted at /coupons — handles coupon lifecycle operations by coupon ID
const couponRouter = express.Router();
couponRouter.post('/:id/expire-check', authenticate, expireCheckHandler);
couponRouter.post('/:id/use',          authenticate, markUsedHandler);

module.exports = { businessRouter, couponRouter };
