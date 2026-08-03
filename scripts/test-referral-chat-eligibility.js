// scripts/test-referral-chat-eligibility.js
// Widened chat friend-eligibility (trusted_friends OR referrals/customer_invites connection) +
// business-owner exclusion from /referrals/mine. Sequential, login-first, PASS/FAIL.
//
// Run (backend up on :3000):  node scripts/test-referral-chat-eligibility.js

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
  console.log('  Referral-based chat eligibility + owner exclusion');
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
  const emailTag = `refelig-${stamp}`;
  const createdConversationIds = [];

  try {
    // ── Setup: A (app-referral to B), Owner O of Business X (customer-invite to C), D unconnected ─
    const A = await signup({ email: `${emailTag}-a@test.com`, phone: `+1550${String(stamp).slice(-7)}`, full_name: 'Referrer A' });
    const B = await signup({ email: `${emailTag}-b@test.com`, phone: `+1551${String(stamp).slice(-7)}`, full_name: 'App Referred B' });
    const C = await signup({ email: `${emailTag}-c@test.com`, phone: `+1552${String(stamp).slice(-7)}`, full_name: 'Invited Customer C' });
    const D = await signup({ email: `${emailTag}-d@test.com`, phone: `+1553${String(stamp).slice(-7)}`, full_name: 'Unconnected D' });
    assert('SETUP-USERS', A.profileId && B.profileId && C.profileId && D.profileId, 'A, B, C, D registered');
    if (!A.profileId || !B.profileId || !C.profileId || !D.profileId) { console.log('cannot continue'); process.exit(1); }

    // Owner O + Business X (O's personal profile is separate from the business profile).
    const O = await signup({ email: `${emailTag}-owner@test.com`, phone: `+1554${String(stamp).slice(-7)}`, full_name: 'Owner O' });
    assert('SETUP-OWNER', !!O.profileId, 'Owner O registered');

    const bizRow = (await db.query(
      `WITH p AS (
         INSERT INTO profiles (user_id, profile_type, display_name, city, state)
         SELECT user_id, 'business', 'Elig Biz X', 'Test City', 'TS' FROM profiles WHERE id = $1
         RETURNING id, user_id
       )
       INSERT INTO businesses (profile_id, name, slug)
       SELECT id, 'Elig Biz X', $2 FROM p RETURNING id, profile_id`,
      [O.profileId, `elig-biz-${stamp}`],
    )).rows[0];
    const businessId = bizRow.id;

    // A <-> B: app-level referral (referrals table), NOT trusted_friends.
    const codeA = (await db.query(
      `INSERT INTO referral_codes (profile_id, business_id, code, type) VALUES ($1, NULL, $2, 'app') RETURNING id`,
      [A.profileId, `FR-ELIG-${stamp}`],
    )).rows[0];
    await db.query(
      `INSERT INTO referrals (referrer_profile_id, referred_profile_id, referral_code_id, type, status, completed_at)
       VALUES ($1, $2, $3, 'app', 'completed', NOW())`,
      [A.profileId, B.profileId, codeA.id],
    );

    // A <-> C: business customer-invite (customer_invites, status='subscribed'), NOT trusted_friends.
    await db.query(
      `INSERT INTO customer_invites (inviter_profile_id, business_id, channel, invitee_identifier, referral_code, status, registered_profile_id, registered_at, subscribed_at)
       VALUES ($1, $2, 'manual', $3, $4, 'subscribed', $5, NOW(), NOW())`,
      [A.profileId, businessId, `+1555${String(stamp).slice(-7)}`, `CI-ELIG-${stamp}`, C.profileId],
    );

    // A also has an app-referral link with Owner O — used to prove excludeBusinessOwnerOf works.
    const codeA2 = (await db.query(
      `INSERT INTO referral_codes (profile_id, business_id, code, type) VALUES ($1, NULL, $2, 'app') RETURNING id`,
      [A.profileId, `FR-ELIG-OWNER-${stamp}`],
    )).rows[0];
    await db.query(
      `INSERT INTO referrals (referrer_profile_id, referred_profile_id, referral_code_id, type, status, completed_at)
       VALUES ($1, $2, $3, 'app', 'completed', NOW())`,
      [A.profileId, O.profileId, codeA2.id],
    );

    // ── T1: A -> B chat (app-referral only) now succeeds ────────────────────────────────────
    const t1 = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: B.profileId, type: 'friend' } });
    if (t1.data?.data?.conversation?.id) createdConversationIds.push(t1.data.data.conversation.id);
    assert('T1-APP-REFERRAL-CHAT', t1.status === 200 || t1.status === 201, 'A can open a friend chat with B via app-referral connection (no trusted_friends row)', t1.data);

    // ── T2: A -> C chat (customer-invite only) now succeeds ─────────────────────────────────
    const t2 = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: C.profileId, type: 'friend' } });
    if (t2.data?.data?.conversation?.id) createdConversationIds.push(t2.data.data.conversation.id);
    assert('T2-CUSTOMER-INVITE-CHAT', t2.status === 200 || t2.status === 201, 'A can open a friend chat with C via customer-invite connection (no trusted_friends row)', t2.data);

    // ── T3: A -> D chat (no connection at all) still 403s ────────────────────────────────────
    const t3 = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: D.profileId, type: 'friend' } });
    assert('T3-UNCONNECTED-STILL-403', t3.status === 403, 'A still cannot chat with completely unconnected D', t3.data);

    // ── T4: /referrals/mine excludes the business owner when excludeBusinessOwnerOf is set ──
    const t4Without = await api('GET', `/referrals/mine?direction=all`, { token: A.token });
    const ownerRowWithout = (t4Without.data?.data?.referrals ?? []).find((r) => r.profile_id === O.profileId);
    assert('T4-OWNER-PRESENT-WITHOUT-PARAM', !!ownerRowWithout, 'Owner O appears in /referrals/mine when excludeBusinessOwnerOf is omitted', t4Without.data);

    const t4With = await api('GET', `/referrals/mine?direction=all&excludeBusinessOwnerOf=${businessId}`, { token: A.token });
    const ownerRowWith = (t4With.data?.data?.referrals ?? []).find((r) => r.profile_id === O.profileId);
    const bRowWith = (t4With.data?.data?.referrals ?? []).find((r) => r.profile_id === B.profileId);
    assert('T4-OWNER-EXCLUDED-WITH-PARAM', !ownerRowWith && !!bRowWith,
      'Owner O is excluded when excludeBusinessOwnerOf is set, but B (unrelated to that business) still appears', t4With.data);

  } finally {
    try {
      if (createdConversationIds.length) {
        await db.query(`DELETE FROM conversations WHERE id = ANY($1::uuid[])`, [createdConversationIds]);
      }
      await db.query(
        `DELETE FROM referrals WHERE referral_code_id IN (SELECT id FROM referral_codes WHERE code LIKE $1)`,
        [`FR-ELIG%${stamp}`],
      );
      await db.query(`DELETE FROM referral_codes WHERE code LIKE $1`, [`FR-ELIG%${stamp}`]);
      await db.query(`DELETE FROM customer_invites WHERE referral_code LIKE $1`, [`CI-ELIG-${stamp}`]);
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
