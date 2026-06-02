// backend/src/modules/points/points.routes.ts
import { Hono } from 'hono';
import { pointsController } from './points.controller';

const points = new Hono();

points.get('/users/:userId', pointsController.balance);
points.get('/users/:userId/transactions', pointsController.transactions);
points.post('/credit', pointsController.credit);
points.post('/deduct', pointsController.deduct);

export default points;
