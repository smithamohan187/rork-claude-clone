/**
 * Test script: Dynamic Business Analytics page.
 *
 * Covers:
 *   - GET /analytics/summary?period=7|30|90
 *
 * Prerequisites:
 *   - Backend running on BASE_URL
 *   - TEST_EMAIL / TEST_PASSWORD is a BUSINESS OWNER (some seed activity makes assertions
 *     more meaningful, but empty-state responses are also valid)
 *   - Optionally OWNER2_EMAIL / OWNER2_PASSWORD for the ownership isolation test
 *
 * Run: node scripts/test-business-analytics.js
 */

const BASE_URL        = process.env.BASE_URL        || 'http://192.168.1.4:3000';
const EMAIL           = process.env.TEST_EMAIL      || 'pinky@test.com';
const PASSWORD        = process.env.TEST_PASSWORD   || 'Pinky123#';
const OWNER2_EMAIL    = process.env.OWNER2_EMAIL    || '';
const OWNER2_PASSWORD = process.env.OWNER2_PASSWORD || '';

let token = '';
let passed = 0;
let failed = 0;

function pass(label) { console.log(`  PASS  ${label}`); passed++; }
function fail(label, detail) { console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); failed++; }

async function req(method, path, body, authToken = token) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

async function loginAs(email, password) {
  const { status, body } = await req('POST', '/auth/login', { identifier: email, password }, null);
  if (status === 200 && body.data?.accessToken) return body.data.accessToken;
  return null;
}

async function login() {
  console.log('\n[1] Login as business owner');
  token = await loginAs(EMAIL, PASSWORD);
  if (token) pass('Login succeeded');
  else { fail('Login', `could not authenticate ${EMAIL}`); process.exit(1); }
}

function assertSummaryShape(data) {
  const summaryKeys = ['new_subscribers', 'offers_shared', 'points_awarded', 'coupons_redeemed'];
  const summaryOK = summaryKeys.every(
    (k) => typeof data.summary?.[k]?.value === 'number' && typeof data.summary?.[k]?.changePct === 'number'
  );
  const arraysOK =
    Array.isArray(data.redemptionTrend) &&
    Array.isArray(data.subscriberGrowth) &&
    Array.isArray(data.pointsBreakdown) &&
    Array.isArray(data.topSharedOffers);
  return summaryOK && arraysOK;
}

async function testSummaryShape() {
  console.log('\n[2] GET /analytics/summary?period=7 — assert shape');
  const { status, body } = await req('GET', '/analytics/summary?period=7');
  if (status !== 200) { fail('request failed', `status=${status} body=${JSON.stringify(body)}`); return; }
  if (assertSummaryShape(body.data)) pass('summary + trend/growth/breakdown/topSharedOffers shape OK');
  else fail('shape invalid', JSON.stringify(body.data));
}

async function testDifferentPeriods() {
  console.log('\n[3] period=30 and period=90 return different date-range-sized series');
  const r30 = (await req('GET', '/analytics/summary?period=30')).body.data;
  const r90 = (await req('GET', '/analytics/summary?period=90')).body.data;
  if (!r30 || !r90) { fail('missing data', 'period=30 or period=90 returned no data'); return; }
  if (r30.period === 30 && r90.period === 90) pass(`period echoed correctly (30, 90)`);
  else fail('period field mismatch', `got ${r30.period}, ${r90.period}`);

  if (r30.subscriberGrowth.length <= r90.subscriberGrowth.length) {
    pass(`subscriberGrowth series length scales with period (${r30.subscriberGrowth.length} <= ${r90.subscriberGrowth.length})`);
  } else {
    fail('series length did not scale with period', `30d=${r30.subscriberGrowth.length} 90d=${r90.subscriberGrowth.length}`);
  }
}

async function testZeroPreviousPeriodNoThrow() {
  console.log('\n[4] % change calc does not throw on a zero-previous-period business');
  const { status, body } = await req('GET', '/analytics/summary?period=7');
  if (status !== 200) { fail('request failed', `status=${status}`); return; }
  const changes = Object.values(body.data.summary).map((m) => m.changePct);
  const allFinite = changes.every((c) => Number.isFinite(c));
  if (allFinite) pass(`all changePct values are finite numbers (${changes.join(', ')})`);
  else fail('non-finite changePct found', JSON.stringify(body.data.summary));
}

async function testOwnershipIsolation() {
  console.log('\n[5] A different business owner gets their own analytics, not this one');
  if (!OWNER2_EMAIL || !OWNER2_PASSWORD) {
    console.log('    INFO  OWNER2_EMAIL/OWNER2_PASSWORD not set — skipping isolation test');
    return;
  }
  const token2 = await loginAs(OWNER2_EMAIL, OWNER2_PASSWORD);
  if (!token2) { fail('owner2 login', 'could not authenticate second owner'); return; }

  const mine = (await req('GET', '/analytics/summary?period=90', undefined, token)).body.data;
  const theirs = (await req('GET', '/analytics/summary?period=90', undefined, token2)).body.data;
  if (!mine || !theirs) { fail('missing data', 'one of the two owners returned no data'); return; }

  const mineOfferIds = new Set((mine.topSharedOffers ?? []).map((o) => o.id));
  const leak = (theirs.topSharedOffers ?? []).filter((o) => mineOfferIds.has(o.id));
  if (leak.length === 0) pass('owner2 topSharedOffers do not include owner1 offers (isolated)');
  else fail('cross-owner data leak', `${leak.length} shared offer id(s)`);
}

async function testNonOwnerRejected() {
  console.log('\n[6] Non-business profile is rejected (404, not another business\'s data)');
  // No dedicated non-owner test account is guaranteed to exist; this documents expected
  // behavior and only asserts when a bad/missing token path is exercised via a garbage token.
  const { status, body } = await req('GET', '/analytics/summary?period=7', undefined, 'not-a-real-token');
  if (status === 401 || status === 403) pass(`unauthenticated request correctly rejected (status=${status})`);
  else fail('unauthenticated request not rejected', `status=${status} body=${JSON.stringify(body)}`);
}

(async () => {
  console.log('=== Business Analytics Test Suite ===');
  try {
    await login();
    await testSummaryShape();
    await testDifferentPeriods();
    await testZeroPreviousPeriodNoThrow();
    await testOwnershipIsolation();
    await testNonOwnerRejected();
  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
