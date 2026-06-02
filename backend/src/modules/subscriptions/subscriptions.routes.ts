// backend/src/modules/subscriptions/subscriptions.routes.ts
import { Hono } from 'hono';
import { subscriptionsController } from './subscriptions.controller';

const subscriptions = new Hono();

subscriptions.get('/plans', subscriptionsController.plans);
subscriptions.post('/subscribe', subscriptionsController.subscribe);
subscriptions.get('/users/:userId', subscriptionsController.mine);
subscriptions.get('/businesses/:businessId/subscribers', subscriptionsController.businessSubscribers);

export default subscriptions;
