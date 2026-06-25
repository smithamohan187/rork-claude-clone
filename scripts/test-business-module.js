// scripts/test-business-module.js
const BASE     = 'http://localhost:3000';
const fs       = require('fs');
const path     = require('path');
const FormData = require('form-data');
const fetch    = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

async function run() {
  let token      = '';
  let businessId = '';

  // ── Step 1: Login ──────────────────────────────────────────────
  console.log('\n[1] Logging in...');
  const loginRes  = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'pinky@test.com', password: 'Pinky123#' }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) { console.error('[1] FAIL login:', loginData); return; }
  // Response shape: { success, data: { accessToken, refreshToken, user }, error }
  token = loginData.data?.accessToken;
  console.log('[1] PASS login — token received:', !!token);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Step 2: Register business ──────────────────────────────────
  console.log('\n[2] Registering business...');
  const registerRes  = await fetch(`${BASE}/businesses/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      business_name:  'Test Business',
      business_type:  'incentivised',
      category_id:    'b2f897a0-5d0a-4daa-9d29-1108571a8575',
      description:    'A test business',
      phone:          '1234567890',
      website:        'https://test.com',
      address:        '123 Test St',
      city:           'Test City',
      state:          'Test State',
      country:        'Test Country',
      inhouse_referral: false,
      // inhouse_referral_url must be omitted when false — Joi.string() rejects null
      hours: [
        // day_of_week: 0=Sun … 6=Sat | is_closed replaces is_open (inverted)
        { day_of_week: 0, is_closed: true },
        { day_of_week: 1, is_closed: false, open_time: '09:00', close_time: '17:00' },
        { day_of_week: 2, is_closed: false, open_time: '09:00', close_time: '17:00' },
        { day_of_week: 3, is_closed: true },
        { day_of_week: 4, is_closed: false, open_time: '09:00', close_time: '17:00' },
        { day_of_week: 5, is_closed: false, open_time: '09:00', close_time: '17:00' },
        { day_of_week: 6, is_closed: true },
      ],
    }),
  });
  const registerData = await registerRes.json();
  if (!registerRes.ok) { console.error('[2] FAIL register:', registerData); return; }
  businessId = registerData.data?.id;
  console.log('[2] PASS register — businessId:', businessId);

  // ── Step 3: Upsert guard — register again, must return same id ─
  console.log('\n[3] Testing upsert guard...');
  const upsertRes  = await fetch(`${BASE}/businesses/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      business_name:    'Test Business Updated',
      business_type:    'incentivised',
      category_id:      'b2f897a0-5d0a-4daa-9d29-1108571a8575',
      description:      'Updated description',
      phone:            '1234567890',
      website:          'https://test.com',
      address:          '123 Test St',
      city:             'Test City',
      state:            'Test State',
      country:          'Test Country',
      inhouse_referral: false,
      hours:            [],
    }),
  });
  const upsertData = await upsertRes.json();
  if (!upsertRes.ok) {
    console.error('[3] FAIL upsert guard:', upsertData);
  } else {
    const upsertId = upsertData.data?.id;
    if (upsertId === businessId) {
      console.log('[3] PASS upsert guard — same id returned, no duplicate created');
    } else {
      console.error('[3] FAIL upsert guard — new id created:', { original: businessId, new: upsertId });
    }
  }

  // ── Step 4: Logo upload ────────────────────────────────────────
  console.log('\n[4] Uploading logo...');
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  if (!fs.existsSync(testImagePath)) {
    // Minimal valid JPEG (22 bytes)
    fs.writeFileSync(testImagePath, Buffer.from([
      0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,
      0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xff,0xd9,
    ]));
  }
  const logoForm = new FormData();
  logoForm.append('logo', fs.createReadStream(testImagePath), { filename: 'test-logo.jpg', contentType: 'image/jpeg' });
  const logoRes  = await fetch(`${BASE}/businesses/${businessId}/logo`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, ...logoForm.getHeaders() },
    body:    logoForm,
  });
  const logoData = await logoRes.json();
  if (!logoRes.ok) console.error('[4] FAIL logo upload:', logoData);
  else             console.log('[4] PASS logo upload — url:', logoData.data?.logo_url);

  // ── Step 5: Cover photo upload ─────────────────────────────────
  console.log('\n[5] Uploading cover photo...');
  const photoForm = new FormData();
  photoForm.append('photo', fs.createReadStream(testImagePath), { filename: 'test-photo.jpg', contentType: 'image/jpeg' });
  const photoRes  = await fetch(`${BASE}/businesses/${businessId}/photo`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, ...photoForm.getHeaders() },
    body:    photoForm,
  });
  const photoData = await photoRes.json();
  if (!photoRes.ok) console.error('[5] FAIL photo upload:', photoData);
  // Response field is cover_url (not photo_url)
  else              console.log('[5] PASS photo upload — url:', photoData.data?.cover_url);

  // ── Step 6: Complete onboarding ───────────────────────────────
  console.log('\n[6] Completing onboarding...');
  const onboardRes  = await fetch(`${BASE}/businesses/${businessId}/onboarding-complete`, {
    method: 'PATCH',
    headers,
  });
  const onboardData = await onboardRes.json();
  if (!onboardRes.ok) console.error('[6] FAIL onboarding:', onboardData);
  else                console.log('[6] PASS onboarding complete');

  // ── Step 7: Validation — missing required fields ───────────────
  console.log('\n[7] Testing validation — empty body...');
  const valRes  = await fetch(`${BASE}/businesses/register`, {
    method: 'POST', headers, body: JSON.stringify({}),
  });
  const valData = await valRes.json();
  if (valRes.status === 400) console.log('[7] PASS validation — 400 returned:', valData.error);
  else                       console.error('[7] FAIL validation — expected 400, got:', valRes.status, valData);

  console.log('\n── Test run complete ──\n');
}

run().catch(err => console.error('Unhandled error:', err));
