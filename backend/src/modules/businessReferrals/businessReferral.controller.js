const businessReferralService = require('./businessReferral.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getMyReferralHandler = asyncHandler(async (req, res) => {
  const { businessId } = req.params;
  try {
    const result = await businessReferralService.getMyReferralForBusiness(req.user.userId, businessId);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 403 || err.status === 400) return res.status(err.status).json(fail(err.message));
    throw err;
  }
});

const resolvePendingHandler = asyncHandler(async (req, res) => {
  const { referral_code } = req.body;
  try {
    const result = await businessReferralService.resolvePendingBusinessReferral(req.user.userId, referral_code);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 400) return res.status(400).json(fail(err.message));
    throw err;
  }
});

module.exports = { getMyReferralHandler, resolvePendingHandler };
