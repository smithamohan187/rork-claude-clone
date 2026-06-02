// backend/src/app.ts
// Main entrypoint for the new modular Node.js backend.
// Currently wraps a Hono app for compatibility with the existing deploy target.
// When migrating to a standalone Express/Fastify + PostgreSQL server, this file
// stays in the same place and only the framework primitives change.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as appLogger } from './utils/logger';
import { ok } from './utils/apiResponse';

import authRoutes from './modules/auth/auth.routes';
import businessRoutes from './modules/businesses/businesses.routes';
import offerRoutes from './modules/offers/offers.routes';
import eventRoutes from './modules/events/events.routes';
import rewardRoutes from './modules/rewards/rewards.routes';
import pointRoutes from './modules/points/points.routes';
import referralRoutes from './modules/referrals/referrals.routes';
import redemptionRoutes from './modules/redemptions/redemptions.routes';
import chatRoutes from './modules/chat/chat.routes';
import savedRoutes from './modules/saved/saved.routes';
import subscriptionRoutes from './modules/subscriptions/subscriptions.routes';

const app = new Hono().basePath('/api/v1');

app.use('*', cors());

app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  appLogger.info('http', `${c.req.method} ${c.req.path} ${c.res.status} ${Date.now() - start}ms`);
});

app.get('/health', (c) => c.json(ok({ status: 'ok' })));

app.route('/auth', authRoutes);
app.route('/businesses', businessRoutes);
app.route('/offers', offerRoutes);
app.route('/events', eventRoutes);
app.route('/rewards', rewardRoutes);
app.route('/points', pointRoutes);
app.route('/referrals', referralRoutes);
app.route('/redemptions', redemptionRoutes);
app.route('/chat', chatRoutes);
app.route('/saved', savedRoutes);
app.route('/subscriptions', subscriptionRoutes);

export default app;
