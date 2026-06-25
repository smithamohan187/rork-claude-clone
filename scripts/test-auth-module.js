// scripts/test-auth-module.js
// Auth module end-to-end test — registration, login, session, refresh, logout

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const BASE = 'http://localhost:3000';

// ── Helpers ──────────────────────────────────────────────────
function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data) console.log('   ', JSON.stringify(data, null, 2));
}

const testEmail = `test_${Date.now()}@example.com`;
const testPassword = 'Test@1234';

async function run() {
  let accessToken = '';
  let refreshToken = '';
  let userId = '';

  console.log('\n════════════════════════════════');
  console.log('  TouchPoints Auth Module Test  ');
  console.log('════════════════════════════════');
  console.log(`  Test user: ${testEmail}`);

  // ── Step 1: Register new user ─────────────────────────────
  log(1, 'INFO', `Registering new user: ${testEmail}`);
  const registerRes = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: 'Test User',
      location: 'Test City',
    }),
  });
  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    log(1, 'FAIL', 'Registration failed', registerData);
    return;
  }
  accessToken = registerData.data?.accessToken;
  refreshToken = registerData.data?.refreshToken;
  userId = registerData.data?.user?.id;
  log(1, 'PASS', 'Registration success', {
    userId,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
  });

  // ── Step 2: Login with same credentials ───────────────────
  log(2, 'INFO', 'Logging in with registered credentials');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testEmail,
      password: testPassword,
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    log(2, 'FAIL', 'Login failed', loginData);
    return;
  }
  accessToken = loginData.data?.accessToken;
  refreshToken = loginData.data?.refreshToken;
  log(2, 'PASS', 'Login success', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
  });

  // ── Step 3: Access protected route with valid token ───────
  log(3, 'INFO', 'Calling GET /auth/session with valid access token');
  const sessionRes = await fetch(`${BASE}/auth/session`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const sessionData = await sessionRes.json();
  if (!sessionRes.ok) {
    log(3, 'FAIL', 'Session fetch failed with valid token', sessionData);
  } else {
    log(3, 'PASS', 'Session fetch success', { userId: sessionData.data?.user_id });
  }

  // ── Step 4: Call refresh endpoint with valid refresh token ─
  log(4, 'INFO', 'Calling POST /auth/refresh with valid refresh token');
  const oldRefreshToken = refreshToken;
  const refreshRes = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const refreshData = await refreshRes.json();
  if (!refreshRes.ok) {
    log(4, 'FAIL', 'Token refresh failed', refreshData);
    return;
  }
  const newAccessToken = refreshData.data?.accessToken;
  const newRefreshToken = refreshData.data?.refreshToken;
  log(4, 'PASS', 'Token refresh success', {
    hasNewAccessToken: !!newAccessToken,
    hasNewRefreshToken: !!newRefreshToken,
    tokenRotated: newRefreshToken !== oldRefreshToken,
  });

  // ── Step 5: Verify OLD refresh token is now invalid ───────
  log(5, 'INFO', 'Testing old refresh token is rejected after rotation');
  const oldRefreshRes = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: oldRefreshToken }),
  });
  if (oldRefreshRes.status === 401) {
    log(5, 'PASS', 'Old refresh token correctly rejected after rotation');
  } else {
    const oldRefreshData = await oldRefreshRes.json();
    log(5, 'FAIL', 'Old refresh token still accepted — token rotation not working', oldRefreshData);
  }

  // Update tokens to new ones
  accessToken = newAccessToken;
  refreshToken = newRefreshToken;

  // ── Step 6: Use new access token on protected route ───────
  log(6, 'INFO', 'Calling GET /auth/session with NEW access token');
  const newSessionRes = await fetch(`${BASE}/auth/session`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!newSessionRes.ok) {
    const newSessionData = await newSessionRes.json();
    log(6, 'FAIL', 'Session fetch failed with new access token', newSessionData);
  } else {
    log(6, 'PASS', 'New access token works on protected route');
  }

  // ── Step 7: Tampered/invalid access token returns 401 ─────
  log(7, 'INFO', 'Testing invalid access token returns 401');
  const fakeTokenRes = await fetch(`${BASE}/auth/session`, {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.invalid.token' },
  });
  if (fakeTokenRes.status === 401) {
    log(7, 'PASS', 'Invalid access token correctly returns 401');
  } else {
    log(7, 'FAIL', `Expected 401 but got ${fakeTokenRes.status}`);
  }

  // ── Step 8: Refresh using valid refresh token after 401 ───
  // Simulates what the Axios interceptor does in the app
  log(8, 'INFO', 'Simulating interceptor flow — refresh after 401');
  const interceptorRefreshRes = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const interceptorRefreshData = await interceptorRefreshRes.json();
  if (!interceptorRefreshRes.ok) {
    log(8, 'FAIL', 'Interceptor refresh failed', interceptorRefreshData);
  } else {
    accessToken = interceptorRefreshData.data?.accessToken;
    refreshToken = interceptorRefreshData.data?.refreshToken;
    log(8, 'PASS', 'Interceptor refresh success — new access token obtained', {
      hasNewAccessToken: !!accessToken,
    });
  }

  // ── Step 9: Wrong password login ──────────────────────────
  log(9, 'INFO', 'Testing login with wrong password');
  const wrongPassRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testEmail,
      password: 'WrongPassword123',
    }),
  });
  if (wrongPassRes.status === 401) {
    log(9, 'PASS', 'Wrong password correctly returns 401');
  } else {
    log(9, 'FAIL', `Expected 401 but got ${wrongPassRes.status}`);
  }

  // ── Step 10: Logout ───────────────────────────────────────
  log(10, 'INFO', 'Logging out');
  const logoutRes = await fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
  if (!logoutRes.ok) {
    const logoutData = await logoutRes.json();
    log(10, 'FAIL', 'Logout failed', logoutData);
  } else {
    log(10, 'PASS', 'Logout success');
  }

  // ── Step 11: Refresh token rejected after logout ──────────
  log(11, 'INFO', 'Testing refresh token is rejected after logout');
  const postLogoutRefreshRes = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (postLogoutRefreshRes.status === 401) {
    log(11, 'PASS', 'Refresh token correctly rejected after logout');
  } else {
    log(11, 'FAIL', 'Refresh token still accepted after logout — logout not invalidating token');
  }

  // ── Step 12: Access token behaviour after logout ──────────
  // Access tokens are stateless JWTs — the middleware checks signature only,
  // not DB revocation. After logout the access token remains valid until its
  // 15-minute expiry window closes. The frontend is responsible for dropping
  // it from memory. A 200 here is EXPECTED behaviour, not a bug.
  log(12, 'INFO', 'Access token after logout (stateless JWT — 200 expected, not a bug)');
  const postLogoutSessionRes = await fetch(`${BASE}/auth/session`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (postLogoutSessionRes.status === 200) {
    log(
      12,
      'INFO',
      'Access token still accepted after logout (expected — stateless JWT, valid for remaining 15-min window). Frontend must drop token from memory on logout.',
    );
  } else if (postLogoutSessionRes.status === 401) {
    log(12, 'PASS', 'Access token rejected after logout (server-side revocation implemented)');
  } else {
    log(12, 'FAIL', `Unexpected status ${postLogoutSessionRes.status}`);
  }

  // ── Summary ───────────────────────────────────────────────
  console.log('\n════════════════════════════════');
  console.log('        Test Run Complete        ');
  console.log('════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌ Unhandled error during test run:', err);
});
