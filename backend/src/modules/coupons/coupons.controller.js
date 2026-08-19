const { ok } = require('../../utils/apiResponse');
const couponsService = require('./coupons.service');

async function getRewardsHandler(req, res, next) {
  try {
    const rewards = await couponsService.getRedeemableRewards(req.user.userId, req.params.businessId);
    res.json(ok({ rewards }));
  } catch (err) {
    next(err);
  }
}

async function redeemHandler(req, res, next) {
  try {
    const result = await couponsService.redeemReward(
      req.user.userId,
      req.params.businessId,
      req.params.rewardId
    );
    res.status(201).json(ok(result));
  } catch (err) {
    next(err);
  }
}

async function scanHandler(req, res, next) {
  try {
    const result = await couponsService.scanCoupon(req.user.userId, req.body.code);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

async function expireCheckHandler(req, res, next) {
  try {
    const result = await couponsService.checkAndExpireCoupon(req.params.id);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

async function markUsedHandler(req, res, next) {
  try {
    const result = await couponsService.confirmCouponUsed(req.params.id);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

module.exports = { getRewardsHandler, redeemHandler, scanHandler, expireCheckHandler, markUsedHandler };
