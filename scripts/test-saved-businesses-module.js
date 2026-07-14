// scripts/test-saved-businesses-module.js
// Saved businesses module end-to-end test — save, status, unsave, list, cross-user isolation

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE            = 'http://localhost:3000';
const TEST_EMAIL      = process.env.TEST_EMAIL      || 'pinky@test.com';
const TEST_PASSWORD   = process.env.TEST_PASSWORD   || 'Pinky123#';
const TEST_EMAIL_2    = process.env.TEST_EMAIL_2    || 'pinky2@test.com';
const TEST_PASSWORD_2 = process.env.TEST_PASSWORD_2 || 'Pinky123#';
// Must be set to the UUID of an existing business
const TEST_BUSINESS_ID = process.env.TEST_BUSINESS_ID || '10c365c7-547d-4004-b431-f601ef69d44d';

// ── Helper ────────────────────────────────────────────────────────
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
    console.error('   Set it to the UUID of an existing business.');
    console.error('   Example: TEST_BUSINESS_ID=<uuid> node scripts/test-saved-businesses-module.js\n');
    process.exit(1);
  }

  let accessToken  = '';
  let accessToken2 = '';

  console.log('\n══════════════════════════════════════════════');
  console.log('  TouchPoints Saved Businesses Module Test   ');
  console.log('══════════════════════════════════════════════');
  console.log(`  User 1:      ${TEST_EMAIL}`);
  console.log(`  User 2:      ${TEST_EMAIL_2}`);
  console.log(`  Business ID: ${TEST_BUSINESS_ID}`);

  // ── Step 1: Login (user 1) ────────────────────────────────────
  log(1, 'INFO', `Logging in as ${TEST_EMAIL}`);
  const { ok: login1Ok, data: loginData } = await loginUser(TEST_EMAIL, TEST_PASSWORD);
  if (!login1Ok) {
    log(1, 'FAIL', 'Login failed — aborting', loginData);
    return;
  }
  accessToken = loginData.data?.accessToken;
  log(1, 'PASS', 'Login success', { hasToken: !!accessToken });

  const authHeaders = {
    Authorization:  `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // ── Step 2: GET status before save ───────────────────────────
  log(2, 'INFO', `GET /saved-businesses/status?business_id=${TEST_BUSINESS_ID}`);
  const statusRes1  = await fetch(`${BASE}/saved-businesses/status?business_id=${TEST_BUSINESS_ID}`, {
    headers: authHeaders,
  });
  const statusData1 = await statusRes1.json();
  if (!statusRes1.ok) {
    log(2, 'FAIL', 'Status fetch failed', statusData1);
  } else {
    if (statusData1.data?.isSaved === false) {
      log(2, 'PASS', 'Status is false before saving (clean state)', statusData1.data);
    } else {
      log(2, 'INFO', 'Business already saved — unsaving first to reset state');
      await fetch(`${BASE}/saved-businesses`, {
        method:  'DELETE',
        headers: authHeaders,
        body:    JSON.stringify({ business_id: TEST_BUSINESS_ID }),
      });
      log(2, 'PASS', 'Reset: unsaved existing record');
    }
  }

  // ── Step 3: POST save ─────────────────────────────────────────
  log(3, 'INFO', `POST /saved-businesses { business_id: ${TEST_BUSINESS_ID} }`);
  const saveRes  = await fetch(`${BASE}/saved-businesses`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({ business_id: TEST_BUSINESS_ID }),
  });
  const saveData = await saveRes.json();
  if (!saveRes.ok || saveData.data?.saved !== true) {
    log(3, 'FAIL', 'Save failed or returned unexpected shape', saveData);
  } else {
    log(3, 'PASS', 'Business saved', saveData.data);
  }

  // ── Step 4: GET status after save ────────────────────────────
  log(4, 'INFO', 'GET status after save');
  const statusRes2  = await fetch(`${BASE}/saved-businesses/status?business_id=${TEST_BUSINESS_ID}`, {
    headers: authHeaders,
  });
  const statusData2 = await statusRes2.json();
  if (!statusRes2.ok || statusData2.data?.isSaved !== true) {
    log(4, 'FAIL', 'Status should be true after save', statusData2.data);
  } else {
    log(4, 'PASS', 'isSaved === true confirmed', statusData2.data);
  }

  // ── Step 5: POST save again (idempotent) ─────────────────────
  log(5, 'INFO', 'POST save again — should be idempotent (ON CONFLICT DO NOTHING)');
  const saveRes2  = await fetch(`${BASE}/saved-businesses`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({ business_id: TEST_BUSINESS_ID }),
  });
  const saveData2 = await saveRes2.json();
  if (!saveRes2.ok) {
    log(5, 'FAIL', 'Duplicate save request failed (should have been idempotent)', saveData2);
  } else {
    log(5, 'PASS', 'Duplicate save succeeded (idempotent)', saveData2.data);
  }

  // ── Step 6: DELETE unsave ─────────────────────────────────────
  log(6, 'INFO', `DELETE /saved-businesses { business_id: ${TEST_BUSINESS_ID} }`);
  const unsaveRes  = await fetch(`${BASE}/saved-businesses`, {
    method:  'DELETE',
    headers: authHeaders,
    body:    JSON.stringify({ business_id: TEST_BUSINESS_ID }),
  });
  const unsaveData = await unsaveRes.json();
  if (!unsaveRes.ok || unsaveData.data?.saved !== false) {
    log(6, 'FAIL', 'Unsave failed or returned unexpected shape', unsaveData);
  } else {
    log(6, 'PASS', 'Business unsaved', unsaveData.data);
  }

  // ── Step 7: GET status after unsave ──────────────────────────
  log(7, 'INFO', 'GET status after unsave');
  const statusRes3  = await fetch(`${BASE}/saved-businesses/status?business_id=${TEST_BUSINESS_ID}`, {
    headers: authHeaders,
  });
  const statusData3 = await statusRes3.json();
  if (!statusRes3.ok || statusData3.data?.isSaved !== false) {
    log(7, 'FAIL', 'Status should be false after unsave', statusData3.data);
  } else {
    log(7, 'PASS', 'isSaved === false confirmed after unsave', statusData3.data);
  }

  // ── Step 8: Login as user 2 (auto-register if needed) ────────
  log(8, 'INFO', `Logging in as ${TEST_EMAIL_2} (second user)`);
  let { ok: login2Ok, data: loginData2 } = await loginUser(TEST_EMAIL_2, TEST_PASSWORD_2);
  if (!login2Ok) {
    log(8, 'INFO', 'Login failed — attempting auto-register');
    const { ok: regOk, data: regData } = await registerUser(TEST_EMAIL_2, TEST_PASSWORD_2);
    if (!regOk) {
      log(8, 'FAIL', 'Auto-register failed — skipping cross-user tests', regData);
      return;
    }
    log(8, 'INFO', 'Registered. Logging in again...');
    ({ ok: login2Ok, data: loginData2 } = await loginUser(TEST_EMAIL_2, TEST_PASSWORD_2));
    if (!login2Ok) {
      log(8, 'FAIL', 'Login after register failed — skipping cross-user tests', loginData2);
      return;
    }
  }
  accessToken2 = loginData2.data?.accessToken;
  log(8, 'PASS', 'Login as user 2 success', { hasToken: !!accessToken2 });

  const authHeaders2 = {
    Authorization:  `Bearer ${accessToken2}`,
    'Content-Type': 'application/json',
  };

  // ── Step 8a: User 2's saved list should be empty ─────────────
  log('8a', 'INFO', 'GET /saved-businesses/my-businesses as user 2 — should be empty');
  const listRes2a  = await fetch(`${BASE}/saved-businesses/my-businesses`, { headers: authHeaders2 });
  const listData2a = await listRes2a.json();
  if (!listRes2a.ok) {
    log('8a', 'FAIL', 'List fetch failed for user 2', listData2a);
  } else {
    const list = listData2a.data ?? [];
    const containsBusiness = list.some((b) => b.id === TEST_BUSINESS_ID);
    if (!containsBusiness) {
      log('8a', 'PASS', `User 2's list is empty or does not contain TEST_BUSINESS_ID (${list.length} items)`, { count: list.length });
    } else {
      log('8a', 'FAIL', "User 2's list unexpectedly contains user 1's saved business", { count: list.length });
    }
  }

  // ── Step 9: User 1 re-saves → verify via list endpoint ───────
  log(9, 'INFO', 'User 1 re-saves business');
  await fetch(`${BASE}/saved-businesses`, {
    method:  'POST',
    headers: authHeaders,
    body:    JSON.stringify({ business_id: TEST_BUSINESS_ID }),
  });

  log('9a', 'INFO', 'GET /saved-businesses/my-businesses as user 1 — should contain saved business');
  const listRes1  = await fetch(`${BASE}/saved-businesses/my-businesses`, { headers: authHeaders });
  const listData1 = await listRes1.json();
  if (!listRes1.ok) {
    log('9a', 'FAIL', 'List fetch failed for user 1', listData1);
  } else {
    const list = listData1.data ?? [];
    const found = list.find((b) => b.id === TEST_BUSINESS_ID);
    if (found) {
      log('9a', 'PASS', 'Saved business appears in user 1 list with correct fields', {
        id:               found.id,
        name:             found.name,
        category_name:    found.category_name,
        subscriber_count: found.subscriber_count,
        has_saved_at:     !!found.saved_at,
      });
    } else {
      log('9a', 'FAIL', 'Saved business NOT found in user 1 list', { count: list.length });
    }
  }

  // ── Step 9b: User 2's list still doesn't contain it ──────────
  log('9b', 'INFO', "GET /saved-businesses/my-businesses as user 2 — should NOT contain user 1's business");
  const listRes2b  = await fetch(`${BASE}/saved-businesses/my-businesses`, { headers: authHeaders2 });
  const listData2b = await listRes2b.json();
  if (!listRes2b.ok) {
    log('9b', 'FAIL', 'List fetch failed for user 2', listData2b);
  } else {
    const list = listData2b.data ?? [];
    const containsBusiness = list.some((b) => b.id === TEST_BUSINESS_ID);
    if (!containsBusiness) {
      log('9b', 'PASS', "User 2's list does not contain user 1's saved business — isolation confirmed", { count: list.length });
    } else {
      log('9b', 'FAIL', "User 2's list incorrectly contains user 1's saved business", { count: list.length });
    }
  }

  // ── Step 10: User 2 tries to unsave user 1's record ──────────
  log(10, 'INFO', "User 2 tries to DELETE the business user 1 saved — own-scope only");
  const crossUnsaveRes  = await fetch(`${BASE}/saved-businesses`, {
    method:  'DELETE',
    headers: authHeaders2,
    body:    JSON.stringify({ business_id: TEST_BUSINESS_ID }),
  });
  const crossUnsaveData = await crossUnsaveRes.json();
  if (!crossUnsaveRes.ok) {
    log(10, 'FAIL', 'User 2 unsave request errored (should succeed silently)', crossUnsaveData);
  } else {
    log(10, 'PASS', 'User 2 unsave returned without error (own-scope only)', crossUnsaveData.data);
  }

  // ── Step 11: User 1's record is untouched ────────────────────
  log(11, 'INFO', "User 1 GET status — record should be untouched by user 2");
  const statusRes4  = await fetch(`${BASE}/saved-businesses/status?business_id=${TEST_BUSINESS_ID}`, {
    headers: authHeaders,
  });
  const statusData4 = await statusRes4.json();
  if (!statusRes4.ok || statusData4.data?.isSaved !== true) {
    log(11, 'FAIL', "User 1's saved record was affected by user 2's delete", statusData4.data);
  } else {
    log(11, 'PASS', "User 1's record is intact — cross-user isolation confirmed", statusData4.data);
  }

  // ── Step 12: User 1 unsaves → list should be empty ───────────
  log(12, 'INFO', 'User 1 unsaves → GET list → should be empty');
  await fetch(`${BASE}/saved-businesses`, {
    method:  'DELETE',
    headers: authHeaders,
    body:    JSON.stringify({ business_id: TEST_BUSINESS_ID }),
  });
  const listRes1b  = await fetch(`${BASE}/saved-businesses/my-businesses`, { headers: authHeaders });
  const listData1b = await listRes1b.json();
  if (!listRes1b.ok) {
    log(12, 'FAIL', 'List fetch failed after unsave', listData1b);
  } else {
    const list = listData1b.data ?? [];
    const stillContains = list.some((b) => b.id === TEST_BUSINESS_ID);
    if (!stillContains) {
      log(12, 'PASS', 'Business no longer appears in user 1 list after unsave', { count: list.length });
    } else {
      log(12, 'FAIL', 'Business still appears in list after unsave', { count: list.length });
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
