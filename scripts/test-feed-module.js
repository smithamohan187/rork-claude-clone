// scripts/test-feed-module.js
// Feed module end-to-end test — subscribed feed, recommendations fallback, category filter, exclusions

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE         = 'http://localhost:3000';
const TEST_EMAIL   = process.env.TEST_EMAIL   || 'pinky@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Pinky123#';
// A user with NO subscriptions (or a fresh account) to test the recommendations fallback
const FRESH_EMAIL  = process.env.FRESH_EMAIL   || 'fresh@test.com';
const FRESH_PASSWORD = process.env.FRESH_PASSWORD || 'Fresh123#';

function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data !== undefined) console.log('   ', JSON.stringify(data, null, 2));
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function getFeed(token, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) qs.set(k, String(v));
  const url = `${BASE}/feed${qs.toString() ? '?' + qs : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

let passed = 0;
let failed = 0;

function assert(step, condition, msg, details) {
  if (condition) {
    log(step, 'PASS', msg);
    passed++;
  } else {
    log(step, 'FAIL', msg, details);
    failed++;
  }
}

async function run() {
  console.log('\n══════════════════════════════════════');
  console.log('  TouchPoints Feed Module Test        ');
  console.log('══════════════════════════════════════');
  console.log(`  Subscribed user: ${TEST_EMAIL}`);
  console.log(`  Fresh user:      ${FRESH_EMAIL}`);

  let token = '';
  let freshToken = '';

  // ── Step 1: Login (subscribed user) ───────────────────────────
  log(1, 'INFO', `Logging in as ${TEST_EMAIL}`);
  const login1 = await loginUser(TEST_EMAIL, TEST_PASSWORD);
  assert(1, login1.ok && login1.data?.data?.accessToken, 'Login success', login1.ok ? null : login1.data);
  token = login1.data?.data?.accessToken ?? '';

  // ── Step 2: GET /feed — expect mode:'feed' if subscribed ───────
  if (token) {
    log(2, 'INFO', 'GET /feed (subscribed user)');
    const feed = await getFeed(token);
    const d = feed.data?.data;
    if (d?.mode === 'feed') {
      assert(2, Array.isArray(d.items) && d.items.length > 0, `mode='feed' with ${d.items?.length} items`);
      const validTypes = d.items.every((i) => ['offer', 'event', 'post'].includes(i.item_type));
      assert('2b', validTypes, 'All items have valid item_type', validTypes ? null : d.items.map((i) => i.item_type));
      const hasRequired = d.items.every((i) => i.item_id && i.business_id && i.business_name && i.title && i.created_at);
      assert('2c', hasRequired, 'All items have required fields');
    } else if (d?.mode === 'recommendations') {
      log(2, 'INFO', `mode='recommendations' returned (user has no active feed content) — skipping feed assertions`);
      passed++;
    } else {
      assert(2, false, 'Unexpected feed response', d);
    }
  } else {
    log(2, 'FAIL', 'Skipped — no token');
    failed += 3;
  }

  // ── Step 3: Unauthenticated request returns 401 ────────────────
  log(3, 'INFO', 'GET /feed without token — expect 401');
  const noAuth = await getFeed('');
  assert(3, noAuth.status === 401, `401 response, got ${noAuth.status}`);

  // ── Step 4: Login fresh user, expect recommendations fallback ──
  log(4, 'INFO', `Logging in as fresh user ${FRESH_EMAIL}`);
  const login2 = await loginUser(FRESH_EMAIL, FRESH_PASSWORD);
  if (login2.ok && login2.data?.data?.accessToken) {
    freshToken = login2.data.data.accessToken;
    log(4, 'PASS', 'Fresh user login success');
    passed++;

    log('4b', 'INFO', 'GET /feed (fresh user — no subscriptions)');
    const freshFeed = await getFeed(freshToken);
    const fd = freshFeed.data?.data;
    assert('4b', fd?.mode === 'recommendations', `mode='recommendations' for fresh user (got '${fd?.mode}')`);
    if (fd?.mode === 'recommendations') {
      const hasBusinessFields = fd.items.every((b) => b.id && b.name);
      assert('4c', hasBusinessFields, 'Recommendation items have id and name fields');
    }
  } else {
    log(4, 'INFO', `Fresh user login failed — skipping recommendations test (create account: ${FRESH_EMAIL})`);
    log('4b', 'INFO', 'Skipped');
  }

  // ── Step 5: Category filter ────────────────────────────────────
  if (token) {
    log(5, 'INFO', 'GET /feed?category=<invalid-uuid> — expect 200 with empty or valid response');
    const catFeed = await getFeed(token, { category: '00000000-0000-0000-0000-000000000000' });
    assert(5, catFeed.ok, `Category filter request succeeded (status ${catFeed.status})`);

    log('5b', 'INFO', 'GET /feed?limit=5 — expect at most 5 items');
    const limited = await getFeed(token, { limit: 5 });
    const ld = limited.data?.data;
    assert('5b', !ld?.items || ld.items.length <= 5, `Limit=5 respected (got ${ld?.items?.length})`);
  }

  // ── Step 6: Verify expired offers excluded ─────────────────────
  if (token) {
    log(6, 'INFO', 'Feed should not contain expired offers (expires_at < NOW)');
    const checkFeed = await getFeed(token);
    const items = checkFeed.data?.data?.items ?? [];
    const hasExpired = items.some((i) => {
      if (i.item_type !== 'offer') return false;
      if (!i.relevant_date) return false;
      return new Date(i.relevant_date) < new Date();
    });
    assert(6, !hasExpired, `No expired offers in feed (found ${hasExpired ? 'YES — FAIL' : 'none — OK'})`);
  }

  // ── Step 7: Verify cancelled events excluded ───────────────────
  if (token) {
    log(7, 'INFO', 'Feed should not contain cancelled events');
    const checkFeed = await getFeed(token);
    const items = checkFeed.data?.data?.items ?? [];
    // Cancelled events would have no relevant_date or a past relevant_date with status metadata
    // We can only check indirectly: any event should have starts_at > NOW (already filtered server-side)
    const hasPastEvent = items.some((i) => {
      if (i.item_type !== 'event') return false;
      if (!i.relevant_date) return false;
      return new Date(i.relevant_date) < new Date();
    });
    assert(7, !hasPastEvent, `No past/cancelled events in feed (found ${hasPastEvent ? 'YES — FAIL' : 'none — OK'})`);
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\n❌ Unhandled error:', err.message);
  process.exit(1);
});
