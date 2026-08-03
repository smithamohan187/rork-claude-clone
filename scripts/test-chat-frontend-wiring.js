// scripts/test-chat-frontend-wiring.js
// Verifies the exact backend API sequence the wired chat frontend performs:
//   messages tabs -> rosters + conversations, chat-detail -> get-or-create +
//   send + poll + markRead. Login-first, sequential PASS/FAIL, self-contained.
//
// Run (backend up on :3000):  node scripts/test-chat-frontend-wiring.js

const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data !== undefined) console.log('   ', JSON.stringify(data, null, 2));
}
function assert(step, cond, msg, details) {
  if (cond) { log(step, 'PASS', msg); passed++; }
  else      { log(step, 'FAIL', msg, details); failed++; }
}

async function api(method, endpoint, { token, body } = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

async function registerUser({ email, phone, full_name }) {
  const r = await api('POST', '/auth/signup', {
    body: { email, phone, password: 'Test123#', full_name, location: 'Test City' },
  });
  return { token: r.data?.data?.accessToken, profileId: r.data?.data?.profile?.id, status: r.status, data: r.data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Chat Frontend Wiring Test');
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
  const emailTag = `chatfe-${stamp}`;
  const createdConversationIds = [];

  try {
    // Setup: A, B (trusted friends), Business D; A subscribes to D.
    const A = await registerUser({ email: `${emailTag}-a@test.com`, phone: `+1520${String(stamp).slice(-7)}`, full_name: 'FE Chat A' });
    const B = await registerUser({ email: `${emailTag}-b@test.com`, phone: `+1521${String(stamp).slice(-7)}`, full_name: 'FE Chat B' });
    assert('SETUP-USERS', A.profileId && B.profileId, 'Registered A and B', { A: A.profileId, B: B.profileId });
    if (!A.profileId || !B.profileId) { console.log('\n❌ cannot continue'); process.exit(1); }

    await db.query(
      `INSERT INTO trusted_friends (profile_id_one, profile_id_two, source_type)
       VALUES (LEAST($1::uuid,$2::uuid), GREATEST($1::uuid,$2::uuid), 'content_share')
       ON CONFLICT DO NOTHING`,
      [A.profileId, B.profileId],
    );

    const biz = (await db.query(
      `WITH u AS (
         INSERT INTO users (email, password_hash, is_verified) VALUES ($1,'x',TRUE) RETURNING id
       ), p AS (
         INSERT INTO profiles (user_id, profile_type, display_name, city, state)
         SELECT id,'business','FE Chat Biz D','Test City','TS' FROM u RETURNING id
       )
       INSERT INTO businesses (profile_id, name, slug)
       SELECT id,'FE Chat Biz D',$2 FROM p RETURNING id, profile_id`,
      [`${emailTag}-d@test.com`, `fe-chat-biz-${stamp}`],
    )).rows[0];
    const businessId = biz.id;
    const businessProfileId = biz.profile_id;

    await api('POST', '/subscriptions/subscribe', { token: A.token, body: { business_id: businessId } });

    // 2. Businesses tab source: /subscriptions/my-businesses carries business_profile_id.
    const t2 = await api('GET', '/subscriptions/my-businesses', { token: A.token });
    const bizRow = (Array.isArray(t2.data?.data) ? t2.data.data : []).find((b) => b.id === businessId);
    assert('T2-SUBSCRIBED-BIZ', t2.status === 200 && bizRow && bizRow.business_profile_id === businessProfileId,
      'GET /subscriptions/my-businesses includes D with business_profile_id', bizRow);

    // 3. Friends tab source: /conversations/friends includes B.
    const t3 = await api('GET', '/conversations/friends', { token: A.token });
    const friendIds = (t3.data?.data?.friends ?? []).map((f) => f.profile_id);
    assert('T3-FRIENDS', t3.status === 200 && friendIds.includes(B.profileId),
      'GET /conversations/friends includes B', t3.data?.data);

    // 4. Tapping rows -> get-or-create (business by business_profile_id, friend by profile_id).
    const t4a = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: businessProfileId, type: 'business' } });
    const convBizId = t4a.data?.data?.conversation?.id;
    if (convBizId) createdConversationIds.push(convBizId);
    assert('T4-OPEN-BIZ', [200, 201].includes(t4a.status) && !!convBizId,
      'Open business conversation via business_profile_id', t4a.data);

    const t4b = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: B.profileId, type: 'friend' } });
    const convFriendId = t4b.data?.data?.conversation?.id;
    if (convFriendId) createdConversationIds.push(convFriendId);
    assert('T4-OPEN-FRIEND', [200, 201].includes(t4b.status) && !!convFriendId,
      'Open friend conversation via profile_id', t4b.data);

    // 5. A sends; B "polls" (GET after=) and picks it up within ~5s (3s cadence).
    const sent = await api('POST', `/conversations/${convFriendId}/messages`, { token: A.token, body: { body: 'polling hello from A' } });
    assert('T5-SEND', sent.status === 201 && !!sent.data?.data?.message?.id, 'A sends message in friend convo', sent.data);

    let seen = false;
    for (let i = 0; i < 3 && !seen; i++) {
      await sleep(1500);
      const poll = await api('GET', `/conversations/${convFriendId}/messages`, { token: B.token });
      seen = (poll.data?.data?.messages ?? []).some((m) => m.body === 'polling hello from A');
    }
    assert('T5-POLL-PICKUP', seen, "B's poll picks up A's message within ~5s", { seen });

    // 6. markRead resets unread on B's conversation list.
    const beforeList = await api('GET', '/conversations?type=friend', { token: B.token });
    const beforeConv = (beforeList.data?.data?.conversations ?? []).find((c) => c.id === convFriendId);
    assert('T6-UNREAD-BEFORE', (beforeConv?.unread_count ?? 0) >= 1, "B has unread >= 1 before read", beforeConv);

    const read = await api('POST', `/conversations/${convFriendId}/read`, { token: B.token });
    const afterList = await api('GET', '/conversations?type=friend', { token: B.token });
    const afterConv = (afterList.data?.data?.conversations ?? []).find((c) => c.id === convFriendId);
    assert('T6-UNREAD-AFTER', read.status === 200 && afterConv?.unread_count === 0, "B unread is 0 after markRead", afterConv);

    // 7. Business path: A sends + reads back in the business conversation.
    const bizSend = await api('POST', `/conversations/${convBizId}/messages`, { token: A.token, body: { body: 'hi business' } });
    const bizFetch = await api('GET', `/conversations/${convBizId}/messages`, { token: A.token });
    assert('T7-BUSINESS-MSG', bizSend.status === 201 && (bizFetch.data?.data?.messages ?? []).some((m) => m.body === 'hi business'),
      'Business conversation send + read-back works', bizFetch.data?.data?.messages?.length);

  } finally {
    try {
      if (createdConversationIds.length) {
        await db.query(`DELETE FROM conversations WHERE id = ANY($1::uuid[])`, [createdConversationIds]);
      }
      await db.query(`DELETE FROM users WHERE email LIKE $1`, [`${emailTag}-%@test.com`]);
    } catch (e) {
      console.log('   ⚠️ cleanup warning:', e.message);
    }
    await db.end();
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
  console.log('══════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => { console.error('\n💥', err); process.exit(1); });
