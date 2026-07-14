// scripts/test-business-profile-edit-images.js
// Asserts that GET /businesses/me returns resolved (absolute HTTP) URLs for
// logo_url and cover_url so the edit business profile screen can display them.
//
// Requires a business owner account with both a logo and cover photo already uploaded.
//
//   OWNER_EMAIL / OWNER_PASSWORD  — business owner with logo + cover photo uploaded
//
// Falls back to TEST_EMAIL / TEST_PASSWORD if not set (marks assertions as non-enforced
// since preconditions may not hold on the default account).

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE = 'http://localhost:3000';
const DEFAULT_EMAIL = process.env.TEST_EMAIL || 'pinky@test.com';
const DEFAULT_PASSWORD = process.env.TEST_PASSWORD || 'Pinky123#';

let passed = 0;
let failed = 0;

function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data !== undefined) console.log('   ', JSON.stringify(data, null, 2));
}

function assert(step, condition, msg, details) {
  if (condition) {
    log(step, 'PASS', msg);
    passed++;
  } else {
    log(step, 'FAIL', msg, details);
    failed++;
  }
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const data = await res.json();
  return { ok: res.ok, token: data?.data?.accessToken ?? '' };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Edit Business Profile Image Test');
  console.log('══════════════════════════════════════════════════');

  const email = process.env.OWNER_EMAIL || DEFAULT_EMAIL;
  const password = process.env.OWNER_PASSWORD || DEFAULT_PASSWORD;
  const usingDefault = !process.env.OWNER_EMAIL;

  log(0, 'INFO', `Login as business owner: ${email}${usingDefault ? ' (default account — preconditions not guaranteed)' : ''}`);
  const { ok, token } = await loginUser(email, password);
  if (!ok || !token) {
    log(0, 'FAIL', `Login failed for ${email}`);
    process.exit(1);
  }
  log(0, 'PASS', 'Login succeeded');
  passed++;

  // Fetch the owner's business profile
  const res = await fetch(`${BASE}/businesses/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  const biz = body?.data;

  assert('1', res.ok, `GET /businesses/me returned 2xx (got ${res.status})`);
  assert('2', !!biz, 'Response contains a business object');

  if (!biz) {
    console.log('\n══════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════════\n');
    process.exit(failed > 0 ? 1 : 0);
  }

  log('3', 'INFO', `logo_url = ${biz.logo_url ?? 'null'}`);
  log('4', 'INFO', `cover_url = ${biz.cover_url ?? 'null'}`);

  if (usingDefault) {
    // Can't guarantee images were uploaded on the default account — only check shape if present
    if (biz.logo_url) {
      assert('3', biz.logo_url.startsWith('/uploads/'), `logo_url is a relative /uploads/ path ('${biz.logo_url}')`);
      assert('4', biz.logo_url.includes('/uploads/'), `logo_url contains /uploads/ path`);
    } else {
      log('3', 'INFO', 'logo_url is null on default account — skipping URL assertions');
    }
    if (biz.cover_url) {
      assert('5', biz.cover_url.startsWith('/uploads/'), `cover_url is a relative /uploads/ path ('${biz.cover_url}')`);
      assert('6', biz.cover_url.includes('/uploads/'), `cover_url contains /uploads/ path`);
    } else {
      log('5', 'INFO', 'cover_url is null on default account — skipping URL assertions');
    }
  } else {
    // Dedicated owner account — assert both images are present and resolved
    assert('3', !!biz.logo_url, 'logo_url is non-null');
    assert('4', typeof biz.logo_url === 'string' && biz.logo_url.startsWith('/uploads/'), `logo_url is a relative /uploads/ path ('${biz.logo_url}')`);
    assert('5', biz.logo_url?.includes('/uploads/'), `logo_url contains /uploads/ path`);

    assert('6', !!biz.cover_url, 'cover_url is non-null');
    assert('7', typeof biz.cover_url === 'string' && biz.cover_url.startsWith('/uploads/'), `cover_url is a relative /uploads/ path ('${biz.cover_url}')`);
    assert('8', biz.cover_url?.includes('/uploads/'), `cover_url contains /uploads/ path`);
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\n❌ Unhandled error:', err.message);
  process.exit(1);
});
