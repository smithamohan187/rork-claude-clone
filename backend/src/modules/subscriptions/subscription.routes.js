const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { subscribeBodySchema, unsubscribeBodySchema, statusQuerySchema } = require('./subscription.validation');
const { subscribeHandler, unsubscribeHandler, statusHandler } = require('./subscription.controller');

const router = Router();

router.post('/subscribe',   authenticate, validateRequest(subscribeBodySchema),   subscribeHandler);
router.post('/unsubscribe', authenticate, validateRequest(unsubscribeBodySchema), unsubscribeHandler);
router.get('/status',       authenticate, statusHandler);

module.exports = router;
