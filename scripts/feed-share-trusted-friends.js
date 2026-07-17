// scripts/feed-share-trusted-friends.js
// Content-share → Trusted Friends referral flow — end-to-end test.
// Sequential, login-first, PASS/FAIL. Verifies both the API and the resulting DB rows.
//
// Run (backend must be up on :3000, migration 006 applied):
//   node scripts/feed-share-trusted-friends.js
// Requires an existing verified personal account for the "sharer" (Profile A):
//   TEST_EMAIL / TEST_PASSWORD env (defaults below).

const path = require('path');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// pg lives in the backend workspace; DB creds come from backend/.env.
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));

const BASE     = process.env.TEST_BASE_URL || 'http://localhost:3000';
const EMAIL    = process.env.TEST_EMAIL    || 'pinky@test.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Pinky123#';

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

async function login(email, password) {
  const r = await api('POST', '/auth/login', { body: { identifier: email, password } });
  return { ok: r.ok, token: r.data?.data?.accessToken, profileId: r.data?.data?.profile?.id };
}

async function registerUser({ email, shareReferralCode }) {
  const body = {
    email,
    password: 'Test123#',
    full_name: 'Share Test User',
    location: 'Test City', // profiles.city is NOT NULL
    ...(shareReferralCode ? { share_referral_code: shareReferralCode } : {}),
  };
  const r = await api('POST', '/auth/signup', { body });
  return {
    ok: r.ok,
    status: r.status,
    token: r.data?.data?.accessToken,
    profileId: r.data?.data?.profile?.id,
    data: r.data,
  };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Content Share / Trusted Friends Test');
  console.log('══════════════════════════════════════════════════');

  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'touchpoint',
    user: process.env.DB_USER || 'touchpoint_user',
    password: process.env.DB_PASSWORD || 'touchpoint123',
  });
  await db.connect();

  try {
    // ── T0: Login Profile A (sharer) ────────────────────────────────────────
    const A = await login(EMAIL, PASSWORD);
    assert('T0-LOGIN', A.ok && A.token && A.profileId, 'Profile A (sharer) login succeeds');
    if (!A.token || !A.profileId) { console.log('\n❌ Cannot continue without Profile A'); process.exit(1); }

    // Two distinct real businesses: one "shared", one "other".
    const bizRes = await db.query('SELECT id FROM businesses ORDER BY created_at LIMIT 2');
    if (bizRes.rows.length < 2) { console.log('\n❌ Need at least 2 businesses in the DB'); process.exit(1); }
    const businessShared = bizRes.rows[0].id;
    const businessOther  = bizRes.rows[1].id;
    const contentId = crypto.randomUUID(); // content_id has no FK; any UUID is valid.

    // ── T1: A shares a post to a recipient → share_recipients row (status=sent) ──
    const shareRes = await api('POST', '/feed/share-recipients', {
      token: A.token,
      body: {
        content_type: 'post',
        content_id: contentId,
        business_id: businessShared,
        recipients: [{ contact: '+353860000001' }],
      },
    });
    const referralCode = shareRes.data?.data?.recipients?.[0]?.referral_code;
    assert('T1-SHARE', shareRes.status === 201 && !!referralCode,
      'POST /feed/share-recipients → 201 with a referral_code', shareRes.data);

    const sentRow = (await db.query('SELECT status FROM share_recipients WHERE referral_code=$1', [referralCode])).rows[0];
    assert('T1-DB', sentRow?.status === 'sent', "share_recipients row created with status='sent'", sentRow);

    // ── T2: resolve valid code → 200 with correct content ─────────────────────
    const r2 = await api('POST', '/feed/resolve-share-referral', { body: { referral_code: referralCode } });
    assert('T2-RESOLVE', r2.status === 200
      && r2.data?.data?.content_type === 'post'
      && r2.data?.data?.content_id === contentId
      && r2.data?.data?.business_id === businessShared,
      'resolve-share-referral → 200 with correct content_type/content_id/business_id', r2.data);

    // ── T3: resolve garbage code → 404 ────────────────────────────────────────
    const r3 = await api('POST', '/feed/resolve-share-referral', { body: { referral_code: 'SH-NOTAREALCODE' } });
    assert('T3-RESOLVE-404', r3.status === 404, `resolve garbage code → 404 (got ${r3.status})`, r3.data);

    // ── T4: register Profile B with the referral code ─────────────────────────
    const emailB = `share-test-b-${Date.now()}@test.com`;
    const B = await registerUser({ email: emailB, shareReferralCode: referralCode });
    assert('T4-REGISTER', B.status === 201 && !!B.token && !!B.profileId,
      'Register Profile B with share_referral_code → 201', B.data);

    const afterRegister = (await db.query(
      'SELECT status, registered_profile_id FROM share_recipients WHERE referral_code=$1', [referralCode])).rows[0];
    assert('T4-STATUS', afterRegister?.status === 'registered' && afterRegister?.registered_profile_id === B.profileId,
      "share_recipients → status='registered', registered_profile_id=B", afterRegister);

    const joinLog = (await db.query(
      `SELECT * FROM referral_points_log WHERE profile_id=$1::uuid AND points_type='join' AND source_type='content_share'`,
      [B.profileId])).rows;
    assert('T4-POINTS-JOIN', joinLog.length === 1,
      "referral_points_log has a 'join' row for Profile B", { count: joinLog.length });

    // ── T5: B subscribes to a DIFFERENT business → no trigger ──────────────────
    const subOther = await api('POST', '/subscriptions/subscribe', { token: B.token, body: { business_id: businessOther } });
    assert('T5-SUB-OTHER', subOther.status === 200 && subOther.data?.data?.subscribed === true,
      'B subscribes to the wrong business → 200 subscribed', subOther.data);

    const noFriend = (await db.query(
      `SELECT * FROM trusted_friends WHERE profile_id_one=LEAST($1::uuid,$2::uuid) AND profile_id_two=GREATEST($1::uuid,$2::uuid)`,
      [A.profileId, B.profileId])).rows;
    const noShareLog = (await db.query(
      `SELECT * FROM referral_points_log WHERE profile_id=$1::uuid AND points_type='share'`, [A.profileId])).rows;
    assert('T5-NO-TRIGGER', noFriend.length === 0 && noShareLog.length === 0,
      'Mismatched subscribe created NO trusted_friends row and NO share points log',
      { friends: noFriend.length, shareLogs: noShareLog.length });

    // ── T6: B subscribes to the CORRECT business → friend link + points ────────
    const subShared = await api('POST', '/subscriptions/subscribe', { token: B.token, body: { business_id: businessShared } });
    assert('T6-SUB-SHARED', subShared.status === 200 && subShared.data?.data?.subscribed === true,
      'B subscribes to the shared business → 200 subscribed', subShared.data);

    const linkedRow = (await db.query('SELECT status FROM share_recipients WHERE referral_code=$1', [referralCode])).rows[0];
    assert('T6-FRIEND-LINKED', linkedRow?.status === 'friend_linked',
      "share_recipients → status='friend_linked'", linkedRow);

    // Both orderings must resolve to the same single ordered row.
    const orderedPair = (await db.query(
      `SELECT * FROM trusted_friends WHERE profile_id_one=LEAST($1::uuid,$2::uuid) AND profile_id_two=GREATEST($1::uuid,$2::uuid)`,
      [A.profileId, B.profileId])).rows;
    const eitherDirection = (await db.query(
      `SELECT * FROM trusted_friends
        WHERE (profile_id_one=$1::uuid AND profile_id_two=$2::uuid) OR (profile_id_one=$2::uuid AND profile_id_two=$1::uuid)`,
      [A.profileId, B.profileId])).rows;
    assert('T6-TRUSTED-FRIEND', orderedPair.length === 1 && eitherDirection.length === 1
      && orderedPair[0].id === eitherDirection[0].id,
      'Exactly one trusted_friends row links A & B; resolves identically from either side',
      { ordered: orderedPair.length, either: eitherDirection.length });

    const shareLog = (await db.query(
      `SELECT * FROM referral_points_log WHERE profile_id=$1::uuid AND points_type='share' AND source_type='content_share'`,
      [A.profileId])).rows;
    assert('T6-POINTS-SHARE', shareLog.length === 1,
      "referral_points_log has a 'share' row for Profile A (sharer)", { count: shareLog.length });

    // ── T7: repeat the correct subscribe → idempotent ─────────────────────────
    await api('POST', '/subscriptions/subscribe', { token: B.token, body: { business_id: businessShared } });
    const dupFriends = (await db.query(
      `SELECT * FROM trusted_friends WHERE profile_id_one=LEAST($1::uuid,$2::uuid) AND profile_id_two=GREATEST($1::uuid,$2::uuid)`,
      [A.profileId, B.profileId])).rows;
    const dupShareLog = (await db.query(
      `SELECT * FROM referral_points_log WHERE profile_id=$1::uuid AND points_type='share'`, [A.profileId])).rows;
    assert('T7-IDEMPOTENT', dupFriends.length === 1 && dupShareLog.length === 1,
      'Re-subscribe creates no duplicate trusted_friends or share points row',
      { friends: dupFriends.length, shareLogs: dupShareLog.length });

    // ── T8: register Profile C with NO code → nothing touched ─────────────────
    const friendsBefore = (await db.query('SELECT COUNT(*)::int AS n FROM trusted_friends')).rows[0].n;
    const pointsBefore   = (await db.query('SELECT COUNT(*)::int AS n FROM referral_points_log')).rows[0].n;
    const recipientsBefore = (await db.query('SELECT COUNT(*)::int AS n FROM share_recipients')).rows[0].n;

    const C = await registerUser({ email: `share-test-c-${Date.now()}@test.com` });
    assert('T8-REGISTER-NOCODE', C.status === 201 && !!C.profileId,
      'Register Profile C with no referral code → 201', C.data);

    const friendsAfter = (await db.query('SELECT COUNT(*)::int AS n FROM trusted_friends')).rows[0].n;
    const pointsAfter   = (await db.query('SELECT COUNT(*)::int AS n FROM referral_points_log')).rows[0].n;
    const recipientsAfter = (await db.query('SELECT COUNT(*)::int AS n FROM share_recipients')).rows[0].n;
    assert('T8-NO-SIDE-EFFECTS',
      friendsAfter === friendsBefore && pointsAfter === pointsBefore && recipientsAfter === recipientsBefore,
      'Non-referred registration touched no share/friend/points rows',
      { friends: [friendsBefore, friendsAfter], points: [pointsBefore, pointsAfter], recipients: [recipientsBefore, recipientsAfter] });

  } finally {
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
