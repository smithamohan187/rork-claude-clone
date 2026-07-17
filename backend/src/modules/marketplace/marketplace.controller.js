const marketplaceService = require('./marketplace.service');
const { ok } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const createInviteHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { business_name, contact_name, contact_method, contact_value } = req.body;
  try {
    const invite = await marketplaceService.createBusinessInvite(userId, {
      business_name,
      contact_name,
      contact_method,
      contact_value,
    });
    if (invite === null) {
      return res.status(200).json(ok({ invite: null, duplicate: true }));
    }
    return res.status(201).json(ok({ invite }));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

const listInvitesHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  try {
    const invites = await marketplaceService.getBusinessInvites(userId);
    res.json(ok({ invites }));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = { createInviteHandler, listInvitesHandler };
