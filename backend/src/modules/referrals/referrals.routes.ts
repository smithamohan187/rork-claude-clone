// backend/src/modules/referrals/referrals.routes.ts
import { Hono } from 'hono';
import { referralsController } from './referrals.controller';

const referrals = new Hono();

referrals.post('/', referralsController.create);
referrals.get('/users/:userId', referralsController.listByUser);
referrals.get('/users/:userId/code', referralsController.code);
referrals.post('/credit', referralsController.credit);

export default referrals;
