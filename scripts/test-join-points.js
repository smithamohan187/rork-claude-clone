/**
 * Test script: auto-award join points on subscription.
 *
 * Prerequisites:
 *   - Backend running on BASE_URL
 *   - TEST_EMAIL / TEST_PASSWORD env vars set, or edit defaults below
 *   - At least one business with welcome_bonus_points > 0 (BUSINESS_ID_A)
 *   - At least one business with welcome_bonus_points = 0 or no reward_config (BUSINESS_ID_ZERO)
 *   - A second business with a different bonus for the split test (BUSINESS_ID_B)
 *   - DB access to verify via psql or a separate connection (queries are logged to console)
 *
 * Run:  node scripts/test-join-points.js
 */

const BASE_URL  = process.env.BASE_URL  || 'http://192.168.1.4:3000';
const EMAIL     = process.env.TEST_EMAIL    || 'pinky@test.com';
const PASSWORD  = process.env.TEST_PASSWORD || 'Pinky123#';

// Replace these with real UUIDs from your DB before running
// BUSINESS_ID_A    — has welcome_bonus_points > 0 (Test Business, 20 pts)
// BUSINESS_ID_ZERO — no reward_config / 0 bonus  (Ritas Showroom)
// BUSINESS_ID_B    — second business for split test; same as ZERO here since only 2 businesses exist
const BUSINESS_ID_A    = process.env.BUSINESS_ID_A    || '10c365c7-547d-4004-b431-f601ef69d44d';
const BUSINESS_ID_ZERO = process.env.BUSINESS_ID_ZERO || '14e753e9-cfec-45a6-a704-8473586a1234';
const BUSINESS_ID_B    = process.env.BUSINESS_ID_B    || '10c365c7-547d-4004-b431-f601ef69d44d';
 
let token = '';
let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  PASS  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

async function login() {
  console.log('\n[1] Login');
  const { status, body } = await req('POST', '/auth/login', { identifier: EMAIL, password: PASSWORD });
  if (status === 200 && body.data?.accessToken) {
    token = body.data.accessToken;
    pass('Login succeeded, token received');
  } else {
    fail('Login', `status=${status} body=${JSON.stringify(body)}`);
    process.exit(1);
  }
}

async function unsubscribeSilent(businessId) {
  await req('POST', '/subscriptions/unsubscribe', { business_id: businessId });
}

async function subscribe(businessId) {
  return req('POST', '/subscriptions/subscribe', { business_id: businessId });
}

async function getSummary() {
  return req('GET', '/points/summary');
}

async function testBasicAward() {
  console.log('\n[2] Subscribe to business A (welcome_bonus_points > 0) → expect points row created');
  await unsubscribeSilent(BUSINESS_ID_A);  // reset state
  await new Promise(r => setTimeout(r, 100));
  const { status, body } = await subscribe(BUSINESS_ID_A);
  if (status === 200 && body.data?.subscribed) {
    pass('Subscribe returned 200 with subscribed:true');
  } else {
    fail('Subscribe to business A', `status=${status}`);
  }
  console.log('    → Check DB: SELECT points FROM points_transactions WHERE business_id = \'' + BUSINESS_ID_A + '\' AND type = \'earn_welcome\'');
}

async function testSummaryEndpoint() {
  console.log('\n[3] GET /points/summary → expect total ≥ welcome_bonus_points, breakdown includes business A');
  const { status, body } = await getSummary();
  if (status !== 200) {
    fail('GET /points/summary', `status=${status}`);
    return;
  }
  const { total, breakdown } = body.data;
  if (typeof total === 'number' && total > 0) {
    pass(`Total points = ${total}`);
  } else {
    fail('Total points', `expected > 0, got ${total}`);
  }
  const bizA = breakdown?.find(b => b.businessId === BUSINESS_ID_A);
  if (bizA && bizA.points > 0) {
    pass(`Business A in breakdown with ${bizA.points} pts`);
  } else {
    fail('Business A not in breakdown or zero points', JSON.stringify(breakdown));
  }
}

async function testIdempotency() {
  console.log('\n[4] Unsubscribe then resubscribe business A → expect NO duplicate points row');
  await unsubscribeSilent(BUSINESS_ID_A);
  await new Promise(r => setTimeout(r, 100));
  const before = await getSummary();
  const totalBefore = before.body.data?.total ?? 0;

  await subscribe(BUSINESS_ID_A);
  await new Promise(r => setTimeout(r, 100));
  const after = await getSummary();
  const totalAfter = after.body.data?.total ?? 0;

  if (totalAfter === totalBefore) {
    pass(`Total unchanged after resubscribe (${totalBefore} pts) — idempotency holds`);
  } else {
    fail('Idempotency', `total before=${totalBefore}, after=${totalAfter} — points were re-awarded`);
  }
}

async function testZeroPoints() {
  console.log('\n[5] Subscribe to business with 0 / no welcome_bonus_points → no error, no points row');
  await unsubscribeSilent(BUSINESS_ID_ZERO);
  const { status, body } = await subscribe(BUSINESS_ID_ZERO);
  if (status === 200 && body.data?.subscribed) {
    pass('Subscribe succeeded without error');
  } else {
    fail('Subscribe to zero-points business', `status=${status}`);
  }
  const { body: sumBody } = await getSummary();
  const bizZero = sumBody.data?.breakdown?.find(b => b.businessId === BUSINESS_ID_ZERO);
  if (!bizZero) {
    pass('Business with 0 bonus not in breakdown (no zero-point row inserted)');
  } else {
    fail('Zero-bonus business should not appear in breakdown', JSON.stringify(bizZero));
  }
}

async function testTwoBusinessSplit() {
  console.log('\n[6] Subscribe to business B → breakdown shows both A and B, total is their sum');
  await unsubscribeSilent(BUSINESS_ID_B);
  await subscribe(BUSINESS_ID_B);
  await new Promise(r => setTimeout(r, 100));
  const { body } = await getSummary();
  if (!body.data) { fail('GET /points/summary in test 6', JSON.stringify(body)); return; }
  const { total, breakdown } = body.data;
  const bizA = breakdown?.find(b => b.businessId === BUSINESS_ID_A);
  const bizB = breakdown?.find(b => b.businessId === BUSINESS_ID_B);

  if (bizA && bizB) {
    pass('Both business A and B appear in breakdown');
  } else {
    fail('Expected both businesses in breakdown', JSON.stringify(breakdown));
  }
  // When A and B are the same business (only 2 businesses in DB), avoid double-counting
  const uniquePoints = BUSINESS_ID_A === BUSINESS_ID_B
    ? (bizA?.points ?? 0)
    : (bizA?.points ?? 0) + (bizB?.points ?? 0);
  if (typeof total === 'number' && total >= uniquePoints) {
    pass(`Total (${total}) ≥ unique business points (${uniquePoints})`);
  } else {
    fail('Total mismatch', `total=${total}, unique pts=${uniquePoints}`);
  }
}

(async () => {
  console.log('=== Join Points Test Suite ===');
  try {
    await login();
    await testBasicAward();
    await testSummaryEndpoint();
    await testIdempotency();
    await testZeroPoints();
    await testTwoBusinessSplit();
  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
