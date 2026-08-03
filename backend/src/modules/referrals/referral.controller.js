const referralService = require('./referral.service');
const { ok } = require('../../utils/apiResponse');
const { myReferralsQuerySchema } = require('./referral.validation');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getMyReferralHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  try {
    const referral = await referralService.getMyReferral(userId);
    res.json(ok(referral));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

const getMyReferralsHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { error, value } = myReferralsQuerySchema.validate(req.query, { stripUnknown: true });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });

  try {
    const referrals = await referralService.getMyReferrals(userId, value);
    res.json(ok({ referrals }));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = {
  getMyReferralHandler,
  getMyReferralsHandler,
};
