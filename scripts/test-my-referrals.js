// scripts/test-my-referrals.js
// My Referrals combined list (app-level + business-level) — end-to-end test.
// Sequential, self-contained (creates its own fixtures), PASS/FAIL.
//
// Run (backend must be up on :3000):
//   node scripts/test-my-referrals.js

const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'))
  .config({ path: path.join(__dirname, '..', 'backend', '.env') });
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

async function registerUser({ email, phone, full_name, referral_code, customer_invite_code }) {
  const body = {
    email,
    phone,
    password: 'Test123#',
    full_name: full_name || 'Referral Test User',
    location: 'Test City',
    referral_code,
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

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — My Referrals (combined list) Test');
  console.log('══════════════════════════════════════════════════');

  const db = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5433),
    database: process.env.DB_NAME || 'touchpoints',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || process.env.DB_PASSWORD,
  });
  await db.connect();

  const stamp = Date.now();
  const createdProfileIds = [];
  const createdEmails = [];

  try {
    // ── Fixtures ──────────────────────────────────────────────────────────────
    const A = await registerUser({
      email: `my-refs-a-${stamp}@test.com`,
      phone: `+1700${String(stamp).slice(-7)}`,
      full_name: 'Alpha Tester',
    });
    assert('T0-REGISTER-A', A.ok && A.token && A.profileId, 'User A registers (no referral) → 201', A.data);
    createdProfileIds.push(A.profileId); createdEmails.push(`my-refs-a-${stamp}@test.com`);

    const codeRes = await api('GET', '/referrals/my-code', { token: A.token });
    const codeA = codeRes.data?.data?.code;
    assert('T1-A-CODE', typeof codeA === 'string' && codeA.startsWith('FR-'), "A's app referral code created", codeRes.data);

    const FriendB = await registerUser({
      email: `my-refs-friendb-${stamp}@test.com`,
      phone: `+1701${String(stamp).slice(-7)}`,
      full_name: 'Bravo Friendname',
      referral_code: codeA,
    });
    assert('T2-REGISTER-FRIEND-B', FriendB.ok && FriendB.profileId, "Friend B registers with A's app code → 201", FriendB.data);
    createdProfileIds.push(FriendB.profileId); createdEmails.push(`my-refs-friendb-${stamp}@test.com`);

    // POST /invites/customer is OWNER-only (customerInvite.service.js's resolveOwnedBusinessId
    // resolves the CALLER's own business server-side and 403s on any other business_id) — A must
    // own the target business. Previously picked "the oldest business in the whole dev DB",
    // which A never owned and which reliably 403'd as the DB accumulated more test data.
    const catRow = (await db.query('SELECT id FROM business_categories LIMIT 1')).rows[0];
    const bizRegRes = await api('POST', '/businesses/register', {
      token: A.token,
      body: {
        business_name: `My Referrals Test Biz ${stamp}`,
        business_type: 'incentivised',
        category_id: catRow.id,
        description: 'test',
        phone: '1234567890',
        address: '123 Test St', city: 'Test City', state: 'Test State', country: 'Test Country',
        inhouse_referral: false,
        hours: [],
      },
    });
    const bizRow = bizRegRes.data?.data ? { id: bizRegRes.data.data.id, name: bizRegRes.data.data.name } : null;
    assert('T3-BUSINESS-FIXTURE', !!bizRow, 'A registers their own business to invite a customer to', bizRegRes.data);
    if (!bizRow) { console.log('\n❌ Cannot continue without a business fixture'); process.exit(1); }

    // Freshly-registered: no business_subscriptions row + onboarding_complete=false would 403
    // isBusinessUnlocked()-gated actions, though /invites/customer itself doesn't gate on that —
    // added for consistency/safety in case this fixture business is reused by future steps.
    await db.query(
      `INSERT INTO business_subscriptions (business_id, plan_id, status, current_period_end)
       VALUES ($1, '3ea4bca7-b327-428a-a32d-83471ddce2bb', 'trial', NOW() + INTERVAL '30 days')
       ON CONFLICT (business_id) DO NOTHING`,
      [bizRow.id],
    );
    await api('PATCH', `/businesses/${bizRow.id}/onboarding-complete`, { token: A.token });

    // /businesses/register switches A's active_profile_id to the new business profile as a side
    // effect (business.service.js's registerBusiness). customerInvite.service.js's
    // createCustomerInvite stamps inviter_profile_id with WHATEVER is active at call time (not
    // necessarily the business profile — getBusinessIdByUserId's ownership check is separately
    // profile_type-based, so it doesn't care). referral.model.js's getCombinedReferrals is
    // strictly single-profileId-scoped, so for T8 below to ever see both the app-level referral
    // (made from A's personal profile) and this business-level invite in one response, both need
    // to be stamped with the SAME profile_id — switch back to personal before creating the
    // invite so it's attributed to A's personal profile, like the app-level referral above.
    await api('POST', '/auth/switch-profile', { token: A.token, body: { profile_id: A.profileId } });

    const inviteRes = await api('POST', '/invites/customer', {
      token: A.token,
      body: {
        business_id: bizRow.id,
        channel: 'manual',
        name: 'Charlie Customer',
        email: `my-refs-inviteec-${stamp}@test.com`,
      },
    });
    const inviteCode = inviteRes.data?.data?.invite?.referral_code;
    assert('T4-CREATE-CUSTOMER-INVITE', inviteRes.status === 201 && typeof inviteCode === 'string' && inviteCode.startsWith('CI-'),
      'A creates a customer invite for the business → 201 with a CI- code', inviteRes.data);

    const InviteeC = await registerUser({
      email: `my-refs-inviteec-${stamp}@test.com`,
      phone: `+1702${String(stamp).slice(-7)}`,
      full_name: 'Charlie Customer',
      customer_invite_code: inviteCode,
    });
    assert('T5-REGISTER-INVITEE-C', InviteeC.ok && InviteeC.profileId, 'Invitee C registers with the CI- code → 201', InviteeC.data);
    createdProfileIds.push(InviteeC.profileId); createdEmails.push(`my-refs-inviteec-${stamp}@test.com`);

    const subRes = await api('POST', '/subscriptions/subscribe', { token: InviteeC.token, body: { business_id: bizRow.id } });
    assert('T6-SUBSCRIBE', subRes.status === 200 && subRes.data?.data?.subscribed === true,
      'Invitee C subscribes to the business → customer_invites flips to subscribed', subRes.data);

    // second app-level chain, purely to exercise the 'i_joined_via' direction from a fresh profile
    const Referrer = await registerUser({
      email: `my-refs-referrer-${stamp}@test.com`,
      phone: `+1703${String(stamp).slice(-7)}`,
      full_name: 'Delta Referrer',
    });
    createdProfileIds.push(Referrer.profileId); createdEmails.push(`my-refs-referrer-${stamp}@test.com`);
    const referrerCodeRes = await api('GET', '/referrals/my-code', { token: Referrer.token });
    const referrerCode = referrerCodeRes.data?.data?.code;

    const Joiner = await registerUser({
      email: `my-refs-joiner-${stamp}@test.com`,
      phone: `+1704${String(stamp).slice(-7)}`,
      full_name: 'Echo Joiner',
      referral_code: referrerCode,
    });
    assert('T7-REGISTER-JOINER', Joiner.ok && Joiner.profileId, 'Joiner registers with Referrer\'s app code → 201', Joiner.data);
    createdProfileIds.push(Joiner.profileId); createdEmails.push(`my-refs-joiner-${stamp}@test.com`);

    // ── Combined list assertions ─────────────────────────────────────────────
    const r8 = await api('GET', '/referrals/mine?direction=all', { token: A.token });
    const rows8 = r8.data?.data?.referrals ?? [];
    const hasFriendB = rows8.some((r) => r.profile_id === FriendB.profileId && r.joined_context === 'touchpoints' && r.direction === 'joined_via_me');
    const hasInviteeC = rows8.some((r) => r.profile_id === InviteeC.profileId && r.joined_context === 'business' && r.direction === 'joined_via_me' && r.business_name === bizRow.name);
    assert('T8-COMBINED-ALL', r8.status === 200 && hasFriendB && hasInviteeC,
      'GET /referrals/mine?direction=all lists both the app-level and business-level joins, correctly labeled', rows8);

    const r9 = await api('GET', '/referrals/mine?direction=i_joined_via', { token: A.token });
    const rows9 = r9.data?.data?.referrals ?? [];
    assert('T9-A-I-JOINED-VIA-EMPTY', r9.status === 200 && rows9.length === 0,
      "A's i_joined_via is empty (A was never referred/invited by anyone)", rows9);

    const r10 = await api('GET', '/referrals/mine?direction=i_joined_via', { token: Joiner.token });
    const rows10 = r10.data?.data?.referrals ?? [];
    const joinerSeesReferrer = rows10.some((r) => r.profile_id === Referrer.profileId && r.direction === 'i_joined_via' && r.joined_context === 'touchpoints');
    assert('T10-JOINER-I-JOINED-VIA', r10.status === 200 && joinerSeesReferrer,
      "Joiner's i_joined_via correctly shows the Referrer", rows10);

    const r11 = await api('GET', `/referrals/mine?direction=all&search=Bravo`, { token: A.token });
    const rows11 = r11.data?.data?.referrals ?? [];
    assert('T11-SEARCH-NAME', rows11.length === 1 && rows11[0].profile_id === FriendB.profileId,
      'search="Bravo" narrows to only Friend B (name match)', rows11);

    const r12 = await api('GET', `/referrals/mine?direction=all&search=${encodeURIComponent(bizRow.name.slice(0, 4))}`, { token: A.token });
    const rows12 = r12.data?.data?.referrals ?? [];
    assert('T12-SEARCH-BUSINESS', rows12.length === 1 && rows12[0].profile_id === InviteeC.profileId,
      'search on a business-name substring narrows to only the business-level row', rows12);

    const r13 = await api('GET', '/referrals/mine?direction=all&search=zzz-no-such-match-zzz', { token: A.token });
    const rows13 = r13.data?.data?.referrals ?? [];
    assert('T13-SEARCH-NO-MATCH', r13.status === 200 && rows13.length === 0,
      'a nonsense search returns an empty array, not an error', r13.data);

    const timestamps = rows8.map((r) => new Date(r.joined_at).getTime());
    const isSortedDesc = timestamps.every((t, i) => i === 0 || timestamps[i - 1] >= t);
    assert('T14-SORT-ORDER', isSortedDesc, 'combined list is sorted by joined_at DESC across both sources', timestamps);

  } finally {
    // Scoped cleanup — only rows tied to the profiles/emails this run created.
    if (createdProfileIds.length > 0) {
      await db.query(`DELETE FROM referrals WHERE referrer_profile_id = ANY($1) OR referred_profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM notifications WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM customer_invites WHERE inviter_profile_id = ANY($1) OR registered_profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM subscriptions WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [createdEmails]);
      await db.query(`DELETE FROM referral_codes WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM profiles WHERE id = ANY($1)`, [createdProfileIds]);
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
