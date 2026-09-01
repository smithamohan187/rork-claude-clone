// scripts/test-tier-recheck.js
// Manually invokes the daily subscriber-tier re-check (normally run by node-cron in
// backend/server.js at 02:00) without waiting 24 hours. Prints one line per business with a
// live Stripe subscription: their current subscriber count, whether their tier changed, and
// (if changed) which plan they're moving to at their next renewal.
//
// Usage: node scripts/test-tier-recheck.js
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const billingService = require('../backend/src/modules/billing/billing.service');

async function main() {
  console.log('Running recheckAllTiers()...\n');
  const results = await billingService.recheckAllTiers();

  if (results.length === 0) {
    console.log('No businesses with a live Stripe subscription found.');
    return;
  }

  for (const r of results) {
    if (r.skipped) {
      console.log(`SKIP  business ${r.businessId} — ${r.subscriberCount} subscribers — ${r.skipped}`);
    } else if (r.changed) {
      console.log(`MOVE  business ${r.businessId} — ${r.subscriberCount} subscribers — will bill at plan ${r.newPlanId} next renewal`);
    } else {
      console.log(`OK    business ${r.businessId} — ${r.subscriberCount} subscribers — already on the correct tier`);
    }
  }

  const changed = results.filter((r) => r.changed).length;
  console.log(`\n${results.length} businesses checked, ${changed} tier changes queued.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('recheckAllTiers() FAILED:', err.message);
    process.exit(1);
  });
