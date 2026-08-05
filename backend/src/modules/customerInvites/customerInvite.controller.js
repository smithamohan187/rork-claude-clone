const customerInviteService = require('./customerInvite.service');
const { ok } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const createInviteHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { business_id, channel, name, email, phone } = req.body;
  try {
    const invite = await customerInviteService.createCustomerInvite(userId, {
      business_id,
      channel,
      name,
      email,
      phone,
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

const bulkCreateInviteHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { business_id, rows } = req.body;
  try {
    const result = await customerInviteService.bulkCreateCustomerInvites(userId, { business_id, rows });
    return res.status(201).json(ok(result));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

const listMyInvitesHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  try {
    const invites = await customerInviteService.getMyCustomerInvites(userId);
    res.json(ok({ invites }));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

const listBusinessInvitesHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { businessId } = req.params;
  try {
    const invites = await customerInviteService.getBusinessCustomerInvites(userId, businessId);
    res.json(ok({ invites }));
  } catch (err) {
    if (err.status === 403 || err.status === 400) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    next(err);
  }
});

const resolvePendingInviteHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { customer_invite_code } = req.body;
  try {
    const result = await customerInviteService.resolvePendingCustomerInvite(userId, customer_invite_code);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = {
  createInviteHandler,
  bulkCreateInviteHandler,
  listMyInvitesHandler,
  listBusinessInvitesHandler,
  resolvePendingInviteHandler,
};
