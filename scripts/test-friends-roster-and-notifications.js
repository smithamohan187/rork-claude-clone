// scripts/test-friends-roster-and-notifications.js
// Widened Friends roster (GET /conversations/friends now includes My-Referrals
// connections, not just trusted_friends) + new-message notification on send.
// Sequential, login-first, PASS/FAIL.
//
// Run (backend up on :3000):  node scripts/test-friends-roster-and-notifications.js

const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
let passed = 0, failed = 0;

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
async function signup({ email, phone, full_name }) {
  const r = await api('POST', '/auth/signup', {
    body: { email, phone, password: 'Test123#', full_name, location: 'Test City' },
  });
  return { token: r.data?.data?.accessToken, profileId: r.data?.data?.profile?.id, status: r.status, data: r.data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  Friends roster widening + new-message notifications');
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
  const emailTag = `roster-${stamp}`;
  const createdConversationIds = [];

  try {
    // A <-> B: app-referral only (no trusted_friends row).
    // A <-> C: fully unconnected (regression guard, mirrors test-chat.js T8).
    const A = await signup({ email: `${emailTag}-a@test.com`, phone: `+1560${String(stamp).slice(-7)}`, full_name: 'Roster A' });
    const B = await signup({ email: `${emailTag}-b@test.com`, phone: `+1561${String(stamp).slice(-7)}`, full_name: 'Roster B' });
    const C = await signup({ email: `${emailTag}-c@test.com`, phone: `+1562${String(stamp).slice(-7)}`, full_name: 'Roster C' });
    assert('SETUP-USERS', A.profileId && B.profileId && C.profileId, 'A, B, C registered');
    if (!A.profileId || !B.profileId || !C.profileId) { console.log('cannot continue'); process.exit(1); }

    const codeA = (await db.query(
      `INSERT INTO referral_codes (profile_id, business_id, code, type) VALUES ($1, NULL, $2, 'app') RETURNING id`,
      [A.profileId, `FR-ROSTER-${stamp}`],
    )).rows[0];
    await db.query(
      `INSERT INTO referrals (referrer_profile_id, referred_profile_id, referral_code_id, type, status, completed_at)
       VALUES ($1, $2, $3, 'app', 'completed', NOW())`,
      [A.profileId, B.profileId, codeA.id],
    );

    // ── T1: GET /conversations/friends as A → B present (referral-only, no trusted_friends row) ─
    const t1 = await api('GET', '/conversations/friends', { token: A.token });
    const friendIds1 = (t1.data?.data?.friends ?? []).map((f) => f.profile_id);
    assert('T1-REFERRAL-IN-ROSTER', t1.status === 200 && friendIds1.includes(B.profileId),
      'B (app-referral connection only) now appears in GET /conversations/friends', t1.data);

    // ── T2: C (fully unconnected) still absent ──────────────────────────────────────────────
    assert('T2-UNCONNECTED-ABSENT', !friendIds1.includes(C.profileId),
      'C (no connection at all) still absent from the roster', t1.data);

    // ── T3: A -> B chat + new-message notification for B ────────────────────────────────────
    const t3 = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: B.profileId, type: 'friend' } });
    const convId = t3.data?.data?.conversation?.id;
    if (convId) createdConversationIds.push(convId);
    assert('T3-CREATE-CONVO', t3.status === 200 || t3.status === 201, 'A can open a friend chat with B (referral-connected)', t3.data);

    const messageBody = `Hello B — roster test ${stamp}`;
    const t3b = await api('POST', `/conversations/${convId}/messages`, { token: A.token, body: { body: messageBody } });
    assert('T3b-SEND', t3b.status === 201, 'A sends a message to B → 201', t3b.data);

    // Give the (best-effort, awaited) notification insert a moment to land.
    await new Promise((r) => setTimeout(r, 300));

    const t4 = await api('GET', '/notifications/mine', { token: B.token });
    const notifs = t4.data?.data?.notifications ?? [];
    const newMsgNotif = notifs.find(
      (n) => n.type === 'new_message' && n.data?.conversation_id === convId && n.data?.sender_profile_id === A.profileId,
    );
    assert('T4-NOTIFICATION', t4.status === 200 && !!newMsgNotif,
      "B's notifications include a new_message row for A's message", { found: newMsgNotif, count: notifs.length });

    // ── T5: POST /conversations decorates the response with the other party's real
    // name + photo (chat-detail's avatar source) ────────────────────────────────────────────
    const avatarPath = `/uploads/avatars/roster-${stamp}.jpg`;
    await db.query(`UPDATE profiles SET avatar_url = $1 WHERE id = $2`, [avatarPath, B.profileId]);

    const t5 = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: B.profileId, type: 'friend' } });
    const convo5 = t5.data?.data?.conversation;
    assert('T5-OTHER-PARTY-DECORATED',
      t5.status === 200 && convo5?.other_name === 'Roster B' && typeof convo5?.other_avatar_url === 'string' && convo5.other_avatar_url.includes(avatarPath),
      'POST /conversations (idempotent re-open) returns real other_name/other_avatar_url for B', convo5);

  } finally {
    try {
      if (createdConversationIds.length) {
        await db.query(`DELETE FROM conversations WHERE id = ANY($1::uuid[])`, [createdConversationIds]);
      }
      await db.query(
        `DELETE FROM referrals WHERE referral_code_id IN (SELECT id FROM referral_codes WHERE code LIKE $1)`,
        [`FR-ROSTER%${stamp}`],
      );
      await db.query(`DELETE FROM referral_codes WHERE code LIKE $1`, [`FR-ROSTER%${stamp}`]);
      await db.query(`DELETE FROM notifications WHERE profile_id IN (
        SELECT id FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)
      )`, [`${emailTag}-%@test.com`]);
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
