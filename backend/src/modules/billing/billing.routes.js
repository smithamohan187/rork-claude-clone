const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { checkoutSessionSchema, changePlanSchema, portalSessionSchema } = require('./billing.validation');
const {
  getPlansHandler,
  createCheckoutSessionHandler,
  selectFreePlanHandler,
  changePlanHandler,
  createPortalSessionHandler,
  cancelSubscriptionHandler,
  getMySubscriptionHandler,
} = require('./billing.controller');

// Mounted at /billing in app.js — deliberately NOT /subscriptions, which is already the
// customer-follows-business loyalty module (see .claude/modules/subscriptions.md). The
// Stripe webhook route (POST /webhooks/stripe) is registered separately in app.js, before
// express.json(), since it needs the raw request body for signature verification.
const router = Router();

router.get('/plans',              getPlansHandler);
router.post('/checkout-session',  authenticate, validateRequest(checkoutSessionSchema), createCheckoutSessionHandler);
router.post('/select-free-plan',  authenticate, selectFreePlanHandler);
router.post('/change-plan',       authenticate, validateRequest(changePlanSchema), changePlanHandler);
router.post('/portal-session',    authenticate, validateRequest(portalSessionSchema), createPortalSessionHandler);
router.post('/cancel',            authenticate, cancelSubscriptionHandler);
router.get('/my-subscription',    authenticate, getMySubscriptionHandler);

module.exports = router;
