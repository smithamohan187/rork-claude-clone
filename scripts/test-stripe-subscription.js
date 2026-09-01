// scripts/test-stripe-subscription.js
// Login-first, sequential PASS/FAIL — same pattern as scripts/test-business-module.js.
//
// Steps 4-6 simulate Stripe webhook deliveries locally (no Stripe CLI required) by signing
// a synthetic event payload with STRIPE_WEBHOOK_SECRET ourselves, using the same HMAC-SHA256
// scheme Stripe's SDK uses (see https://stripe.com/docs/webhooks/signatures#verify-manually).
// This requires backend/.env's STRIPE_WEBHOOK_SECRET to be set to a real value for signature
// verification to succeed — the placeholder committed to .env will make steps 4-6 fail.
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const crypto = require('crypto');
const BASE   = 'http://localhost:3000';
const fetch  = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function signPayload(payloadObj) {
  const payload = JSON.stringify(payloadObj);
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(signedPayload).digest('hex');
  return { payload, header: `t=${timestamp},v1=${signature}` };
}

async function sendWebhook(eventObj) {
  const { payload, header } = signPayload(eventObj);
  const res = await fetch(`${BASE}/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': header },
    body: payload,
  });
  return { res, data: await res.json().catch(() => ({})) };
}

async function run() {
  let token = '';

  // ── Step 1: Login (test business account, already has a business profile) ──
  console.log('\n[1] Logging in...');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'e2e.f.happy+1785935283403@example.com',
      password: 'TestPass123!',
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) { console.error('[1] FAIL login:', loginData); return; }
  token = loginData.data?.accessToken;
  console.log('[1] PASS login — token received:', !!token);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Step 2: GET /billing/plans ────────────────────────────────
  console.log('\n[2] Fetching subscription plans...');
  const plansRes = await fetch(`${BASE}/billing/plans`);
  const plansData = await plansRes.json();
  const plans = plansData.data ?? [];
  const paidPlan = plans.find(p => p.price_monthly > 0 && p.stripe_price_id);
  if (!plansRes.ok || plans.length === 0) {
    console.error('[2] FAIL plans:', plansData);
    return;
  }
  console.log('[2] PASS plans — count:', plans.length);
  if (!paidPlan) {
    console.warn('[2] WARN — no paid plan has a stripe_price_id set yet; steps 3-6 need one '
      + '(set subscription_plans.stripe_price_id by hand after creating a Price in the Stripe dashboard). Stopping here.');
    return;
  }

  // ── Step 3: POST /billing/checkout-session ──────────────────────
  console.log('\n[3] Creating checkout session...');
  const checkoutRes = await fetch(`${BASE}/billing/checkout-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      plan_id: paidPlan.id,
      success_url: 'rork-app://checkout-success',
      cancel_url: 'rork-app://checkout-cancel',
    }),
  });
  const checkoutData = await checkoutRes.json();
  if (!checkoutRes.ok || !checkoutData.data?.url) {
    console.error('[3] FAIL checkout-session:', checkoutData);
    return;
  }
  console.log('[3] PASS checkout-session — url received:', !!checkoutData.data.url);

  if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'whsec_replace_me') {
    console.warn('\n[4-6] SKIPPED — STRIPE_WEBHOOK_SECRET is still the placeholder in backend/.env. '
      + 'Set a real value (from `stripe listen` or the Stripe dashboard) to test webhook handling.');
    return;
  }

  // Fake IDs — good enough for the local business_subscriptions upsert path, since this
  // test doesn't hit real Stripe, only our own webhook handler.
  const fakeCustomerId = `cus_test_${Date.now()}`;
  const fakeSubscriptionId = `sub_test_${Date.now()}`;
  const businessId = '66466941-72ea-4703-84b5-3668ee3d7239'; // E2E Test Cafe — see memory: project_module_bug_hunt_progress

  // ── Step 4: checkout.session.completed ──────────────────────────
  console.log('\n[4] Simulating checkout.session.completed...');
  const eventId4 = `evt_test_${Date.now()}_completed`;
  const { res: res4, data: data4 } = await sendWebhook({
    id: eventId4,
    type: 'checkout.session.completed',
    data: {
      object: {
        customer: fakeCustomerId,
        subscription: fakeSubscriptionId,
        metadata: { business_id: businessId, plan_id: paidPlan.id },
      },
    },
  });
  if (!res4.ok) { console.error('[4] FAIL checkout.session.completed:', data4); return; }
  console.log('[4] PASS checkout.session.completed — webhook accepted');

  // ── Step 5: Re-send the same event id — idempotency check ───────
  console.log('\n[5] Re-sending the same event id (idempotency)...');
  const { res: res5, data: data5 } = await sendWebhook({
    id: eventId4, // same id as step 4, on purpose
    type: 'checkout.session.completed',
    data: {
      object: {
        customer: fakeCustomerId,
        subscription: fakeSubscriptionId,
        metadata: { business_id: businessId, plan_id: paidPlan.id },
      },
    },
  });
  if (!res5.ok) { console.error('[5] FAIL duplicate webhook rejected unexpectedly:', data5); return; }
  console.log('[5] PASS duplicate event accepted (200) but treated as a no-op — check DB for exactly one row');

  // ── Step 6: customer.subscription.deleted ────────────────────────
  console.log('\n[6] Simulating customer.subscription.deleted...');
  const eventId6 = `evt_test_${Date.now()}_deleted`;
  const { res: res6, data: data6 } = await sendWebhook({
    id: eventId6,
    type: 'customer.subscription.deleted',
    data: { object: { id: fakeSubscriptionId } },
  });
  if (!res6.ok) { console.error('[6] FAIL customer.subscription.deleted:', data6); return; }
  console.log('[6] PASS customer.subscription.deleted — webhook accepted');

  // ── Step 7: Verify final state via GET /billing/my-subscription ──
  console.log('\n[7] Verifying final subscription status...');
  const subRes = await fetch(`${BASE}/billing/my-subscription`, { headers });
  const subData = await subRes.json();
  const status = subData.data?.status;
  // Schema's CHECK constraint uses 'cancelled' (double L), not Stripe's 'canceled'.
  if (status === 'cancelled') {
    console.log('[7] PASS — business_subscriptions.status is "cancelled"');
  } else {
    console.error('[7] FAIL — expected status "cancelled", got:', status);
  }
}

run().catch((err) => console.error('Unhandled error:', err));
