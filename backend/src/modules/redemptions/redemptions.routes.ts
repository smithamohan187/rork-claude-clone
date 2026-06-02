// backend/src/modules/redemptions/redemptions.routes.ts
import { Hono } from 'hono';
import { redemptionsController } from './redemptions.controller';

const redemptions = new Hono();

redemptions.post('/', redemptionsController.create);
redemptions.get('/:id', redemptionsController.coupon);
redemptions.post('/:id/generate', redemptionsController.generate);
redemptions.post('/:id/expire', redemptionsController.expire);

export default redemptions;
