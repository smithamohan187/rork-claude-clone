const subscriptionService = require('./subscription.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const subscribeHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.body;
  if (!business_id) return res.status(400).json(fail('business_id is required'));

  try {
    const result = await subscriptionService.subscribeToBusiness(req.user.userId, business_id);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 404) return res.status(404).json(fail(err.message));
    if (err.status === 400) return res.status(400).json(fail(err.message));
    throw err;
  }
});

const scanSubscribeHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.body;
  const result = await subscriptionService.resolveScanSubscribe(req.user.userId, business_id);
  res.json(ok(result));
});

const unsubscribeHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.body;
  if (!business_id) return res.status(400).json(fail('business_id is required'));

  try {
    const result = await subscriptionService.unsubscribeFromBusiness(req.user.userId, business_id);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 400) return res.status(400).json(fail(err.message));
    throw err;
  }
});

const statusHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.query;
  if (!business_id) return res.status(400).json(fail('business_id is required'));

  const result = await subscriptionService.getSubscriptionStatus(req.user.userId, business_id);
  res.json(ok(result));
});

const myBusinessesHandler = asyncHandler(async (req, res) => {
  const result = await subscriptionService.getSubscribedBusinesses(req.user.userId);
  res.json(ok(result));
});

const membersHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.query; // optional — service derives from JWT when absent
  try {
    const result = await subscriptionService.getBusinessMembers(req.user.userId, business_id ?? null);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 403) return res.status(403).json(fail(err.message));
    throw err;
  }
});

const removeMemberHandler = asyncHandler(async (req, res) => {
  const { business_id, member_profile_id } = req.body; // business_id optional
  if (!member_profile_id) return res.status(400).json(fail('member_profile_id is required'));
  try {
    const result = await subscriptionService.removeBusinessMember(req.user.userId, business_id ?? null, member_profile_id);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 403) return res.status(403).json(fail(err.message));
    throw err;
  }
});

module.exports = { subscribeHandler, scanSubscribeHandler, unsubscribeHandler, statusHandler, myBusinessesHandler, membersHandler, removeMemberHandler };
