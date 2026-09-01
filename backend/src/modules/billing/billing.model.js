const { query } = require('../../config/database');

async function getActivePlans() {
  const { rows } = await query(
    `SELECT id, name, price_monthly, price_yearly, price_cents, stripe_price_id,
            max_offers, max_events, max_subscribers, can_broadcast, can_run_rewards,
            priority_listing
     FROM subscription_plans
     WHERE is_active = TRUE
     ORDER BY price_cents ASC NULLS FIRST`
  );
  return rows;
}

async function getPlanById(planId) {
  const { rows } = await query(
    'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = TRUE',
    [planId]
  );
  return rows[0] ?? null;
}

async function getFreePlan() {
  const { rows } = await query(
    'SELECT * FROM subscription_plans WHERE price_monthly = 0 AND is_active = TRUE LIMIT 1'
  );
  return rows[0] ?? null;
}

async function getBusinessSubscription(businessId) {
  const { rows } = await query(
    `SELECT bs.*, sp.name AS plan_name, sp.price_cents, sp.max_offers, sp.max_events,
            sp.can_broadcast, sp.can_run_rewards, sp.priority_listing
     FROM business_subscriptions bs
     JOIN subscription_plans sp ON sp.id = bs.plan_id
     WHERE bs.business_id = $1`,
    [businessId]
  );
  return rows[0] ?? null;
}

async function getBusinessSubscriptionByStripeSubscriptionId(stripeSubscriptionId) {
  const { rows } = await query(
    'SELECT * FROM business_subscriptions WHERE stripe_subscription_id = $1',
    [stripeSubscriptionId]
  );
  return rows[0] ?? null;
}

async function getBusinessSubscriptionByStripeCustomerId(stripeCustomerId) {
  const { rows } = await query(
    'SELECT * FROM business_subscriptions WHERE stripe_customer_id = $1',
    [stripeCustomerId]
  );
  return rows[0] ?? null;
}

// Upserts on business_id (UNIQUE) — a business has exactly one subscription row.
async function upsertBusinessSubscription(client, {
  businessId, planId, status, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd,
}) {
  const { rows } = await client.query(
    `INSERT INTO business_subscriptions
       (business_id, plan_id, status, stripe_customer_id, stripe_subscription_id, current_period_end)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (business_id) DO UPDATE SET
       plan_id                = EXCLUDED.plan_id,
       status                 = EXCLUDED.status,
       stripe_customer_id     = COALESCE(EXCLUDED.stripe_customer_id, business_subscriptions.stripe_customer_id),
       stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, business_subscriptions.stripe_subscription_id),
       current_period_end     = COALESCE(EXCLUDED.current_period_end, business_subscriptions.current_period_end)
     RETURNING *`,
    [businessId, planId, status, stripeCustomerId ?? null, stripeSubscriptionId ?? null, currentPeriodEnd ?? null]
  );
  return rows[0];
}

// Explicit UPDATE (not upsertBusinessSubscription's ON CONFLICT) because that COALESCEs
// stripe_subscription_id from the existing row when passed null — correct for the webhook's
// partial updates, but wrong here since cancelling must actively clear it. Leaves
// stripe_customer_id untouched so a future re-subscribe reuses the same Stripe customer.
async function setSubscriptionToFreePlan(client, businessId, freePlanId) {
  const { rows } = await client.query(
    `UPDATE business_subscriptions
     SET plan_id = $2,
         status = 'active',
         stripe_subscription_id = NULL,
         current_period_end = NULL
     WHERE business_id = $1
     RETURNING *`,
    [businessId, freePlanId]
  );
  return rows[0] ?? null;
}

async function updateSubscriptionStatusByStripeSubscriptionId(client, stripeSubscriptionId, { status, currentPeriodEnd, planId }) {
  const { rows } = await client.query(
    `UPDATE business_subscriptions
     SET status = $2,
         current_period_end = COALESCE($3, current_period_end),
         plan_id = COALESCE($4, plan_id)
     WHERE stripe_subscription_id = $1
     RETURNING *`,
    [stripeSubscriptionId, status, currentPeriodEnd ?? null, planId ?? null]
  );
  return rows[0] ?? null;
}

async function setBusinessStripeCustomerId(client, businessId, stripeCustomerId) {
  await client.query(
    'UPDATE business_subscriptions SET stripe_customer_id = $2 WHERE business_id = $1',
    [businessId, stripeCustomerId]
  );
}

async function getPlanByStripePriceId(stripePriceId) {
  const { rows } = await query(
    'SELECT * FROM subscription_plans WHERE stripe_price_id = $1',
    [stripePriceId]
  );
  return rows[0] ?? null;
}

// Same "active" definition already used elsewhere (getDashboardSummary, getBusinessById) —
// a subscriber is a row in `subscriptions` (the customer-follows-business loyalty table,
// unrelated to business_subscriptions) with is_active = true.
async function getSubscriberCount(businessId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS count FROM subscriptions WHERE business_id = $1 AND is_active = true',
    [businessId]
  );
  return rows[0]?.count ?? 0;
}

// Every business_subscriptions row with a live Stripe subscription — status 'active' covers
// both Stripe 'active' and 'trialing' (mapStripeStatus maps both to 'active' in this app),
// so trialing businesses are re-tiered too, same as fully active ones.
async function getBillableSubscriptions() {
  const { rows } = await query(
    `SELECT bs.*, sp.max_subscribers AS current_plan_max_subscribers
     FROM business_subscriptions bs
     JOIN subscription_plans sp ON sp.id = bs.plan_id
     WHERE bs.status = 'active' AND bs.stripe_subscription_id IS NOT NULL`
  );
  return rows;
}

// Idempotency guard — insert the Stripe event id first. Returns the inserted row, or
// null if the id already exists (ON CONFLICT DO NOTHING), meaning this event was already handled.
async function insertWebhookEvent(client, stripeEventId) {
  const { rows } = await client.query(
    `INSERT INTO stripe_webhook_events (stripe_event_id)
     VALUES ($1)
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING id`,
    [stripeEventId]
  );
  return rows[0] ?? null;
}

module.exports = {
  getActivePlans,
  getPlanById,
  getFreePlan,
  getBusinessSubscription,
  getBusinessSubscriptionByStripeSubscriptionId,
  getBusinessSubscriptionByStripeCustomerId,
  upsertBusinessSubscription,
  setSubscriptionToFreePlan,
  updateSubscriptionStatusByStripeSubscriptionId,
  setBusinessStripeCustomerId,
  getPlanByStripePriceId,
  insertWebhookEvent,
  getSubscriberCount,
  getBillableSubscriptions,
};
