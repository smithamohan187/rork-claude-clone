// scripts/test-marketplace-invite-business.js
// Marketplace / Invite a Business — end-to-end test
// Sequential: login first, then test POST/GET endpoints with PASS/FAIL reporting

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE     = 'http://localhost:3000';
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

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const data = await res.json();
  return { ok: res.ok, token: data?.data?.accessToken };
}

async function postInvite(token, body) {
  const res = await fetch(`${BASE}/marketplace/invite-business`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function getInvites(token) {
  const res = await fetch(`${BASE}/marketplace/invite-business`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Marketplace Invite-a-Business Test');
  console.log('══════════════════════════════════════════════════');

  // ── T0: Login ──────────────────────────────────────────────────────────────
  const loginRes = await login(EMAIL, PASSWORD);
  assert('T0-LOGIN', loginRes.ok && loginRes.token, 'Personal profile login succeeds');
  const token = loginRes.token;
  if (!token) { console.log('\n❌ Cannot continue without auth token'); process.exit(1); }

  // ── T1: POST sms invite — new row created ────────────────────────────────
  const smsPhone = '+353861234567';
  const r1 = await postInvite(token, {
    business_name:  'Joe\'s Coffee Shop',
    contact_name:   'Joe Smith',
    contact_method: 'sms',
    contact_value:  smsPhone,
  });
  assert('T1-SMS-INVITE', r1.status === 201
    && r1.data?.data?.invite?.status === 'pending'
    && r1.data?.data?.invite?.is_lead === true
    && typeof r1.data?.data?.invite?.invite_code === 'string',
    `POST sms invite → 201, status=pending, is_lead=true, invite_code present`,
    r1.data,
  );

  // ── T2: POST duplicate (same contact_value, same inviter) ──────────────────
  const r2 = await postInvite(token, {
    business_name:  'Joe\'s Coffee Shop Again',
    contact_name:   'Joe Smith',
    contact_method: 'sms',
    contact_value:  smsPhone, // same phone — should conflict
  });
  assert('T2-DUPLICATE', r2.status === 200 && r2.data?.data?.duplicate === true,
    `POST duplicate sms invite → 200 + duplicate:true (ON CONFLICT DO NOTHING)`,
    r2.data,
  );

  // Verify no duplicate row was created by checking invite count stays at 1 for this phone
  const afterDup = await getInvites(token);
  const smsInvites = (afterDup.data?.data?.invites ?? []).filter(i => i.contact_value === smsPhone);
  assert('T2-NO-DUP-ROW', smsInvites.length === 1,
    `Invite list still has exactly 1 row for the duplicate contact_value`,
    { count: smsInvites.length },
  );

  // ── T3: POST email invite ──────────────────────────────────────────────────
  const r3 = await postInvite(token, {
    business_name:  'Mary\'s Bakery',
    contact_name:   'Mary',
    contact_method: 'email',
    contact_value:  'mary@bakery.ie',
  });
  assert('T3-EMAIL-INVITE', r3.status === 201 && r3.data?.data?.invite?.contact_method === 'email',
    `POST email invite → 201`,
    r3.data,
  );

  // ── T4: POST whatsapp invite ───────────────────────────────────────────────
  const r4 = await postInvite(token, {
    business_name:  'Pete\'s Pub',
    contact_name:   'Pete',
    contact_method: 'whatsapp',
    contact_value:  '+353871112222',
  });
  assert('T4-WHATSAPP-INVITE', r4.status === 201 && r4.data?.data?.invite?.contact_method === 'whatsapp',
    `POST whatsapp invite → 201`,
    r4.data,
  );

  // ── T5: POST link invite (no contact_value) ────────────────────────────────
  const r5 = await postInvite(token, {
    business_name:  'Generic Shop',
    contact_method: 'link',
  });
  assert('T5-LINK-INVITE', r5.status === 201 && r5.data?.data?.invite?.contact_method === 'link',
    `POST link invite (no contact_value) → 201`,
    r5.data,
  );

  // ── T6: GET invite list — all non-duplicate invites returned ──────────────
  const listRes = await getInvites(token);
  const invites = listRes.data?.data?.invites ?? [];
  assert('T6-LIST', listRes.ok && Array.isArray(invites) && invites.length >= 4,
    `GET /marketplace/invite-business → ${invites.length} invites (≥4 expected), all status=pending`,
    { count: invites.length, statuses: invites.map(i => i.status) },
  );
  const allPending = invites.every(i => i.status === 'pending');
  assert('T6-STATUSES', allPending,
    `All returned invites have status='pending'`,
  );

  // ── T7: POST missing business_name → 400 ──────────────────────────────────
  const r7 = await postInvite(token, {
    contact_method: 'sms',
    contact_value:  '+353889998888',
  });
  assert('T7-MISSING-NAME', r7.status === 400,
    `POST missing business_name → 400 (got ${r7.status})`,
    r7.data,
  );

  // ── T8: POST invalid contact_method → 400 ─────────────────────────────────
  const r8 = await postInvite(token, {
    business_name:  'Some Shop',
    contact_method: 'carrier_pigeon',
    contact_value:  '+353001234567',
  });
  assert('T8-BAD-METHOD', r8.status === 400,
    `POST invalid contact_method 'carrier_pigeon' → 400 (got ${r8.status})`,
    r8.data,
  );

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
  console.log('══════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
