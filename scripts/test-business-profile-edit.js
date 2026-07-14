// scripts/test-business-profile-edit.js
// Tests the POST /businesses/register endpoint (upsert) used by the edit business profile flow.
//
//   OWNER_EMAIL / OWNER_PASSWORD    — business owner account
//   CUSTOMER_EMAIL / CUSTOMER_PASS  — customer account (no business profile) [optional]
//
// Scenarios:
//   1. PASS — valid update succeeds, response contains updated fields
//   2. INFO — non-owner (customer) calling register creates a new business rather than erroring
//   3. FAIL — invalid category_id rejected by FK constraint
//   4. FAIL — malformed opening_hours time format rejected by Joi

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE            = 'http://localhost:3000';
const OWNER_EMAIL     = process.env.OWNER_EMAIL    || 'smith@test.com';
const OWNER_PASS      = process.env.OWNER_PASSWORD || 'Smith123#';
const CUSTOMER_EMAIL  = process.env.CUSTOMER_EMAIL || 'pinky@test.com';
const CUSTOMER_PASS   = process.env.CUSTOMER_PASSWORD || 'Pinky123#';

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
  return { ok: res.ok, status: res.status, token: data?.data?.accessToken ?? '' };
}

async function registerBusiness(token, payload) {
  const res = await fetch(`${BASE}/businesses/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data: data?.data, error: data?.error, raw: data };
}

async function getMyBusiness(token) {
  const res = await fetch(`${BASE}/businesses/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { ok: res.ok, biz: data?.data };
}

async function getFirstCategory(token) {
  const res = await fetch(`${BASE}/categories/business`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const cats = data?.data ?? [];
  return cats.length > 0 ? cats[0] : null;
}

async function run() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  TouchPoints — Business Profile Edit (POST /register)');
  console.log('══════════════════════════════════════════════════════');

  // ── Login as business owner ──────────────────────────────────
  log(0, 'INFO', `Login as owner: ${OWNER_EMAIL}`);
  const { ok: ownerOk, token: ownerToken } = await loginUser(OWNER_EMAIL, OWNER_PASS);
  if (!ownerOk || !ownerToken) {
    log(0, 'FAIL', `Login failed for ${OWNER_EMAIL}`);
    process.exit(1);
  }
  log(0, 'PASS', 'Owner login succeeded');
  passed++;

  // Fetch existing business to get current values
  const { biz } = await getMyBusiness(ownerToken);
  if (!biz) {
    log(0, 'FAIL', 'Owner has no existing business — cannot test update path');
    process.exit(1);
  }
  log(0, 'INFO', `Existing business: ${biz.name} (id: ${biz.id})`);

  // Fetch a valid category id
  const category = await getFirstCategory(ownerToken);
  if (!category) {
    log(0, 'FAIL', 'No categories returned from GET /categories/business — cannot proceed');
    process.exit(1);
  }
  log(0, 'INFO', `Using category: ${category.name} (${category.id})`);

  const validHours = [0, 1, 2, 3, 4, 5, 6].map(d => ({
    day_of_week: d,
    open_time: '09:00',
    close_time: '17:30',
    is_closed: d === 0,
  }));

  // ── Test 1: Valid update ──────────────────────────────────────
  console.log('\n── Test 1: Valid update ──');
  const updatedName = `Test Business ${Date.now()}`;
  const t1 = await registerBusiness(ownerToken, {
    business_name: updatedName,
    category_id: category.id,
    business_type: biz.business_type ?? 'goodwill',
    description: 'Updated description for testing.',
    phone: '+1 555 000 1234',
    website: 'https://testbusiness.example.com',
    address: '456 Updated Ave',
    hours: validHours,
    inhouse_referral: false,
  });

  assert('1a', t1.ok && t1.status === 201, `POST /register returned 201 (got ${t1.status})`, t1.raw);
  assert('1b', t1.data?.name === updatedName, `Response name matches updated value "${updatedName}"`, t1.data);
  assert('1c', t1.data?.id === biz.id, `Same business id returned (not a new business)`, { returned: t1.data?.id, expected: biz.id });

  // Confirm the update persisted
  const { biz: refreshed } = await getMyBusiness(ownerToken);
  assert('1d', refreshed?.name === updatedName, `GET /businesses/me reflects updated name`, { got: refreshed?.name, expected: updatedName });

  // Restore original name so the test is non-destructive
  await registerBusiness(ownerToken, {
    business_name: biz.name,
    category_id: category.id,
    business_type: biz.business_type ?? 'goodwill',
    description: biz.description ?? '',
    phone: biz.phone ?? '',
    website: biz.website ?? '',
    address: biz.address ?? '',
    inhouse_referral: false,
  });
  log('1e', 'INFO', 'Restored original business name');

  // ── Test 2: Customer calling register (non-owner) ─────────────
  console.log('\n── Test 2: Non-owner (customer) calling register ──');
  const { ok: custOk, token: custToken } = await loginUser(CUSTOMER_EMAIL, CUSTOMER_PASS);
  if (!custOk || !custToken) {
    log('2', 'INFO', `Customer login failed for ${CUSTOMER_EMAIL} — skipping non-owner test`);
  } else {
    const { biz: custBiz } = await getMyBusiness(custToken);
    if (custBiz) {
      log('2', 'INFO', `Customer account already has a business (${custBiz.name}) — non-owner test not applicable`);
    } else {
      // Customer has no business — calling register will create a new one, NOT affect owner's business
      log('2', 'INFO', 'Customer has no business — verifying POST /register does not touch owner business');
      const t2 = await registerBusiness(custToken, {
        business_name: 'Temp Customer Biz',
        category_id: category.id,
        business_type: 'goodwill',
        inhouse_referral: false,
      });
      // Should create a new business for the customer, not update the owner's
      const { biz: ownerCheck } = await getMyBusiness(ownerToken);
      assert('2', ownerCheck?.name === biz.name, `Owner business unchanged after customer's register call`, {
        ownerBizName: ownerCheck?.name,
        customerBizId: t2.data?.id,
      });
    }
  }

  // ── Test 3: Invalid category_id (FK constraint) ───────────────
  console.log('\n── Test 3: Invalid category_id ──');
  const t3 = await registerBusiness(ownerToken, {
    business_name: biz.name,
    category_id: '00000000-0000-0000-0000-000000000000',
    business_type: biz.business_type ?? 'goodwill',
    inhouse_referral: false,
  });
  assert('3a', !t3.ok, `POST /register with nonexistent category_id returns error (got ${t3.status})`, t3.raw);
  assert('3b', t3.status >= 400, `Status is 4xx or 5xx for invalid category (got ${t3.status})`);

  // ── Test 4: Malformed opening_hours time format ───────────────
  console.log('\n── Test 4: Malformed opening_hours time format ──');
  const t4 = await registerBusiness(ownerToken, {
    business_name: biz.name,
    category_id: category.id,
    business_type: biz.business_type ?? 'goodwill',
    inhouse_referral: false,
    hours: [{ day_of_week: 1, open_time: 'bad', close_time: '18:00', is_closed: false }],
  });
  assert('4a', !t4.ok, `POST /register with bad open_time returns error (got ${t4.status})`, t4.raw);
  assert('4b', t4.status === 400, `Status is 400 (Joi validation) for malformed time (got ${t4.status})`);

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n💥 Unhandled error:', err.message);
  process.exit(1);
});
