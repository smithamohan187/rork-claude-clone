// scripts/test-invite-registration-autosubscribe.js
// Invite-Customers registration-time auto-subscribe — end-to-end test.
// Sequential, login-first, PASS/FAIL. Verifies both the API and the resulting DB rows.
//
// Run (backend must be up on :3000, migrations through 010 applied):
//   node scripts/test-invite-registration-autosubscribe.js
// Requires an existing verified personal account for the "inviter":
//   TEST_EMAIL / TEST_PASSWORD env (defaults below).

const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

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

async function registerUser({ email, phone, full_name, customer_invite_code }) {
  const body = {
    email,
    phone,
    password: 'Test123#',
    full_name: full_name || 'Invite Registration Test User',
    location: 'Test City',
    customer_invite_code,
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

async function createInvite(token, businessId, phone, name) {
  const r = await api('POST', '/invites/customer', {
    token,
    body: { business_id: businessId, channel: 'manual', name, phone },
  });
  return r.data?.data?.invite;
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Invite Registration Auto-Subscribe Test');
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
    // ── T0: Login inviter ─────────────────────────────────────────────────
    const A = await login(EMAIL, PASSWORD);
    assert('T0-LOGIN', A.ok && A.token && A.profileId, 'Inviter login succeeds');
    if (!A.token || !A.profileId) { console.log('\n❌ Cannot continue without inviter'); process.exit(1); }

    const bizRes = await db.query(
      `SELECT b.id, b.profile_id AS owner_profile_id
         FROM businesses b
        WHERE b.profile_id != $1
        ORDER BY b.created_at LIMIT 1`,
      [A.profileId],
    );
    if (bizRes.rows.length === 0) { console.log('\n❌ Need at least 1 business not owned by the inviter'); process.exit(1); }
    const businessId = bizRes.rows[0].id;
    const ownerProfileId = bizRes.rows[0].owner_profile_id;

    const stamp = Date.now();

    // ═══════════════════════════════════════════════════════════════════════
    // PART 1 — welcome points configured
    // ═══════════════════════════════════════════════════════════════════════
    const WELCOME_POINTS = 77;
    await db.query(
      `INSERT INTO reward_config (business_id, welcome_bonus_points)
       VALUES ($1, $2)
       ON CONFLICT (business_id) DO UPDATE SET welcome_bonus_points = $2`,
      [businessId, WELCOME_POINTS],
    );

    const phone1 = `+1888${String(stamp).slice(-7)}`;
    const invite1 = await createInvite(A.token, businessId, phone1, 'Autosub Invitee One');
    assert('T1-INVITE-CREATED', !!invite1?.referral_code, 'Invite created with a referral_code', invite1);

    const email1 = `autosub1-${stamp}@test.com`;
    const reg1 = await registerUser({ email: email1, phone: phone1, full_name: 'Autosub One', customer_invite_code: invite1.referral_code });
    assert('T1-REGISTER', reg1.status === 201 && !!reg1.token && !!reg1.profileId,
      'Invitee registers with customer_invite_code → 201', reg1.data);

    const resolve1 = await api('POST', '/invites/customer/resolve-pending', {
      token: reg1.token,
      body: { customer_invite_code: invite1.referral_code },
    });
    assert('T1-RESOLVE', resolve1.status === 200
      && resolve1.data?.data?.matched === true
      && resolve1.data?.data?.alreadyProcessed === false
      && resolve1.data?.data?.business?.id === businessId
      && resolve1.data?.data?.welcomePoints === WELCOME_POINTS,
      'resolve-pending auto-subscribes and reports business + welcomePoints for redirect', resolve1.data);

    const sub1 = (await db.query(
      `SELECT is_active FROM subscriptions WHERE profile_id = $1 AND business_id = $2`,
      [reg1.profileId, businessId],
    )).rows;
    assert('T1-SUBSCRIPTION', sub1.length === 1 && sub1[0].is_active === true,
      'Subscription row created and active', sub1);

    const pts1 = (await db.query(
      `SELECT points FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_welcome'`,
      [reg1.profileId, businessId],
    )).rows;
    assert('T1-POINTS-TX', pts1.length === 1 && pts1[0].points === WELCOME_POINTS,
      'Points transaction row credited matching configured welcome amount', pts1);

    const custNotif1 = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'points_earned'`,
      [reg1.profileId],
    )).rows;
    assert('T1-CUSTOMER-NOTIF', custNotif1.length === 1,
      'Customer notification row exists for welcome points', { count: custNotif1.length });

    const ownerNotif1 = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'customer_subscribed' AND data->>'invite_id' = $2`,
      [ownerProfileId, invite1.id],
    )).rows;
    assert('T1-OWNER-NOTIF', ownerNotif1.length === 1,
      'Business owner notification row exists for new member', { count: ownerNotif1.length });

    // ── Double-fire idempotency ─────────────────────────────────────────────
    const resolve1Again = await api('POST', '/invites/customer/resolve-pending', {
      token: reg1.token,
      body: { customer_invite_code: invite1.referral_code },
    });
    assert('T1-DOUBLE-FIRE-RESPONSE', resolve1Again.status === 200
      && resolve1Again.data?.data?.alreadyProcessed === true,
      'Second resolve-pending call reports alreadyProcessed, does not re-run', resolve1Again.data);

    const sub1Again = (await db.query(
      `SELECT COUNT(*)::int AS n FROM subscriptions WHERE profile_id = $1 AND business_id = $2`,
      [reg1.profileId, businessId],
    )).rows[0];
    const pts1Again = (await db.query(
      `SELECT COUNT(*)::int AS n FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_welcome'`,
      [reg1.profileId, businessId],
    )).rows[0];
    const ownerNotif1Again = (await db.query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE profile_id = $1 AND type = 'customer_subscribed' AND data->>'invite_id' = $2`,
      [ownerProfileId, invite1.id],
    )).rows[0];
    assert('T1-DOUBLE-FIRE-DB', sub1Again.n === 1 && pts1Again.n === 1 && ownerNotif1Again.n === 1,
      'Repeating the same invite resolution does not double-subscribe, double-credit, or double-notify',
      { subscriptions: sub1Again.n, pointsTx: pts1Again.n, ownerNotifs: ownerNotif1Again.n });

    // ═══════════════════════════════════════════════════════════════════════
    // PART 2 — no welcome points configured
    // ═══════════════════════════════════════════════════════════════════════
    await db.query(`UPDATE reward_config SET welcome_bonus_points = 0 WHERE business_id = $1`, [businessId]);

    const phone2 = `+1999${String(stamp).slice(-7)}`;
    const invite2 = await createInvite(A.token, businessId, phone2, 'Autosub Invitee Two');
    assert('T2-INVITE-CREATED', !!invite2?.referral_code, 'Second invite created with a referral_code', invite2);

    const email2 = `autosub2-${stamp}@test.com`;
    const reg2 = await registerUser({ email: email2, phone: phone2, full_name: 'Autosub Two', customer_invite_code: invite2.referral_code });
    assert('T2-REGISTER', reg2.status === 201 && !!reg2.token && !!reg2.profileId,
      'Second invitee registers with customer_invite_code → 201', reg2.data);

    const resolve2 = await api('POST', '/invites/customer/resolve-pending', {
      token: reg2.token,
      body: { customer_invite_code: invite2.referral_code },
    });
    assert('T2-RESOLVE', resolve2.status === 200
      && resolve2.data?.data?.matched === true
      && resolve2.data?.data?.business?.id === businessId
      && resolve2.data?.data?.welcomePoints === 0,
      'resolve-pending still subscribes with zero welcome points', resolve2.data);

    const sub2 = (await db.query(
      `SELECT is_active FROM subscriptions WHERE profile_id = $1 AND business_id = $2`,
      [reg2.profileId, businessId],
    )).rows;
    assert('T2-SUBSCRIPTION', sub2.length === 1 && sub2[0].is_active === true,
      'Subscription still created with no welcome points configured', sub2);

    const pts2 = (await db.query(
      `SELECT COUNT(*)::int AS n FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_welcome'`,
      [reg2.profileId, businessId],
    )).rows[0];
    assert('T2-NO-POINTS-TX', pts2.n === 0, 'No points transaction row when no welcome points configured', pts2);

    const custNotif2 = (await db.query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE profile_id = $1 AND type = 'points_earned'`,
      [reg2.profileId],
    )).rows[0];
    assert('T2-NO-POINTS-NOTIF', custNotif2.n === 0, 'No points-earned notification when no welcome points configured', custNotif2);

    const ownerNotif2 = (await db.query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE profile_id = $1 AND type = 'customer_subscribed' AND data->>'invite_id' = $2`,
      [ownerProfileId, invite2.id],
    )).rows[0];
    assert('T2-OWNER-NOTIF-ONLY', ownerNotif2.n === 1, 'Join notification still fires with no welcome points configured', ownerNotif2);

    // ═══════════════════════════════════════════════════════════════════════
    // PART 3 — login flow: existing account, invite never linked at signup
    // (registered_profile_id stays NULL; resolution must fall back to phone/email matching)
    // ═══════════════════════════════════════════════════════════════════════
    const LOGIN_WELCOME_POINTS = 55;
    await db.query(
      `UPDATE reward_config SET welcome_bonus_points = $2 WHERE business_id = $1`,
      [businessId, LOGIN_WELCOME_POINTS],
    );

    const phone3 = `+1222${String(stamp).slice(-7)}`;
    const email3 = `autosub3-${stamp}@test.com`;
    const password3 = 'Test123#';

    // C registers normally first, with NO customer_invite_code — simulates an existing account.
    const regC = await registerUser({ email: email3, phone: phone3, full_name: 'Autosub Three' });
    assert('T3-PRE-REGISTER', regC.status === 201 && !!regC.profileId,
      'Existing user pre-registers with no invite code → 201', regC.data);

    // The invite is created AFTER C already has an account, targeting C's phone.
    const invite3 = await createInvite(A.token, businessId, phone3, 'Autosub Invitee Three');
    assert('T3-INVITE-CREATED', !!invite3?.referral_code
      && invite3?.registered_profile_id == null,
      'Third invite created, never linked via signup (registered_profile_id is null)', invite3);

    // C logs in (not registers) using the invite link's code.
    const loginC = await login(email3, password3);
    assert('T3-LOGIN', loginC.ok && !!loginC.token, 'Existing user logs in via the invite link → success');

    const resolve3 = await api('POST', '/invites/customer/resolve-pending', {
      token: loginC.token,
      body: { customer_invite_code: invite3.referral_code },
    });
    assert('T3-RESOLVE', resolve3.status === 200
      && resolve3.data?.data?.matched === true
      && resolve3.data?.data?.alreadyProcessed === false
      && resolve3.data?.data?.business?.id === businessId
      && resolve3.data?.data?.welcomePoints === LOGIN_WELCOME_POINTS,
      'resolve-pending on login auto-subscribes via the phone/email fallback match', resolve3.data);

    const sub3 = (await db.query(
      `SELECT is_active FROM subscriptions WHERE profile_id = $1 AND business_id = $2`,
      [loginC.profileId, businessId],
    )).rows;
    assert('T3-SUBSCRIPTION', sub3.length === 1 && sub3[0].is_active === true,
      'Subscription row created for the existing account via login', sub3);

    const pts3 = (await db.query(
      `SELECT points FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_welcome'`,
      [loginC.profileId, businessId],
    )).rows;
    assert('T3-POINTS-TX', pts3.length === 1 && pts3[0].points === LOGIN_WELCOME_POINTS,
      'Points transaction credited on the login-flow resolution', pts3);

    const custNotif3 = (await db.query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE profile_id = $1 AND type = 'points_earned'`,
      [loginC.profileId],
    )).rows[0];
    assert('T3-CUSTOMER-NOTIF', custNotif3.n === 1, 'Customer notification fires on the login-flow resolution', custNotif3);

    const ownerNotif3 = (await db.query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE profile_id = $1 AND type = 'customer_subscribed' AND data->>'invite_id' = $2`,
      [ownerProfileId, invite3.id],
    )).rows[0];
    assert('T3-OWNER-NOTIF', ownerNotif3.n === 1,
      'Owner notification fires via the fallback phone match despite no registered_profile_id link', ownerNotif3);

    // Double-fire idempotency, using the new subscriptions-row-exists guard.
    const resolve3Again = await api('POST', '/invites/customer/resolve-pending', {
      token: loginC.token,
      body: { customer_invite_code: invite3.referral_code },
    });
    assert('T3-DOUBLE-FIRE-RESPONSE', resolve3Again.status === 200
      && resolve3Again.data?.data?.alreadyProcessed === true,
      'Second resolve-pending call for the same profile+business reports alreadyProcessed', resolve3Again.data);

    const pts3Again = (await db.query(
      `SELECT COUNT(*)::int AS n FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_welcome'`,
      [loginC.profileId, businessId],
    )).rows[0];
    const ownerNotif3Again = (await db.query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE profile_id = $1 AND type = 'customer_subscribed' AND data->>'invite_id' = $2`,
      [ownerProfileId, invite3.id],
    )).rows[0];
    assert('T3-DOUBLE-FIRE-DB', pts3Again.n === 1 && ownerNotif3Again.n === 1,
      'Repeating the login-flow resolution does not double-credit or double-notify',
      { pointsTx: pts3Again.n, ownerNotifs: ownerNotif3Again.n });

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
