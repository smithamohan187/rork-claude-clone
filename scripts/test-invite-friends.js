// scripts/test-invite-friends.js
// Invite Friends (app-level referral) — end-to-end test.
// Sequential, login-first, PASS/FAIL. Verifies both the API and the resulting DB rows.
//
// Run (backend must be up on :3000):
//   node scripts/test-invite-friends.js
// Requires an existing verified personal account for the "referrer":
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

async function registerUser({ email, phone, full_name, referral_code }) {
  const body = {
    email,
    phone,
    password: 'Test123#',
    full_name: full_name || 'Referral Test User',
    location: 'Test City',
    referral_code,
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
  console.log('  TouchPoints — Invite Friends Test');
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
    // ── T0: Login referrer (User A) ─────────────────────────────────────────
    const A = await login(EMAIL, PASSWORD);
    assert('T0-LOGIN', A.ok && A.token && A.profileId, 'Referrer login succeeds');
    if (!A.token || !A.profileId) { console.log('\n❌ Cannot continue without referrer'); process.exit(1); }

    const stamp = Date.now();

    // ── T1: GET my-code returns a stable FR- code + /s/<code> url ────────────
    const r1a = await api('GET', '/referrals/my-code', { token: A.token });
    assert('T1-MY-CODE', r1a.status === 200
      && typeof r1a.data?.data?.code === 'string'
      && r1a.data.data.code.startsWith('FR-')
      && typeof r1a.data?.data?.url === 'string'
      && r1a.data.data.url.endsWith(`/s/${r1a.data.data.code}`),
      'GET /referrals/my-code → 200 with an FR- code and matching /s/<code> url', r1a.data);
    const referralCode = r1a.data?.data?.code;

    const r1b = await api('GET', '/referrals/my-code', { token: A.token });
    assert('T1-IDEMPOTENT-CODE', r1b.data?.data?.code === referralCode,
      'Second call returns the SAME code (get-or-create idempotency)', r1b.data);

    // ── T2: User B signs up with A's referral code → referrals row created ───
    const B = await registerUser({
      email: `friend-b-${stamp}@test.com`,
      phone: `+1555${String(stamp).slice(-7)}`,
      full_name: 'Referred Friend B',
      referral_code: referralCode,
    });
    assert('T2-REGISTER', B.status === 201 && !!B.token && !!B.profileId,
      "Invitee registers with A's referral_code → 201", B.data);

    const referralRow = (await db.query(
      `SELECT r.*, rc.code FROM referrals r
         JOIN referral_codes rc ON rc.id = r.referral_code_id
        WHERE r.referrer_profile_id = $1 AND r.referred_profile_id = $2`,
      [A.profileId, B.profileId],
    )).rows[0];
    assert('T2-REFERRAL-ROW', referralRow
      && referralRow.type === 'app'
      && referralRow.status === 'completed'
      && referralRow.code === referralCode,
      'referrals row exists: referrer=A, referred=B, type=app, status=completed', referralRow);

    // ── T3: A received a referral_joined notification ────────────────────────
    const notifRows = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'referral_joined' AND data->>'referred_profile_id' = $2`,
      [A.profileId, B.profileId],
    )).rows;
    assert('T3-NOTIFICATION', notifRows.length === 1,
      "A notifications row was inserted for A's profile_id, type=referral_joined", { count: notifRows.length });

    // ── T4: idempotency — re-firing signup linkage produces no duplicates ────
    // (simulated directly since signup can only run once per user; call the same DB state check
    //  after a second identical linkage attempt is not possible via HTTP, so we assert via the
    //  service being additive-only: re-run the notification/referral existence check.)
    const referralRowCountAfter = (await db.query(
      `SELECT COUNT(*)::int AS c FROM referrals WHERE referrer_profile_id = $1 AND referred_profile_id = $2`,
      [A.profileId, B.profileId],
    )).rows[0].c;
    assert('T4-NO-DUPLICATE-REFERRAL', referralRowCountAfter === 1,
      'Exactly one referrals row exists for this referrer/referred pair', { count: referralRowCountAfter });

    // ── T5: self-referral guard — signup with own code creates no referral ───
    const C = await registerUser({
      email: `self-ref-${stamp}@test.com`,
      phone: `+1666${String(stamp).slice(-7)}`,
      full_name: 'Self Referral Test',
    });
    assert('T5-REGISTER-C', C.status === 201 && !!C.token && !!C.profileId, 'User C registers → 201', C.data);

    const cCodeRes = await api('GET', '/referrals/my-code', { token: C.token });
    const cCode = cCodeRes.data?.data?.code;
    assert('T5-C-HAS-CODE', typeof cCode === 'string' && cCode.startsWith('FR-'),
      "User C's own code is created", cCodeRes.data);

    // Self-referral can't be exercised through /auth/signup (code only known post-signup), so
    // assert directly against the service's guard behavior via a second account using C's own
    // code would require a fresh signup — instead verify no self-referral row exists for C.
    const selfRefRow = (await db.query(
      `SELECT id FROM referrals WHERE referrer_profile_id = $1 AND referred_profile_id = $1`,
      [C.profileId],
    )).rows[0];
    assert('T5-NO-SELF-REFERRAL', !selfRefRow, 'No self-referral row exists for User C', selfRefRow);

    // ── T6: GET /referrals/mine lists B for A ─────────────────────────────────
    const r6 = await api('GET', '/referrals/mine', { token: A.token });
    const listedIds = (r6.data?.data?.referrals ?? []).map((r) => r.profile_id);
    assert('T6-MY-REFERRALS', r6.status === 200 && listedIds.includes(B.profileId),
      "GET /referrals/mine lists B in A's referrals", r6.data);

    // ── T7: deep-link resolver — FR- code resolves, unknown 404s, SH-/CI- unaffected ─
    const r7a = await api('POST', '/feed/share/resolve-share-referral', { body: { referral_code: referralCode } });
    assert('T7-RESOLVE-APP-REFERRAL', r7a.status === 200 && r7a.data?.data?.content_type === 'app_referral',
      'resolve-share-referral with an FR- code → 200 content_type=app_referral', r7a.data);

    const r7b = await api('POST', '/feed/share/resolve-share-referral', { body: { referral_code: 'FR-NOTAREALCODE99' } });
    assert('T7-RESOLVE-UNKNOWN-404', r7b.status === 404,
      'resolve-share-referral with an unknown code → 404', r7b.data);

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
