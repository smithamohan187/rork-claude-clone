const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { subscribeBodySchema, unsubscribeBodySchema, scanSubscribeBodySchema, removeMemberSchema } = require('./subscription.validation');
const { subscribeHandler, scanSubscribeHandler, unsubscribeHandler, statusHandler, myBusinessesHandler, membersHandler, removeMemberHandler } = require('./subscription.controller');

const router = Router();

router.get('/members',         authenticate, membersHandler);
router.delete('/members',      authenticate, validateRequest(removeMemberSchema), removeMemberHandler);
router.post('/subscribe',      authenticate, validateRequest(subscribeBodySchema),   subscribeHandler);
router.post('/scan-subscribe', authenticate, validateRequest(scanSubscribeBodySchema), scanSubscribeHandler);
router.post('/unsubscribe',    authenticate, validateRequest(unsubscribeBodySchema), unsubscribeHandler);
router.get('/status',          authenticate, statusHandler);
router.get('/my-businesses',   authenticate, myBusinessesHandler);

module.exports = router;
