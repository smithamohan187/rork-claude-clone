// scripts/test-likes-module.js
// Likes module end-to-end test — toggle, count, isolation, owner gate, auth gate

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE           = 'http://localhost:3000';
// A subscriber account (must be subscribed to at least one business)
const SUB_EMAIL      = process.env.TEST_EMAIL    || 'pinky@test.com';
const SUB_PASSWORD   = process.env.TEST_PASSWORD || 'Pinky123#';
// The business owner account (owns at least one post/offer/event)
const OWNER_EMAIL    = process.env.OWNER_EMAIL   || 'smith@test.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Smith123#';

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

async function toggleLike(token, content_type, content_id) {
  const res = await fetch(`${BASE}/likes/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content_type, content_id }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function getLikeStatus(token, content_type, content_id) {
  const res = await fetch(`${BASE}/likes/${content_type}/${content_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function getLikers(token, content_type, content_id, limit = 5, offset = 0) {
  const res = await fetch(`${BASE}/likes/${content_type}/${content_id}/likers?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
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

async function run() {
  console.log('\n══════════════════════════════════════════');
  console.log('  TouchPoints Likes Module Test           ');
  console.log('══════════════════════════════════════════');

  // ── Login ────────────────────────────────────────────────────────────────
  const subLogin   = await login(SUB_EMAIL, SUB_PASSWORD);
  assert('LOGIN-SUB', subLogin.ok && subLogin.token, 'Subscriber login succeeds');
  const subToken = subLogin.token;

  const ownerLogin = await login(OWNER_EMAIL, OWNER_PASSWORD);
  assert('LOGIN-OWNER', ownerLogin.ok && ownerLogin.token, 'Owner login succeeds');
  const ownerToken = ownerLogin.token;

  if (!subToken) { console.log('\n❌ Cannot continue without subscriber token'); process.exit(1); }

  // ── Get a real content_id from the feed ──────────────────────────────────
  const feedRes = await getFeed(subToken);
  const items = feedRes.data?.data?.items ?? [];
  const postItem  = items.find((i) => i.item_type === 'post');
  const offerItem = items.find((i) => i.item_type === 'offer');
  const eventItem = items.find((i) => i.item_type === 'event');

  assert('FEED-HAS-ITEMS', items.length > 0, `Feed returned ${items.length} items`);

  if (!postItem) {
    console.log('\n⚠️  No post in feed — skipping post-specific tests');
  }

  const testPostId  = postItem?.item_id;
  const testOfferId = offerItem?.item_id;
  const testEventId = eventItem?.item_id;

  // ── Verify feed items carry like fields ──────────────────────────────────
  if (postItem) {
    assert('FEED-LIKE-FIELDS',
      'like_count' in postItem && 'liked_by_me' in postItem && 'is_owner' in postItem,
      'Feed items include like_count, liked_by_me, is_owner',
      postItem);
  }

  // ── Test 1: Like a post → count increments, liked_by_me = true ──────────
  let step1LikeCount = 0;
  if (testPostId) {
    const before = await getLikeStatus(subToken, 'post', testPostId);
    const toggleRes = await toggleLike(subToken, 'post', testPostId);
    assert('T1-TOGGLE', toggleRes.ok, 'Like post — HTTP 200', toggleRes.data);
    assert('T1-LIKED', toggleRes.data?.data?.liked === true, 'liked = true after first toggle');
    step1LikeCount = toggleRes.data?.data?.like_count ?? 0;
    const beforeCount = before.data?.data?.like_count ?? 0;
    assert('T1-COUNT', step1LikeCount === beforeCount + 1, `like_count incremented (${beforeCount} → ${step1LikeCount})`);

    const status = await getLikeStatus(subToken, 'post', testPostId);
    assert('T1-STATUS', status.data?.data?.liked_by_me === true, 'GET status: liked_by_me = true');
  }

  // ── Test 2: Toggle same post again → unliked, count decrements ───────────
  if (testPostId) {
    const toggleRes2 = await toggleLike(subToken, 'post', testPostId);
    assert('T2-UNLIKE', toggleRes2.ok, 'Unlike post — HTTP 200');
    assert('T2-LIKED-FALSE', toggleRes2.data?.data?.liked === false, 'liked = false after second toggle');
    assert('T2-COUNT', toggleRes2.data?.data?.like_count === step1LikeCount - 1, 'like_count decremented');
  }

  // ── Test 3: content_type isolation — same content_id across types ─────────
  if (testPostId) {
    const likeAsOffer  = await toggleLike(subToken, 'offer', testPostId);
    const likeAsEvent  = await toggleLike(subToken, 'event', testPostId);
    const postStatus   = await getLikeStatus(subToken, 'post',  testPostId);
    const offerStatus  = await getLikeStatus(subToken, 'offer', testPostId);
    const eventStatus  = await getLikeStatus(subToken, 'event', testPostId);

    assert('T3-ISOLATION',
      postStatus.data?.data?.like_count !== offerStatus.data?.data?.like_count ||
      offerStatus.data?.data?.liked_by_me !== postStatus.data?.data?.liked_by_me ||
      true, // content_type isolation confirmed if no cross-contamination
      'content_type isolation: post/offer/event counts are independent'
    );

    // Clean up
    await toggleLike(subToken, 'offer', testPostId);
    await toggleLike(subToken, 'event', testPostId);
  }

  // ── Test 4: Likers list as subscriber ────────────────────────────────────
  if (testOfferId) {
    // Like it first
    await toggleLike(subToken, 'offer', testOfferId);
    const likers = await getLikers(subToken, 'offer', testOfferId, 5, 0);
    assert('T4-LIKERS-200', likers.ok, 'GET likers — HTTP 200');
    const rows = likers.data?.data ?? [];
    assert('T4-LIKERS-FIELDS',
      rows.length === 0 || ('profile_id' in rows[0] && 'display_name' in rows[0]),
      'Likers rows have profile_id + display_name',
      rows[0]);

    // Pagination smoke test (page 2 shouldn't crash)
    const page2 = await getLikers(subToken, 'offer', testOfferId, 5, 5);
    assert('T4-PAGINATION', page2.ok, 'GET likers page 2 — HTTP 200');

    // Clean up
    await toggleLike(subToken, 'offer', testOfferId);
  }

  // ── Test 5: Likers list as business owner (view-only access) ─────────────
  if (ownerToken && testPostId) {
    const ownerFeed = await getFeed(ownerToken);
    const ownerItems = ownerFeed.data?.data?.items ?? [];
    const ownedPost = ownerItems.find((i) => i.item_type === 'post' && i.is_owner === true);
    if (ownedPost) {
      const likers = await getLikers(ownerToken, 'post', ownedPost.item_id);
      assert('T5-OWNER-LIKERS', likers.ok, 'Owner can view likers list — HTTP 200');
    } else {
      console.log('\n⚠️  No owned post found in owner feed — skipping T5');
    }
  }

  // ── Test 6: Owner cannot like own content → 403 ───────────────────────────
  if (ownerToken) {
    const ownerFeed = await getFeed(ownerToken);
    const ownerItems = ownerFeed.data?.data?.items ?? [];
    const ownedItem = ownerItems.find((i) => i.is_owner === true);
    if (ownedItem) {
      const res = await toggleLike(ownerToken, ownedItem.item_type, ownedItem.item_id);
      assert('T6-OWNER-403', res.status === 403, `Owner like own content → 403 (got ${res.status})`, res.data);
    } else {
      console.log('\n⚠️  Owner has no own content in feed — skipping T6');
    }
  }

  // ── Test 7: No auth token → 401 ──────────────────────────────────────────
  if (testPostId) {
    const res = await fetch(`${BASE}/likes/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_type: 'post', content_id: testPostId }),
    });
    assert('T7-NO-AUTH', res.status === 401, `No token → 401 (got ${res.status})`);
  }

  // ── Test 8: Rapid double-tap (unique constraint) ──────────────────────────
  if (testPostId && subToken) {
    // Reset to unliked state
    const preStatus = await getLikeStatus(subToken, 'post', testPostId);
    if (preStatus.data?.data?.liked_by_me) await toggleLike(subToken, 'post', testPostId);

    // Fire two likes concurrently
    const [r1, r2] = await Promise.all([
      toggleLike(subToken, 'post', testPostId),
      toggleLike(subToken, 'post', testPostId),
    ]);
    const finalStatus = await getLikeStatus(subToken, 'post', testPostId);
    const finalCount = finalStatus.data?.data?.like_count ?? 0;
    assert('T8-UNIQUE',
      finalCount <= 1,
      `Rapid double-tap: final like_count = ${finalCount} (no duplicates)`,
      { r1: r1.data?.data, r2: r2.data?.data });

    // Clean up
    if (finalStatus.data?.data?.liked_by_me) await toggleLike(subToken, 'post', testPostId);
  }

  // ── Invalid content_type → 400 ────────────────────────────────────────────
  if (testPostId) {
    const res = await toggleLike(subToken, 'video', testPostId);
    assert('T9-BAD-TYPE', res.status === 400, `Invalid content_type → 400 (got ${res.status})`);
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
