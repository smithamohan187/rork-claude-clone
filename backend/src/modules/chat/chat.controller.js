const chatService = require('./chat.service');
const conversationModel = require('./conversation.model');
const { listConversationsQuerySchema } = require('./chat.validation');
const { ok } = require('../../utils/apiResponse');
const { getIO, profileRoom } = require('../../realtime/socket');

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
    // Best-effort real-time fan-out so a REST-originated send (anything other than the
    // socket 'send_message' path, which already broadcasts this itself) still reaches an
    // already-open chat screen live, instead of only appearing on next reload/refocus.
    try {
      const io = getIO();
      io.to(req.params.id).emit('new_message', message);
      const participants = await conversationModel.getParticipants(req.params.id);
      participants.forEach((p) => {
        io.to(profileRoom(p.profile_id)).emit('conversation_updated', { conversationId: req.params.id });
      });
    } catch (broadcastErr) {
      // Socket layer unavailable or not initialized — message is already persisted and
      // returned to the caller, so this must never fail the request.
    }
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
