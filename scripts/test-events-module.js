// scripts/test-events-module.js
// Events module — end-to-end test (create, list, get, update, toggle-status, cancel, image,
// delete). Mirrors test-offers-module.js/test-posts-module.js's coverage shape, since Events was
// previously the one of the three with no dedicated lifecycle checklist of its own.
//
// Prerequisites:
//   - Backend running on BASE_URL (defaults to deployed Cloud Run URL)
//   - TEST_EMAIL / TEST_PASSWORD: a BUSINESS OWNER account with an unlocked (Stripe-active)
//     business — creating events requires isBusinessUnlocked(businessId) to be true
//
// Run: node scripts/test-events-module.js

// Uses Node's own built-in fetch/FormData/Blob — multipart uploads need fetch and FormData to
// agree on serialization, and node-fetch's FormData is a different (incompatible) class.
const BASE     = process.env.TEST_BASE_URL || 'https://touchpoints-backend-495493629048.asia-south1.run.app';
const EMAIL    = process.env.TEST_EMAIL    || 'e2e.f.happy+1785935283403@example.com';
const PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!';

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

async function api(method, endpoint, { token, body, formData } = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(formData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: formData ? formData : (body ? JSON.stringify(body) : undefined),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

async function login(email, password) {
  const r = await api('POST', '/auth/login', { body: { identifier: email, password } });
  return { ok: r.ok, token: r.data?.data?.accessToken };
}

const VALID_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Events Module Test');
  console.log('══════════════════════════════════════════════════');

  try {
    // ── T0: Login ───────────────────────────────────────────────────────────
    const owner = await login(EMAIL, PASSWORD);
    assert('T0-LOGIN', owner.ok && owner.token, 'Owner login succeeds');
    if (!owner.token) { console.log('\n❌ Cannot continue without owner'); process.exit(1); }

    // ── T1: create event ────────────────────────────────────────────────────
    const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const r1 = await api('POST', '/events', {
      token: owner.token,
      body: {
        title: 'Automated Test Event',
        description: 'Created by test-events-module.js',
        location: 'Test Venue',
        starts_at: futureStart,
        event_type: 'In Person',
        category: 'community',
        is_free: true,
      },
    });
    const event = r1.data?.data?.event ?? r1.data?.data;
    const eventId = event?.id;
    const businessId = event?.business_id;
    assert('T1-CREATE', r1.status === 201 && !!eventId, 'POST /events creates a new event → 201', r1.data);
    if (!eventId) { console.log('\n❌ Cannot continue without eventId'); process.exit(1); }

    // ── T2: list my events — created event present ─────────────────────────
    const r2 = await api('GET', '/events', { token: owner.token });
    const myEvents = r2.data?.data?.events ?? [];
    assert('T2-LIST-MINE', r2.status === 200 && myEvents.some((e) => e.id === eventId),
      'GET /events (mine) includes the created event', { count: myEvents.length });

    // ── T3: get event by id ──────────────────────────────────────────────────
    const r3 = await api('GET', `/events/${eventId}`);
    const fetchedTitle = r3.data?.data?.event?.title;
    assert('T3-GET-BY-ID', r3.status === 200 && fetchedTitle === 'Automated Test Event',
      'GET /events/:id returns the correct event (public, no auth needed)', { fetchedTitle });

    // ── T4: update event — partial update preserves other fields (COALESCE) ──
    const r4 = await api('PATCH', `/events/${eventId}`, {
      token: owner.token, body: { title: 'Automated Test Event — Updated' },
    });
    const updated = r4.data?.data?.event;
    assert('T4-UPDATE', r4.status === 200 && updated?.title === 'Automated Test Event — Updated',
      'PATCH /events/:id updates the title', updated);
    assert('T4-COALESCE', updated?.description === 'Created by test-events-module.js',
      'Description untouched by the partial update (COALESCE confirmed)', { description: updated?.description });

    // ── T5: toggle status — upcoming event cancels, effective_status flips ──
    const r5 = await api('PATCH', `/events/${eventId}/toggle-status`, { token: owner.token });
    assert('T5-TOGGLE-CANCEL', r5.status === 200 && r5.data?.data?.event?.status === 'cancelled',
      'Toggling an upcoming event cancels it', r5.data?.data?.event);

    // ── T6: toggle again — restores it back to upcoming ─────────────────────
    const r6 = await api('PATCH', `/events/${eventId}/toggle-status`, { token: owner.token });
    assert('T6-TOGGLE-RESTORE', r6.status === 200 && r6.data?.data?.event?.status === 'upcoming',
      'Toggling a cancelled (future) event restores it to upcoming', r6.data?.data?.event);

    // ── T7: upload event image ───────────────────────────────────────────────
    const form7 = new FormData();
    form7.append('image', new Blob([Buffer.from(VALID_PNG_BASE64, 'base64')], { type: 'image/png' }), 'event.png');
    const r7 = await api('POST', `/events/${eventId}/image`, { token: owner.token, formData: form7 });
    assert('T7-IMAGE-UPLOAD', r7.status === 200 && typeof r7.data?.data?.event?.image_url === 'string',
      'POST /events/:id/image uploads and attaches an image_url', r7.data?.data?.event);

    // ── T8: remove event image ───────────────────────────────────────────────
    const r8 = await api('DELETE', `/events/${eventId}/image`, { token: owner.token });
    assert('T8-IMAGE-REMOVE', r8.status === 200 && r8.data?.data?.event?.image_url === null,
      'DELETE /events/:id/image clears image_url', r8.data?.data?.event);

    // ── T9: public business event list includes this (upcoming) event ──────
    if (businessId) {
      const r9 = await api('GET', `/events/business/${businessId}`, { token: owner.token });
      const found = (r9.data?.data?.events ?? []).some((e) => e.id === eventId);
      assert('T9-BUSINESS-LIST', r9.status === 200 && found,
        'GET /events/business/:businessId (as owner) includes the event', { count: r9.data?.data?.events?.length });
    }

    // ── T10: cancel-already-cancelled guard ──────────────────────────────────
    await api('PATCH', `/events/${eventId}/cancel`, { token: owner.token }); // first cancel
    const r10 = await api('PATCH', `/events/${eventId}/cancel`, { token: owner.token }); // second cancel
    assert('T10-DOUBLE-CANCEL-GUARD', r10.status === 400 && /already cancelled/i.test(r10.data?.error || ''),
      'Cancelling an already-cancelled event → 400 "Event is already cancelled"', r10.data);

    // ── T11: delete-while-upcoming guard (fresh second event) ───────────────
    const r11create = await api('POST', '/events', {
      token: owner.token,
      body: { title: 'Delete Guard Test Event', starts_at: futureStart, is_free: true },
    });
    const event2Id = r11create.data?.data?.event?.id;
    if (event2Id) {
      const r11 = await api('DELETE', `/events/${event2Id}`, { token: owner.token });
      assert('T11-DELETE-UPCOMING-GUARD', r11.status === 400 && /cancel it first/i.test(r11.data?.error || ''),
        'Deleting a still-upcoming event → 400 (must cancel first)', r11.data);

      // Cancel then delete should now succeed — exercises the full intended path.
      await api('PATCH', `/events/${event2Id}/cancel`, { token: owner.token });
      const r11b = await api('DELETE', `/events/${event2Id}`, { token: owner.token });
      assert('T11B-DELETE-AFTER-CANCEL', r11b.status === 200,
        'Deleting a cancelled event succeeds', r11b.data);
    } else {
      console.log('    INFO  Could not create second event — skipping delete-guard check');
    }

    // ── T12: delete the (now cancelled) primary test event + verify 404 ─────
    const r12 = await api('DELETE', `/events/${eventId}`, { token: owner.token });
    assert('T12-DELETE', r12.status === 200, 'DELETE /events/:id succeeds on a cancelled event', r12.data);

    const r12b = await api('GET', `/events/${eventId}`);
    assert('T12B-404-AFTER-DELETE', r12b.status === 404, 'GET /events/:id returns 404 after deletion', r12b.data);

    // ── T13: validation guard — missing title/starts_at → 400 ───────────────
    const r13 = await api('POST', '/events', { token: owner.token, body: { description: 'No title or date' } });
    assert('T13-VALIDATION', r13.status === 400, 'POST /events with missing required fields → 400', r13.data);

    // ── T14: unauthenticated request rejected ───────────────────────────────
    const r14 = await api('POST', '/events', { body: { title: 'Should be rejected', starts_at: futureStart } });
    assert('T14-UNAUTH-401', r14.status === 401, 'POST /events with no token → 401', r14.data);

  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
