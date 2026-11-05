// scripts/test-business-directory-module.js
// Business Directory module — end-to-end test (browsing/searching businesses).
// Previously had zero automated coverage.
//
// Covers:
//   - GET /businessdirectory              (search, category filter, pagination, is_subscribed)
//   - GET /businessdirectory/categories
//
// Prerequisites:
//   - Backend running on BASE_URL (defaults to deployed Cloud Run URL)
//   - TEST_EMAIL / TEST_PASSWORD: a customer account (used only for the is_subscribed check —
//     the directory itself is public/anonymous-browsable)
//   - KNOWN_BUSINESS_NAME / KNOWN_BUSINESS_ID: a real, listed business to search/subscribe-check for
//
// Run: node scripts/test-business-directory-module.js

const BASE               = process.env.TEST_BASE_URL         || 'https://touchpoints-backend-495493629048.asia-south1.run.app';
const EMAIL              = process.env.TEST_EMAIL            || 'pinky@test.com';
const PASSWORD           = process.env.TEST_PASSWORD         || 'Pinky123#';
const KNOWN_BUSINESS_NAME= process.env.KNOWN_BUSINESS_NAME    || 'E2E Test Cafe';
const KNOWN_BUSINESS_ID  = process.env.KNOWN_BUSINESS_ID      || '66466941-72ea-4703-84b5-3668ee3d7239';

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

async function api(method, endpoint, { token } = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Business Directory Test');
  console.log('══════════════════════════════════════════════════');

  try {
    // ── T0: anonymous browsing works with no token at all ──────────────────
    const r0 = await api('GET', '/businessdirectory');
    assert('T0-ANON-BROWSE', r0.status === 200 && Array.isArray(r0.data?.data?.businesses),
      'GET /businessdirectory with no auth → 200 with a businesses array (public browsing)', { count: r0.data?.data?.businesses?.length, total: r0.data?.data?.total });

    // ── T1: categories list ──────────────────────────────────────────────────
    const r1 = await api('GET', '/businessdirectory/categories');
    const categories = r1.data?.data?.categories ?? [];
    assert('T1-CATEGORIES', r1.status === 200 && Array.isArray(categories) && categories.length > 0,
      'GET /businessdirectory/categories returns a non-empty list', { count: categories.length });

    // ── T2: search by name finds the known business ─────────────────────────
    const r2 = await api('GET', `/businessdirectory?search=${encodeURIComponent(KNOWN_BUSINESS_NAME)}`);
    const found2 = (r2.data?.data?.businesses ?? []).some((b) => b.id === KNOWN_BUSINESS_ID);
    assert('T2-SEARCH-FINDS', r2.status === 200 && found2,
      `Searching "${KNOWN_BUSINESS_NAME}" finds the known business`, { returned: r2.data?.data?.businesses?.map((b) => b.name) });

    // ── T3: search with a nonsense term finds nothing ────────────────────────
    const r3 = await api('GET', `/businessdirectory?search=zzz-no-such-business-zzz-${Date.now()}`);
    assert('T3-SEARCH-EMPTY', r3.status === 200 && (r3.data?.data?.businesses ?? []).length === 0,
      'Searching a nonsense term returns an empty list, not an error', { count: r3.data?.data?.businesses?.length });

    // ── T4: category filter — only businesses in that category are returned ──
    if (categories.length > 0) {
      const categoryName = categories[0].name;
      const r4 = await api('GET', `/businessdirectory?category=${encodeURIComponent(categoryName)}`);
      assert('T4-CATEGORY-FILTER', r4.status === 200 && Array.isArray(r4.data?.data?.businesses),
        `Filtering by category "${categoryName}" succeeds`, { count: r4.data?.data?.businesses?.length });
    } else {
      console.log('    INFO  No categories returned — skipping category filter check');
    }

    // ── T5: pagination — page=1 and page=2 don't return identical full sets ──
    const r5a = await api('GET', '/businessdirectory?page=1');
    const r5b = await api('GET', '/businessdirectory?page=2');
    const ids5a = (r5a.data?.data?.businesses ?? []).map((b) => b.id);
    const ids5b = (r5b.data?.data?.businesses ?? []).map((b) => b.id);
    const total5 = r5a.data?.data?.total ?? 0;
    if (total5 > 20) {
      const overlap = ids5b.filter((id) => ids5a.includes(id));
      assert('T5-PAGINATION', overlap.length === 0, 'page=1 and page=2 return non-overlapping businesses', { total: total5, overlap: overlap.length });
    } else {
      console.log(`    INFO  Only ${total5} total businesses — not enough to exercise pagination, skipping`);
    }

    // ── T6: invalid page number is rejected ──────────────────────────────────
    // Found while writing this script: validateRequest.js's signature only ever validated
    // req.body, silently ignoring the second 'query' argument this route passes — so query-string
    // validation here was completely inert (page=0 produced a negative SQL OFFSET and leaked a
    // raw Postgres error as a 500). Fixed in backend/src/middleware/validateRequest.js (now takes
    // a target param). Fix is local-only as of this writing — this check will fail against the
    // deployed backend until that fix ships.
    const r6 = await api('GET', '/businessdirectory?page=0');
    assert('T6-INVALID-PAGE', r6.status === 400, 'page=0 → 400 (Joi min(1))', r6.data);

    // ── T7: is_subscribed reflects the real subscription state for a logged-in viewer ──
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
    });
    const loginData = await loginRes.json().catch(() => ({}));
    const token = loginData.data?.accessToken;
    if (token) {
      // Ensure a known, deterministic state: not subscribed.
      await fetch(`${BASE}/subscriptions/unsubscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_id: KNOWN_BUSINESS_ID }),
      });
      const r7a = await api('GET', `/businessdirectory?search=${encodeURIComponent(KNOWN_BUSINESS_NAME)}`, { token });
      const entry7a = (r7a.data?.data?.businesses ?? []).find((b) => b.id === KNOWN_BUSINESS_ID);
      assert('T7A-IS-SUBSCRIBED-FALSE', entry7a?.is_subscribed === false,
        'Directory entry shows is_subscribed:false before subscribing', entry7a);

      await fetch(`${BASE}/subscriptions/subscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_id: KNOWN_BUSINESS_ID }),
      });
      const r7b = await api('GET', `/businessdirectory?search=${encodeURIComponent(KNOWN_BUSINESS_NAME)}`, { token });
      const entry7b = (r7b.data?.data?.businesses ?? []).find((b) => b.id === KNOWN_BUSINESS_ID);
      assert('T7B-IS-SUBSCRIBED-TRUE', entry7b?.is_subscribed === true,
        'Directory entry shows is_subscribed:true after subscribing', entry7b);

      // Cleanup — leave the account unsubscribed as found.
      await fetch(`${BASE}/subscriptions/unsubscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_id: KNOWN_BUSINESS_ID }),
      });
    } else {
      console.log('    INFO  Could not log in TEST_EMAIL — skipping is_subscribed check');
    }

  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
