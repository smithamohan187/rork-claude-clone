// backend/src/modules/saved/saved.routes.ts
import { Hono } from 'hono';
import { savedController } from './saved.controller';

const saved = new Hono();

saved.get('/users/:userId', savedController.list);
saved.get('/users/:userId/businesses', savedController.businesses);
saved.post('/', savedController.save);
saved.delete('/users/:userId/:itemType/:itemId', savedController.remove);

export default saved;
