const Stripe = require('stripe');
const billingModel = require('./billing.model');
const { getBusinessProfileByUserId, getBusinessByProfileId } = require('../businesses/business.model');
const { getClient } = require('../../config/database');
const { logger } = require('../../utils/logger');

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

  // Append Stripe's own {CHECKOUT_SESSION_ID} placeholder (auto-substituted by Stripe on
  // redirect) so the success screen can verify the session directly via GET
  // /billing/verify-session/:sessionId instead of only waiting on the async webhook, which can
  // lag behind the redirect (or never arrive in some environments) — see verifySession below.
  const separator = successUrl.includes('?') ? '&' : '?';
  const successUrlWithSession = `${successUrl}${separator}session_id={CHECKOUT_SESSION_ID}`;

  // Only a business with no prior business_subscriptions row at all gets the 30-day trial —
  // a renewal after cancelling has already had its trial (or an active period), so it goes
  // straight to a paid checkout.
  const sessionParams = {
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: successUrlWithSession,
    cancel_url: cancelUrl,
    metadata: { business_id: business.id, plan_id: plan.id },
    ...(existingSubscription ? {} : { subscription_data: { trial_period_days: 30 } }),
  };

  let session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (err) {
    // A stored stripe_customer_id can go stale (deleted in the Stripe dashboard, carried over
    // from a different Stripe mode/environment, or — as happened here — left behind by a DB
    // seeding script) — recover by minting a fresh customer and retrying once, rather than
    // permanently 500ing every future checkout attempt for this business.
    const isMissingCustomer = err.code === 'resource_missing' && err.param === 'customer';
    if (!isMissingCustomer) throw err;
    logger.warn(`Stale Stripe customer ${stripeCustomerId} for business ${business.id} — creating a new one`);
    const customer = await stripe.customers.create({
      name: business.name,
      metadata: { business_id: business.id },
    });
    stripeCustomerId = customer.id;
    session = await stripe.checkout.sessions.create({ ...sessionParams, customer: stripeCustomerId });
  }

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

// Cancelling stops billing outright — no Free-tier fallback (Free was deactivated in migration
// 015; there is no permanently-free plan anymore). The business simply has no active
// subscription until it renews, which also removes it from listings/subscriber access
// (see isSubscriptionActive below).
async function cancelSubscription(userId) {
  const business = await resolveBusinessForUser(userId);
  const current = await billingModel.getBusinessSubscription(business.id);
  if (!current || current.status === 'cancelled') {
    throw Object.assign(new Error('No active subscription to cancel'), { status: 400 });
  }

  if (current.stripe_subscription_id) {
    await stripe.subscriptions.cancel(current.stripe_subscription_id);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await billingModel.cancelBusinessSubscriptionInPlace(client, business.id);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return billingModel.getBusinessSubscription(business.id);
}

// A business is publicly visible / can access its own subscriber data only while its platform
// subscription is active or trialing. No row at all counts as not-visible (same bucket as
// 'cancelled') — a business mid-checkout or pre-Stripe-migration isn't entitled to visibility
// any more than one that explicitly cancelled.
async function isSubscriptionActive(businessId) {
  const sub = await billingModel.getBusinessSubscription(businessId);
  return !!sub && (sub.status === 'active' || sub.status === 'trial');
}

// Direct, synchronous alternative to waiting on the async webhook — called by the success screen
// right after Stripe redirects back, using the session_id createCheckoutSession now appends to
// success_url. Retrieves the session straight from Stripe and upserts business_subscriptions
// itself if it finds a real (trialing/active) subscription, using the exact same
// upsertBusinessSubscription call the webhook uses — safe to call even if the webhook already
// ran, or runs again later (ON CONFLICT upsert, not an insert-only path).
async function verifySession(userId, sessionId) {
  const business = await resolveBusinessForUser(userId);

  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
  if (session.metadata?.business_id !== business.id) {
    throw Object.assign(new Error('This checkout session does not belong to your business'), { status: 403 });
  }

  const planId = session.metadata?.plan_id;
  const subscription = session.subscription;
  if (!subscription || !planId || typeof subscription === 'string') {
    // Not paid/expanded yet — nothing to verify. Caller falls back to its existing poll.
    return { verified: false, subscription: await billingModel.getBusinessSubscription(business.id) };
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const saved = await billingModel.upsertBusinessSubscription(client, {
      businessId: business.id,
      planId,
      status: mapStripeStatus(subscription.status),
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: resolvePeriodEnd(subscription),
    });
    await client.query('COMMIT');
    return { verified: true, subscription: saved };
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
  logger.info('billing.webhook', `received ${event.type}`, { eventId: event.id });
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const inserted = await billingModel.insertWebhookEvent(client, event.id);
    if (!inserted) {
      // Already processed this event id — idempotent no-op.
      await client.query('ROLLBACK');
      logger.info('billing.webhook', `duplicate ${event.type}, skipped`, { eventId: event.id });
      return { handled: false, reason: 'duplicate' };
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const businessId = session.metadata?.business_id;
        const planId = session.metadata?.plan_id;
        if (businessId && planId) {
          // The Checkout Session itself doesn't carry the subscription's real status (trialing
          // vs active) — look it up so a trial isn't miscorded as a paid-and-active subscription.
          let status = 'active';
          let currentPeriodEnd = null;
          if (session.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(session.subscription);
              status = mapStripeStatus(subscription.status);
              currentPeriodEnd = resolvePeriodEnd(subscription);
            } catch (err) {
              logger.warn('billing.webhook', 'could not retrieve subscription for status, defaulting to active', { eventId: event.id, err: err.message });
            }
          }
          await billingModel.upsertBusinessSubscription(client, {
            businessId,
            planId,
            status,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            currentPeriodEnd,
          });
          logger.info('billing.webhook', 'checkout.session.completed applied', { businessId, planId, status });
        } else {
          logger.warn('billing.webhook', 'checkout.session.completed missing business_id/plan_id metadata', { eventId: event.id });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const plan = await billingModel.getPlanByStripePriceId(sub.items?.data?.[0]?.price?.id);
        await billingModel.updateSubscriptionStatusByStripeSubscriptionId(client, sub.id, {
          status: mapStripeStatus(sub.status),
          currentPeriodEnd: resolvePeriodEnd(sub),
          planId: plan?.id,
        });
        logger.info('billing.webhook', 'customer.subscription.updated applied', { stripeSubscriptionId: sub.id, status: sub.status });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await billingModel.updateSubscriptionStatusByStripeSubscriptionId(client, sub.id, {
          status: 'cancelled',
        });
        logger.info('billing.webhook', 'customer.subscription.deleted applied', { stripeSubscriptionId: sub.id });
        break;
      }
      default:
        logger.debug('billing.webhook', `unhandled event type ${event.type}`, { eventId: event.id });
        break;
    }

    await client.query('COMMIT');
    return { handled: true };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('billing.webhook', `error handling ${event.type}`, err);
    throw err;
  } finally {
    client.release();
  }
}

function mapStripeStatus(stripeStatus) {
  if (stripeStatus === 'trialing') return 'trial';
  if (stripeStatus === 'active') return 'active';
  if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') return 'cancelled';
  if (stripeStatus === 'past_due' || stripeStatus === 'incomplete_expired') return 'expired';
  return 'active';
}

// The date billing.service.js/the frontend should show as "when does this period end / when
// do you get charged". For a trialing subscription that's trial_end, not current_period_end
// (current_period_end moved off the top-level Subscription object onto each subscription item
// in newer Stripe API versions — read both so this keeps working either way).
function resolvePeriodEnd(subscription) {
  const unixSeconds = subscription.status === 'trialing'
    ? subscription.trial_end
    : (subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end);
  return unixSeconds ? new Date(unixSeconds * 1000) : null;
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
  verifySession,
  isSubscriptionActive,
  verifyWebhookSignature,
  handleWebhookEvent,
  getSubscriptionForUser,
  resolveTierForSubscriberCount,
  recheckAllTiers,
};
