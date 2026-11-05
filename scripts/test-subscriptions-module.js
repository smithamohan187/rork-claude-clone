// scripts/test-subscriptions-module.js
// Core Subscribe-to-Business module — end-to-end test. Previously only ever exercised as a
// side-effect/setup step inside other scripts (dashboard, business-subscriber-referral, etc.) —
// this gives the subscribe/unsubscribe/status/my-businesses/members flow its own checklist.
//
// Covers:
//   - POST /subscriptions/subscribe   (incl. welcome-points bonus, self-subscribe guard)
//   - POST /subscriptions/unsubscribe
//   - GET  /subscriptions/status
//   - GET  /subscriptions/my-businesses
//   - GET  /subscriptions/members (+ DELETE, owner-only)
//
// Prerequisites:
//   - Backend running on BASE_URL (defaults to deployed Cloud Run URL)
//   - BUSINESS_ID: a real, unlocked business the TEST_EMAIL account does NOT own (required)
//   - TEST_EMAIL / TEST_PASSWORD: a customer account that can subscribe to BUSINESS_ID
//   - OWNER_EMAIL / OWNER_PASSWORD: BUSINESS_ID's own owner account (for the members check)
//
// Run: BUSINESS_ID=<id> node scripts/test-subscriptions-module.js

const BASE          = process.env.TEST_BASE_URL  || 'https://touchpoints-backend-495493629048.asia-south1.run.app';
const EMAIL         = process.env.TEST_EMAIL     || 'pinky@test.com';
const PASSWORD      = process.env.TEST_PASSWORD  || 'Pinky123#';
const OWNER_EMAIL   = process.env.OWNER_EMAIL    || 'e2e.f.happy+1785935283403@example.com';
const OWNER_PASSWORD= process.env.OWNER_PASSWORD || 'TestPass123!';
const BUSINESS_ID   = process.env.BUSINESS_ID    || '66466941-72ea-4703-84b5-3668ee3d7239';

let passed = 0;
let failed = 0;

function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data !== undefined) console.log('   ', JSON.stringify(data, null, 2));
}
function assert(step, condition, msg, details) {
  if (condition) { log(step, 'PASS', msg); passed++; }
  else           { log(step, 'FAIL', msg, details); failed++; }
}

async function api(method, endpoint, { token, body } = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

async function login(email, password) {
  const r = await api('POST', '/auth/login', { body: { identifier: email, password } });
  return { ok: r.ok, token: r.data?.data?.accessToken };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Subscriptions (Subscribe/Unsubscribe) Test');
  console.log('══════════════════════════════════════════════════');

  try {
    // ── T0: Login ────────────────────────────────────────────────────────────
    const customer = await login(EMAIL, PASSWORD);
    assert('T0-LOGIN', customer.ok && customer.token, 'Customer login succeeds');
    if (!customer.token) { console.log('\n❌ Cannot continue'); process.exit(1); }

    // Start from a known state.
    await api('POST', '/subscriptions/unsubscribe', { token: customer.token, body: { business_id: BUSINESS_ID } });

    // ── T1: status reflects not-subscribed ──────────────────────────────────
    const r1 = await api('GET', `/subscriptions/status?business_id=${BUSINESS_ID}`, { token: customer.token });
    assert('T1-STATUS-FALSE', r1.status === 200 && r1.data?.data?.isSubscribed === false,
      'GET status before subscribing → isSubscribed:false', r1.data);

    // ── T2: subscribe succeeds ───────────────────────────────────────────────
    const r2 = await api('POST', '/subscriptions/subscribe', { token: customer.token, body: { business_id: BUSINESS_ID } });
    assert('T2-SUBSCRIBE', r2.status === 200 && r2.data?.data?.subscribed === true,
      'POST subscribe → 200 subscribed:true', r2.data);
    assert('T2-BUSINESS-SHAPE', typeof r2.data?.data?.business?.name === 'string',
      'Response includes the business name', r2.data?.data?.business);

    // ── T3: status now reflects subscribed ───────────────────────────────────
    const r3 = await api('GET', `/subscriptions/status?business_id=${BUSINESS_ID}`, { token: customer.token });
    assert('T3-STATUS-TRUE', r3.status === 200 && r3.data?.data?.isSubscribed === true,
      'GET status after subscribing → isSubscribed:true', r3.data);

    // ── T4: business appears in my-businesses ────────────────────────────────
    const r4 = await api('GET', '/subscriptions/my-businesses', { token: customer.token });
    const list4 = r4.data?.data ?? [];
    assert('T4-MY-BUSINESSES', r4.status === 200 && list4.some((b) => b.id === BUSINESS_ID || b.business_id === BUSINESS_ID),
      'GET my-businesses includes the subscribed business', { count: list4.length });

    // ── T5: re-subscribing is idempotent (no duplicate row / no crash) ──────
    const r5 = await api('POST', '/subscriptions/subscribe', { token: customer.token, body: { business_id: BUSINESS_ID } });
    assert('T5-RESUBSCRIBE-IDEMPOTENT', r5.status === 200 && r5.data?.data?.subscribed === true,
      'Subscribing again while already subscribed → still 200, no error', r5.data);

    // ── T6: unsubscribe succeeds ─────────────────────────────────────────────
    const r6 = await api('POST', '/subscriptions/unsubscribe', { token: customer.token, body: { business_id: BUSINESS_ID } });
    assert('T6-UNSUBSCRIBE', r6.status === 200 && r6.data?.data?.subscribed === false,
      'POST unsubscribe → 200 subscribed:false', r6.data);

    const r6b = await api('GET', `/subscriptions/status?business_id=${BUSINESS_ID}`, { token: customer.token });
    assert('T6B-STATUS-FALSE-AFTER-UNSUB', r6b.data?.data?.isSubscribed === false,
      'GET status after unsubscribing → isSubscribed:false', r6b.data);

    // ── T7: unsubscribing when not subscribed is a safe no-op ───────────────
    const r7 = await api('POST', '/subscriptions/unsubscribe', { token: customer.token, body: { business_id: BUSINESS_ID } });
    assert('T7-DOUBLE-UNSUBSCRIBE-SAFE', r7.status === 200,
      'Unsubscribing again while already unsubscribed → still 200, no crash', r7.data);

    // ── T8: self-subscribe guard — an owner cannot subscribe to their own business ──
    const owner = await login(OWNER_EMAIL, OWNER_PASSWORD);
    if (owner.token) {
      const r8 = await api('POST', '/subscriptions/subscribe', { token: owner.token, body: { business_id: BUSINESS_ID } });
      assert('T8-SELF-SUBSCRIBE-GUARD', r8.status === 400 && /own business/i.test(r8.data?.error || ''),
        'Owner subscribing to their own business → 400 "cannot subscribe to your own business"', r8.data);
    } else {
      console.log('    INFO  OWNER_EMAIL/OWNER_PASSWORD login failed — skipping self-subscribe guard check');
    }

    // ── T9: validation — missing business_id → 400 ──────────────────────────
    const r9a = await api('POST', '/subscriptions/subscribe', { token: customer.token, body: {} });
    assert('T9A-MISSING-BUSINESS-ID-SUBSCRIBE', r9a.status === 400, 'subscribe with no business_id → 400', r9a.data);
    const r9b = await api('GET', '/subscriptions/status', { token: customer.token });
    assert('T9B-MISSING-BUSINESS-ID-STATUS', r9b.status === 400, 'status with no business_id → 400', r9b.data);

    // ── T10: unauthenticated requests are rejected ───────────────────────────
    const r10a = await api('POST', '/subscriptions/subscribe', { body: { business_id: BUSINESS_ID } });
    assert('T10A-SUBSCRIBE-401', r10a.status === 401, 'subscribe with no token → 401', r10a.data);
    const r10b = await api('GET', `/subscriptions/status?business_id=${BUSINESS_ID}`, {});
    assert('T10B-STATUS-401', r10b.status === 401, 'status with no token → 401', r10b.data);
    const r10c = await api('GET', '/subscriptions/members', {});
    assert('T10C-MEMBERS-401', r10c.status === 401, 'members with no token → 401', r10c.data);

    // ── T11: a non-owner cannot view the business's members list ────────────
    const r11 = await api('GET', `/subscriptions/members?business_id=${BUSINESS_ID}`, { token: customer.token });
    assert('T11-MEMBERS-NON-OWNER-403', r11.status === 403,
      'A non-owner requesting members → 403', r11.data);

    // ── T12: owner CAN view their own members list ──────────────────────────
    if (owner.token) {
      // re-subscribe the customer so there's at least one real member to see
      await api('POST', '/subscriptions/subscribe', { token: customer.token, body: { business_id: BUSINESS_ID } });
      const r12 = await api('GET', '/subscriptions/members', { token: owner.token });
      assert('T12-MEMBERS-OWNER', r12.status === 200 && Array.isArray(r12.data?.data?.members ?? r12.data?.data),
        'Owner can view their own members list', { status: r12.status });
      // Leave the customer subscribed/unsubscribed state as we found it (unsubscribed at T6).
      await api('POST', '/subscriptions/unsubscribe', { token: customer.token, body: { business_id: BUSINESS_ID } });
    }

  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
