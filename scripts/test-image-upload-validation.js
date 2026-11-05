// scripts/test-image-upload-validation.js
// Image upload validation — end-to-end test for the shared upload chokepoint
// (backend/src/config/storage.js's uploadFileToGCS), exercised here via the business
// cover-photo route (POST /businesses/:id/photo). Since every upload-handling module
// (business, posts, events, offers, businessMedia, profile) funnels through the same
// uploadFileToGCS function, this one route's behavior stands in for all of them.
//
// Covers (bugs found + fixed in the 2026-11 image-handling QA pass):
//   - TC-IMG-009: a 0-byte/corrupted file must be rejected (400), not silently accepted
//   - A valid small image must still succeed (sanity check — makes sure the fix didn't
//     also start rejecting good files)
//   - An oversized file (>10MB) must be rejected (400) by the route's multer limit
//
// Prerequisites:
//   - Backend running on BASE_URL (defaults to deployed Cloud Run URL)
//   - TEST_EMAIL / TEST_PASSWORD: a BUSINESS OWNER account (this script uploads to —
//     and then resets — that business's own cover photo, so use a test business)
//
// Run: node scripts/test-image-upload-validation.js

// Uses Node's own built-in fetch/FormData/Blob (not node-fetch) — multipart file uploads need
// FormData and the fetch implementation to agree on how to serialize it, and node-fetch's
// FormData is a different class than Node's global one.
const BASE     = process.env.TEST_BASE_URL || 'https://touchpoints-backend-495493629048.asia-south1.run.app';
const EMAIL    = process.env.TEST_EMAIL    || 'e2e.f.happy+1785935283403@example.com';
const PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!';

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
    body: formData ? formData : (body ? JSON.stringify(body) : undefined),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

async function login(email, password) {
  const r = await api('POST', '/auth/login', { body: { identifier: email, password } });
  return { ok: r.ok, token: r.data?.data?.accessToken };
}

// A minimal but genuinely valid 1x1 transparent PNG (67 bytes) — real decodable image bytes,
// not just an arbitrary non-empty buffer, so this is a meaningful "valid upload" case.
const VALID_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function uploadForm(buffer, filename, mimeType) {
  const form = new FormData();
  form.append('photo', new Blob([buffer], { type: mimeType }), filename);
  return form;
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Image Upload Validation Test');
  console.log('══════════════════════════════════════════════════');

  try {
    // ── T0: Login + find own business ──────────────────────────────────────
    const owner = await login(EMAIL, PASSWORD);
    assert('T0-LOGIN', owner.ok && owner.token, 'Owner login succeeds');
    if (!owner.token) { console.log('\n❌ Cannot continue without owner'); process.exit(1); }

    const me = await api('GET', '/businesses/me', { token: owner.token });
    const businessId = me.data?.data?.id;
    assert('T0-BUSINESS', me.status === 200 && !!businessId, 'Owner has a business to test against', me.data);
    if (!businessId) { console.log('\n❌ Cannot continue without a business'); process.exit(1); }

    // Remember prior photo so we can tell a rejected upload really didn't change anything.
    const coverBefore = me.data?.data?.coverUrl ?? me.data?.data?.cover_url ?? null;

    // ── T1: a valid small image is accepted (sanity — the fix shouldn't break good files) ──
    const validBuffer = Buffer.from(VALID_PNG_BASE64, 'base64');
    const r1 = await api('POST', `/businesses/${businessId}/photo`, {
      token: owner.token,
      formData: uploadForm(validBuffer, 'valid.png', 'image/png'),
    });
    assert('T1-VALID-ACCEPTED', r1.status === 200 && typeof (r1.data?.data?.coverUrl ?? r1.data?.data?.cover_url) === 'string',
      'A genuinely valid small PNG is accepted → 200 with a new cover URL', r1.data);

    // ── T2: a 0-byte file is rejected (the bug fixed this session — TC-IMG-009) ──
    const r2 = await api('POST', `/businesses/${businessId}/photo`, {
      token: owner.token,
      formData: uploadForm(Buffer.alloc(0), 'empty.jpg', 'image/jpeg'),
    });
    assert('T2-EMPTY-REJECTED', r2.status === 400 && /empty|corrupt/i.test(r2.data?.error || ''),
      '0-byte file → 400 "Uploaded file is empty or corrupted." (not silently accepted)', r2.data);

    // Confirm the rejected upload did NOT change the business's real cover photo.
    const meAfterEmpty = await api('GET', '/businesses/me', { token: owner.token });
    const coverAfterEmpty = meAfterEmpty.data?.data?.coverUrl ?? meAfterEmpty.data?.data?.cover_url ?? null;
    assert('T2-NO-CORRUPTION', coverAfterEmpty !== null && coverAfterEmpty === (r1.data?.data?.coverUrl ?? r1.data?.data?.cover_url),
      'Rejected empty-file upload left the last valid cover photo untouched', { coverAfterEmpty });

    // ── T3: an oversized file (>10MB) is rejected by the route's multer limit ──
    const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024, 1); // 11MB of non-zero bytes
    const r3 = await api('POST', `/businesses/${businessId}/photo`, {
      token: owner.token,
      formData: uploadForm(oversizedBuffer, 'oversized.jpg', 'image/jpeg'),
    });
    assert('T3-OVERSIZED-REJECTED', r3.status === 400 && /large/i.test(r3.data?.error || ''),
      '11MB file → 400 "File is too large." (10MB multer limit enforced)', r3.data);

    // ── T4: unauthenticated upload is rejected ─────────────────────────────
    const r4 = await api('POST', `/businesses/${businessId}/photo`, {
      formData: uploadForm(validBuffer, 'valid.png', 'image/png'),
    });
    assert('T4-UNAUTH-401', r4.status === 401, 'Upload with no token → 401', r4.data);

    // ── Cleanup: remove the test photo so this script leaves no visible trace ──
    const cleanup = await api('DELETE', `/businesses/${businessId}/photo`, { token: owner.token });
    assert('T5-CLEANUP', cleanup.status === 200, 'Test photo removed after the run (cleanup)', cleanup.data);

  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
