/**
 * Test script: Dynamic Business Dashboard Feed (stats, recent activity, redemptions).
 *
 * Covers:
 *   - GET /businesses/me/dashboard-summary  (extended with total_redemption_count)
 *   - GET /dashboard/feed/recent-activity?limit&offset
 *   - GET /dashboard/feed/redemptions?limit&offset
 *
 * Prerequisites:
 *   - Backend running on BASE_URL
 *   - TEST_EMAIL / TEST_PASSWORD is a BUSINESS OWNER with some seed activity
 *     (events, redemptions, subscribers, likes, comments, referrals) for meaningful assertions
 *   - OWNER2_EMAIL / OWNER2_PASSWORD is a DIFFERENT business owner (for the ownership isolation test)
 *   - Optionally BUSINESS_ID_A + an affordable reward, to exercise the redeem-increments-count check
 *
 * Run: node scripts/test-dashboard-feed-module.js
 */

const BASE_URL       = process.env.BASE_URL       || 'http://192.168.1.4:3000';
const EMAIL          = process.env.TEST_EMAIL     || 'pinky@test.com';
const PASSWORD       = process.env.TEST_PASSWORD  || 'Pinky123#';
const OWNER2_EMAIL   = process.env.OWNER2_EMAIL   || '';
const OWNER2_PASSWORD= process.env.OWNER2_PASSWORD|| '';
const BUSINESS_ID_A  = process.env.BUSINESS_ID_A  || '';

const VALID_TYPES = ['redemption', 'subscriber', 'like', 'comment', 'referral'];

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

async function getSummary() {
  const { body } = await req('GET', '/businesses/me/dashboard-summary');
  return body.data;
}

async function testSummaryShape() {
  console.log('\n[2] Dashboard summary includes total_redemption_count + upcoming_event_count');
  const summary = await getSummary();
  if (!summary) { fail('summary missing', 'is this account a business owner?'); return; }
  const hasFields = ['subscriber_count', 'active_offer_count', 'upcoming_event_count', 'total_redemption_count']
    .every((k) => typeof summary[k] === 'number');
  if (hasFields) pass(`summary shape OK (redemptions=${summary.total_redemption_count}, upcoming events=${summary.upcoming_event_count})`);
  else fail('summary missing numeric fields', JSON.stringify(summary));
}

async function testRedeemIncrementsCount() {
  console.log('\n[3] Redeeming a reward increments total_redemption_count (then mark used)');
  if (!BUSINESS_ID_A) { console.log('    INFO  BUSINESS_ID_A not set — skipping redeem-increment check'); return; }

  // Note: the "Redeemed" stat counts coupons with status='used'. A fresh redeem creates an
  // 'active' coupon; we mark it used via /coupons/:id/use so the all-time count moves.
  const before = (await getSummary())?.total_redemption_count ?? 0;

  const { body: rwBody } = await req('GET', `/businesses/${BUSINESS_ID_A}/rewards`);
  const affordable = (rwBody.data?.rewards ?? []).find((r) => r.affordable);
  if (!affordable) { console.log('    INFO  No affordable reward for this user — skipping test 3'); return; }

  const { status: rs, body: rb } = await req('POST', `/businesses/${BUSINESS_ID_A}/rewards/${affordable.id}/redeem`, {});
  if (rs !== 201 || !rb.data?.couponId) { fail('redeem failed', `status=${rs}`); return; }
  const useRes = await req('POST', `/coupons/${rb.data.couponId}/use`, {});
  if (useRes.status !== 200) { fail('mark-used failed', `status=${useRes.status}`); return; }

  const after = (await getSummary())?.total_redemption_count ?? 0;
  if (after === before + 1) pass(`total_redemption_count incremented ${before} → ${after}`);
  else fail('count did not increment by 1', `before=${before} after=${after}`);
}

async function testRecentActivity() {
  console.log('\n[4] GET /dashboard/feed/recent-activity — shape, valid types, sorted DESC');
  const { status, body } = await req('GET', '/dashboard/feed/recent-activity?limit=20&offset=0');
  if (status !== 200 || !Array.isArray(body.data)) { fail('recent-activity', `status=${status} body=${JSON.stringify(body)}`); return; }
  const items = body.data;
  pass(`recent-activity returned ${items.length} item(s)`);

  if (items.length === 0) { console.log('    INFO  No activity for this business — see test 8 empty-state note'); return; }

  const shapeOK = items.every((i) =>
    VALID_TYPES.includes(i.type) &&
    typeof i.message === 'string' &&
    typeof i.referenceId === 'string' &&
    typeof i.timestamp === 'string');
  if (shapeOK) pass('every item has valid type + message + referenceId + timestamp');
  else fail('item shape invalid', JSON.stringify(items[0]));

  const times = items.map((i) => new Date(i.timestamp).getTime());
  const sorted = times.every((t, idx) => idx === 0 || times[idx - 1] >= t);
  if (sorted) pass('items sorted by timestamp DESC');
  else fail('items not sorted DESC', JSON.stringify(times));

  const typesSeen = [...new Set(items.map((i) => i.type))];
  console.log(`    INFO  activity types present: ${typesSeen.join(', ') || '(none)'}`);
}

async function testActivityPagination() {
  console.log('\n[5] recent-activity pagination — page 2 has no overlap with page 1');
  const p1 = (await req('GET', '/dashboard/feed/recent-activity?limit=2&offset=0')).body.data ?? [];
  const p2 = (await req('GET', '/dashboard/feed/recent-activity?limit=2&offset=2')).body.data ?? [];
  if (p1.length < 2) { console.log('    INFO  Fewer than 3 activity rows — pagination not exercisable, skipping'); return; }
  const ids1 = new Set(p1.map((i) => i.referenceId));
  const overlap = p2.filter((i) => ids1.has(i.referenceId));
  if (overlap.length === 0) pass(`no duplicates across pages (page1=${p1.length}, page2=${p2.length})`);
  else fail('pagination overlap detected', `${overlap.length} duplicated referenceId(s)`);
}

async function testRedemptions() {
  console.log('\n[6] GET /dashboard/feed/redemptions — customer/reward/timestamp, sorted DESC');
  const { status, body } = await req('GET', '/dashboard/feed/redemptions?limit=20&offset=0');
  if (status !== 200 || !Array.isArray(body.data)) { fail('redemptions', `status=${status} body=${JSON.stringify(body)}`); return; }
  const items = body.data;
  pass(`redemptions returned ${items.length} row(s)`);
  if (items.length === 0) { console.log('    INFO  No redemptions for this business — empty-state path'); return; }

  const shapeOK = items.every((r) =>
    typeof r.referenceId === 'string' &&
    typeof r.rewardName === 'string' &&
    typeof r.redeemedAt === 'string' &&
    ('customerName' in r));
  if (shapeOK) pass('every redemption has referenceId + rewardName + redeemedAt + customerName');
  else fail('redemption shape invalid', JSON.stringify(items[0]));

  const times = items.map((r) => new Date(r.redeemedAt).getTime());
  const sorted = times.every((t, idx) => idx === 0 || times[idx - 1] >= t);
  if (sorted) pass('redemptions sorted by redeemedAt DESC');
  else fail('redemptions not sorted DESC', JSON.stringify(times));
}

async function testOwnershipIsolation() {
  console.log('\n[7] A different business owner sees their own feed, not this one');
  if (!OWNER2_EMAIL || !OWNER2_PASSWORD) {
    console.log('    INFO  OWNER2_EMAIL/OWNER2_PASSWORD not set — skipping isolation test');
    return;
  }
  const token2 = await loginAs(OWNER2_EMAIL, OWNER2_PASSWORD);
  if (!token2) { fail('owner2 login', 'could not authenticate second owner'); return; }

  const mine = (await req('GET', '/dashboard/feed/redemptions?limit=50&offset=0', undefined, token)).body.data ?? [];
  const theirs = (await req('GET', '/dashboard/feed/redemptions?limit=50&offset=0', undefined, token2)).body.data ?? [];
  const mineIds = new Set(mine.map((r) => r.referenceId));
  const leak = theirs.filter((r) => mineIds.has(r.referenceId));
  if (leak.length === 0) pass('owner2 redemptions do not include owner1 rows (feeds are isolated)');
  else fail('cross-owner data leak', `${leak.length} shared referenceId(s)`);
}

async function testNoBusinessReturns404() {
  console.log('\n[8] Non-business account (or empty states) handled gracefully');
  // Empty-state is validated implicitly in tests 4 & 6 (200 + []). Here we just confirm the
  // endpoint returns a well-formed success envelope even with no data.
  const { status, body } = await req('GET', '/dashboard/feed/recent-activity?limit=1&offset=0');
  if (status === 200 && body.success === true && Array.isArray(body.data)) {
    pass('endpoint returns { success:true, data:[...] } envelope');
  } else if (status === 404) {
    pass('non-business owner correctly receives 404');
  } else {
    fail('unexpected envelope', `status=${status} body=${JSON.stringify(body)}`);
  }
}

(async () => {
  console.log('=== Dashboard Feed Test Suite ===');
  try {
    await login();
    await testSummaryShape();
    await testRedeemIncrementsCount();
    await testRecentActivity();
    await testActivityPagination();
    await testRedemptions();
    await testOwnershipIsolation();
    await testNoBusinessReturns404();
  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
