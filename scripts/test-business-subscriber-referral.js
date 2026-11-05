// scripts/test-business-subscriber-referral.js
// Business Subscriber Referral — end-to-end test (the "BR-" coded system, distinct from both the
// Content Share (`SH-`) and app-level Invite Friends (`FR-`) referral systems).
// Sequential, login-first, PASS/FAIL. Pure API calls only — no direct DB access, so this is safe
// to run against a shared/deployed backend (local DB access via cloud-sql-proxy was unreliable
// in this environment anyway — ECONNRESET on every connection attempt).
//
// Covers:
//   - GET  /subscriber-referrals/business/:businessId/mine
//   - POST /subscriber-referrals/business/resolve-pending
//
// Prerequisites:
//   - Backend running on BASE_URL (defaults to deployed Cloud Run URL)
//   - BUSINESS_ID: a real business the TEST_EMAIL account does NOT own (required)
//   - TEST_EMAIL / TEST_PASSWORD: a customer account that can subscribe to BUSINESS_ID
//
// Run: BUSINESS_ID=<id> node scripts/test-business-subscriber-referral.js

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE        = process.env.TEST_BASE_URL || 'https://touchpoints-backend-495493629048.asia-south1.run.app';
const EMAIL       = process.env.TEST_EMAIL    || 'pinky@test.com';
const PASSWORD    = process.env.TEST_PASSWORD || 'Pinky123#';
const BUSINESS_ID = process.env.BUSINESS_ID   || '66466941-72ea-4703-84b5-3668ee3d7239'; // E2E Test Cafe — the sharer (TEST_EMAIL) must not own this

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
  const body = { email, phone, password: 'Test123#', full_name: full_name || 'BRF Test User', location: 'Test City' };
  const r = await api('POST', '/auth/signup', { body });
  return {
    ok: r.ok,
    status: r.status,
    token: r.data?.data?.accessToken,
    profileId: r.data?.data?.profile?.id,
    data: r.data,
  };
}

async function pointsForBusiness(token, businessId) {
  const r = await api('GET', '/points/summary', { token });
  const row = (r.data?.data?.breakdown ?? []).find((b) => b.businessId === businessId);
  return row?.points ?? 0;
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Business Subscriber Referral Test');
  console.log('══════════════════════════════════════════════════');

  if (!BUSINESS_ID) {
    console.log('\n❌ BUSINESS_ID env var is required — set it to a business the TEST_EMAIL account does not own.');
    process.exit(1);
  }

  try {
    // ── T0: Login sharer ──────────────────────────────────────────────────────
    const sharer = await login(EMAIL, PASSWORD);
    assert('T0-LOGIN', sharer.ok && sharer.token && sharer.profileId, 'Sharer login succeeds');
    if (!sharer.token || !sharer.profileId) { console.log('\n❌ Cannot continue without sharer'); process.exit(1); }

    // Start from a known state: not subscribed (idempotent — safe even if already unsubscribed).
    await api('POST', '/subscriptions/unsubscribe', { token: sharer.token, body: { business_id: BUSINESS_ID } });

    // ── T1: unsubscribed sharer is blocked from getting a referral link (403) ──
    const r1 = await api('GET', `/subscriber-referrals/business/${BUSINESS_ID}/mine`, { token: sharer.token });
    assert('T1-GATED', r1.status === 403, 'GET mine while NOT subscribed → 403', r1.data);

    // ── T2: subscribe, then mine succeeds and mints a BR- code ─────────────────
    const subRes = await api('POST', '/subscriptions/subscribe', { token: sharer.token, body: { business_id: BUSINESS_ID } });
    assert('T2-SUBSCRIBE', subRes.status === 200, 'Sharer subscribes to the business → 200', subRes.data);

    const r2 = await api('GET', `/subscriber-referrals/business/${BUSINESS_ID}/mine`, { token: sharer.token });
    const referralCode = r2.data?.data?.referralCode;
    assert('T2-MINE', r2.status === 200 && /^BR-[A-Z0-9]{10}$/.test(referralCode || ''),
      'GET mine after subscribing → 200 with a BR-prefixed code', r2.data);
    assert('T2-LINK', typeof r2.data?.data?.referralLink === 'string' && r2.data.data.referralLink.includes(referralCode || '\0'),
      'referralLink embeds the referral code', r2.data?.data);

    // ── T2b: calling mine again returns the SAME code (lazy get-or-create, not re-minted) ──
    const r2b = await api('GET', `/subscriber-referrals/business/${BUSINESS_ID}/mine`, { token: sharer.token });
    assert('T2B-STABLE-CODE', r2b.data?.data?.referralCode === referralCode,
      'Calling mine twice returns the identical code (no duplicate row minted)', r2b.data?.data);

    const statsBeforeJoin = r2.data?.data?.stats;
    console.log(`    INFO  stats before any join: referred=${statsBeforeJoin?.referredCount}, completed=${statsBeforeJoin?.completedCount}`);

    // ── T3: self-referral is a no-op (sharer opening their own link) ──────────
    const r3 = await api('POST', '/subscriber-referrals/business/resolve-pending', {
      token: sharer.token, body: { referral_code: referralCode },
    });
    assert('T3-SELF-NOOP', r3.status === 200 && r3.data?.data?.matched === false && r3.data?.data?.welcomePoints === 0,
      "Sharer opening their own referral link → matched:false, no points", r3.data);

    // ── T4: unknown code resolves gracefully (matched:false, not an error) ────
    const stamp = Date.now();
    const friendEmail = `brf-friend-${stamp}@test.com`;
    const friendPhone = `+1555${String(stamp).slice(-7)}`;
    const friend = await registerUser({ email: friendEmail, phone: friendPhone, full_name: 'BRF Friend' });
    assert('T4-FRIEND-REGISTER', friend.status === 201 && !!friend.token && !!friend.profileId,
      'Friend registers a fresh account → 201', friend.data);

    const r4 = await api('POST', '/subscriber-referrals/business/resolve-pending', {
      token: friend.token, body: { referral_code: 'BR-DOESNOTEXIST01' },
    });
    assert('T4-UNKNOWN-CODE', r4.status === 200 && r4.data?.data?.matched === false,
      'Unknown referral code → 200 matched:false (never a hard error)', r4.data);

    // ── T5: real referral join — friend resolves the sharer's real code ───────
    const sharerPointsBefore = await pointsForBusiness(sharer.token, BUSINESS_ID);

    const r5 = await api('POST', '/subscriber-referrals/business/resolve-pending', {
      token: friend.token, body: { referral_code: referralCode },
    });
    assert('T5-MATCHED', r5.status === 200 && r5.data?.data?.matched === true,
      'Friend resolves a real referral code → matched:true', r5.data);

    const friendStatus = await api('GET', `/subscriptions/status?business_id=${BUSINESS_ID}`, { token: friend.token });
    assert('T5-AUTOSUBSCRIBED', friendStatus.data?.data?.isSubscribed === true,
      'Friend is auto-subscribed to the business as a result', friendStatus.data);

    // ── T6: sharer's stats + points reflect the completed referral ────────────
    const r6 = await api('GET', `/subscriber-referrals/business/${BUSINESS_ID}/mine`, { token: sharer.token });
    assert('T6-STATS-UPDATED',
      r6.data?.data?.stats?.referredCount === (statsBeforeJoin?.referredCount ?? 0) + 1 &&
      r6.data?.data?.stats?.completedCount === (statsBeforeJoin?.completedCount ?? 0) + 1,
      'Sharer stats incremented by exactly 1 referred / 1 completed', r6.data?.data?.stats);

    const bonusPerReferral = r6.data?.data?.bonusPerReferral ?? 0;
    if (bonusPerReferral > 0) {
      const sharerPointsAfter = await pointsForBusiness(sharer.token, BUSINESS_ID);
      assert('T6-POINTS-CREDITED',
        Number(sharerPointsAfter) === Number(sharerPointsBefore) + Number(bonusPerReferral),
        `Sharer credited exactly ${bonusPerReferral} bonus point(s) (before=${sharerPointsBefore}, after=${sharerPointsAfter})`,
        { sharerPointsBefore, sharerPointsAfter, bonusPerReferral });
    } else {
      console.log('    INFO  bonusPerReferral is 0 for this business — skipping points-credited check');
    }

    // ── T7: idempotency — re-resolving the same code again never double-credits ──
    const sharerPointsBeforeReopen = bonusPerReferral > 0 ? await pointsForBusiness(sharer.token, BUSINESS_ID) : 0;
    const r7 = await api('POST', '/subscriber-referrals/business/resolve-pending', {
      token: friend.token, body: { referral_code: referralCode },
    });
    assert('T7-REOPEN-MATCHED', r7.status === 200 && r7.data?.data?.matched === true && r7.data?.data?.welcomePoints === 0,
      'Friend re-opening the same link → matched:true, welcomePoints:0 (already an active subscriber)', r7.data);

    if (bonusPerReferral > 0) {
      const sharerPointsAfterReopen = await pointsForBusiness(sharer.token, BUSINESS_ID);
      assert('T7-NO-DOUBLE-CREDIT', Number(sharerPointsAfterReopen) === Number(sharerPointsBeforeReopen),
        'Re-resolving the same referral does not credit the sharer a second time',
        { sharerPointsBeforeReopen, sharerPointsAfterReopen });
    }

    // ── T8: unauthenticated requests are rejected ──────────────────────────────
    const r8a = await api('GET', `/subscriber-referrals/business/${BUSINESS_ID}/mine`, {});
    assert('T8-MINE-401', r8a.status === 401, 'GET mine with no token → 401', r8a.data);
    const r8b = await api('POST', '/subscriber-referrals/business/resolve-pending', { body: { referral_code: referralCode } });
    assert('T8-RESOLVE-401', r8b.status === 401, 'POST resolve-pending with no token → 401', r8b.data);

  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
