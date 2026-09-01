const Stripe = require('stripe');
const billingModel = require('./billing.model');
const { getBusinessProfileByUserId, getBusinessByProfileId } = require('../businesses/business.model');
const { getClient } = require('../../config/database');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Resolve the business via the profile_type = 'business' JOIN pattern, not active_profile_id —
// the caller's active profile may be personal at call time (see business-create.md).
async function resolveBusinessForUser(userId) {
  const businessProfile = await getBusinessProfileByUserId(userId);
  if (!businessProfile) throw Object.assign(new Error('No business profile found for this user'), { status: 403 });
  const business = await getBusinessByProfileId(businessProfile.id);
  if (!business) throw Object.assign(new Error('Business not found'), { status: 404 });
  return business;
}

async function createCheckoutSession(userId, planId, { successUrl, cancelUrl }) {
  const business = await resolveBusinessForUser(userId);

  const plan = await billingModel.getPlanById(planId);
  if (!plan) throw Object.assign(new Error('Plan not found'), { status: 404 });
  if (!plan.stripe_price_id) {
    throw Object.assign(new Error('This plan is not connected to Stripe yet'), { status: 400 });
  }

  const existingSubscription = await billingModel.getBusinessSubscription(business.id);

  let stripeCustomerId = existingSubscription?.stripe_customer_id ?? null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: business.name,
      metadata: { business_id: business.id },
    });
    stripeCustomerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { business_id: business.id, plan_id: plan.id },
    subscription_data: { trial_period_days: 30 },
  });

  return { url: session.url };
}

// Selecting the Free plan doesn't go through Stripe Checkout — insert the
// business_subscriptions row directly, same as the old auto-assign-on-signup behavior.
async function selectFreePlan(userId) {
  const business = await resolveBusinessForUser(userId);
  const freePlan = await billingModel.getFreePlan();
  if (!freePlan) throw Object.assign(new Error('No free subscription plan found'), { status: 500 });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const subscription = await billingModel.upsertBusinessSubscription(client, {
      businessId: business.id,
      planId: freePlan.id,
      status: 'active',
    });
    await client.query('COMMIT');
    return subscription;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Switch between two PAID plans on an already-active Stripe subscription (e.g. Basic -> Pro).
// Going from Free needs a real Checkout session/card — this only handles the swap case.
async function changePlan(userId, newPlanId) {
  const business = await resolveBusinessForUser(userId);

  const newPlan = await billingModel.getPlanById(newPlanId);
  if (!newPlan) throw Object.assign(new Error('Plan not found'), { status: 404 });
  if (!newPlan.stripe_price_id) {
    throw Object.assign(new Error('This plan is not connected to Stripe yet'), { status: 400 });
  }

  const current = await billingModel.getBusinessSubscription(business.id);
  if (!current?.stripe_subscription_id) {
    throw Object.assign(new Error('No active paid subscription to change — start checkout instead'), { status: 400 });
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(current.stripe_subscription_id);
  const itemId = stripeSubscription.items.data[0].id;

  await stripe.subscriptions.update(current.stripe_subscription_id, {
    items: [{ id: itemId, price: newPlan.stripe_price_id }],
    proration_behavior: 'create_prorations',
  });

  // business_subscriptions is deliberately not written here — the customer.subscription.updated
  // webhook handler above does that once Stripe confirms the change, same idempotent path as
  // every other subscription mutation in this module.
  return { pending: true };
}

// Same swap case as changePlan, but via the Stripe Customer Portal instead of updating the
// subscription server-side — shows the customer a real Stripe-hosted confirm/proration page
// rather than silently mutating their subscription. Does NOT use Checkout: a Checkout Session
// in mode:'subscription' always creates a brand-new subscription, which would double-bill a
// business that already has one — the Portal's subscription_update_confirm flow updates the
// existing subscription in place instead.
async function createPortalSession(userId, newPlanId, returnUrl) {
  const business = await resolveBusinessForUser(userId);

  const newPlan = await billingModel.getPlanById(newPlanId);
  if (!newPlan) throw Object.assign(new Error('Plan not found'), { status: 404 });
  if (!newPlan.stripe_price_id) {
    throw Object.assign(new Error('This plan is not connected to Stripe yet'), { status: 400 });
  }

  const current = await billingModel.getBusinessSubscription(business.id);
  if (!current?.stripe_subscription_id) {
    throw Object.assign(new Error('No active paid subscription to change — start checkout instead'), { status: 400 });
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(current.stripe_subscription_id);
  const itemId = stripeSubscription.items.data[0].id;

  const session = await stripe.billingPortal.sessions.create({
    customer: current.stripe_customer_id,
    return_url: returnUrl,
    flow_data: {
      type: 'subscription_update_confirm',
      subscription_update_confirm: {
        subscription: current.stripe_subscription_id,
        items: [{ id: itemId, price: newPlan.stripe_price_id }],
      },
    },
  });

  return { url: session.url };
}

// Given a subscriber count, find the cheapest active plan whose max_subscribers band covers
// it. Plans come back price_cents ASC (getActivePlans' existing ordering), so the first match
// is always the correct (lowest-priced sufficient) tier. NULL max_subscribers = unlimited/top
// tier, matches any count.
function resolveTierForSubscriberCount(count, activePlans) {
  return activePlans.find((plan) => plan.max_subscribers === null || plan.max_subscribers >= count) ?? null;
}

// Daily re-check: for every business with a live Stripe subscription, recompute their current
// subscriber count and move them to the matching tier's Stripe price if it changed — so the
// NEXT renewal charges the right amount. proration_behavior:'none' means this never charges/
// credits mid-cycle; it only takes effect at the subscription's next billing date. Scheduled
// via node-cron in server.js; also callable directly (see scripts/test-tier-recheck.js).
async function recheckAllTiers() {
  const [subscriptions, activePlans] = await Promise.all([
    billingModel.getBillableSubscriptions(),
    billingModel.getActivePlans(),
  ]);

  const results = [];
  for (const sub of subscriptions) {
    const count = await billingModel.getSubscriberCount(sub.business_id);
    const targetPlan = resolveTierForSubscriberCount(count, activePlans);

    if (!targetPlan || targetPlan.id === sub.plan_id) {
      results.push({ businessId: sub.business_id, subscriberCount: count, changed: false });
      continue;
    }
    if (!targetPlan.stripe_price_id) {
      // Tier resolved but not yet connected to a real Stripe Price — skip rather than fail
      // the whole run; same guard createCheckoutSession/changePlan already use.
      results.push({ businessId: sub.business_id, subscriberCount: count, changed: false, skipped: 'plan not connected to Stripe' });
      continue;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const itemId = stripeSubscription.items.data[0].id;

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: itemId, price: targetPlan.stripe_price_id }],
      proration_behavior: 'none',
    });

    // business_subscriptions.plan_id is deliberately not written here — the
    // customer.subscription.updated webhook syncs it once Stripe confirms the price change,
    // same pattern changePlan already relies on.
    results.push({ businessId: sub.business_id, subscriberCount: count, changed: true, newPlanId: targetPlan.id });
  }
  return results;
}

// "Cancel" means revert to the permanent Free tier, matching selectFreePlan's existing
// treatment of Free as the no-payment baseline rather than a hard lockout.
async function cancelSubscription(userId) {
  const business = await resolveBusinessForUser(userId);
  const current = await billingModel.getBusinessSubscription(business.id);

  if (current?.stripe_subscription_id) {
    await stripe.subscriptions.cancel(current.stripe_subscription_id);
  }

  const freePlan = await billingModel.getFreePlan();
  if (!freePlan) throw Object.assign(new Error('No free subscription plan found'), { status: 500 });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const subscription = await billingModel.setSubscriptionToFreePlan(client, business.id, freePlan.id);
    await client.query('COMMIT');
    return subscription;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function verifyWebhookSignature(rawBody, signature) {
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

async function handleWebhookEvent(event) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const inserted = await billingModel.insertWebhookEvent(client, event.id);
    if (!inserted) {
      // Already processed this event id — idempotent no-op.
      await client.query('ROLLBACK');
      return { handled: false, reason: 'duplicate' };
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const businessId = session.metadata?.business_id;
        const planId = session.metadata?.plan_id;
        if (businessId && planId) {
          await billingModel.upsertBusinessSubscription(client, {
            businessId,
            planId,
            status: 'active',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const plan = await billingModel.getPlanByStripePriceId(sub.items?.data?.[0]?.price?.id);
        await billingModel.updateSubscriptionStatusByStripeSubscriptionId(client, sub.id, {
          status: mapStripeStatus(sub.status),
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          planId: plan?.id,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await billingModel.updateSubscriptionStatusByStripeSubscriptionId(client, sub.id, {
          status: 'cancelled',
        });
        break;
      }
      default:
        break;
    }

    await client.query('COMMIT');
    return { handled: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function mapStripeStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') return 'cancelled';
  if (stripeStatus === 'past_due' || stripeStatus === 'incomplete_expired') return 'expired';
  return 'active';
}

async function getPlans() {
  return billingModel.getActivePlans();
}

async function getSubscriptionForUser(userId) {
  const business = await resolveBusinessForUser(userId);
  return billingModel.getBusinessSubscription(business.id);
}

module.exports = {
  getPlans,
  createCheckoutSession,
  selectFreePlan,
  changePlan,
  createPortalSession,
  cancelSubscription,
  verifyWebhookSignature,
  handleWebhookEvent,
  getSubscriptionForUser,
  resolveTierForSubscriberCount,
  recheckAllTiers,
};
