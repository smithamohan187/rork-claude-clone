// scripts/test-business-invite-personal-code.js
// Permanent, reusable, per-inviter business-referral code (GET /marketplace/my-referral-code):
// real link shape, real code format, personal + business profile callers, deep-link resolution,
// registration-time auto-membership, and reusability across multiple businesses.
// Sequential, self-contained, PASS/FAIL.
//
// Run (backend must be up on :3000):
//   node scripts/test-business-invite-personal-code.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));
const marketplaceService = require(path.join(__dirname, '..', 'backend', 'src', 'modules', 'marketplace', 'marketplace.service'));

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SHARE_BASE_URL = (process.env.SHARE_BASE_URL || 'https://touchpoints.app').replace(/\/$/, '');
const CODE_RE = /^TP-BIZ-[A-Z0-9]{8}$/;

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
    body: { email, phone, password: 'Test123#', full_name: full_name || 'BizRefCode Test User', location: 'Test City' },
  });
  return { ok: r.ok, status: r.status, token: r.data?.data?.accessToken, profileId: r.data?.data?.profile?.id, data: r.data };
}

async function registerBusinessFor(token, { name, catId, invite_code }) {
  return api('POST', '/businesses/register', {
    token,
    body: {
      business_name: name,
      business_type: 'incentivised',
      category_id: catId,
      description: 'Personal-referral-code test fixture business',
      phone: '1234567890',
      address: '123 Test St', city: 'Test City', state: 'Test State', country: 'Test Country',
      inhouse_referral: false,
      hours: [
        { day_of_week: 0, is_closed: true },
        { day_of_week: 1, is_closed: false, open_time: '09:00', close_time: '17:00' },
      ],
      ...(invite_code ? { invite_code } : {}),
    },
  });
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Personal Business-Referral Code Test');
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
  const createdProfileIds = [];
  const createdEmails = [];
  const createdBusinessIds = [];

  try {
    const catRow = (await db.query('SELECT id FROM business_categories LIMIT 1')).rows[0];
    assert('T0-CATEGORY-FIXTURE', !!catRow, 'A business category exists', catRow);

    // ── Inviter registers (personal profile) ───────────────────────────────────────────────
    const Inviter = await registerUser({ email: `bizrefcode-inviter-${stamp}@test.com`, phone: `+1740${String(stamp).slice(-7)}`, full_name: 'RefCode Inviter' });
    assert('T1-REGISTER-INVITER', Inviter.ok && Inviter.token && Inviter.profileId, 'Inviter registers → 201', Inviter.data);
    createdProfileIds.push(Inviter.profileId); createdEmails.push(`bizrefcode-inviter-${stamp}@test.com`);

    // ── Personal-profile: GET my-referral-code ─────────────────────────────────────────────
    const personalRes = await api('GET', '/marketplace/my-referral-code', { token: Inviter.token });
    const personalCode = personalRes.data?.data?.code;
    const personalUrl = personalRes.data?.data?.url;
    assert('T2-PERSONAL-CODE-FORMAT', personalRes.status === 200 && CODE_RE.test(personalCode ?? ''),
      'Personal-profile caller gets a code matching TP-BIZ-XXXXXXXX (not bizguest)', personalRes.data);
    assert('T3-PERSONAL-URL-SHAPE', personalUrl === `${SHARE_BASE_URL}/s/${personalCode}`,
      'Personal-profile url is a real touchpoints.app/s/<code> link (not touchpoint.app)', { personalUrl, expected: `${SHARE_BASE_URL}/s/${personalCode}` });

    // ── Idempotency: calling again returns the SAME code, not a new one ───────────────────
    const personalRes2 = await api('GET', '/marketplace/my-referral-code', { token: Inviter.token });
    assert('T4-PERSONAL-CODE-STABLE', personalRes2.data?.data?.code === personalCode,
      'Calling again returns the same persisted code (get-or-create, not regenerated)',
      { first: personalCode, second: personalRes2.data?.data?.code });

    // ── Inviter registers a business — this switches their active profile to 'business' ───
    const inviterBizRes = await registerBusinessFor(Inviter.token, { name: `Inviter Own Biz ${stamp}`, catId: catRow.id });
    const inviterOwnBusinessId = inviterBizRes.data?.data?.id;
    assert('T5-INVITER-REGISTERS-OWN-BUSINESS', inviterBizRes.status === 201 && !!inviterOwnBusinessId,
      'Inviter registers their own business (switches active profile) → 201', inviterBizRes.data);
    if (inviterOwnBusinessId) createdBusinessIds.push(inviterOwnBusinessId);

    // ── Business-profile: GET my-referral-code (same token, now active_profile_id = business) ─
    const businessRes = await api('GET', '/marketplace/my-referral-code', { token: Inviter.token });
    const businessCode = businessRes.data?.data?.code;
    const businessUrl = businessRes.data?.data?.url;
    assert('T6-BUSINESS-CODE-FORMAT', businessRes.status === 200 && CODE_RE.test(businessCode ?? ''),
      'Business-profile caller also gets a code matching TP-BIZ-XXXXXXXX (not bizguest)', businessRes.data);
    assert('T7-BUSINESS-URL-SHAPE', businessUrl === `${SHARE_BASE_URL}/s/${businessCode}`,
      'Business-profile url is a real touchpoints.app/s/<code> link (not touchpoint.app)', { businessUrl, expected: `${SHARE_BASE_URL}/s/${businessCode}` });
    assert('T8-DIFFERENT-PER-PROFILE', businessCode !== personalCode,
      'Business-profile code differs from the personal-profile code (per-profile, not per-user)',
      { personalCode, businessCode });

    // ── Deep link resolves the personal code via the shared /s/<code> resolver ─────────────
    const resolveRes = await api('POST', '/feed/share/resolve-share-referral', { body: { referral_code: personalCode } });
    assert('T9-RESOLVE-DEEP-LINK', resolveRes.status === 200 &&
      resolveRes.data?.data?.content_type === 'business_invite' &&
      resolveRes.data?.data?.route === '/create-business-profile',
      'Resolving the personal code returns content_type=business_invite, route=/create-business-profile', resolveRes.data);

    // ── A different user registers a NEW business using the personal code as invite_code ──
    const InviteeA = await registerUser({ email: `bizrefcode-inviteeA-${stamp}@test.com`, phone: `+1741${String(stamp).slice(-7)}`, full_name: 'RefCode InviteeA' });
    createdProfileIds.push(InviteeA.profileId); createdEmails.push(`bizrefcode-inviteeA-${stamp}@test.com`);

    const bizResA = await registerBusinessFor(InviteeA.token, { name: `Referred Biz A ${stamp}`, catId: catRow.id, invite_code: personalCode });
    const newBusinessIdA = bizResA.data?.data?.id;
    assert('T10-REGISTER-BUSINESS-A-WITH-PERSONAL-CODE', bizResA.status === 201 && !!newBusinessIdA,
      'A business registers with the personal code as invite_code → 201', bizResA.data);
    if (newBusinessIdA) createdBusinessIds.push(newBusinessIdA);

    // ── Inviter is auto-subscribed as a member of business A ──────────────────────────────
    const membershipA = (await db.query(
      `SELECT * FROM subscriptions WHERE profile_id = $1 AND business_id = $2 AND is_active = true`,
      [Inviter.profileId, newBusinessIdA],
    )).rows;
    assert('T11-AUTO-MEMBERSHIP-A', membershipA.length === 1,
      'Inviter is auto-subscribed as an active member of business A', membershipA);

    const notifA = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'invited_business_joined' AND data->>'business_id' = $2`,
      [Inviter.profileId, newBusinessIdA],
    )).rows;
    assert('T12-NOTIFICATION-A', notifA.length === 1, 'Exactly one invited_business_joined notification for business A', notifA);

    const pointsLogA = (await db.query(
      `SELECT * FROM referral_points_log WHERE profile_id = $1 AND points_type = 'share' AND source_type = 'business_referral_code' AND source_id = (
         SELECT id FROM referral_codes WHERE code = $2
       )`,
      [Inviter.profileId, personalCode],
    )).rows;
    assert('T13-POINTS-LOG-PENDING-A', pointsLogA.length === 1 &&
      pointsLogA[0].status === 'pending_credit' && pointsLogA[0].points_amount === null,
      'referral_points_log row for business A is pending_credit with points_amount NULL', pointsLogA);

    // ── Reusability: a SECOND, different business also registers with the SAME personal code ─
    const InviteeB = await registerUser({ email: `bizrefcode-inviteeB-${stamp}@test.com`, phone: `+1742${String(stamp).slice(-7)}`, full_name: 'RefCode InviteeB' });
    createdProfileIds.push(InviteeB.profileId); createdEmails.push(`bizrefcode-inviteeB-${stamp}@test.com`);

    const bizResB = await registerBusinessFor(InviteeB.token, { name: `Referred Biz B ${stamp}`, catId: catRow.id, invite_code: personalCode });
    const newBusinessIdB = bizResB.data?.data?.id;
    assert('T14-REGISTER-BUSINESS-B-WITH-SAME-CODE', bizResB.status === 201 && !!newBusinessIdB,
      'A second, different business registers with the SAME personal code → 201', bizResB.data);
    if (newBusinessIdB) createdBusinessIds.push(newBusinessIdB);

    const membershipB = (await db.query(
      `SELECT * FROM subscriptions WHERE profile_id = $1 AND business_id = $2 AND is_active = true`,
      [Inviter.profileId, newBusinessIdB],
    )).rows;
    assert('T15-AUTO-MEMBERSHIP-B-REUSABLE', membershipB.length === 1,
      'Inviter is ALSO auto-subscribed as a member of business B — the code is reusable, not one-shot', membershipB);

    const notifB = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'invited_business_joined' AND data->>'business_id' = $2`,
      [Inviter.profileId, newBusinessIdB],
    )).rows;
    assert('T16-NOTIFICATION-B', notifB.length === 1, 'Exactly one invited_business_joined notification for business B too', notifB);

    // ── Idempotency: resolveBusinessInviteOnRegister's fallback path guards against re-granting
    // membership for the same (inviter, business) pair. Note: /businesses/register only resolves
    // invite_code on the CREATE path (business.service.js), never on the edit/update path for an
    // existing profile — so this can only be exercised by calling the resolver directly a second
    // time for the already-granted (Inviter, business A) pair, exactly as a defensive retry would.
    await marketplaceService.resolveBusinessInviteOnRegister(db, personalCode, { newBusinessId: newBusinessIdA });
    const notifAAfter = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'invited_business_joined' AND data->>'business_id' = $2`,
      [Inviter.profileId, newBusinessIdA],
    )).rows;
    const membershipAAfter = (await db.query(
      `SELECT * FROM subscriptions WHERE profile_id = $1 AND business_id = $2 AND is_active = true`,
      [Inviter.profileId, newBusinessIdA],
    )).rows;
    assert('T17-IDEMPOTENT-NO-DUPLICATE-A', notifAAfter.length === 1 && membershipAAfter.length === 1,
      'A direct retry of the resolver for the same (inviter, business) pair does not duplicate the notification or membership',
      { notifications: notifAAfter.length, membership: membershipAAfter.length });

  } finally {
    if (createdBusinessIds.length > 0) {
      await db.query(`DELETE FROM notifications WHERE data->>'business_id' = ANY($1)`, [createdBusinessIds]);
      await db.query(`DELETE FROM referral_points_log WHERE source_id IN (SELECT id FROM referral_codes WHERE profile_id = ANY($1))`, [createdProfileIds]);
      await db.query(`DELETE FROM business_hours WHERE business_id = ANY($1)`, [createdBusinessIds]);
      await db.query(`DELETE FROM business_subscriptions WHERE business_id = ANY($1)`, [createdBusinessIds]);
      await db.query(`DELETE FROM businesses WHERE id = ANY($1)`, [createdBusinessIds]);
    }
    if (createdProfileIds.length > 0) {
      await db.query(`DELETE FROM notifications WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM referral_points_log WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM business_invites WHERE inviter_profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM referral_codes WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [createdEmails]);
      await db.query(`DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [createdEmails]);
      await db.query(`DELETE FROM users WHERE email = ANY($1)`, [createdEmails]);
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
