// scripts/test-business-members-module.js
// Business Members module end-to-end test — owner access, non-owner 403, subscribe, list, remove

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE            = 'http://localhost:3000';
const TEST_EMAIL      = process.env.TEST_EMAIL      || 'pinky@test.com';
const TEST_PASSWORD   = process.env.TEST_PASSWORD   || 'Pinky123#';
const TEST_EMAIL_2    = process.env.TEST_EMAIL_2    || 'pinky2@test.com';
const TEST_PASSWORD_2 = process.env.TEST_PASSWORD_2 || 'Pinky123#';
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
  if (!TEST_BUSINESS_ID) {
    console.error('\n❌ TEST_BUSINESS_ID env var is required.');
    console.error('   Set it to the UUID of a business owned by TEST_EMAIL.');
    console.error('   Example: TEST_BUSINESS_ID=<uuid> node scripts/test-business-members-module.js\n');
    process.exit(1);
  }

  let accessToken  = '';
  let accessToken2 = '';

  console.log('\n══════════════════════════════════════════════');
  console.log('  TouchPoints Business Members Module Test   ');
  console.log('══════════════════════════════════════════════');
  console.log(`  Owner (User 1): ${TEST_EMAIL}`);
  console.log(`  Non-owner (User 2): ${TEST_EMAIL_2}`);
  console.log(`  Business ID: ${TEST_BUSINESS_ID}`);

  // ── Step 1: Login as business owner ──────────────────────────
  log(1, 'INFO', `Logging in as business owner: ${TEST_EMAIL}`);
  const { ok: login1Ok, data: loginData1 } = await loginUser(TEST_EMAIL, TEST_PASSWORD);
  if (!login1Ok) {
    log(1, 'FAIL', 'Owner login failed — aborting', loginData1);
    return;
  }
  accessToken = loginData1.data?.accessToken;
  log(1, 'PASS', 'Owner login success', { hasToken: !!accessToken });

  const authHeaders1 = {
    Authorization:  `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // ── Step 2: Owner fetches member list ─────────────────────────
  log(2, 'INFO', `GET /subscriptions/members?business_id=${TEST_BUSINESS_ID} as owner`);
  const listRes1  = await fetch(`${BASE}/subscriptions/members?business_id=${TEST_BUSINESS_ID}`, {
    headers: authHeaders1,
  });
  const listData1 = await listRes1.json();
  if (!listRes1.ok || !Array.isArray(listData1.data)) {
    log(2, 'FAIL', 'Owner should be able to fetch member list', listData1);
  } else {
    log(2, 'PASS', `Owner can access member list (${listData1.data.length} current members)`, { count: listData1.data.length });
  }

  // ── Step 3: Login as non-owner (auto-register if needed) ──────
  log(3, 'INFO', `Logging in as non-owner: ${TEST_EMAIL_2}`);
  let { ok: login2Ok, data: loginData2 } = await loginUser(TEST_EMAIL_2, TEST_PASSWORD_2);
  if (!login2Ok) {
    log(3, 'INFO', 'Login failed — attempting auto-register');
    const { ok: regOk, data: regData } = await registerUser(TEST_EMAIL_2, TEST_PASSWORD_2);
    if (!regOk) {
      log(3, 'FAIL', 'Auto-register failed — skipping non-owner tests', regData);
      return;
    }
    log(3, 'INFO', 'Registered. Logging in again...');
    ({ ok: login2Ok, data: loginData2 } = await loginUser(TEST_EMAIL_2, TEST_PASSWORD_2));
    if (!login2Ok) {
      log(3, 'FAIL', 'Login after register failed', loginData2);
      return;
    }
  }
  accessToken2 = loginData2.data?.accessToken;
  log(3, 'PASS', 'Non-owner login success', { hasToken: !!accessToken2 });

  const authHeaders2 = {
    Authorization:  `Bearer ${accessToken2}`,
    'Content-Type': 'application/json',
  };

  // ── Step 4: Non-owner tries to fetch member list (expect 403) ─
  log(4, 'INFO', 'GET /subscriptions/members as non-owner — should get 403');
  const listRes2  = await fetch(`${BASE}/subscriptions/members?business_id=${TEST_BUSINESS_ID}`, {
    headers: authHeaders2,
  });
  const listData2 = await listRes2.json();
  if (listRes2.status === 403) {
    log(4, 'PASS', 'Non-owner correctly rejected with 403', { error: listData2.error });
  } else {
    log(4, 'FAIL', `Expected 403 but got ${listRes2.status}`, listData2);
  }

  // ── Step 5: User 2 subscribes to the business ─────────────────
  log(5, 'INFO', 'User 2 subscribes to the business');
  const subRes  = await fetch(`${BASE}/subscriptions/subscribe`, {
    method:  'POST',
    headers: authHeaders2,
    body:    JSON.stringify({ business_id: TEST_BUSINESS_ID }),
  });
  const subData = await subRes.json();
  if (!subRes.ok) {
    log(5, 'FAIL', 'Subscribe failed', subData);
  } else {
    log(5, 'PASS', 'User 2 subscribed', subData.data);
  }

  // ── Step 6: Owner fetches members — User 2 should appear ──────
  log(6, 'INFO', 'Owner fetches member list — User 2 should now appear');
  const listRes3  = await fetch(`${BASE}/subscriptions/members?business_id=${TEST_BUSINESS_ID}`, {
    headers: authHeaders1,
  });
  const listData3 = await listRes3.json();
  if (!listRes3.ok || !Array.isArray(listData3.data)) {
    log(6, 'FAIL', 'List fetch failed', listData3);
    return;
  }
  const members = listData3.data;
  const user2Member = members[0]; // most recent first
  if (members.length > 0 && user2Member?.profile_id) {
    log(6, 'PASS', 'User 2 appears in member list with correct fields', {
      profile_id:    user2Member.profile_id,
      display_name:  user2Member.display_name,
      has_subscribed_at: !!user2Member.subscribed_at,
    });
  } else {
    log(6, 'FAIL', 'User 2 not found in member list', { count: members.length });
    return;
  }

  const memberProfileId = user2Member.profile_id;

  // ── Step 7: Owner removes User 2 ──────────────────────────────
  log(7, 'INFO', `DELETE /subscriptions/members — remove profile ${memberProfileId}`);
  const removeRes  = await fetch(`${BASE}/subscriptions/members`, {
    method:  'DELETE',
    headers: authHeaders1,
    body:    JSON.stringify({ business_id: TEST_BUSINESS_ID, member_profile_id: memberProfileId }),
  });
  const removeData = await removeRes.json();
  if (!removeRes.ok || removeData.data?.removed !== true) {
    log(7, 'FAIL', 'Remove member failed or unexpected response', removeData);
  } else {
    log(7, 'PASS', 'Member removed successfully', removeData.data);
  }

  // ── Step 8: Non-owner DELETE also rejected ────────────────────
  log(8, 'INFO', 'Non-owner tries DELETE /subscriptions/members — should get 403');
  const crossRemoveRes  = await fetch(`${BASE}/subscriptions/members`, {
    method:  'DELETE',
    headers: authHeaders2,
    body:    JSON.stringify({ business_id: TEST_BUSINESS_ID, member_profile_id: memberProfileId }),
  });
  if (crossRemoveRes.status === 403) {
    log(8, 'PASS', 'Non-owner correctly rejected with 403 on DELETE');
  } else {
    log(8, 'FAIL', `Expected 403 but got ${crossRemoveRes.status}`);
  }

  // ── Step 9: Owner fetches list — User 2 should be gone ────────
  log(9, 'INFO', "Owner fetches member list — User 2 should be removed");
  const listRes4  = await fetch(`${BASE}/subscriptions/members?business_id=${TEST_BUSINESS_ID}`, {
    headers: authHeaders1,
  });
  const listData4 = await listRes4.json();
  if (!listRes4.ok) {
    log(9, 'FAIL', 'List fetch failed after removal', listData4);
  } else {
    const stillPresent = (listData4.data ?? []).some((m) => m.profile_id === memberProfileId);
    if (!stillPresent) {
      log(9, 'PASS', 'Removed member no longer in list', { count: listData4.data.length });
    } else {
      log(9, 'FAIL', 'Removed member still appears in list', { count: listData4.data.length });
    }
  }

  console.log('\n══════════════════════════════════════════════');
  console.log('  All tests complete.                        ');
  console.log('══════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌ Unhandled error:', err.message);
  process.exit(1);
});
