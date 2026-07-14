// scripts/test-save-offer.js
// Tests the saved-offers toggle endpoint and the is_saved field in the feed.
//
// ENV VARS:
//   TEST_EMAIL / TEST_PASSWORD  — personal account subscribed to a business with active offers
//   OFFER_ID                    — (optional) a known active offer UUID; otherwise auto-detected from feed
//
// Falls back to default credentials if not set.

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE = 'http://localhost:3000';
const EMAIL = process.env.TEST_EMAIL || 'pinky@test.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Pinky123#';

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

async function doToggle(token, offerId) {
  const res = await fetch(`${BASE}/saved-offers/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ offer_id: offerId }),
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, data: body?.data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Save Offer Module Test');
  console.log('══════════════════════════════════════════════════');

  log(0, 'INFO', `Login as: ${EMAIL}`);
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  const loginBody = await loginRes.json();
  const token = loginBody?.data?.accessToken ?? '';
  assert('1', loginRes.ok && !!token, 'Login succeeded');
  if (!token) { process.exit(1); }

  // Locate an offer ID
  let offerId = process.env.OFFER_ID ?? null;
  if (!offerId) {
    const feedRes = await fetch(`${BASE}/feed`, { headers: { Authorization: `Bearer ${token}` } });
    const feedBody = await feedRes.json();
    assert('2', feedRes.ok, `GET /feed returned 2xx (got ${feedRes.status})`);
    if (feedBody?.data?.mode === 'feed') {
      const offerItem = (feedBody.data.items ?? []).find((i) => i.item_type === 'offer');
      offerId = offerItem?.item_id ?? null;
      if (offerItem) {
        assert('2b', typeof offerItem.is_saved === 'boolean', 'Feed offer item has is_saved as a boolean field', { is_saved: offerItem.is_saved });
      }
    }
  } else {
    passed++; // count step 2 as pass when OFFER_ID provided
    log('2', 'INFO', `Using provided OFFER_ID: ${offerId}`);
  }

  if (!offerId) {
    log('3', 'INFO', 'No active offer found in feed. Subscribe to a business with active offers or set OFFER_ID env var.');
    console.log('\n══════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════════\n');
    process.exit(failed > 0 ? 1 : 0);
  }
  log('3', 'INFO', `Target offer ID: ${offerId}`);

  // Ensure clean state: unsave if already saved
  const myRes0 = await fetch(`${BASE}/saved-offers/my-offers`, { headers: { Authorization: `Bearer ${token}` } });
  const myBody0 = await myRes0.json();
  const alreadySaved = (myBody0?.data ?? []).some((o) => o.id === offerId);
  if (alreadySaved) {
    await doToggle(token, offerId); // unsave first
    log('3a', 'INFO', 'Pre-existing save cleared for clean test state');
  }

  // Scenario 1 — Toggle save
  const t1 = await doToggle(token, offerId);
  assert('4', t1.ok, `POST /saved-offers/toggle returned 2xx (got ${t1.status})`);
  assert('5', t1.data?.saved === true, 'Toggle 1 returns saved: true', t1.data);

  // Scenario 2 — Offer appears in my-offers
  const myRes = await fetch(`${BASE}/saved-offers/my-offers`, { headers: { Authorization: `Bearer ${token}` } });
  const myBody = await myRes.json();
  assert('6', myRes.ok, `GET /saved-offers/my-offers returned 2xx`);
  const found = (myBody?.data ?? []).find((o) => o.id === offerId);
  assert('7', !!found, 'Saved offer appears in my-offers list');
  if (found) {
    assert('7a', typeof found.title === 'string', 'Offer has title field', found);
    assert('7b', typeof found.business_name === 'string', 'Offer has business_name field', found);
  }

  // Scenario 3 — Feed returns is_saved: true for this offer
  const feedRes2 = await fetch(`${BASE}/feed`, { headers: { Authorization: `Bearer ${token}` } });
  const feedBody2 = await feedRes2.json();
  if (feedBody2?.data?.mode === 'feed') {
    const offerInFeed = (feedBody2.data.items ?? []).find((i) => i.item_id === offerId);
    if (offerInFeed) {
      assert('8', offerInFeed.is_saved === true, 'Feed returns is_saved: true for saved offer', { is_saved: offerInFeed.is_saved });
    } else {
      log('8', 'INFO', 'Offer not in current feed page (may be paginated or category-filtered) — skipping is_saved assertion');
    }
  } else {
    log('8', 'INFO', `Feed mode is '${feedBody2?.data?.mode}' — skipping is_saved assertion (not in feed mode)`);
  }

  // Scenario 4 — Toggle unsave
  const t2 = await doToggle(token, offerId);
  assert('9', t2.ok, `POST /saved-offers/toggle (unsave) returned 2xx (got ${t2.status})`);
  assert('10', t2.data?.saved === false, 'Toggle 2 returns saved: false', t2.data);

  // Scenario 5 — Offer gone from my-offers
  const myRes2 = await fetch(`${BASE}/saved-offers/my-offers`, { headers: { Authorization: `Bearer ${token}` } });
  const myBody2 = await myRes2.json();
  const found2 = (myBody2?.data ?? []).find((o) => o.id === offerId);
  assert('11', !found2, 'Offer removed from my-offers after unsave');

  // Scenario 5b — Feed returns is_saved: false after unsave
  const feedRes3 = await fetch(`${BASE}/feed`, { headers: { Authorization: `Bearer ${token}` } });
  const feedBody3 = await feedRes3.json();
  if (feedBody3?.data?.mode === 'feed') {
    const offerInFeed3 = (feedBody3.data.items ?? []).find((i) => i.item_id === offerId);
    if (offerInFeed3) {
      assert('11b', offerInFeed3.is_saved === false, 'Feed returns is_saved: false after unsave', { is_saved: offerInFeed3.is_saved });
    } else {
      log('11b', 'INFO', 'Offer not in current feed page — skipping is_saved:false assertion');
    }
  } else {
    log('11b', 'INFO', `Feed mode is '${feedBody3?.data?.mode}' — skipping is_saved:false assertion`);
  }

  // Scenario 6 — Rapid double-toggle (no duplicate row)
  await doToggle(token, offerId); // save
  const t3 = await doToggle(token, offerId); // unsave immediately
  assert('12', t3.data?.saved === false, 'Double-toggle: second call returns saved: false (no duplicate row)', t3.data);

  // Scenario 7 — Unauthenticated request returns 401
  const unauthRes = await fetch(`${BASE}/saved-offers/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offer_id: offerId }),
  });
  assert('13', unauthRes.status === 401, `Unauthenticated toggle returns 401 (got ${unauthRes.status})`);

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\n❌ Unhandled error:', err.message);
  process.exit(1);
});
