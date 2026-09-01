const billingService = require('./billing.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getPlansHandler = asyncHandler(async (req, res) => {
  const plans = await billingService.getPlans();
  res.status(200).json(ok(plans));
});

const createCheckoutSessionHandler = asyncHandler(async (req, res) => {
  const { plan_id, success_url, cancel_url } = req.body;
  try {
    const result = await billingService.createCheckoutSession(req.user.userId, plan_id, {
      successUrl: success_url,
      cancelUrl: cancel_url,
    });
    res.status(200).json(ok(result));
  } catch (err) {
    if (err.status) return res.status(err.status).json(fail(err.message));
    throw err;
  }
});

const selectFreePlanHandler = asyncHandler(async (req, res) => {
  try {
    const subscription = await billingService.selectFreePlan(req.user.userId);
    res.status(200).json(ok(subscription));
  } catch (err) {
    if (err.status) return res.status(err.status).json(fail(err.message));
    throw err;
  }
});

const changePlanHandler = asyncHandler(async (req, res) => {
  const { plan_id } = req.body;
  try {
    const result = await billingService.changePlan(req.user.userId, plan_id);
    res.status(200).json(ok(result));
  } catch (err) {
    if (err.status) return res.status(err.status).json(fail(err.message));
    throw err;
  }
});

const createPortalSessionHandler = asyncHandler(async (req, res) => {
  const { plan_id, return_url } = req.body;
  try {
    const result = await billingService.createPortalSession(req.user.userId, plan_id, return_url);
    res.status(200).json(ok(result));
  } catch (err) {
    if (err.status) return res.status(err.status).json(fail(err.message));
    throw err;
  }
});

const cancelSubscriptionHandler = asyncHandler(async (req, res) => {
  try {
    const subscription = await billingService.cancelSubscription(req.user.userId);
    res.status(200).json(ok(subscription));
  } catch (err) {
    if (err.status) return res.status(err.status).json(fail(err.message));
    throw err;
  }
});

const getMySubscriptionHandler = asyncHandler(async (req, res) => {
  try {
    const subscription = await billingService.getSubscriptionForUser(req.user.userId);
    res.status(200).json(ok(subscription));
  } catch (err) {
    if (err.status) return res.status(err.status).json(fail(err.message));
    throw err;
  }
});

// POST /webhooks/stripe — mounted BEFORE express.json() in app.js with express.raw(),
// so req.body here is the raw Buffer Stripe's signature verification requires.
const stripeWebhookHandler = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = billingService.verifyWebhookSignature(req.body, signature);
  } catch (err) {
    return res.status(400).json(fail(`Webhook signature verification failed: ${err.message}`));
  }

  await billingService.handleWebhookEvent(event);
  // Always 200 once the event is accepted/parsed, so Stripe doesn't keep retrying.
  res.status(200).json({ received: true });
});

module.exports = {
  getPlansHandler,
  createCheckoutSessionHandler,
  selectFreePlanHandler,
  changePlanHandler,
  createPortalSessionHandler,
  cancelSubscriptionHandler,
  getMySubscriptionHandler,
  stripeWebhookHandler,
};
