// socket.js — Socket.IO wiring for real-time chat. Transport layer only: every
// event handler below delegates to chat.service.js for business logic (same
// functions the REST controller calls), so there is exactly one implementation
// of "send a message" / "mark read", not two.
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const subscriptionModel = require('../modules/subscriptions/subscription.model');
const conversationModel = require('../modules/chat/conversation.model');
const chatService = require('../modules/chat/chat.service');

let io = null;

function profileRoom(profileId) {
  return `profile:${profileId}`;
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // Mirrors backend/src/middleware/authenticate.js — sockets have no req/res to
  // reuse that middleware directly, so the same jwt.verify call is repeated here.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const profileId = await subscriptionModel.getActiveProfileId(payload.userId);
      if (!profileId) return next(new Error('unauthorized'));
      socket.data.userId = payload.userId;
      socket.data.profileId = profileId;
      next();
    } catch (err) {
      logger.warn('socket', 'auth failed', err.message);
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(profileRoom(socket.data.profileId));

    socket.on('join_conversation', async ({ conversationId } = {}, ack) => {
      try {
        const allowed = await conversationModel.isParticipant(conversationId, socket.data.profileId);
        if (!allowed) {
          socket.emit('error', { message: 'Not a participant in this conversation' });
          if (typeof ack === 'function') ack({ success: false });
          return;
        }
        socket.join(conversationId);
        if (typeof ack === 'function') ack({ success: true });
      } catch (err) {
        socket.emit('error', { message: err.message });
        if (typeof ack === 'function') ack({ success: false });
      }
    });

    socket.on('leave_conversation', ({ conversationId } = {}) => {
      if (conversationId) socket.leave(conversationId);
    });

    socket.on('send_message', async ({ conversationId, body } = {}, ack) => {
      try {
        const message = await chatService.sendMessage(socket.data.userId, conversationId, body);
        io.to(conversationId).emit('new_message', message);

        const participants = await conversationModel.getParticipants(conversationId);
        participants.forEach((p) => {
          io.to(profileRoom(p.profile_id)).emit('conversation_updated', { conversationId });
        });

        if (typeof ack === 'function') ack({ success: true, message });
      } catch (err) {
        socket.emit('error', { message: err.message });
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });

    socket.on('mark_read', async ({ conversationId } = {}, ack) => {
      try {
        await chatService.markRead(socket.data.userId, conversationId);
        io.to(profileRoom(socket.data.profileId)).emit('conversation_updated', { conversationId });
        if (typeof ack === 'function') ack({ success: true });
      } catch (err) {
        socket.emit('error', { message: err.message });
        if (typeof ack === 'function') ack({ success: false, error: err.message });
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized — call initSocket first');
  return io;
}

module.exports = { initSocket, getIO };
