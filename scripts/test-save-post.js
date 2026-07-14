// scripts/test-save-post.js
// Tests the saved-posts toggle endpoint and the is_saved field in the feed.
//
// ENV VARS:
//   TEST_EMAIL / TEST_PASSWORD  — personal account subscribed to a business with active posts
//   POST_ID                     — (optional) a known post UUID; otherwise auto-detected from feed
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

async function doToggle(token, postId) {
  const res = await fetch(`${BASE}/saved-posts/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ post_id: postId }),
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, data: body?.data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Save Post Module Test');
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

  // Locate a post ID
  let postId = process.env.POST_ID ?? null;
  if (!postId) {
    const feedRes = await fetch(`${BASE}/feed`, { headers: { Authorization: `Bearer ${token}` } });
    const feedBody = await feedRes.json();
    assert('2', feedRes.ok, `GET /feed returned 2xx (got ${feedRes.status})`);
    if (feedBody?.data?.mode === 'feed') {
      const postItem = (feedBody.data.items ?? []).find((i) => i.item_type === 'post');
      postId = postItem?.item_id ?? null;
      if (postItem) {
        assert('2b', typeof postItem.is_saved === 'boolean', 'Feed post item has is_saved as a boolean field', { is_saved: postItem.is_saved });
      }
    }
  } else {
    passed++;
    log('2', 'INFO', `Using provided POST_ID: ${postId}`);
  }

  if (!postId) {
    log('3', 'INFO', 'No active post found in feed. Subscribe to a business with posts or set POST_ID env var.');
    console.log('\n══════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════════\n');
    process.exit(failed > 0 ? 1 : 0);
  }
  log('3', 'INFO', `Target post ID: ${postId}`);

  // Ensure clean state: unsave if already saved
  const myRes0 = await fetch(`${BASE}/saved-posts/my-posts`, { headers: { Authorization: `Bearer ${token}` } });
  const myBody0 = await myRes0.json();
  const alreadySaved = (myBody0?.data ?? []).some((p) => p.id === postId);
  if (alreadySaved) {
    await doToggle(token, postId);
    log('3a', 'INFO', 'Pre-existing save cleared for clean test state');
  }

  // Scenario 1 — Toggle save
  const t1 = await doToggle(token, postId);
  assert('4', t1.ok, `POST /saved-posts/toggle returned 2xx (got ${t1.status})`);
  assert('5', t1.data?.saved === true, 'Toggle 1 returns saved: true', t1.data);

  // Scenario 2 — Post appears in my-posts
  const myRes = await fetch(`${BASE}/saved-posts/my-posts`, { headers: { Authorization: `Bearer ${token}` } });
  const myBody = await myRes.json();
  assert('6', myRes.ok, 'GET /saved-posts/my-posts returned 2xx');
  const found = (myBody?.data ?? []).find((p) => p.id === postId);
  assert('7', !!found, 'Saved post appears in my-posts list');
  if (found) {
    assert('7a', typeof found.title === 'string', 'Post has title field', found);
    assert('7b', typeof found.business_name === 'string', 'Post has business_name field', found);
    assert('7c', typeof found.content === 'string', 'Post has content field', { content: found.content?.slice(0, 60) });
  }

  // Scenario 3 — Feed returns is_saved: true for this post
  const feedRes2 = await fetch(`${BASE}/feed`, { headers: { Authorization: `Bearer ${token}` } });
  const feedBody2 = await feedRes2.json();
  if (feedBody2?.data?.mode === 'feed') {
    const postInFeed = (feedBody2.data.items ?? []).find((i) => i.item_id === postId);
    if (postInFeed) {
      assert('8', postInFeed.is_saved === true, 'Feed returns is_saved: true for saved post', { is_saved: postInFeed.is_saved });
    } else {
      log('8', 'INFO', 'Post not in current feed page (may be paginated or category-filtered) — skipping is_saved assertion');
    }
  } else {
    log('8', 'INFO', `Feed mode is '${feedBody2?.data?.mode}' — skipping is_saved assertion (not in feed mode)`);
  }

  // Scenario 4 — Toggle unsave
  const t2 = await doToggle(token, postId);
  assert('9', t2.ok, `POST /saved-posts/toggle (unsave) returned 2xx (got ${t2.status})`);
  assert('10', t2.data?.saved === false, 'Toggle 2 returns saved: false', t2.data);

  // Scenario 5 — Post gone from my-posts
  const myRes2 = await fetch(`${BASE}/saved-posts/my-posts`, { headers: { Authorization: `Bearer ${token}` } });
  const myBody2 = await myRes2.json();
  const found2 = (myBody2?.data ?? []).find((p) => p.id === postId);
  assert('11', !found2, 'Post removed from my-posts after unsave');

  // Scenario 5b — Feed returns is_saved: false after unsave
  const feedRes3 = await fetch(`${BASE}/feed`, { headers: { Authorization: `Bearer ${token}` } });
  const feedBody3 = await feedRes3.json();
  if (feedBody3?.data?.mode === 'feed') {
    const postInFeed3 = (feedBody3.data.items ?? []).find((i) => i.item_id === postId);
    if (postInFeed3) {
      assert('11b', postInFeed3.is_saved === false, 'Feed returns is_saved: false after unsave', { is_saved: postInFeed3.is_saved });
    } else {
      log('11b', 'INFO', 'Post not in current feed page — skipping is_saved:false assertion');
    }
  } else {
    log('11b', 'INFO', `Feed mode is '${feedBody3?.data?.mode}' — skipping is_saved:false assertion`);
  }

  // Scenario 6 — Rapid double-toggle (no duplicate row)
  await doToggle(token, postId); // save
  const t3 = await doToggle(token, postId); // unsave immediately
  assert('12', t3.data?.saved === false, 'Double-toggle: second call returns saved: false (no duplicate row)', t3.data);

  // Scenario 7 — Unauthenticated request returns 401
  const unauthRes = await fetch(`${BASE}/saved-posts/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: postId }),
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
