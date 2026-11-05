// scripts/test-personal-profile-module.js
// Personal Profile module — end-to-end test (edit name/bio/location, avatar). This module was
// previously only tested by hand (bugs found & fixed in an earlier pass: missing Bio field,
// missing avatar validation, missing name-required validation) with no automated checklist.
//
// Covers:
//   - GET   /profile/me
//   - PUT   /profile/me        (display_name, bio, city/state/country, validation)
//   - PATCH /profile/me/avatar
//   - POST  /profile/me/avatar-upload
//   - GET   /profile/interests
//   - GET   /profile/:profileId/public
//
// Prerequisites:
//   - Backend running on BASE_URL (defaults to deployed Cloud Run URL)
//   - TEST_EMAIL / TEST_PASSWORD: any account (its personal profile fields are edited and then
//     restored to their original values at the end of the run)
//
// Run: node scripts/test-personal-profile-module.js

const BASE     = process.env.TEST_BASE_URL || 'https://touchpoints-backend-495493629048.asia-south1.run.app';
const EMAIL    = process.env.TEST_EMAIL    || 'pinky@test.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Pinky123#';

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

async function api(method, endpoint, { token, body, formData } = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(formData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: formData ? formData : (body !== undefined ? JSON.stringify(body) : undefined),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

async function login(email, password) {
  const r = await api('POST', '/auth/login', { body: { identifier: email, password } });
  return { ok: r.ok, token: r.data?.data?.accessToken };
}

const VALID_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Personal Profile Test');
  console.log('══════════════════════════════════════════════════');

  try {
    // ── T0: Login + fetch current profile (to restore later) ────────────────
    const user = await login(EMAIL, PASSWORD);
    assert('T0-LOGIN', user.ok && user.token, 'Login succeeds');
    if (!user.token) { console.log('\n❌ Cannot continue'); process.exit(1); }

    const r0 = await api('GET', '/profile/me', { token: user.token });
    assert('T0-GET-ME', r0.status === 200 && !!r0.data?.data?.profile_id,
      'GET /profile/me returns the caller\'s own profile', { profile_id: r0.data?.data?.profile_id });
    const original = r0.data?.data ?? {};
    const profileId = original.profile_id;

    // ── T1: update display_name, bio, city ───────────────────────────────────
    const stamp = Date.now();
    const r1 = await api('PUT', '/profile/me', {
      token: user.token,
      body: { display_name: `Script Test User ${stamp}`, bio: `Edited by test-personal-profile-module.js at ${stamp}`, city: 'Testville' },
    });
    assert('T1-UPDATE', r1.status === 200 && r1.data?.data?.display_name === `Script Test User ${stamp}`,
      'PUT /profile/me updates display_name', r1.data?.data);
    assert('T1-BIO-SAVED', r1.data?.data?.bio === `Edited by test-personal-profile-module.js at ${stamp}`,
      'Bio field is saved (this was previously a missing field entirely)', { bio: r1.data?.data?.bio });
    assert('T1-CITY-SAVED', r1.data?.data?.city === 'Testville', 'City field is saved', { city: r1.data?.data?.city });

    // ── T2: GET /profile/me reflects the update (not just the PUT response) ──
    const r2 = await api('GET', '/profile/me', { token: user.token });
    assert('T2-PERSISTED', r2.data?.data?.display_name === `Script Test User ${stamp}` && r2.data?.data?.bio?.includes(String(stamp)),
      'A follow-up GET confirms the edit actually persisted to the DB', { display_name: r2.data?.data?.display_name });

    // ── T3: partial update preserves untouched fields ────────────────────────
    const r3 = await api('PUT', '/profile/me', { token: user.token, body: { city: 'Testville 2' } });
    assert('T3-PARTIAL-UPDATE', r3.data?.data?.city === 'Testville 2' && r3.data?.data?.display_name === `Script Test User ${stamp}`,
      'Updating only city leaves display_name untouched', r3.data?.data);

    // ── T4: validation guard — display_name too short (min 2) → 400 ─────────
    const r4 = await api('PUT', '/profile/me', { token: user.token, body: { display_name: 'A' } });
    assert('T4-NAME-TOO-SHORT', r4.status === 400,
      'A 1-character display_name is rejected → 400 (the "blank name" bug this guards against)', r4.data);

    // ── T5: validation guard — invalid phone format → 400 ────────────────────
    const r5 = await api('PUT', '/profile/me', { token: user.token, body: { phone: 'not-a-phone' } });
    assert('T5-INVALID-PHONE', r5.status === 400, 'An invalid phone format is rejected → 400', r5.data);

    // ── T6: avatar — PATCH with no avatar_url → 400 ──────────────────────────
    const r6 = await api('PATCH', '/profile/me/avatar', { token: user.token, body: {} });
    assert('T6-AVATAR-REQUIRED', r6.status === 400 && /avatar_url is required/i.test(r6.data?.error || ''),
      'PATCH avatar with no avatar_url → 400', r6.data);

    // ── T7: avatar — real file upload succeeds and returns a usable URL ─────
    const form7 = new FormData();
    form7.append('avatar', new Blob([Buffer.from(VALID_PNG_BASE64, 'base64')], { type: 'image/png' }), 'avatar.png');
    const r7 = await api('POST', '/profile/me/avatar-upload', { token: user.token, formData: form7 });
    assert('T7-AVATAR-UPLOAD', r7.status === 200 && typeof r7.data?.data?.url === 'string',
      'POST avatar-upload accepts a real image and returns a URL', r7.data?.data);

    // ── T8: avatar — 0-byte file is rejected (shares the storage.js chokepoint fix) ──
    const form8 = new FormData();
    form8.append('avatar', new Blob([Buffer.alloc(0)], { type: 'image/jpeg' }), 'empty.jpg');
    const r8 = await api('POST', '/profile/me/avatar-upload', { token: user.token, formData: form8 });
    assert('T8-EMPTY-AVATAR-REJECTED', r8.status === 400 && /empty|corrupt/i.test(r8.data?.error || ''),
      '0-byte avatar file is rejected → 400 (shared uploadFileToGCS validation)', r8.data);

    // ── T9: avatar — wrong file type is rejected by the route's fileFilter ──
    const form9 = new FormData();
    form9.append('avatar', new Blob([Buffer.from('not an image')], { type: 'application/pdf' }), 'doc.pdf');
    const r9 = await api('POST', '/profile/me/avatar-upload', { token: user.token, formData: form9 });
    assert('T9-WRONG-FILETYPE-REJECTED', r9.status === 400,
      'A non-image (PDF) avatar upload is rejected → 400 (multer fileFilter)', r9.data);

    // ── T10: PATCH avatar with the uploaded URL actually sets it ────────────
    if (typeof r7.data?.data?.url === 'string') {
      const r10 = await api('PATCH', '/profile/me/avatar', { token: user.token, body: { avatar_url: r7.data.data.url } });
      assert('T10-AVATAR-SET', r10.status === 200 && r10.data?.data?.avatar_url === r7.data.data.url,
        'PATCH avatar with a real URL updates avatar_url', r10.data?.data);
    }

    // ── T11: public interests list (no auth required) ───────────────────────
    const r11 = await api('GET', '/profile/interests', {});
    assert('T11-INTERESTS', r11.status === 200 && Array.isArray(r11.data?.data),
      'GET /profile/interests (public) returns a list', { count: r11.data?.data?.length });

    // ── T12: public profile view of self ─────────────────────────────────────
    if (profileId) {
      const r12 = await api('GET', `/profile/${profileId}/public`, { token: user.token });
      assert('T12-PUBLIC-PROFILE', r12.status === 200 && !!r12.data?.data,
        'GET /profile/:profileId/public returns a profile', { status: r12.status });
    }

    // ── T13: unauthenticated requests are rejected ───────────────────────────
    const r13a = await api('GET', '/profile/me', {});
    assert('T13A-GET-ME-401', r13a.status === 401, 'GET /profile/me with no token → 401', r13a.data);
    const r13b = await api('PUT', '/profile/me', { body: { display_name: 'Should be rejected' } });
    assert('T13B-UPDATE-401', r13b.status === 401, 'PUT /profile/me with no token → 401', r13b.data);

    // ── Cleanup: restore original profile fields ─────────────────────────────
    const restore = await api('PUT', '/profile/me', {
      token: user.token,
      body: {
        display_name: original.display_name || 'Pinky',
        bio: original.bio ?? '',
        city: original.city ?? '',
      },
    });
    assert('T14-CLEANUP', restore.status === 200, 'Original profile fields restored after the run', { display_name: restore.data?.data?.display_name });
    if (original.avatar_url) {
      await api('PATCH', '/profile/me/avatar', { token: user.token, body: { avatar_url: original.avatar_url } });
    }

  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
