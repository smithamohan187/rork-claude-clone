// backend/src/modules/chat/chat.routes.ts
import { Hono } from 'hono';
import { chatController } from './chat.controller';

const chat = new Hono();

chat.get('/conversations/:conversationId/messages', chatController.messages);
chat.post('/messages', chatController.send);
chat.get('/businesses/:businessId/broadcasts', chatController.broadcasts);
chat.post('/broadcasts', chatController.createBroadcast);

export default chat;
