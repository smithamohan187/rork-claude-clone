// scripts/test-profile-switching-module.js
// Profile Switching module — end-to-end test (toggling between a user's personal and business
// profile). Previously had zero automated coverage.
//
// Covers:
//   - GET  /auth/session         (profiles[] array, active_profile_id/type)
//   - POST /auth/switch-profile
//
// Prerequisites:
//   - Backend running on BASE_URL (defaults to deployed Cloud Run URL)
//   - TEST_EMAIL / TEST_PASSWORD: an account with BOTH a personal and a business profile
//   - OTHER_EMAIL / OTHER_PASSWORD (optional): a different account, to test switching to a
//     profile that does not belong to the caller (should be rejected)
//
// Run: node scripts/test-profile-switching-module.js

const BASE          = process.env.TEST_BASE_URL   || 'https://touchpoints-backend-495493629048.asia-south1.run.app';
const EMAIL         = process.env.TEST_EMAIL      || 'e2e.f.happy+1785935283403@example.com';
const PASSWORD      = process.env.TEST_PASSWORD   || 'TestPass123!';
const OTHER_EMAIL    = process.env.OTHER_EMAIL    || 'pinky@test.com';
const OTHER_PASSWORD = process.env.OTHER_PASSWORD || 'Pinky123#';

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
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

async function login(email, password) {
  const r = await api('POST', '/auth/login', { body: { identifier: email, password } });
  return { ok: r.ok, token: r.data?.data?.accessToken };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Profile Switching Test');
  console.log('══════════════════════════════════════════════════');

  try {
    // ── T0: Login ────────────────────────────────────────────────────────────
    const user = await login(EMAIL, PASSWORD);
    assert('T0-LOGIN', user.ok && user.token, 'Login succeeds');
    if (!user.token) { console.log('\n❌ Cannot continue'); process.exit(1); }

    // ── T1: session returns a profiles[] array with both profile types ─────
    const r1 = await api('GET', '/auth/session', { token: user.token });
    const profiles = r1.data?.data?.profiles ?? [];
    const personal = profiles.find((p) => p.profile_type === 'personal');
    const business = profiles.find((p) => p.profile_type === 'business');
    assert('T1-SESSION-SHAPE', r1.status === 200 && Array.isArray(profiles) && profiles.length >= 1,
      'GET /auth/session returns a profiles[] array', { count: profiles.length });
    assert('T1-HAS-BOTH-TYPES', !!personal && !!business,
      'The test account has both a personal and a business profile (required for this test)', { personal: !!personal, business: !!business });
    if (!personal || !business) { console.log('\n❌ Cannot continue without both profile types on TEST_EMAIL'); process.exit(1); }

    const originalActiveId = r1.data?.data?.active_profile_id;

    // ── T2: switch to business profile ──────────────────────────────────────
    const r2 = await api('POST', '/auth/switch-profile', { token: user.token, body: { profile_id: business.id } });
    assert('T2-SWITCH-TO-BUSINESS', r2.status === 200 && r2.data?.data?.active_profile_id === business.id
      && r2.data?.data?.active_profile_type === 'business',
      'Switching to the business profile → active_profile_id/type update correctly', r2.data?.data);

    // ── T3: session reflects the switch ──────────────────────────────────────
    const r3 = await api('GET', '/auth/session', { token: user.token });
    assert('T3-SESSION-REFLECTS-BUSINESS', r3.data?.data?.active_profile_id === business.id,
      'GET /auth/session after switching shows the business profile as active', { active_profile_id: r3.data?.data?.active_profile_id });

    // ── T4: switch back to personal profile ──────────────────────────────────
    const r4 = await api('POST', '/auth/switch-profile', { token: user.token, body: { profile_id: personal.id } });
    assert('T4-SWITCH-TO-PERSONAL', r4.status === 200 && r4.data?.data?.active_profile_id === personal.id
      && r4.data?.data?.active_profile_type === 'personal',
      'Switching back to the personal profile → active_profile_id/type update correctly', r4.data?.data);

    const r4b = await api('GET', '/auth/session', { token: user.token });
    assert('T4B-SESSION-REFLECTS-PERSONAL', r4b.data?.data?.active_profile_id === personal.id,
      'GET /auth/session after switching back shows the personal profile as active', { active_profile_id: r4b.data?.data?.active_profile_id });

    // ── T5: switching to a profile that doesn't belong to the caller is rejected ──
    const other = await login(OTHER_EMAIL, OTHER_PASSWORD);
    if (other.token) {
      const r5other = await api('GET', '/auth/session', { token: other.token });
      const foreignProfileId = r5other.data?.data?.active_profile_id;
      if (foreignProfileId) {
        const r5 = await api('POST', '/auth/switch-profile', { token: user.token, body: { profile_id: foreignProfileId } });
        assert('T5-FOREIGN-PROFILE-REJECTED', r5.status >= 400,
          "Switching to another user's profile_id is rejected (not silently accepted)", { status: r5.status, body: r5.data });
      } else {
        console.log('    INFO  Could not resolve a foreign profile id — skipping T5');
      }
    } else {
      console.log('    INFO  OTHER_EMAIL/OTHER_PASSWORD login failed — skipping foreign-profile-rejection check');
    }

    // Confirm switching the foreign id didn't actually change OUR active profile.
    const r5b = await api('GET', '/auth/session', { token: user.token });
    assert('T5B-NOT-ACTUALLY-SWITCHED', r5b.data?.data?.active_profile_id === personal.id,
      "The rejected switch attempt left our own active_profile_id unchanged", { active_profile_id: r5b.data?.data?.active_profile_id });

    // ── T6: missing profile_id → 400 ─────────────────────────────────────────
    const r6 = await api('POST', '/auth/switch-profile', { token: user.token, body: {} });
    assert('T6-MISSING-PROFILE-ID', r6.status === 400, 'switch-profile with no profile_id → 400', r6.data);

    // ── T7: unauthenticated request rejected ─────────────────────────────────
    const r7 = await api('POST', '/auth/switch-profile', { body: { profile_id: business.id } });
    assert('T7-UNAUTH-401', r7.status === 401, 'switch-profile with no token → 401', r7.data);

    // Restore original active profile, in case it differed from "personal" when we started.
    if (originalActiveId && originalActiveId !== personal.id) {
      await api('POST', '/auth/switch-profile', { token: user.token, body: { profile_id: originalActiveId } });
    }

  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
