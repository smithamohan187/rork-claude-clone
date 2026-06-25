// scripts/test-edit-profile-module.js
// Edit-profile module end-to-end test — fetch, update, partial update, avatar, interests, guards

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const BASE = 'http://localhost:3000';

// ── Helpers ──────────────────────────────────────────────────
function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data) console.log('   ', JSON.stringify(data, null, 2));
}

const testEmail = `profile_test_${Date.now()}@example.com`;
const testPassword = 'Test@1234';
// Generate unique phone: 10 digits starting with 9, last 9 from timestamp
const testPhone = `9${Date.now().toString().slice(-9)}`;

async function run() {
  let accessToken = '';
  let categoryId = '';

  console.log('\n══════════════════════════════════════');
  console.log('  TouchPoints Edit Profile Test       ');
  console.log('══════════════════════════════════════');
  console.log(`  Test user: ${testEmail}`);

  // ── Step 0: Register fresh user ───────────────────────────
  log(0, 'INFO', 'Registering fresh test user');
  const registerRes = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: 'Profile Test User',
      location: 'Test City',
    }),
  });
  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    log(0, 'FAIL', 'Registration failed', registerData);
    return;
  }
  accessToken = registerData.data?.accessToken;
  log(0, 'PASS', 'Fresh user registered', {
    userId: registerData.data?.user?.id,
    hasAccessToken: !!accessToken,
  });

  // ── Step 1: Login with same credentials ───────────────────
  log(1, 'INFO', `Logging in as ${testEmail}`);
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testEmail, password: testPassword }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    log(1, 'FAIL', 'Login failed', loginData);
    return;
  }
  accessToken = loginData.data?.accessToken;
  log(1, 'PASS', 'Login success', { hasToken: !!accessToken });

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // ── Step 2: Fetch current profile ─────────────────────────
  log(2, 'INFO', 'Fetching current profile — GET /profile/me');
  const fetchRes = await fetch(`${BASE}/profile/me`, { headers: authHeaders });
  const fetchData = await fetchRes.json();
  if (!fetchRes.ok) {
    log(2, 'FAIL', 'Profile fetch failed', fetchData);
    return;
  }
  log(2, 'PASS', 'Profile fetch success', {
    display_name: fetchData.data?.display_name,
    phone:        fetchData.data?.phone,
    bio:          fetchData.data?.bio,
    city:         fetchData.data?.city,
    state:        fetchData.data?.state,
    country:      fetchData.data?.country,
    interests:    fetchData.data?.interests,
    avatar_url:   fetchData.data?.avatar_url,
    is_active:    fetchData.data?.is_active,
  });

  // ── Step 3: Fetch interest categories ─────────────────────
  log(3, 'INFO', 'Fetching interest categories — GET /profile/interests');
  const catsRes = await fetch(`${BASE}/profile/interests`);
  const catsData = await catsRes.json();
  if (!catsRes.ok) {
    log(3, 'FAIL', 'Categories fetch failed', catsData);
  } else {
    categoryId = catsData.data?.[0]?.id ?? '';
    log(3, 'PASS', `Categories fetched — count: ${catsData.data?.length}`, {
      firstCategory: catsData.data?.[0],
    });
  }

  // ── Step 4: Update all profile fields ─────────────────────
  log(4, 'INFO', 'Updating all profile fields — PUT /profile/me');
  const updateRes = await fetch(`${BASE}/profile/me`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      display_name: 'Test User Updated',
      phone:        testPhone,
      bio:          'This is a test bio updated by test script',
      city:         'Mumbai',
      state:        'Maharashtra',
      country:      'India',
      interest_ids: categoryId ? [categoryId] : [],
    }),
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    log(4, 'FAIL', 'Profile update failed', updateData);
  } else {
    log(4, 'PASS', 'Profile update success', {
      display_name: updateData.data?.display_name,
      city:         updateData.data?.city,
      interests:    updateData.data?.interests,
    });
  }

  // ── Step 5: Verify all fields persisted ───────────────────
  log(5, 'INFO', 'Re-fetching profile to verify update persisted');
  const verifyRes = await fetch(`${BASE}/profile/me`, { headers: authHeaders });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) {
    log(5, 'FAIL', 'Re-fetch failed', verifyData);
  } else {
    const p = verifyData.data;
    const checks = {
      display_name: p?.display_name === 'Test User Updated',
      phone:        p?.phone === testPhone,
      bio:          p?.bio === 'This is a test bio updated by test script',
      city:         p?.city === 'Mumbai',
      state:        p?.state === 'Maharashtra',
      country:      p?.country === 'India',
      has_interest: categoryId ? p?.interests?.some(i => i.id === categoryId) : true,
    };
    const allPassed = Object.values(checks).every(Boolean);
    if (allPassed) {
      log(5, 'PASS', 'All updated fields persisted correctly', checks);
    } else {
      log(5, 'FAIL', 'Some fields did not persist', checks);
    }
  }

  // ── Step 6: Partial update — bio only ─────────────────────
  log(6, 'INFO', 'Testing partial update — sending only bio field');
  const partialRes = await fetch(`${BASE}/profile/me`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ bio: 'Partial update bio' }),
  });
  if (!partialRes.ok) {
    const partialData = await partialRes.json();
    log(6, 'FAIL', 'Partial update failed', partialData);
  } else {
    const reCheckRes = await fetch(`${BASE}/profile/me`, { headers: authHeaders });
    const reCheckData = await reCheckRes.json();
    const p = reCheckData.data;
    const otherFieldsIntact =
      p?.display_name === 'Test User Updated' &&
      p?.phone === testPhone &&
      p?.bio === 'Partial update bio';
    if (otherFieldsIntact) {
      log(6, 'PASS', 'Partial update worked — other fields not nulled out', {
        display_name: p?.display_name,
        phone:        p?.phone,
        bio:          p?.bio,
      });
    } else {
      log(6, 'FAIL', 'Partial update nulled out other fields', {
        display_name: p?.display_name,
        phone:        p?.phone,
        bio:          p?.bio,
      });
    }
  }

  // ── Step 7: Avatar update via URL ─────────────────────────
  log(7, 'INFO', 'Updating avatar — PATCH /profile/me/avatar (JSON, not multipart)');
  const avatarRes = await fetch(`${BASE}/profile/me/avatar`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ avatar_url: 'https://picsum.photos/200' }),
  });
  const avatarData = await avatarRes.json();
  if (!avatarRes.ok) {
    log(7, 'FAIL', 'Avatar update failed', avatarData);
  } else {
    log(7, 'PASS', 'Avatar update success', { avatar_url: avatarData.data?.avatar_url });
  }

  // ── Step 8: Verify avatar persisted ───────────────────────
  log(8, 'INFO', 'Re-fetching profile to verify avatar persisted');
  const avatarVerifyRes = await fetch(`${BASE}/profile/me`, { headers: authHeaders });
  const avatarVerifyData = await avatarVerifyRes.json();
  if (!avatarVerifyRes.ok) {
    log(8, 'FAIL', 'Profile re-fetch failed after avatar update', avatarVerifyData);
  } else {
    const hasAvatar = !!avatarVerifyData.data?.avatar_url;
    if (hasAvatar) {
      log(8, 'PASS', 'Avatar persisted in profile', {
        avatar_url: avatarVerifyData.data?.avatar_url,
      });
    } else {
      log(8, 'FAIL', 'Avatar not found in profile after update');
    }
  }

  // ── Step 9: Invalid phone format ──────────────────────────
  // There is currently no Joi validation on PUT /profile/me so this
  // may be accepted by the DB (phone is a plain varchar column).
  // Expected behaviour once validation is added: 400.
  log(9, 'INFO', 'Testing validation — invalid phone format (expect 400 once validation wired)');
  const invalidPhoneRes = await fetch(`${BASE}/profile/me`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ phone: 'not-a-phone' }),
  });
  if (invalidPhoneRes.status === 400) {
    log(9, 'PASS', 'Invalid phone correctly rejected with 400');
  } else {
    log(
      9,
      'FAIL',
      `Expected 400 but got ${invalidPhoneRes.status} — no Joi validation on PUT /profile/me`,
      { status: invalidPhoneRes.status },
    );
  }

  // ── Step 10: Unauthenticated request rejected ──────────────
  log(10, 'INFO', 'Testing unauthenticated request is rejected');
  const unauthRes = await fetch(`${BASE}/profile/me`);
  if (unauthRes.status === 401) {
    log(10, 'PASS', 'Unauthenticated request correctly returns 401');
  } else {
    log(10, 'FAIL', `Expected 401 but got ${unauthRes.status}`);
  }

  // ── Summary ───────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log('         Test Run Complete            ');
  console.log('══════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌ Unhandled error during test run:', err);
});
