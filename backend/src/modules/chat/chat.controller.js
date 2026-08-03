const chatService = require('./chat.service');
const { listConversationsQuerySchema } = require('./chat.validation');
const { ok } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Maps a service error carrying a `status` to a shaped JSON response;
// anything else bubbles to the global error handler.
function sendKnownError(err, res, next, statuses = [400, 403, 404]) {
  if (statuses.includes(err.status)) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  return next(err);
}

const listConversationsHandler = asyncHandler(async (req, res, next) => {
  const { error, value } = listConversationsQuerySchema.validate(req.query, { stripUnknown: true });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  try {
    const conversations = await chatService.listConversations(req.user.userId, value.type);
    res.json(ok({ conversations }));
  } catch (err) {
    sendKnownError(err, res, next);
  }
});

const createConversationHandler = asyncHandler(async (req, res, next) => {
  const { targetProfileId, type } = req.body;
  try {
    const { conversation, created } = await chatService.getOrCreateConversation(
      req.user.userId, targetProfileId, type,
    );
    res.status(created ? 201 : 200).json(ok({ conversation, created }));
  } catch (err) {
    sendKnownError(err, res, next);
  }
});

const listFriendsHandler = asyncHandler(async (req, res, next) => {
  try {
    const friends = await chatService.listFriends(req.user.userId);
    res.json(ok({ friends }));
  } catch (err) {
    sendKnownError(err, res, next);
  }
});

const getMessagesHandler = asyncHandler(async (req, res, next) => {
  try {
    const messages = await chatService.getMessages(req.user.userId, req.params.id, req.query.after);
    res.json(ok({ messages }));
  } catch (err) {
    sendKnownError(err, res, next);
  }
});

const sendMessageHandler = asyncHandler(async (req, res, next) => {
  try {
    const message = await chatService.sendMessage(req.user.userId, req.params.id, req.body.body);
    res.status(201).json(ok({ message }));
  } catch (err) {
    sendKnownError(err, res, next);
  }
});

const markReadHandler = asyncHandler(async (req, res, next) => {
  try {
    const result = await chatService.markRead(req.user.userId, req.params.id);
    res.json(ok(result));
  } catch (err) {
    sendKnownError(err, res, next);
  }
});

module.exports = {
  listConversationsHandler,
  createConversationHandler,
  listFriendsHandler,
  getMessagesHandler,
  sendMessageHandler,
  markReadHandler,
};
