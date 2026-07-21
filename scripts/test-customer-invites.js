// scripts/test-customer-invites.js
// Invite Customers — end-to-end test.
// Sequential, login-first, PASS/FAIL. Verifies both the API and the resulting DB rows.
//
// Run (backend must be up on :3000, migration 009 applied):
//   node scripts/test-customer-invites.js
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

async function registerUser({ email, phone, full_name }) {
  const body = {
    email,
    phone,
    password: 'Test123#',
    full_name: full_name || 'Invite Test User',
    location: 'Test City',
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
  console.log('  TouchPoints — Invite Customers Test');
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
    // ── T0: Login inviter (customer A) ──────────────────────────────────────
    const A = await login(EMAIL, PASSWORD);
    assert('T0-LOGIN', A.ok && A.token && A.profileId, 'Inviter login succeeds');
    if (!A.token || !A.profileId) { console.log('\n❌ Cannot continue without inviter'); process.exit(1); }

    // Need a business the inviter does NOT own, with a resolvable owner profile_id.
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
    const manualPhone = `+1555${String(stamp).slice(-7)}`;
    const emailAddr = `invitee-${stamp}@test.com`;
    const manualName = 'Manual Invitee';

    // ── T1: single manual invite (channel=manual, phone) → 201 ────────────────
    const r1 = await api('POST', '/invites/customer', {
      token: A.token,
      body: { business_id: businessId, channel: 'manual', name: manualName, phone: manualPhone },
    });
    assert('T1-MANUAL-INVITE', r1.status === 201
      && r1.data?.data?.invite?.channel === 'manual'
      && r1.data?.data?.invite?.invitee_identifier === manualPhone
      && typeof r1.data?.data?.invite?.url === 'string',
      'POST manual invite → 201 with channel=manual and a share url', r1.data);
    const invite1Id = r1.data?.data?.invite?.id;

    // ── T2: duplicate (same business + identifier) → 200 duplicate:true ──────
    const r2 = await api('POST', '/invites/customer', {
      token: A.token,
      body: { business_id: businessId, channel: 'manual', name: 'Dup Attempt', phone: manualPhone },
    });
    assert('T2-DUPLICATE', r2.status === 200 && r2.data?.data?.duplicate === true,
      'POST duplicate invite (same business+identifier) → 200 duplicate:true', r2.data);

    // ── T3: single email invite (channel=email) → 201 ─────────────────────────
    const r3 = await api('POST', '/invites/customer', {
      token: A.token,
      body: { business_id: businessId, channel: 'email', name: 'Email Invitee', email: emailAddr },
    });
    assert('T3-EMAIL-INVITE', r3.status === 201 && r3.data?.data?.invite?.channel === 'email',
      'POST email invite → 201 with channel=email', r3.data);

    // ── T4: bulk CSV — phone-only, email-only, malformed row ──────────────────
    const csvPhone = `+1666${String(stamp).slice(-7)}`;
    const csvEmail = `csv-${stamp}@test.com`;
    const r4 = await api('POST', '/invites/customer/bulk', {
      token: A.token,
      body: {
        business_id: businessId,
        rows: [
          { name: 'CSV Phone Row', phone: csvPhone },
          { name: 'CSV Email Row', email: csvEmail },
          { name: 'CSV Bad Row', email: 'not-an-email', phone: '' },
        ],
      },
    });
    const r4Statuses = (r4.data?.data?.results ?? []).map((r) => r.status);
    assert('T4-BULK-MIXED', r4.status === 201
      && r4.data?.data?.inserted === 2
      && r4Statuses.filter((s) => s === 'inserted').length === 2
      && r4Statuses.filter((s) => s === 'invalid').length === 1,
      'POST bulk CSV (phone-only, email-only, malformed) → 2 inserted, 1 invalid, no partial failure', r4.data);

    // ── T5: bulk CSV — in-file duplicate business+phone ────────────────────────
    const dupPhone = `+1777${String(stamp).slice(-7)}`;
    const r5 = await api('POST', '/invites/customer/bulk', {
      token: A.token,
      body: {
        business_id: businessId,
        rows: [
          { name: 'First Occurrence', phone: dupPhone },
          { name: 'Second Occurrence', phone: dupPhone },
        ],
      },
    });
    const r5Results = r5.data?.data?.results ?? [];
    const r5First = r5Results.find((r) => r.name === 'First Occurrence');
    const r5Second = r5Results.find((r) => r.name === 'Second Occurrence');
    assert('T5-BULK-INFILE-DUP', r5.status === 201
      && r5.data?.data?.inserted === 1
      && r5First?.status === 'inserted'
      && r5Second?.status === 'skipped-duplicate',
      'POST bulk CSV with in-file duplicate phone → only first inserts, second skipped-duplicate', r5.data);

    // ── T6: invitee registers with the manual invite's phone, then subscribes ─
    const B = await registerUser({ email: `invitee-b-${stamp}@test.com`, phone: manualPhone, full_name: 'Invitee B' });
    assert('T6-REGISTER', B.status === 201 && !!B.token && !!B.profileId,
      'Invitee registers with the invited phone number → 201', B.data);

    const subRes = await api('POST', '/subscriptions/subscribe', { token: B.token, body: { business_id: businessId } });
    assert('T6-SUBSCRIBE', subRes.status === 200 && subRes.data?.data?.subscribed === true,
      'Invitee subscribes to the invited business → 200 subscribed', subRes.data);

    const invite1Row = (await db.query('SELECT status, subscribed_at FROM customer_invites WHERE id = $1', [invite1Id])).rows[0];
    assert('T6-INVITE-SUBSCRIBED', invite1Row?.status === 'subscribed' && !!invite1Row?.subscribed_at,
      "customer_invites row transitions to status='subscribed' with subscribed_at set", invite1Row);

    // ── T7: business owner received a notification ────────────────────────────
    const notifRows = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'customer_subscribed' AND data->>'invite_id' = $2`,
      [ownerProfileId, invite1Id],
    )).rows;
    assert('T7-NOTIFICATION', notifRows.length === 1,
      "A notifications row was inserted for the business owner's profile_id", { count: notifRows.length });

    // ── T8: re-subscribe (duplicate event) → no duplicate notification ────────
    await api('POST', '/subscriptions/subscribe', { token: B.token, body: { business_id: businessId } });
    const notifRowsAfter = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'customer_subscribed' AND data->>'invite_id' = $2`,
      [ownerProfileId, invite1Id],
    )).rows;
    assert('T8-IDEMPOTENT', notifRowsAfter.length === 1,
      'Re-subscribe creates no duplicate notification', { count: notifRowsAfter.length });

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
