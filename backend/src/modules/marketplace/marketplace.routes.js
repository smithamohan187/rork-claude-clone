const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { createInviteSchema } = require('./marketplace.validation');
const { createInviteHandler, listInvitesHandler } = require('./marketplace.controller');

const router = Router();

router.post('/invite-business', authenticate, validateRequest(createInviteSchema), createInviteHandler);
router.get('/invite-business',  authenticate, listInvitesHandler);

module.exports = router;
