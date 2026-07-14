// scripts/test-business-profile-likes.js
// Verifies like_count + liked_by_me appear on business profile content tab responses,
// and that cross-surface consistency holds with the Home Feed.

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE          = 'http://localhost:3000';
const OWNER_EMAIL   = process.env.OWNER_EMAIL    || 'smith@test.com';
const OWNER_PASS    = process.env.OWNER_PASSWORD || 'Smith123#';
const SUB_EMAIL     = process.env.TEST_EMAIL     || 'pinky@test.com';
const SUB_PASS      = process.env.TEST_PASSWORD  || 'Pinky123#';

let passed = 0;
let failed = 0;

function assert(step, condition, msg, data) {
  if (condition) {
    console.log(`\n✅ [${step}] ${msg}`);
    passed++;
  } else {
    console.log(`\n❌ [${step}] ${msg}`);
    if (data !== undefined) console.log('   ', JSON.stringify(data, null, 2));
    failed++;
  }
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

async function getOffers(token, businessId, status) {
  const qs = status ? `?status=${status}` : '';
  const res = await fetch(`${BASE}/offers/business/${businessId}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, items: data?.data?.offers ?? [], raw: data };
}

async function getEvents(token, businessId, filter) {
  const qs = filter ? `?filter=${filter}` : '';
  const res = await fetch(`${BASE}/events/business/${businessId}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, items: data?.data?.events ?? [], raw: data };
}

async function getPosts(token, businessId, status) {
  const qs = status ? `?status=${status}` : '';
  const res = await fetch(`${BASE}/posts/business/${businessId}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, items: data?.data?.posts ?? [], raw: data };
}

async function toggleLike(token, content_type, content_id) {
  const res = await fetch(`${BASE}/likes/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content_type, content_id }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function getFeed(token) {
  const res = await fetch(`${BASE}/feed`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, items: data?.data?.items ?? [] };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  Business Profile Likes — Integration Test       ');
  console.log('══════════════════════════════════════════════════');

  // ── Login ────────────────────────────────────────────────────────────────
  const ownerAuth = await login(OWNER_EMAIL, OWNER_PASS);
  assert('LOGIN-OWNER', ownerAuth.ok && ownerAuth.token, 'Owner login succeeds');
  const ownerToken = ownerAuth.token;

  const subAuth = await login(SUB_EMAIL, SUB_PASS);
  assert('LOGIN-SUB', subAuth.ok && subAuth.token, 'Subscriber login succeeds');
  const subToken = subAuth.token;

  if (!ownerToken) { console.log('\n❌ Cannot continue without owner token'); process.exit(1); }
  if (!subToken)   { console.log('\n❌ Cannot continue without subscriber token'); process.exit(1); }

  // ── Resolve business ID via owner feed ──────────────────────────────────
  const ownerFeed = await getFeed(ownerToken);
  const ownedItem = ownerFeed.items.find((i) => i.is_owner === true);
  if (!ownedItem) {
    console.log('\n⚠️  Owner has no owned items in feed — cannot determine businessId. Aborting.');
    process.exit(1);
  }
  const businessId = ownedItem.business_id;
  console.log(`\n🔵 Using businessId: ${businessId}`);

  // ── T1: Owner fetches offers tab → like_count + liked_by_me present ─────
  const ownerOffers = await getOffers(ownerToken, businessId);
  assert('T1-OFFERS-STATUS', ownerOffers.ok, `GET /offers/business/:id → HTTP 200 (got ${ownerOffers.status})`);
  if (ownerOffers.items.length > 0) {
    const sample = ownerOffers.items[0];
    assert('T1-OFFERS-LIKE-FIELDS',
      'like_count' in sample && 'liked_by_me' in sample,
      `Offers include like_count (${sample.like_count}) and liked_by_me (${sample.liked_by_me})`,
      sample);
    assert('T1-OFFERS-LIKED-BY-ME-FALSE',
      sample.liked_by_me === false,
      'Owner\'s liked_by_me = false for own content');
  } else {
    console.log('\n⚠️  No offers found for this business — skipping T1 field checks');
  }

  // ── T2: Subscriber toggles like on offer → count updates ────────────────
  const subOffers = await getOffers(subToken, businessId);
  assert('T2-SUB-OFFERS-OK', subOffers.ok, `Subscriber GET /offers/business/:id → HTTP 200 (got ${subOffers.status})`);
  if (subOffers.items.length > 0) {
    const offer = subOffers.items[0];
    const beforeCount = offer.like_count ?? 0;
    const toggleRes = await toggleLike(subToken, 'offer', offer.id);
    assert('T2-TOGGLE-OK', toggleRes.ok, 'Toggle like on offer → HTTP 200');
    // Re-fetch to confirm count updated
    const afterOffers = await getOffers(subToken, businessId);
    const afterOffer = afterOffers.items.find((o) => o.id === offer.id);
    const afterCount = afterOffer?.like_count ?? 0;
    assert('T2-COUNT-UPDATED',
      afterCount === beforeCount + 1 || (toggleRes.data?.data?.liked === false && afterCount === beforeCount - 1),
      `like_count changed from ${beforeCount} to ${afterCount} after toggle`);
    // Clean up
    if (toggleRes.data?.data?.liked) await toggleLike(subToken, 'offer', offer.id);
  } else {
    console.log('\n⚠️  No offers to test toggle — skipping T2');
  }

  // ── T3: Events tab returns like_count + liked_by_me ─────────────────────
  const subEvents = await getEvents(subToken, businessId);
  assert('T3-EVENTS-OK', subEvents.ok, `GET /events/business/:id → HTTP 200 (got ${subEvents.status})`);
  if (subEvents.items.length > 0) {
    const ev = subEvents.items[0];
    assert('T3-EVENTS-LIKE-FIELDS',
      'like_count' in ev && 'liked_by_me' in ev,
      `Events include like_count (${ev.like_count}) and liked_by_me (${ev.liked_by_me})`);
  } else {
    console.log('\n⚠️  No events found — skipping T3 field check');
  }

  // ── T4: Like from feed → same count appears on business profile tab ──────
  const subFeed = await getFeed(subToken);
  const feedOffer = subFeed.items.find((i) => i.item_type === 'offer' && i.business_id === businessId);
  if (feedOffer) {
    // Like it via toggle endpoint
    const t = await toggleLike(subToken, 'offer', feedOffer.item_id);
    if (t.data?.data?.liked) {
      // Re-fetch business profile tab
      const profileOffers = await getOffers(subToken, businessId);
      const profileOffer = profileOffers.items.find((o) => o.id === feedOffer.item_id);
      assert('T4-CROSS-SURFACE',
        profileOffer?.liked_by_me === true && (profileOffer?.like_count ?? 0) >= 1,
        `After feed like: business profile tab shows liked_by_me=${profileOffer?.liked_by_me}, like_count=${profileOffer?.like_count}`);
      // Clean up
      await toggleLike(subToken, 'offer', feedOffer.item_id);
    } else {
      console.log('\n⚠️  Toggle returned liked=false (was already liked) — skipping T4 assertion');
    }
  } else {
    console.log('\n⚠️  No matching offer in subscriber feed for this business — skipping T4');
  }

  // ── T5: Owner cannot like own content → 403 ─────────────────────────────
  if (ownerOffers.items.length > 0) {
    const offer = ownerOffers.items[0];
    const res = await toggleLike(ownerToken, 'offer', offer.id);
    assert('T5-OWNER-403', res.status === 403, `Owner toggle own offer → 403 (got ${res.status})`, res.data);
  } else {
    console.log('\n⚠️  No owner offers to test 403 — skipping T5');
  }

  // ── T6: No auth → 401 ───────────────────────────────────────────────────
  const noAuthRes = await fetch(`${BASE}/offers/business/${businessId}`, {});
  assert('T6-NO-AUTH', noAuthRes.status === 401, `No token → 401 (got ${noAuthRes.status})`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
  console.log('══════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
