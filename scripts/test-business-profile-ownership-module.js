// scripts/test-business-profile-ownership-module.js
// Business Profile ownership check test — verifies owner_user_id is returned
// and correctly identifies the owner vs non-owner.

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE             = 'http://localhost:3000';
const TEST_EMAIL       = process.env.TEST_EMAIL       || 'pinky@test.com';
const TEST_PASSWORD    = process.env.TEST_PASSWORD    || 'Pinky123#';
const TEST_EMAIL_2     = process.env.TEST_EMAIL_2     || 'pinky2@test.com';
const TEST_PASSWORD_2  = process.env.TEST_PASSWORD_2  || 'Pinky123#';
// Must be a UUID of a business owned by TEST_EMAIL's user
const TEST_BUSINESS_ID = process.env.TEST_BUSINESS_ID || '10c365c7-547d-4004-b431-f601ef69d44d';

// ── Helpers ───────────────────────────────────────────────────────
function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data) console.log('   ', JSON.stringify(data, null, 2));
}

async function loginUser(email, password) {
  const res  = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ identifier: email, password }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function registerUser(email, password) {
  const res  = await fetch(`${BASE}/auth/signup`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, full_name: 'Test User 2', location: 'Test City' }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  TouchPoints Business Profile Ownership Check Test      ');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Owner (User 1):      ${TEST_EMAIL}`);
  console.log(`  Non-owner (User 2):  ${TEST_EMAIL_2}`);
  console.log(`  Business ID:         ${TEST_BUSINESS_ID}`);

  // ── Step 1: GET /businesses/:id with no auth (public endpoint) ──
  log(1, 'INFO', `GET /businesses/${TEST_BUSINESS_ID} — no auth (public endpoint)`);
  const publicRes  = await fetch(`${BASE}/businesses/${TEST_BUSINESS_ID}`);
  const publicData = await publicRes.json();
  if (!publicRes.ok) {
    log(1, 'FAIL', 'Public endpoint returned non-200', publicData);
    return;
  }
  const biz = publicData.data?.business ?? publicData.data;
  if (!biz?.owner_user_id) {
    log(1, 'FAIL', 'Response does not include owner_user_id', { keys: Object.keys(biz ?? {}) });
    return;
  }
  log(1, 'PASS', 'Business profile fetched — owner_user_id present', { owner_user_id: biz.owner_user_id });

  const ownerUserId = biz.owner_user_id;

  // ── Step 2: Login as business owner ─────────────────────────────
  log(2, 'INFO', `Logging in as business owner: ${TEST_EMAIL}`);
  const { ok: login1Ok, data: loginData1 } = await loginUser(TEST_EMAIL, TEST_PASSWORD);
  if (!login1Ok) {
    log(2, 'FAIL', 'Owner login failed — aborting', loginData1);
    return;
  }
  const ownerLoggedInUserId = loginData1.data?.userId;
  log(2, 'PASS', 'Owner login success', { userId: ownerLoggedInUserId });

  // ── Step 3: Confirm owner_user_id matches the owner's user_id ───
  log(3, 'INFO', 'Checking owner_user_id matches logged-in owner userId');
  if (ownerLoggedInUserId && ownerUserId === ownerLoggedInUserId) {
    log(3, 'PASS', 'owner_user_id matches the business owner\'s user_id', {
      owner_user_id:    ownerUserId,
      login_userId:     ownerLoggedInUserId,
      match: true,
    });
  } else {
    log(3, 'FAIL', 'owner_user_id does NOT match owner login userId', {
      owner_user_id:  ownerUserId,
      login_userId:   ownerLoggedInUserId,
    });
  }

  // ── Step 4: Login as non-owner (auto-register if needed) ────────
  log(4, 'INFO', `Logging in as non-owner: ${TEST_EMAIL_2}`);
  let { ok: login2Ok, data: loginData2 } = await loginUser(TEST_EMAIL_2, TEST_PASSWORD_2);
  if (!login2Ok) {
    log(4, 'INFO', 'Login failed — attempting auto-register');
    const { ok: regOk, data: regData } = await registerUser(TEST_EMAIL_2, TEST_PASSWORD_2);
    if (!regOk) {
      log(4, 'FAIL', 'Auto-register failed — skipping non-owner test', regData);
      return;
    }
    log(4, 'INFO', 'Registered. Logging in again...');
    ({ ok: login2Ok, data: loginData2 } = await loginUser(TEST_EMAIL_2, TEST_PASSWORD_2));
    if (!login2Ok) {
      log(4, 'FAIL', 'Login after register failed', loginData2);
      return;
    }
  }
  const nonOwnerUserId = loginData2.data?.userId;
  log(4, 'PASS', 'Non-owner login success', { userId: nonOwnerUserId });

  // ── Step 5: Confirm owner_user_id does NOT match non-owner ──────
  log(5, 'INFO', 'Checking owner_user_id does NOT match non-owner userId');
  if (nonOwnerUserId && ownerUserId !== nonOwnerUserId) {
    log(5, 'PASS', 'owner_user_id correctly differs from non-owner user_id', {
      owner_user_id:  ownerUserId,
      non_owner_id:   nonOwnerUserId,
      match: false,
    });
  } else {
    log(5, 'FAIL', 'owner_user_id unexpectedly matches non-owner userId', {
      owner_user_id:  ownerUserId,
      non_owner_id:   nonOwnerUserId,
    });
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  All tests complete.                                     ');
  console.log('══════════════════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌ Unhandled error:', err.message);
  process.exit(1);
});
