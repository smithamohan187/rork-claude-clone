const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { resolvePendingSchema } = require('./businessReferral.validation');
const { getMyReferralHandler, resolvePendingHandler } = require('./businessReferral.controller');

const router = Router();

router.get('/business/:businessId/mine', authenticate, getMyReferralHandler);
router.post('/business/resolve-pending', authenticate, validateRequest(resolvePendingSchema), resolvePendingHandler);

module.exports = router;
