const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { createConversationSchema, sendMessageSchema } = require('./chat.validation');
const {
  listConversationsHandler,
  createConversationHandler,
  listFriendsHandler,
  getMessagesHandler,
  sendMessageHandler,
  markReadHandler,
} = require('./chat.controller');

const router = Router();

// Static '/friends' is declared before the '/:id/...' routes so the literal
// path isn't captured by the :id param.
router.get('/friends',           authenticate, listFriendsHandler);

router.get('/',                  authenticate, listConversationsHandler);
router.post('/',                 authenticate, validateRequest(createConversationSchema), createConversationHandler);

router.get('/:id/messages',      authenticate, getMessagesHandler);
router.post('/:id/messages',     authenticate, validateRequest(sendMessageSchema), sendMessageHandler);
router.post('/:id/read',         authenticate, markReadHandler);

module.exports = router;
