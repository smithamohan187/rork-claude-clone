/**
 * Test script: Dynamic Rewards Redemption lifecycle.
 *
 * Prerequisites:
 *   - Backend running on BASE_URL
 *   - Migration 008_coupons_redemption.sql applied
 *   - BUSINESS_ID_A has at least one reward in rewards_catalog (is_active=TRUE)
 *   - TEST_EMAIL user has enough points for at least one reward in BUSINESS_ID_A
 *   - A second reward exists in BUSINESS_ID_A with points_required > user's balance (for test 4)
 *     OR run test 4 with a very high points reward
 *
 * To simulate expiry in test 5, run:
 *   UPDATE coupons SET expires_at = NOW() - INTERVAL '1 second' WHERE id = '<couponId>';
 *
 * Run: node scripts/test-rewards-redemption.js
 */

const BASE_URL        = process.env.BASE_URL        || 'http://192.168.1.4:3000';
const EMAIL           = process.env.TEST_EMAIL       || 'pinky@test.com';
const PASSWORD        = process.env.TEST_PASSWORD    || 'Pinky123#';
const BUSINESS_ID_A   = process.env.BUSINESS_ID_A   || '10c365c7-547d-4004-b431-f601ef69d44d';

let token = '';
let passed = 0;
let failed = 0;
let redeemableCouponId = null;  // coupon created in test 3, used in tests 5 & 6
let freshCouponId = null;       // coupon created in test 7 (used for confirm-use test)

function pass(label) {
  console.log(`  PASS  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

async function req(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

async function getBalance() {
  const { body } = await req('GET', '/points/summary');
  const biz = body.data?.breakdown?.find(b => b.businessId === BUSINESS_ID_A);
  return biz?.points ?? 0;
}

async function login() {
  console.log('\n[1] Login');
  const { status, body } = await req('POST', '/auth/login', { identifier: EMAIL, password: PASSWORD });
  if (status === 200 && body.data?.accessToken) {
    token = body.data.accessToken;
    pass('Login succeeded');
  } else {
    fail('Login', `status=${status}`);
    process.exit(1);
  }
}

async function testRewardsList() {
  console.log('\n[2] GET /businesses/:id/rewards — shape and affordable flag');
  const { status, body } = await req('GET', `/businesses/${BUSINESS_ID_A}/rewards`);
  if (status !== 200 || !body.data?.rewards) {
    fail('GET rewards', `status=${status} body=${JSON.stringify(body)}`);
    return;
  }
  const rewards = body.data.rewards;
  if (!Array.isArray(rewards)) {
    fail('rewards is not an array', JSON.stringify(rewards));
    return;
  }
  pass(`Rewards list returned (${rewards.length} items)`);

  const hasShape = rewards.every(r =>
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.pointsRequired === 'number' &&
    typeof r.affordable === 'boolean'
  );
  if (hasShape) {
    pass('All reward items have id, name, pointsRequired, affordable fields');
  } else {
    fail('Reward item missing required fields', JSON.stringify(rewards[0]));
  }

  const balance = await getBalance();
  const expectAffordable = rewards.filter(r => r.pointsRequired <= balance);
  const expectNot        = rewards.filter(r => r.pointsRequired > balance);
  const affordableMismatch = expectAffordable.filter(r => !r.affordable).length;
  const notMismatch        = expectNot.filter(r => r.affordable).length;
  if (affordableMismatch === 0 && notMismatch === 0) {
    pass(`affordable flag correct for all rewards (balance=${balance})`);
  } else {
    fail('affordable flag mismatch', `${affordableMismatch} should-be-true wrong, ${notMismatch} should-be-false wrong`);
  }
}

async function testRedeem() {
  console.log('\n[3] Redeem an affordable reward — coupon created, points deducted');
  const { body: rwBody } = await req('GET', `/businesses/${BUSINESS_ID_A}/rewards`);
  const rewards = rwBody.data?.rewards ?? [];
  const affordable = rewards.find(r => r.affordable);
  if (!affordable) {
    console.log('    INFO  No affordable reward for this user — skipping test 3');
    return;
  }

  const balanceBefore = await getBalance();
  const { status, body } = await req('POST', `/businesses/${BUSINESS_ID_A}/rewards/${affordable.id}/redeem`, {});

  if (status !== 201 || !body.data?.couponId) {
    fail('POST redeem', `status=${status} body=${JSON.stringify(body)}`);
    return;
  }
  const result = body.data;
  redeemableCouponId = result.couponId;

  pass(`Coupon created id=${result.couponId}`);
  const expiresInMs = result.expiresAt - Date.now();
  const approx30min = expiresInMs > 28 * 60 * 1000 && expiresInMs < 32 * 60 * 1000;
  if (approx30min) {
    pass(`expiresAt is ~30 minutes from now (${Math.round(expiresInMs / 60000)} min)`);
  } else {
    fail('expiresAt not ~30 minutes', `diff=${Math.round(expiresInMs / 60000)} min`);
  }

  const balanceAfter = await getBalance();
  const expected = balanceBefore - affordable.pointsRequired;
  if (balanceAfter === expected) {
    pass(`Balance reduced: ${balanceBefore} → ${balanceAfter} (deducted ${affordable.pointsRequired})`);
  } else {
    fail('Balance mismatch after redeem', `expected ${expected}, got ${balanceAfter}`);
  }

  console.log(`    INFO  Coupon ID for expiry test: ${redeemableCouponId}`);
  console.log(`    INFO  To expire it: UPDATE coupons SET expires_at = NOW() - INTERVAL '1 second' WHERE id = '${redeemableCouponId}';`);
}

async function testInsufficientPoints() {
  console.log('\n[4] Redeem with insufficient points — server must reject (bypass UI)');
  const { body: rwBody } = await req('GET', `/businesses/${BUSINESS_ID_A}/rewards`);
  const rewards = rwBody.data?.rewards ?? [];
  const notAffordable = rewards.find(r => !r.affordable);
  if (!notAffordable) {
    console.log('    INFO  All rewards are affordable for this user — skipping test 4');
    console.log('    INFO  Add a reward with points_required > current balance to exercise this path');
    return;
  }

  const balanceBefore = await getBalance();
  const { status, body } = await req('POST', `/businesses/${BUSINESS_ID_A}/rewards/${notAffordable.id}/redeem`, {});

  if (status === 402) {
    pass(`Server rejected with 402 (insufficient points)`);
  } else {
    fail('Expected 402', `got status=${status} body=${JSON.stringify(body)}`);
  }

  const balanceAfter = await getBalance();
  if (balanceAfter === balanceBefore) {
    pass('Balance unchanged after failed redeem');
  } else {
    fail('Balance changed after failed redeem', `before=${balanceBefore} after=${balanceAfter}`);
  }
}

async function testCouponExpiry() {
  console.log('\n[5] Expire-check — status flips and refund written (requires manual DB update)');
  if (!redeemableCouponId) {
    console.log('    INFO  No coupon from test 3 — skipping test 5');
    return;
  }
  console.log(`    INFO  Run this SQL first: UPDATE coupons SET expires_at = NOW() - INTERVAL '1 second' WHERE id = '${redeemableCouponId}';`);
  console.log('    INFO  Then press Enter to continue...');
  await new Promise(r => process.stdin.once('data', r));
  process.stdin.resume();

  const balanceBefore = await getBalance();
  const { status, body } = await req('POST', `/coupons/${redeemableCouponId}/expire-check`, {});

  if (status === 200 && body.data?.expired === true) {
    pass('expire-check returned expired:true');
  } else if (status === 200 && body.data?.expired === false) {
    fail('expired:false — did you update expires_at?', JSON.stringify(body.data));
    return;
  } else {
    fail('expire-check failed', `status=${status} body=${JSON.stringify(body)}`);
    return;
  }

  const balanceAfter = await getBalance();
  if (balanceAfter > balanceBefore) {
    pass(`Balance restored after refund: ${balanceBefore} → ${balanceAfter}`);
  } else {
    fail('Balance not restored after refund', `before=${balanceBefore} after=${balanceAfter}`);
  }
}

async function testIdempotentExpiry() {
  console.log('\n[6] Expire-check second call — no duplicate refund');
  if (!redeemableCouponId) {
    console.log('    INFO  No coupon from test 3 — skipping test 6');
    return;
  }

  const balanceBefore = await getBalance();
  const { status, body } = await req('POST', `/coupons/${redeemableCouponId}/expire-check`, {});

  if (status === 200 && body.data?.expired === false) {
    pass('Second expire-check returned expired:false (idempotent)');
  } else {
    fail('Second expire-check unexpected response', `status=${status} expired=${body.data?.expired}`);
  }

  const balanceAfter = await getBalance();
  if (balanceAfter === balanceBefore) {
    pass('Balance unchanged on second expire-check (no duplicate refund)');
  } else {
    fail('Balance changed on second expire-check — duplicate refund!', `before=${balanceBefore} after=${balanceAfter}`);
  }
}

async function testMarkUsed() {
  console.log('\n[7] Mark coupon used before expiry — status=used, no additional points transaction');
  const { body: rwBody } = await req('GET', `/businesses/${BUSINESS_ID_A}/rewards`);
  const rewards = rwBody.data?.rewards ?? [];
  const affordable = rewards.find(r => r.affordable);
  if (!affordable) {
    console.log('    INFO  No affordable reward — skipping test 7');
    return;
  }

  const { status: redeemStatus, body: redeemBody } = await req(
    'POST', `/businesses/${BUSINESS_ID_A}/rewards/${affordable.id}/redeem`, {}
  );
  if (redeemStatus !== 201) {
    fail('Redeem for mark-used test failed', `status=${redeemStatus}`);
    return;
  }
  freshCouponId = redeemBody.data.couponId;
  const balanceAfterRedeem = await getBalance();

  const { status, body } = await req('POST', `/coupons/${freshCouponId}/use`, {});
  if (status === 200 && body.data?.coupon?.status === 'used') {
    pass(`Coupon marked used (id=${freshCouponId})`);
  } else {
    fail('Mark used failed', `status=${status} body=${JSON.stringify(body)}`);
    return;
  }

  const balanceAfterUse = await getBalance();
  if (balanceAfterUse === balanceAfterRedeem) {
    pass('Balance unchanged after mark-used (no extra deduction)');
  } else {
    fail('Balance changed after mark-used', `before=${balanceAfterRedeem} after=${balanceAfterUse}`);
  }
}

async function testDoubleUseAndExpiredReject() {
  console.log('\n[8] Attempt to use/expire already-processed coupons — server must reject');
  if (!freshCouponId && !redeemableCouponId) {
    console.log('    INFO  No coupons available — skipping test 8');
    return;
  }

  if (freshCouponId) {
    const { status } = await req('POST', `/coupons/${freshCouponId}/use`, {});
    if (status === 409) {
      pass('POST /use on already-used coupon returns 409');
    } else {
      fail('Expected 409 for double-use', `got ${status}`);
    }
  }

  if (redeemableCouponId) {
    const balanceBefore = await getBalance();
    const { status } = await req('POST', `/coupons/${redeemableCouponId}/expire-check`, {});
    if (status === 200) {
      pass('expire-check on already-expired coupon returns 200 (no crash)');
    } else {
      fail('expire-check on expired coupon failed', `status=${status}`);
    }
    const balanceAfter = await getBalance();
    if (balanceAfter === balanceBefore) {
      pass('No balance change on expire-check of already-expired coupon');
    } else {
      fail('Balance changed — duplicate refund on already-expired coupon!', `before=${balanceBefore} after=${balanceAfter}`);
    }
  }
}

async function testTwoRedemptions() {
  console.log('\n[9] Redeem two rewards back-to-back — independent coupons and cumulative deduction');
  const { body: rwBody } = await req('GET', `/businesses/${BUSINESS_ID_A}/rewards`);
  const rewards = rwBody.data?.rewards ?? [];
  const affordable = rewards.filter(r => r.affordable);
  if (affordable.length < 2) {
    console.log(`    INFO  Only ${affordable.length} affordable reward(s) — need 2 to exercise this test`);
    if (affordable.length === 1) {
      console.log('    INFO  Skipping test 9 — increase balance or add a second affordable reward');
    }
    return;
  }

  const balanceBefore = await getBalance();
  const [r1, r2] = affordable;

  const { status: s1, body: b1 } = await req('POST', `/businesses/${BUSINESS_ID_A}/rewards/${r1.id}/redeem`, {});
  const { status: s2, body: b2 } = await req('POST', `/businesses/${BUSINESS_ID_A}/rewards/${r2.id}/redeem`, {});

  if (s1 === 201 && s2 === 201) {
    pass('Both redemptions returned 201');
  } else {
    fail('Redemption failed', `status1=${s1} status2=${s2}`);
    return;
  }

  const c1 = b1.data.couponId;
  const c2 = b2.data.couponId;
  if (c1 && c2 && c1 !== c2) {
    pass(`Two distinct coupons created: ${c1} and ${c2}`);
  } else {
    fail('Coupons not distinct', `c1=${c1} c2=${c2}`);
  }

  const balanceAfter = await getBalance();
  const expectedDeduction = r1.pointsRequired + r2.pointsRequired;
  const actualDeduction = balanceBefore - balanceAfter;
  if (actualDeduction === expectedDeduction) {
    pass(`Balance deducted correctly: -${expectedDeduction} pts (${r1.pointsRequired} + ${r2.pointsRequired})`);
  } else {
    fail('Balance deduction mismatch', `expected -${expectedDeduction}, got -${actualDeduction}`);
  }

  const e1 = b1.data.expiresAt;
  const e2 = b2.data.expiresAt;
  if (typeof e1 === 'number' && typeof e2 === 'number') {
    pass('Both coupons have numeric expiresAt timestamps');
  } else {
    fail('Missing expiresAt', `e1=${e1} e2=${e2}`);
  }
}

(async () => {
  console.log('=== Rewards Redemption Test Suite ===');
  try {
    await login();
    await testRewardsList();
    await testRedeem();
    await testInsufficientPoints();
    await testCouponExpiry();
    await testIdempotentExpiry();
    await testMarkUsed();
    await testDoubleUseAndExpiredReject();
    await testTwoRedemptions();
  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
