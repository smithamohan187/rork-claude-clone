const shareReferralsService = require('./shareReferrals.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const createRecipientsHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { content_type, content_id, business_id, recipients } = req.body;
  try {
    const created = await shareReferralsService.createShareRecipients(userId, {
      content_type,
      content_id,
      business_id,
      recipients,
    });
    return res.status(201).json(ok({ recipients: created }));
  } catch (err) {
    if (err.status === 400) return res.status(400).json(fail(err.message));
    next(err);
  }
});

const resolveReferralHandler = asyncHandler(async (req, res, next) => {
  const { referral_code } = req.body;
  try {
    const result = await shareReferralsService.resolveReferral(referral_code);
    return res.json(ok(result));
  } catch (err) {
    if (err.status === 404) return res.status(404).json(fail(err.message));
    next(err);
  }
});

const shareOfferToFriendsHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { offerId, targetProfileIds } = req.body;
  try {
    const results = await shareReferralsService.shareOfferToFriends(userId, offerId, targetProfileIds);
    return res.status(201).json(ok({ results }));
  } catch (err) {
    if (err.status === 400 || err.status === 404) return res.status(err.status).json(fail(err.message));
    next(err);
  }
});

module.exports = { createRecipientsHandler, resolveReferralHandler, shareOfferToFriendsHandler };
