// scripts/test-share-module.js
// Shares module end-to-end test — log by content type, all channels, auth gate, validation

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE         = 'http://localhost:3000';
const SUB_EMAIL    = process.env.TEST_EMAIL    || 'pinky@test.com';
const SUB_PASSWORD = process.env.TEST_PASSWORD || 'Pinky123#';

function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data !== undefined) console.log('   ', JSON.stringify(data, null, 2));
}

let passed = 0;
let failed = 0;

function assert(step, condition, msg, details) {
  if (condition) { log(step, 'PASS', msg); passed++; }
  else           { log(step, 'FAIL', msg, details); failed++; }
}

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const data = await res.json();
  return { ok: res.ok, token: data?.data?.accessToken };
}

async function postShare(token, body) {
  const res = await fetch(`${BASE}/shares`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function getFeed(token) {
  const res = await fetch(`${BASE}/feed`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function getBusinesses(token) {
  const res = await fetch(`${BASE}/businessdirectory`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function run() {
  console.log('\n══════════════════════════════════════════');
  console.log('  TouchPoints Shares Module Test          ');
  console.log('══════════════════════════════════════════');

  // ── Login ────────────────────────────────────────────────────────────────
  const subLogin = await login(SUB_EMAIL, SUB_PASSWORD);
  assert('LOGIN', subLogin.ok && subLogin.token, 'Subscriber login succeeds');
  const token = subLogin.token;
  if (!token) { console.log('\n❌ Cannot continue without token'); process.exit(1); }

  // ── Discover real content IDs from the feed ──────────────────────────────
  const feedRes = await getFeed(token);
  const items = feedRes.data?.data?.items ?? [];
  const postItem  = items.find((i) => i.item_type === 'post');
  const offerItem = items.find((i) => i.item_type === 'offer');
  const eventItem = items.find((i) => i.item_type === 'event');

  assert('FEED-HAS-ITEMS', items.length > 0, `Feed returned ${items.length} items`);

  const testPostId  = postItem?.item_id;
  const testOfferId = offerItem?.item_id;
  const testEventId = eventItem?.item_id;

  // Discover a business ID for the 'broadcast' content type
  const bizRes = await getBusinesses(token);
  const businesses = bizRes.data?.data?.businesses ?? bizRes.data?.data ?? [];
  const testBusinessId = businesses[0]?.id ?? null;

  // ── T1: Log a share for a post ────────────────────────────────────────────
  if (testPostId) {
    const res = await postShare(token, { content_type: 'post', content_id: testPostId, channel: 'facebook' });
    assert('T1-POST', res.ok && res.data?.data?.logged === true,
      'POST /shares — post content_type → 200 logged:true', res.data);
  } else {
    log('T1-POST', 'INFO', 'No post in feed — skipping');
  }

  // ── T2: Log a share for an offer ──────────────────────────────────────────
  if (testOfferId) {
    const res = await postShare(token, { content_type: 'offer', content_id: testOfferId, channel: 'whatsapp' });
    assert('T2-OFFER', res.ok && res.data?.data?.logged === true,
      'POST /shares — offer content_type → 200 logged:true', res.data);
  } else {
    log('T2-OFFER', 'INFO', 'No offer in feed — skipping');
  }

  // ── T3: Log a share for an event ──────────────────────────────────────────
  if (testEventId) {
    const res = await postShare(token, { content_type: 'event', content_id: testEventId, channel: 'twitter' });
    assert('T3-EVENT', res.ok && res.data?.data?.logged === true,
      'POST /shares — event content_type → 200 logged:true', res.data);
  } else {
    log('T3-EVENT', 'INFO', 'No event in feed — skipping');
  }

  // ── T4: Log a share for broadcast (business discovery card) ───────────────
  if (testBusinessId) {
    const res = await postShare(token, { content_type: 'broadcast', content_id: testBusinessId, channel: 'instagram' });
    assert('T4-BROADCAST', res.ok && res.data?.data?.logged === true,
      'POST /shares — broadcast content_type → 200 logged:true', res.data);
  } else {
    log('T4-BROADCAST', 'INFO', 'No business found — skipping');
  }

  // ── T5: All 10 channel values accepted ────────────────────────────────────
  const contentId = testPostId ?? testOfferId ?? testEventId ?? testBusinessId;
  const contentType = testPostId ? 'post' : testOfferId ? 'offer' : testEventId ? 'event' : 'broadcast';

  if (contentId) {
    const channels = ['facebook', 'twitter', 'instagram', 'tiktok', 'whatsapp', 'messenger', 'sms', 'email', 'native', 'contacts'];
    let allPassed = true;
    for (const channel of channels) {
      const res = await postShare(token, { content_type: contentType, content_id: contentId, channel });
      if (!res.ok) {
        allPassed = false;
        log('T5-CHANNELS', 'FAIL', `channel '${channel}' returned ${res.status}`, res.data);
        failed++;
      }
    }
    if (allPassed) {
      log('T5-CHANNELS', 'PASS', 'All 10 channel values accepted (200)');
      passed++;
    }
  }

  // ── T6: Invalid channel → 400 ─────────────────────────────────────────────
  if (contentId) {
    const res = await postShare(token, { content_type: contentType, content_id: contentId, channel: 'carrier_pigeon' });
    assert('T6-BAD-CHANNEL', res.status === 400,
      `Invalid channel → 400 (got ${res.status})`, res.data);
  }

  // ── T7: Invalid content_type → 400 ───────────────────────────────────────
  if (contentId) {
    const res = await postShare(token, { content_type: 'video', content_id: contentId, channel: 'facebook' });
    assert('T7-BAD-TYPE', res.status === 400,
      `Invalid content_type → 400 (got ${res.status})`, res.data);
  }

  // ── T8: No auth token → 401 ───────────────────────────────────────────────
  if (contentId) {
    const res = await postShare(null, { content_type: contentType, content_id: contentId, channel: 'facebook' });
    assert('T8-NO-AUTH', res.status === 401,
      `No auth token → 401 (got ${res.status})`, res.data);
  }

  // ── T9: Multiple shares for same content are all logged (no unique block) ──
  if (contentId) {
    const r1 = await postShare(token, { content_type: contentType, content_id: contentId, channel: 'native' });
    const r2 = await postShare(token, { content_type: contentType, content_id: contentId, channel: 'native' });
    assert('T9-MULTI-SHARE', r1.ok && r2.ok,
      'Multiple shares of same content all succeed (no unique constraint)', { r1: r1.data?.data, r2: r2.data?.data });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
  console.log('══════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
