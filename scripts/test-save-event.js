// scripts/test-save-event.js
// Tests the saved-events toggle endpoint and the is_saved field in the feed.
//
// ENV VARS:
//   TEST_EMAIL / TEST_PASSWORD  — personal account subscribed to a business with active events
//   EVENT_ID                    — (optional) a known upcoming event UUID; otherwise auto-detected from feed
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

async function doToggle(token, eventId) {
  const res = await fetch(`${BASE}/saved-events/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ event_id: eventId }),
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, data: body?.data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Save Event Module Test');
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

  // Locate an event ID
  let eventId = process.env.EVENT_ID ?? null;
  if (!eventId) {
    const feedRes = await fetch(`${BASE}/feed`, { headers: { Authorization: `Bearer ${token}` } });
    const feedBody = await feedRes.json();
    assert('2', feedRes.ok, `GET /feed returned 2xx (got ${feedRes.status})`);
    if (feedBody?.data?.mode === 'feed') {
      const eventItem = (feedBody.data.items ?? []).find((i) => i.item_type === 'event');
      eventId = eventItem?.item_id ?? null;
      if (eventItem) {
        assert('2b', typeof eventItem.is_saved === 'boolean', 'Feed event item has is_saved as a boolean field', { is_saved: eventItem.is_saved });
      }
    }
  } else {
    passed++;
    log('2', 'INFO', `Using provided EVENT_ID: ${eventId}`);
  }

  if (!eventId) {
    log('3', 'INFO', 'No active event found in feed. Subscribe to a business with upcoming events or set EVENT_ID env var.');
    console.log('\n══════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════════\n');
    process.exit(failed > 0 ? 1 : 0);
  }
  log('3', 'INFO', `Target event ID: ${eventId}`);

  // Ensure clean state: unsave if already saved
  const myRes0 = await fetch(`${BASE}/saved-events/my-events`, { headers: { Authorization: `Bearer ${token}` } });
  const myBody0 = await myRes0.json();
  const alreadySaved = (myBody0?.data ?? []).some((e) => e.id === eventId);
  if (alreadySaved) {
    await doToggle(token, eventId);
    log('3a', 'INFO', 'Pre-existing save cleared for clean test state');
  }

  // Scenario 1 — Toggle save
  const t1 = await doToggle(token, eventId);
  assert('4', t1.ok, `POST /saved-events/toggle returned 2xx (got ${t1.status})`);
  assert('5', t1.data?.saved === true, 'Toggle 1 returns saved: true', t1.data);

  // Scenario 2 — Event appears in my-events
  const myRes = await fetch(`${BASE}/saved-events/my-events`, { headers: { Authorization: `Bearer ${token}` } });
  const myBody = await myRes.json();
  assert('6', myRes.ok, `GET /saved-events/my-events returned 2xx`);
  const found = (myBody?.data ?? []).find((e) => e.id === eventId);
  assert('7', !!found, 'Saved event appears in my-events list');
  if (found) {
    assert('7a', typeof found.title === 'string', 'Event has title field', found);
    assert('7b', typeof found.business_name === 'string', 'Event has business_name field', found);
    assert('7c', typeof found.event_type === 'string', 'Event has event_type field', { event_type: found.event_type });
    assert('7d', typeof found.starts_at === 'string', 'Event has starts_at field', { starts_at: found.starts_at });
  }

  // Scenario 3 — Feed returns is_saved: true for this event
  const feedRes2 = await fetch(`${BASE}/feed`, { headers: { Authorization: `Bearer ${token}` } });
  const feedBody2 = await feedRes2.json();
  if (feedBody2?.data?.mode === 'feed') {
    const eventInFeed = (feedBody2.data.items ?? []).find((i) => i.item_id === eventId);
    if (eventInFeed) {
      assert('8', eventInFeed.is_saved === true, 'Feed returns is_saved: true for saved event', { is_saved: eventInFeed.is_saved });
    } else {
      log('8', 'INFO', 'Event not in current feed page (may be paginated or category-filtered) — skipping is_saved assertion');
    }
  } else {
    log('8', 'INFO', `Feed mode is '${feedBody2?.data?.mode}' — skipping is_saved assertion (not in feed mode)`);
  }

  // Scenario 4 — Toggle unsave
  const t2 = await doToggle(token, eventId);
  assert('9', t2.ok, `POST /saved-events/toggle (unsave) returned 2xx (got ${t2.status})`);
  assert('10', t2.data?.saved === false, 'Toggle 2 returns saved: false', t2.data);

  // Scenario 5 — Event gone from my-events
  const myRes2 = await fetch(`${BASE}/saved-events/my-events`, { headers: { Authorization: `Bearer ${token}` } });
  const myBody2 = await myRes2.json();
  const found2 = (myBody2?.data ?? []).find((e) => e.id === eventId);
  assert('11', !found2, 'Event removed from my-events after unsave');

  // Scenario 5b — Feed returns is_saved: false after unsave
  const feedRes3 = await fetch(`${BASE}/feed`, { headers: { Authorization: `Bearer ${token}` } });
  const feedBody3 = await feedRes3.json();
  if (feedBody3?.data?.mode === 'feed') {
    const eventInFeed3 = (feedBody3.data.items ?? []).find((i) => i.item_id === eventId);
    if (eventInFeed3) {
      assert('11b', eventInFeed3.is_saved === false, 'Feed returns is_saved: false after unsave', { is_saved: eventInFeed3.is_saved });
    } else {
      log('11b', 'INFO', 'Event not in current feed page — skipping is_saved:false assertion');
    }
  } else {
    log('11b', 'INFO', `Feed mode is '${feedBody3?.data?.mode}' — skipping is_saved:false assertion`);
  }

  // Scenario 6 — Rapid double-toggle (no duplicate row)
  await doToggle(token, eventId); // save
  const t3 = await doToggle(token, eventId); // unsave immediately
  assert('12', t3.data?.saved === false, 'Double-toggle: second call returns saved: false (no duplicate row)', t3.data);

  // Scenario 7 — Unauthenticated request returns 401
  const unauthRes = await fetch(`${BASE}/saved-events/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId }),
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
