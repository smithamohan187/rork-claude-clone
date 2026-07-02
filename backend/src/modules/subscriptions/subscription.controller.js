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

module.exports = { subscribeHandler, unsubscribeHandler, statusHandler };
