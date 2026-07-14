// scripts/test-feed-fallback.js
// Feed fallback chain test — feed → category_recommendations → location_recommendations → top_rated
//
// The chain is stateful: each scenario needs a differently-configured account.
// Configure the ones you have via env vars; missing accounts log INFO and are skipped
// rather than hard-failing, so the script is runnable in any environment.
//
//   FEED_EMAIL / FEED_PASSWORD          — subscribed to a business WITH an active offer/event/post
//   STALE_EMAIL / STALE_PASSWORD        — has subscriptions but ZERO active content
//   CATEGORY_EMAIL / CATEGORY_PASSWORD  — no subs, but an interested category matching a business
//   LOCATION_EMAIL / LOCATION_PASSWORD  — no subs, no category match, same city as a business
//   TOPRATED_EMAIL / TOPRATED_PASSWORD  — no subs, no category match, foreign city
//
// Any account not set falls back to TEST_EMAIL / TEST_PASSWORD (still asserts items non-empty).
//   OWNER_EMAIL / OWNER_PASSWORD  — user who OWNS a business and has zero subscriptions
//                                   used to assert own business never appears in recommendations

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE = 'http://localhost:3000';
const DEFAULT_EMAIL = process.env.TEST_EMAIL || 'pinky@test.com';
const DEFAULT_PASSWORD = process.env.TEST_PASSWORD || 'Pinky123#';

const RECOMMENDATION_MODES = [
  'category_recommendations',
  'location_recommendations',
  'top_rated',
];

let passed = 0;
let failed = 0;

function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data !== undefined) console.log('   ', JSON.stringify(data, null, 2));
}

function assert(step, condition, msg, details) {
  if (condition) {
    log(step, 'PASS', msg);
    passed++;
  } else {
    log(step, 'FAIL', msg, details);
    failed++;
  }
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const data = await res.json();
  return { ok: res.ok, token: data?.data?.accessToken ?? '' };
}

async function fetchFeed(token) {
  const res = await fetch(`${BASE}/feed`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, body: data?.data };
}

// Runs one scenario. `expected` is either a single mode string, an array of
// acceptable modes, or null (any mode accepted — only asserts items non-empty).
async function scenario(step, label, emailVar, passVar, expected) {
  const email = process.env[emailVar] || DEFAULT_EMAIL;
  const password = process.env[passVar] || DEFAULT_PASSWORD;
  const usingDefault = !process.env[emailVar];

  log(step, 'INFO', `${label} — login ${email}${usingDefault ? ' (default account — preconditions not guaranteed)' : ''}`);
  const { ok, token } = await loginUser(email, password);
  if (!ok || !token) {
    log(step, 'INFO', `Login failed for ${email} — skipping scenario`);
    return;
  }

  const feed = await fetchFeed(token);
  const mode = feed.body?.mode;
  const items = feed.body?.items ?? [];

  // items must never be empty for a personal profile
  assert(`${step}a`, Array.isArray(items) && items.length > 0, `items non-empty (mode='${mode}', ${items.length} items)`);

  if (expected == null) {
    log(step, 'INFO', `mode='${mode}' (no strict expectation for this scenario)`);
    return;
  }
  const acceptable = Array.isArray(expected) ? expected : [expected];
  if (usingDefault) {
    // Can't guarantee DB precondition — assert only that mode is a valid feed mode.
    const validModes = ['feed', ...RECOMMENDATION_MODES];
    assert(`${step}b`, validModes.includes(mode), `mode is a valid feed mode ('${mode}') — precondition not enforced on default account`);
  } else {
    assert(`${step}b`, acceptable.includes(mode), `mode='${mode}' expected one of [${acceptable.join(', ')}]`);
  }
}

async function run() {
  console.log('\n══════════════════════════════════════');
  console.log('  TouchPoints Feed Fallback Chain Test');
  console.log('══════════════════════════════════════');

  // Guard: unauthenticated request must be rejected
  log(0, 'INFO', 'GET /feed without token — expect 401');
  const noAuth = await fetchFeed('');
  assert(0, noAuth.status === 401, `401 without token (got ${noAuth.status})`);

  // 1. Subscribed + active content → 'feed'
  await scenario(1, 'Subscribed with active content', 'FEED_EMAIL', 'FEED_PASSWORD', 'feed');

  // 2. Subscribed but no active content → any fallback (mode !== 'feed')
  await scenario(2, 'Subscribed, no active content', 'STALE_EMAIL', 'STALE_PASSWORD', RECOMMENDATION_MODES);

  // 3. No subs, category match → 'category_recommendations'
  await scenario(3, 'No subs, category match', 'CATEGORY_EMAIL', 'CATEGORY_PASSWORD', 'category_recommendations');

  // 4. No subs, no category, city match → 'location_recommendations'
  await scenario(4, 'No subs, location match', 'LOCATION_EMAIL', 'LOCATION_PASSWORD', 'location_recommendations');

  // 5. No subs, no category, no location → 'top_rated'
  await scenario(5, 'No subs, no category, no location', 'TOPRATED_EMAIL', 'TOPRATED_PASSWORD', 'top_rated');

  // 6. Business owner sees no own business in recommendations
  const ownerEmail = process.env.OWNER_EMAIL || DEFAULT_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD || DEFAULT_PASSWORD;
  const usingDefaultOwner = !process.env.OWNER_EMAIL;
  log(6, 'INFO', `Business owner own-business exclusion — login ${ownerEmail}${usingDefaultOwner ? ' (default account — preconditions not guaranteed)' : ''}`);
  const ownerLogin = await loginUser(ownerEmail, ownerPassword);
  if (!ownerLogin.ok || !ownerLogin.token) {
    log(6, 'INFO', `Login failed for ${ownerEmail} — skipping scenario`);
  } else {
    // Fetch the owner's business IDs
    const myBizRes = await fetch(`${BASE}/businesses/my`, {
      headers: { Authorization: `Bearer ${ownerLogin.token}` },
    });
    const myBizData = await myBizRes.json();
    const ownedId = myBizData?.data?.id ?? myBizData?.data?.business_id ?? null;

    // Fetch the feed
    const ownerFeed = await fetchFeed(ownerLogin.token);
    const items = ownerFeed.body?.items ?? [];
    const mode = ownerFeed.body?.mode;

    assert('6a', Array.isArray(items), `feed returned an items array (mode='${mode}')`);

    if (ownedId) {
      const leaked = items.some((it) => it.id === ownedId);
      assert('6b', !leaked, `own business (${ownedId}) absent from ${items.length} recommendation items`);
    } else {
      log(6, 'INFO', `Could not determine owned business ID from /businesses/my — skipping own-business assertion`);
    }
  }

  console.log('\n══════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\n❌ Unhandled error:', err.message);
  process.exit(1);
});
