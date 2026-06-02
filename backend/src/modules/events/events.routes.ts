// backend/src/modules/events/events.routes.ts
import { Hono } from 'hono';
import { eventsController } from './events.controller';

const events = new Hono();

events.get('/', eventsController.list);
events.post('/', eventsController.create);
events.post('/:id/cancel', eventsController.cancel);

export default events;
