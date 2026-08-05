const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { createInviteSchema, bulkCreateInviteSchema, resolvePendingInviteSchema } = require('./customerInvite.validation');
const {
  createInviteHandler,
  bulkCreateInviteHandler,
  listMyInvitesHandler,
  listBusinessInvitesHandler,
  resolvePendingInviteHandler,
} = require('./customerInvite.controller');

const router = Router();

router.post('/customer',      authenticate, validateRequest(createInviteSchema),     createInviteHandler);
router.post('/customer/bulk', authenticate, validateRequest(bulkCreateInviteSchema),  bulkCreateInviteHandler);
router.post('/customer/resolve-pending', authenticate, validateRequest(resolvePendingInviteSchema), resolvePendingInviteHandler);
router.get('/customer/mine',  authenticate, listMyInvitesHandler);
router.get('/customer/business/:businessId', authenticate, listBusinessInvitesHandler);

module.exports = router;
