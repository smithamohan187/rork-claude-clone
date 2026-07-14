// scripts/test-comments.js
// Integration tests for the Comments feature (1-level replies, soft-delete, pagination)
// Prerequisites: backend running at http://localhost:3000, comments table in DB
// Usage: node scripts/test-comments.js

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE         = 'http://localhost:3000';
const OWNER_EMAIL  = process.env.OWNER_EMAIL    || 'smith@test.com';
const OWNER_PASS   = process.env.OWNER_PASSWORD || 'Smith123#';
const SUB_EMAIL    = process.env.TEST_EMAIL     || 'pinky@test.com';
const SUB_PASS     = process.env.TEST_PASSWORD  || 'Pinky123#';

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

async function getFeed(token) {
  const res = await fetch(`${BASE}/feed`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  return { ok: res.ok, items: data?.data?.items ?? [] };
}

async function getComments(token, contentType, contentId, limit = 20, offset = 0) {
  const res = await fetch(`${BASE}/comments/${contentType}/${contentId}?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, comments: data?.data?.comments ?? [], raw: data };
}

async function getReplies(token, commentId, limit = 20, offset = 0) {
  const res = await fetch(`${BASE}/comments/${commentId}/replies?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, replies: data?.data?.replies ?? [], raw: data };
}

async function addComment(token, contentType, contentId, body, parentCommentId) {
  const res = await fetch(`${BASE}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      content_type: contentType,
      content_id: contentId,
      body,
      ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
    }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, comment: data?.data?.comment, raw: data };
}

async function deleteComment(token, commentId) {
  const res = await fetch(`${BASE}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, raw: data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  Comments Feature — Integration Tests           ');
  console.log('══════════════════════════════════════════════════');

  // ── Login ────────────────────────────────────────────────────────────────
  const ownerAuth = await login(OWNER_EMAIL, OWNER_PASS);
  assert('LOGIN-OWNER', ownerAuth.ok && ownerAuth.token, 'Owner login succeeds');
  const ownerToken = ownerAuth.token;

  const subAuth = await login(SUB_EMAIL, SUB_PASS);
  assert('LOGIN-SUB', subAuth.ok && subAuth.token, 'Subscriber login succeeds');
  const subToken = subAuth.token;

  if (!ownerToken || !subToken) {
    console.log('\n❌ Cannot continue without both tokens');
    process.exit(1);
  }

  // ── Resolve a post to comment on ─────────────────────────────────────────
  const feed = await getFeed(subToken);
  const postItem = feed.items.find((i) => i.item_type === 'post');
  if (!postItem) {
    console.log('\n⚠️  No post found in subscriber feed — cannot run tests. Create posts first.');
    process.exit(1);
  }
  const contentType = 'post';
  const contentId = postItem.item_id;
  console.log(`\n🔵 Testing comments on ${contentType} ${contentId}`);
  assert('T0-FEED-COMMENT-COUNT', 'comment_count' in postItem, `Feed item has comment_count field (${postItem.comment_count})`);

  // ── T1: Add top-level comment → appears in list, comment_count increments ─
  const before = await getComments(subToken, contentType, contentId);
  const beforeCount = postItem.comment_count ?? 0;
  const add1 = await addComment(subToken, contentType, contentId, 'Test comment from subscriber T1');
  assert('T1-ADD-OK', add1.ok, `POST /comments → 201 (got ${add1.status})`, add1.raw);
  const after1 = await getComments(subToken, contentType, contentId);
  const found1 = after1.comments.find((c) => c.id === add1.comment?.id);
  assert('T1-APPEARS', !!found1, 'Comment appears in list after add');
  assert('T1-BODY', found1?.body === 'Test comment from subscriber T1', 'Comment body matches');

  // ── T2: Reply to that comment → nested, comment_count increments ─────────
  const parentId = add1.comment?.id;
  const add2 = await addComment(subToken, contentType, contentId, 'Reply to T1 comment', parentId);
  assert('T2-REPLY-OK', add2.ok && add2.status === 201, `Reply → 201 (got ${add2.status})`, add2.raw);
  const after2 = await getComments(subToken, contentType, contentId);
  const parent = after2.comments.find((c) => c.id === parentId);
  const replyFound = parent?.replies?.find((r) => r.id === add2.comment?.id);
  assert('T2-NESTED', !!replyFound, 'Reply appears nested under parent');
  assert('T2-PARENT-ID', add2.comment?.parent_comment_id === parentId, 'Reply has correct parent_comment_id');

  // ── T3: Reply to a reply (depth 2) → 400 ───────────────────────────────
  const replyId = add2.comment?.id;
  if (replyId) {
    const add3 = await addComment(subToken, contentType, contentId, 'Should be rejected', replyId);
    assert('T3-DEPTH-REJECT', add3.status === 400, `Reply to reply → 400 (got ${add3.status})`, add3.raw);
  } else {
    console.log('\n⚠️  No reply ID from T2 — skipping T3');
  }

  // ── T4: Author soft-deletes own comment → placeholder, replies remain ────
  if (parentId) {
    const del = await deleteComment(subToken, parentId);
    assert('T4-DELETE-OK', del.ok, `Author deletes own comment → 200 (got ${del.status})`, del.raw);
    const after4 = await getComments(subToken, contentType, contentId);
    const deleted = after4.comments.find((c) => c.id === parentId);
    assert('T4-SOFT-DELETE', deleted?.is_deleted === true, 'Comment is_deleted = true after soft delete');
    assert('T4-PLACEHOLDER', deleted?.body === '[comment deleted]', `Body is placeholder (got: "${deleted?.body}")`);
    if (replyId) {
      const replyStillHere = deleted?.replies?.find((r) => r.id === replyId) ?? after4.comments.find((c) => c.id === replyId);
      assert('T4-REPLY-PRESERVED', !!replyStillHere, 'Reply under deleted parent is still visible');
    }
  } else {
    console.log('\n⚠️  No parent comment ID — skipping T4');
  }

  // ── T5: Content-owning business deletes a subscriber's comment ───────────
  const add5 = await addComment(subToken, contentType, contentId, 'Comment that owner will delete');
  if (add5.ok) {
    const del5 = await deleteComment(ownerToken, add5.comment.id);
    assert('T5-OWNER-DELETE', del5.ok, `Content owner deletes subscriber comment → 200 (got ${del5.status})`, del5.raw);
  } else {
    console.log('\n⚠️  Could not add comment for T5 — skipping');
  }

  // ── T6: Non-owner non-author → 403 ───────────────────────────────────────
  // Add a comment as owner, try to delete as subscriber
  const add6 = await addComment(ownerToken, contentType, contentId, 'Owner comment sub will try to delete');
  if (add6.ok) {
    const del6 = await deleteComment(subToken, add6.comment.id);
    assert('T6-UNAUTHORIZED', del6.status === 403, `Non-author non-owner delete → 403 (got ${del6.status})`, del6.raw);
    // clean up
    await deleteComment(ownerToken, add6.comment.id);
  } else {
    console.log('\n⚠️  Could not add owner comment for T6 — skipping');
  }

  // ── T7: Paginate 30+ comments (use limit=5) ──────────────────────────────
  // Seed 7 comments so we can paginate with limit=5
  const seeded = [];
  for (let i = 0; i < 7; i++) {
    const r = await addComment(subToken, contentType, contentId, `Pagination seed comment ${i + 1}`);
    if (r.ok) seeded.push(r.comment.id);
  }
  const page1 = await getComments(subToken, contentType, contentId, 5, 0);
  const page2 = await getComments(subToken, contentType, contentId, 5, 5);
  assert('T7-PAGE1', page1.comments.length === 5, `Page 1 has 5 comments (got ${page1.comments.length})`);
  assert('T7-PAGE2', page2.comments.length >= 1, `Page 2 has at least 1 comment (got ${page2.comments.length})`);
  const page1Ids = new Set(page1.comments.map((c) => c.id));
  const page2Ids = page2.comments.map((c) => c.id);
  assert('T7-NO-OVERLAP', page2Ids.every((id) => !page1Ids.has(id)), 'Page 1 and Page 2 have no overlapping comment IDs');
  // clean up seeded
  for (const id of seeded) await deleteComment(subToken, id).catch(() => {});

  // ── T8: Paginate replies (seed 3 replies, fetch with limit=2) ───────────
  const parentForReplies = await addComment(subToken, contentType, contentId, 'Parent for reply pagination T8');
  if (parentForReplies.ok) {
    const pid = parentForReplies.comment.id;
    const replyIds = [];
    for (let i = 0; i < 3; i++) {
      const r = await addComment(subToken, contentType, contentId, `Reply ${i + 1} for T8`, pid);
      if (r.ok) replyIds.push(r.comment.id);
    }
    const repPage1 = await getReplies(subToken, pid, 2, 0);
    assert('T8-REPLIES-PAGE1', repPage1.replies.length === 2, `Replies page 1 has 2 (got ${repPage1.replies.length})`);
    const repPage2 = await getReplies(subToken, pid, 2, 2);
    assert('T8-REPLIES-PAGE2', repPage2.replies.length === 1, `Replies page 2 has 1 (got ${repPage2.replies.length})`);
    // clean up
    for (const id of replyIds) await deleteComment(subToken, id).catch(() => {});
    await deleteComment(subToken, pid).catch(() => {});
  } else {
    console.log('\n⚠️  Could not add parent comment for T8 — skipping');
  }

  // ── T9: No auth → 401 ────────────────────────────────────────────────────
  const noAuthRes = await fetch(`${BASE}/comments/${contentType}/${contentId}`, {});
  assert('T9-NO-AUTH', noAuthRes.status === 401, `No token → 401 (got ${noAuthRes.status})`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
  console.log('══════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
