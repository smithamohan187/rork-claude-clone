// scripts/test-business-qr.js
// Business QR scan-code endpoint (owner-only), dynamic welcome points, and channel-agnostic
// join-bonus on subscribe. Sequential, self-contained (creates its own fixtures), PASS/FAIL.
//
// Run (backend must be up on :3000):
//   node scripts/test-business-qr.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SHARE_BASE_URL = (process.env.SHARE_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

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
    body: { email, phone, password: 'Test123#', full_name: full_name || 'QR Test User', location: 'Test City' },
  });
  return { ok: r.ok, status: r.status, token: r.data?.data?.accessToken, profileId: r.data?.data?.profile?.id, data: r.data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Business QR Scan-Code Test');
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
  let businessId = null;

  try {
    // ── Fixtures: owner + business + welcome bonus ──────────────────────────────────────
    const Owner = await registerUser({ email: `qr-owner-${stamp}@test.com`, phone: `+1720${String(stamp).slice(-7)}`, full_name: 'QR Owner' });
    assert('T0-REGISTER-OWNER', Owner.ok && Owner.token && Owner.profileId, 'Business owner registers → 201', Owner.data);
    createdProfileIds.push(Owner.profileId); createdEmails.push(`qr-owner-${stamp}@test.com`);

    const catRow = (await db.query('SELECT id FROM business_categories LIMIT 1')).rows[0];
    assert('T0b-CATEGORY-FIXTURE', !!catRow, 'A business category exists', catRow);

    const registerRes = await api('POST', '/businesses/register', {
      token: Owner.token,
      body: {
        business_name: `QR Test Biz ${stamp}`,
        business_type: 'incentivised',
        category_id: catRow.id,
        description: 'QR test fixture business',
        phone: '1234567890',
        address: '123 Test St', city: 'Test City', state: 'Test State', country: 'Test Country',
        inhouse_referral: false,
        hours: [
          { day_of_week: 0, is_closed: true },
          { day_of_week: 1, is_closed: false, open_time: '09:00', close_time: '17:00' },
          { day_of_week: 2, is_closed: false, open_time: '09:00', close_time: '17:00' },
          { day_of_week: 3, is_closed: true },
          { day_of_week: 4, is_closed: false, open_time: '09:00', close_time: '17:00' },
          { day_of_week: 5, is_closed: false, open_time: '09:00', close_time: '17:00' },
          { day_of_week: 6, is_closed: true },
        ],
      },
    });
    businessId = registerRes.data?.data?.id;
    assert('T1-REGISTER-BUSINESS', registerRes.status === 201 && !!businessId, 'Owner registers a business → 201', registerRes.data);

    const WELCOME = 40;
    const cfgRes = await api('PUT', `/reward-config/${businessId}`, { token: Owner.token, body: { welcome_bonus_points: WELCOME } });
    assert('T2-SET-WELCOME-BONUS', cfgRes.status === 200 && cfgRes.data?.data?.config?.welcome_bonus_points === WELCOME,
      `Owner sets welcome_bonus_points=${WELCOME}`, cfgRes.data);

    // ── Scan-code endpoint: owner gets 200 with the /b/:id deep link ────────────────────
    const scanRes = await api('GET', `/businesses/${businessId}/scan-code`, { token: Owner.token });
    const scanUrl = scanRes.data?.data?.url;
    assert('T3-SCAN-CODE-OWNER', scanRes.status === 200 && scanUrl === `${SHARE_BASE_URL}/b/${businessId}`,
      'Owner GET /businesses/:id/scan-code → 200 with the /b/:id deep link', { status: scanRes.status, url: scanUrl, expected: `${SHARE_BASE_URL}/b/${businessId}` });

    // ── The scan-code URL itself actually resolves (not a bare 404) ───────────────────────
    const landingRes = await fetch(scanUrl);
    const landingHtml = await landingRes.text();
    assert('T3b-SCAN-LANDING-PAGE-RESOLVES', landingRes.status === 200 && landingHtml.includes(`QR Test Biz ${stamp}`),
      'GET the scan-code URL itself (the actual QR target) → 200 with the business name in the page',
      { status: landingRes.status, snippet: landingHtml.slice(0, 200) });

    const landing404 = await fetch(`${SHARE_BASE_URL}/b/00000000-0000-0000-0000-000000000000`);
    assert('T3c-SCAN-LANDING-UNKNOWN-BUSINESS-STILL-200', landing404.status === 200,
      'Scan-code landing page for an unknown business ID still 200s with a generic fallback (never a bare 404)',
      { status: landing404.status });

    // ── Non-owner is rejected (403) ──────────────────────────────────────────────────────
    const Other = await registerUser({ email: `qr-other-${stamp}@test.com`, phone: `+1721${String(stamp).slice(-7)}`, full_name: 'QR Other' });
    assert('T4-REGISTER-OTHER', Other.ok && Other.token && Other.profileId, 'A second (non-owner) user registers → 201', Other.data);
    createdProfileIds.push(Other.profileId); createdEmails.push(`qr-other-${stamp}@test.com`);

    const scanOther = await api('GET', `/businesses/${businessId}/scan-code`, { token: Other.token });
    assert('T5-SCAN-CODE-NON-OWNER-403', scanOther.status === 403,
      'Non-owner GET /businesses/:id/scan-code → 403', { status: scanOther.status, body: scanOther.data });

    // ── Unauthenticated is rejected (401) ────────────────────────────────────────────────
    const scanAnon = await api('GET', `/businesses/${businessId}/scan-code`);
    assert('T6-SCAN-CODE-ANON-401', scanAnon.status === 401,
      'Unauthenticated GET /businesses/:id/scan-code → 401', { status: scanAnon.status });

    // ── Non-existent business → 404 ──────────────────────────────────────────────────────
    const scan404 = await api('GET', `/businesses/00000000-0000-0000-0000-000000000000/scan-code`, { token: Owner.token });
    assert('T7-SCAN-CODE-404', scan404.status === 404,
      'Scan-code for a non-existent business → 404', { status: scan404.status });

    // ── Dynamic welcome points: reward-config returns the configured value ────────────────
    const rcRes = await api('GET', `/reward-config/${businessId}`, { token: Other.token });
    assert('T8-WELCOME-POINTS-DYNAMIC', rcRes.status === 200 && rcRes.data?.data?.config?.welcome_bonus_points === WELCOME,
      'GET /reward-config/:id returns the configured welcome points (drives the public copy, not a hardcoded number)', rcRes.data?.data?.config);

    // ── Subscribe via the (any) channel awards exactly the configured value, once ─────────
    const subRes = await api('POST', '/subscriptions/subscribe', { token: Other.token, body: { business_id: businessId } });
    assert('T9-SUBSCRIBE', subRes.status === 200 && subRes.data?.data?.subscribed === true, 'Non-owner subscribes → 200', subRes.data);

    const earnRows1 = (await db.query(
      `SELECT points FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_welcome'`,
      [Other.profileId, businessId],
    )).rows;
    assert('T10-JOIN-BONUS-CONFIGURED-VALUE', earnRows1.length === 1 && earnRows1[0].points === WELCOME,
      `Exactly one earn_welcome row for the configured value (${WELCOME}), not a hardcoded number`, earnRows1);

    // ── Idempotency: unsubscribe + resubscribe does NOT duplicate the bonus ───────────────
    await api('POST', '/subscriptions/unsubscribe', { token: Other.token, body: { business_id: businessId } });
    await api('POST', '/subscriptions/subscribe', { token: Other.token, body: { business_id: businessId } });
    const earnRows2 = (await db.query(
      `SELECT points FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_welcome'`,
      [Other.profileId, businessId],
    )).rows;
    assert('T11-JOIN-BONUS-IDEMPOTENT', earnRows2.length === 1,
      'Re-subscribe does NOT create a duplicate earn_welcome row (idempotency intact)', earnRows2);

    // ── Changing the configured value is reflected without any code change ────────────────
    const NEW_WELCOME = 75;
    await api('PUT', `/reward-config/${businessId}`, { token: Owner.token, body: { welcome_bonus_points: NEW_WELCOME } });
    const rcRes2 = await api('GET', `/reward-config/${businessId}`, { token: Other.token });
    assert('T12-WELCOME-POINTS-UPDATED', rcRes2.data?.data?.config?.welcome_bonus_points === NEW_WELCOME,
      'Updating welcome_bonus_points is reflected on re-fetch (genuinely dynamic)', rcRes2.data?.data?.config);

  } finally {
    if (createdProfileIds.length > 0) {
      await db.query(`DELETE FROM notifications WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM points_transactions WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM subscriptions WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM referral_codes WHERE profile_id = ANY($1)`, [createdProfileIds]);
    }
    if (businessId) {
      await db.query(`DELETE FROM points_transactions WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM subscriptions WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM rewards_catalog WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM reward_config WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM business_hours WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM business_subscriptions WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM businesses WHERE id = $1`, [businessId]);
    }
    if (createdProfileIds.length > 0) {
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
