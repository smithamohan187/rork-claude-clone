// scripts/test-chat.js
// Direct Chat (Customer<->Business, Customer<->Friend) — end-to-end test.
// Sequential, login-first, PASS/FAIL. Self-contained: creates its own fixtures
// (Profiles A/B/C via signup, an A<->B trusted_friends link, and Business D via
// direct DB inserts) and cleans them up at the end.
//
// Run (backend must be up on :3000):
//   node scripts/test-chat.js

const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

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

async function api(method, endpoint, { token, body } = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

async function registerUser({ email, phone, full_name }) {
  const r = await api('POST', '/auth/signup', {
    body: { email, phone, password: 'Test123#', full_name, location: 'Test City' },
  });
  return { ok: r.ok, status: r.status, token: r.data?.data?.accessToken, profileId: r.data?.data?.profile?.id, data: r.data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Direct Chat Test');
  console.log('══════════════════════════════════════════════════');

  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'touchpoint',
    user: process.env.DB_USER || 'touchpoint_user',
    password: process.env.DB_PASSWORD || 'touchpoint123',
  });
  await db.connect();

  const stamp = Date.now();
  const createdConversationIds = [];
  const emailTag = `chat-${stamp}`;

  try {
    // ── Setup: register A, B, C ───────────────────────────────────────────────
    const A = await registerUser({ email: `${emailTag}-a@test.com`, phone: `+1500${String(stamp).slice(-7)}`, full_name: 'Chat User A' });
    const B = await registerUser({ email: `${emailTag}-b@test.com`, phone: `+1501${String(stamp).slice(-7)}`, full_name: 'Chat User B' });
    const C = await registerUser({ email: `${emailTag}-c@test.com`, phone: `+1502${String(stamp).slice(-7)}`, full_name: 'Chat User C' });
    assert('SETUP-USERS', A.profileId && B.profileId && C.profileId,
      'Profiles A, B, C registered', { A: A.profileId, B: B.profileId, C: C.profileId });
    if (!A.profileId || !B.profileId || !C.profileId) { console.log('\n❌ Cannot continue without fixtures'); process.exit(1); }

    // Link A <-> B as trusted friends (LEAST/GREATEST mirrors insertTrustedFriend).
    await db.query(
      `INSERT INTO trusted_friends (profile_id_one, profile_id_two, source_type)
       VALUES (LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid), 'content_share')
       ON CONFLICT (profile_id_one, profile_id_two) DO NOTHING`,
      [A.profileId, B.profileId],
    );

    // Create Business D directly: user + business profile + businesses row.
    const bizProfileId = (await db.query(
      `WITH u AS (
         INSERT INTO users (email, password_hash, is_verified)
         VALUES ($1, 'x-not-used', TRUE) RETURNING id
       ), p AS (
         INSERT INTO profiles (user_id, profile_type, display_name, city, state)
         SELECT id, 'business', 'Chat Business D', 'Test City', 'Test State' FROM u
         RETURNING id
       )
       INSERT INTO businesses (profile_id, name, slug)
       SELECT id, 'Chat Business D', $2 FROM p
       RETURNING profile_id, id`,
      [`${emailTag}-d@test.com`, `chat-biz-d-${stamp}`],
    )).rows[0];
    const businessProfileId = bizProfileId.profile_id;
    const businessId = bizProfileId.id;
    assert('SETUP-BUSINESS', !!businessProfileId && !!businessId,
      'Business D created (business profile + businesses row)', { businessProfileId, businessId });

    // ── T1: A→B friend → 201, conversation created ────────────────────────────
    const t1 = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: B.profileId, type: 'friend' } });
    const convAB = t1.data?.data?.conversation?.id;
    if (convAB) createdConversationIds.push(convAB);
    assert('T1-CREATE-FRIEND', t1.status === 201 && !!convAB && t1.data?.data?.conversation?.type === 'direct_friend',
      'POST /conversations A→B type=friend → 201, conversation created', t1.data);

    // ── T2: A→C friend → 403 (not trusted friends) ────────────────────────────
    const t2 = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: C.profileId, type: 'friend' } });
    assert('T2-FRIEND-403', t2.status === 403,
      'POST /conversations A→C type=friend → 403 (not trusted friends)', t2.data);

    // ── T3: A→D business → 201 ────────────────────────────────────────────────
    const t3 = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: businessProfileId, type: 'business' } });
    const convAD = t3.data?.data?.conversation?.id;
    if (convAD) createdConversationIds.push(convAD);
    assert('T3-CREATE-BUSINESS', t3.status === 201 && !!convAD && t3.data?.data?.conversation?.type === 'direct_business',
      'POST /conversations A→D type=business → 201, conversation created', t3.data);

    // ── T3b: get-or-create is idempotent (A→B again returns same convo, 200) ──
    const t3b = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: B.profileId, type: 'friend' } });
    assert('T3b-IDEMPOTENT', t3b.status === 200 && t3b.data?.data?.conversation?.id === convAB && t3b.data?.data?.created === false,
      'Repeat A→B returns the SAME conversation (200, created=false)', t3b.data);

    // ── T4: A sends a message to conv(A,B) → 201 ──────────────────────────────
    const t4 = await api('POST', `/conversations/${convAB}/messages`, { token: A.token, body: { body: 'Hey B, thanks for the referral!' } });
    assert('T4-SEND', t4.status === 201 && t4.data?.data?.message?.id && t4.data?.data?.message?.sender_profile_id === A.profileId,
      'POST message A→conv(A,B) → 201', t4.data);

    // ── T5: B sees the message ────────────────────────────────────────────────
    const t5 = await api('GET', `/conversations/${convAB}/messages`, { token: B.token });
    const bMsgs = t5.data?.data?.messages ?? [];
    assert('T5-VISIBLE', t5.status === 200 && bMsgs.some((m) => m.body === 'Hey B, thanks for the referral!'),
      'GET messages as B → message visible', t5.data);

    // ── T6: C (non-participant) is rejected ───────────────────────────────────
    const t6 = await api('GET', `/conversations/${convAB}/messages`, { token: C.token });
    assert('T6-NONPARTICIPANT-403', t6.status === 403,
      'GET messages as C (not a participant) → 403', t6.data);

    // ── T7: subscribed-businesses (reuses existing /subscriptions/my-businesses)
    await api('POST', '/subscriptions/subscribe', { token: A.token, body: { business_id: businessId } });
    const t7 = await api('GET', '/subscriptions/my-businesses', { token: A.token });
    const subIds = (Array.isArray(t7.data?.data) ? t7.data.data : []).map((b) => b.id);
    assert('T7-SUBSCRIBED', t7.status === 200 && subIds.includes(businessId),
      'GET /subscriptions/my-businesses as A → includes subscribed Business D', t7.data);

    // ── T8: friends list — B present, C absent ────────────────────────────────
    const t8 = await api('GET', '/conversations/friends', { token: A.token });
    const friendIds = (t8.data?.data?.friends ?? []).map((f) => f.profile_id);
    assert('T8-FRIENDS', t8.status === 200 && friendIds.includes(B.profileId) && !friendIds.includes(C.profileId),
      'GET /conversations/friends as A → B present, C absent', t8.data);

    // ── T9: unread count before read > 0, then read → 0 ──────────────────────
    const t9a = await api('GET', '/conversations?type=friend', { token: B.token });
    const convForBBefore = (t9a.data?.data?.conversations ?? []).find((c) => c.id === convAB);
    assert('T9-UNREAD-BEFORE', t9a.status === 200 && convForBBefore && convForBBefore.unread_count >= 1,
      "B's conversation list shows unread_count >= 1 before read", convForBBefore);

    const t9b = await api('POST', `/conversations/${convAB}/read`, { token: B.token });
    assert('T9-MARK-READ', t9b.status === 200, 'POST /conversations/:id/read as B → 200', t9b.data);

    const t9c = await api('GET', '/conversations?type=friend', { token: B.token });
    const convForBAfter = (t9c.data?.data?.conversations ?? []).find((c) => c.id === convAB);
    assert('T9-UNREAD-AFTER', t9c.status === 200 && convForBAfter && convForBAfter.unread_count === 0,
      "B's unread_count is 0 after marking read", convForBAfter);

  } finally {
    // Cleanup: delete conversations first (cascades participants + messages, which
    // have no ON DELETE on sender_profile_id), then the fixture users (cascades
    // profiles → businesses → subscriptions → trusted_friends).
    try {
      if (createdConversationIds.length) {
        await db.query(`DELETE FROM conversations WHERE id = ANY($1::uuid[])`, [createdConversationIds]);
      }
      await db.query(`DELETE FROM users WHERE email LIKE $1`, [`${emailTag}-%@test.com`]);
    } catch (e) {
      console.log('   ⚠️  cleanup warning:', e.message);
    }
    await db.end();
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
  console.log('══════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
