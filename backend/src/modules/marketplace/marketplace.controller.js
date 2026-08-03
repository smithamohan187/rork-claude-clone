const marketplaceService = require('./marketplace.service');
const { ok } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getMyBusinessReferralCodeHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  try {
    const referral = await marketplaceService.getMyBusinessReferralCode(userId);
    res.json(ok(referral));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = { getMyBusinessReferralCodeHandler };
