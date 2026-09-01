require('dotenv').config();
const app = require('./src/app');
const cron = require('node-cron');
const billingService = require('./src/modules/billing/billing.service');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

// Daily subscriber-tier re-check — moves each business to the correct Starter/Pro Business/
// Corporate price ahead of their next Stripe renewal, based on their current subscriber count.
// See .claude/modules/billing.md and billing.service.js#recheckAllTiers for the full design.
cron.schedule('0 2 * * *', async () => {
  try {
    const results = await billingService.recheckAllTiers();
    const changed = results.filter((r) => r.changed).length;
    console.log(`[billing] Daily tier re-check: ${results.length} businesses checked, ${changed} tier changes queued for next renewal.`);
  } catch (err) {
    console.error('[billing] Daily tier re-check failed:', err.message);
  }
});
