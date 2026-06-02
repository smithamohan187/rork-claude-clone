// backend/src/modules/rewards/rewards.routes.ts
import { Hono } from 'hono';
import { rewardsController } from './rewards.controller';

const rewards = new Hono();

rewards.get('/catalog', rewardsController.catalog);
rewards.get('/businesses/:businessId/tiers', rewardsController.tiers);
rewards.get('/businesses/:businessId/config', rewardsController.config);
rewards.put('/config', rewardsController.upsertConfig);

export default rewards;
