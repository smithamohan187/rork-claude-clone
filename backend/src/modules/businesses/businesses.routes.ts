// backend/src/modules/businesses/businesses.routes.ts
import { Hono } from 'hono';
import { businessesController } from './businesses.controller';

const businesses = new Hono();

businesses.get('/', businessesController.list);
businesses.get('/:id', businessesController.get);
businesses.patch('/:id', businessesController.update);
businesses.get('/:id/subscribers', businessesController.subscribers);

export default businesses;
