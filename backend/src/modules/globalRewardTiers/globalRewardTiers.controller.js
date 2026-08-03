const globalRewardTiersService = require('./globalRewardTiers.service');
const { ok } = require('../../utils/apiResponse');

async function getTierHandler(req, res, next) {
  try {
    const tier = await globalRewardTiersService.getUserGlobalTierByUserId(req.user.userId);
    res.json(ok(tier));
  } catch (err) {
    next(err);
  }
}

module.exports = { getTierHandler };
