// backend/src/modules/offers/offers.routes.ts
import { Hono } from 'hono';
import { offersController } from './offers.controller';

const offers = new Hono();

offers.get('/', offersController.list);
offers.post('/', offersController.create);
offers.patch('/:id/status', offersController.toggleStatus);

export default offers;
