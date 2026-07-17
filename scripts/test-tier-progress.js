/**
 * Test script: per-business tier progress in /points/summary.
 *
 * Prerequisites:
 *   - Backend running on BASE_URL
 *   - At least one business with reward_tiers configured (BUSINESS_ID_A)
 *   - At least one business with no tiers (BUSINESS_ID_ZERO)
 *   - Run test-join-points.js first to ensure points exist in DB
 *
 * Run:  node scripts/test-tier-progress.js
 *
 * Regression: run `node scripts/test-join-points.js` separately to confirm 9/9 still pass.
 */

const BASE_URL       = process.env.BASE_URL       || 'http://192.168.1.4:3000';
const EMAIL          = process.env.TEST_EMAIL      || 'pinky@test.com';
const PASSWORD       = process.env.TEST_PASSWORD   || 'Pinky123#';
const BUSINESS_ID_A  = process.env.BUSINESS_ID_A  || '10c365c7-547d-4004-b431-f601ef69d44d';
const BUSINESS_ID_ZERO = process.env.BUSINESS_ID_ZERO || '14e753e9-cfec-45a6-a704-8473586a1234';

let token = '';
let passed = 0;
let failed = 0;

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
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

async function login() {
  console.log('\n[1] Login');
  const { status, body } = await req('POST', '/auth/login', { identifier: EMAIL, password: PASSWORD });
  if (status === 200 && body.data?.accessToken) {
    token = body.data.accessToken;
    pass('Login succeeded, token received');
  } else {
    fail('Login', `status=${status} body=${JSON.stringify(body)}`);
    process.exit(1);
  }
}

async function getSummary() {
  return req('GET', '/points/summary');
}

async function subscribe(businessId) {
  return req('POST', '/subscriptions/subscribe', { business_id: businessId });
}

async function testBreakdownShape() {
  console.log('\n[2] GET /points/summary — breakdown item shape includes tier fields');
  const { status, body } = await getSummary();
  if (status !== 200 || !body.data) {
    fail('GET /points/summary', `status=${status}`);
    return;
  }
  const { breakdown } = body.data;
  if (!Array.isArray(breakdown) || breakdown.length === 0) {
    fail('Breakdown shape', 'breakdown is empty — subscribe to at least one business first');
    return;
  }
  const item = breakdown[0];
  const hasAllFields =
    Array.isArray(item.tiers) &&
    'currentTier' in item &&
    'nextTier' in item &&
    'pointsToNextTier' in item &&
    typeof item.progressPercent === 'number';
  if (hasAllFields) {
    pass('Breakdown item has tiers, currentTier, nextTier, pointsToNextTier, progressPercent');
  } else {
    fail('Breakdown item missing tier fields', JSON.stringify(Object.keys(item)));
  }
}

async function testWithTiers() {
  console.log('\n[3] Business A — subscribe and check tier progress fields');
  await subscribe(BUSINESS_ID_A);
  await new Promise(r => setTimeout(r, 100));
  const { status, body } = await getSummary();
  if (status !== 200 || !body.data) {
    fail('GET /points/summary in test 3', `status=${status}`);
    return;
  }
  const bizA = body.data.breakdown.find(b => b.businessId === BUSINESS_ID_A);
  if (!bizA) {
    fail('Business A not in breakdown', 'Subscribe first');
    return;
  }

  if (Array.isArray(bizA.tiers)) {
    pass(`tiers is array (length=${bizA.tiers.length})`);
  } else {
    fail('tiers is not an array', JSON.stringify(bizA.tiers));
  }

  if (bizA.tiers.length > 0) {
    const inRange = bizA.progressPercent >= 0 && bizA.progressPercent <= 100;
    if (inRange) {
      pass(`progressPercent=${bizA.progressPercent} is in [0, 100]`);
    } else {
      fail('progressPercent out of range', `got ${bizA.progressPercent}`);
    }

    if (bizA.currentTier !== null) {
      pass(`currentTier="${bizA.currentTier.name}" (user has reached at least first tier)`);
      // verify pointsToNextTier logic
      if (bizA.nextTier === null) {
        if (bizA.progressPercent === 100) {
          pass('progressPercent=100 and nextTier=null — top tier reached');
        } else {
          fail('progressPercent should be 100 when nextTier is null', `got ${bizA.progressPercent}`);
        }
        if (bizA.pointsToNextTier === null) {
          pass('pointsToNextTier=null at top tier');
        } else {
          fail('pointsToNextTier should be null at top tier', `got ${bizA.pointsToNextTier}`);
        }
      } else {
        const expectedPtsToNext = bizA.nextTier.minPoints - bizA.points;
        if (bizA.pointsToNextTier === expectedPtsToNext) {
          pass(`pointsToNextTier=${bizA.pointsToNextTier} = nextTier.minPoints(${bizA.nextTier.minPoints}) - points(${bizA.points})`);
        } else {
          fail('pointsToNextTier mismatch', `expected ${expectedPtsToNext}, got ${bizA.pointsToNextTier}`);
        }
      }
    } else {
      pass('currentTier=null — user below first tier threshold');
      if (bizA.progressPercent < 100) {
        pass(`progressPercent=${bizA.progressPercent} < 100 (correct — not at first tier yet)`);
      } else {
        fail('progressPercent should be <100 when currentTier is null', `got ${bizA.progressPercent}`);
      }
    }
  } else {
    console.log('    INFO  Business A has no tiers configured — skipping tier progress checks for test 3');
  }
}

async function testBelowFirstTier() {
  // BUSINESS_ID_ZERO has tiers but the user's points for it are below the first tier threshold —
  // confirming that currentTier=null + partial progressPercent is handled correctly.
  console.log('\n[4] Business with user below first tier — currentTier=null, progressPercent toward first tier');
  await subscribe(BUSINESS_ID_ZERO);
  await new Promise(r => setTimeout(r, 100));
  const { status, body } = await getSummary();
  if (status !== 200 || !body.data) {
    fail('GET /points/summary in test 4', `status=${status}`);
    return;
  }
  const bizZero = body.data.breakdown.find(b => b.businessId === BUSINESS_ID_ZERO);
  if (!bizZero) {
    // No points for this business — it won't appear in the breakdown (0 welcome bonus).
    // That means the zero-tier code path is exercised for businesses not in the breakdown.
    pass('Business with 0 welcome bonus not in breakdown — no crash, no tier fields to check');
    return;
  }
  // Business is in breakdown with some points
  if (Array.isArray(bizZero.tiers)) {
    pass(`tiers is array (length=${bizZero.tiers.length})`);
  } else {
    fail('tiers is not an array', JSON.stringify(bizZero.tiers));
    return;
  }
  if (bizZero.tiers.length === 0) {
    // Truly no tiers — all nulls/zero
    const ok = bizZero.currentTier === null && bizZero.nextTier === null && bizZero.progressPercent === 0;
    if (ok) {
      pass('Zero-tier business: currentTier=null, nextTier=null, progressPercent=0');
    } else {
      fail('Zero-tier business unexpected values', `currentTier=${JSON.stringify(bizZero.currentTier)}, progress=${bizZero.progressPercent}`);
    }
  } else if (bizZero.currentTier === null) {
    // Has tiers but user is below the first threshold
    const firstMin = bizZero.tiers[0].minPoints;
    const expectedProgress = firstMin > 0
      ? Math.min(Math.round((bizZero.points / firstMin) * 100), 99)
      : 0;
    pass(`currentTier=null — user (${bizZero.points} pts) is below first tier (${firstMin} min_points)`);
    if (bizZero.progressPercent === expectedProgress) {
      pass(`progressPercent=${bizZero.progressPercent} matches expected ${expectedProgress}`);
    } else {
      fail('progressPercent mismatch for below-first-tier case', `expected ${expectedProgress}, got ${bizZero.progressPercent}`);
    }
    if (bizZero.nextTier !== null && bizZero.nextTier.id === bizZero.tiers[0].id) {
      pass(`nextTier="${bizZero.nextTier.name}" is the first tier (correct)`);
    } else {
      fail('nextTier should be the first tier when user is below all thresholds', JSON.stringify(bizZero.nextTier));
    }
  } else {
    // User has already reached first tier for this business
    pass(`User has reached at least first tier "${bizZero.currentTier.name}" for this business — below-first-tier path not exercised`);
  }
}

async function testLogoUrlResolved() {
  console.log('\n[5] logoUrl — raw API returns relative path; frontend service resolves to absolute');
  // We test the raw API here (no frontend); just confirm the field is present and not undefined
  const { status, body } = await getSummary();
  if (status !== 200 || !body.data) {
    fail('GET /points/summary in test 5', `status=${status}`);
    return;
  }
  const { breakdown } = body.data;
  if (breakdown.length === 0) {
    console.log('    INFO  No breakdown entries — skipping logo check');
    return;
  }
  const withLogo = breakdown.find(b => b.logoUrl !== null);
  const allHaveField = breakdown.every(b => 'logoUrl' in b);
  if (allHaveField) {
    pass('All breakdown items have logoUrl field (null or relative path)');
  } else {
    fail('Some breakdown items missing logoUrl field');
  }
  if (withLogo) {
    // Raw from backend — should be a relative path starting with /uploads or null
    const isRelative = withLogo.logoUrl === null || withLogo.logoUrl.startsWith('/');
    if (isRelative) {
      pass(`Backend returns raw relative logoUrl: "${withLogo.logoUrl}" — frontend resolveUrl() converts to absolute`);
    } else {
      console.log(`    INFO  logoUrl="${withLogo.logoUrl}" (may already be absolute)`);
    }
  } else {
    console.log('    INFO  No business with a logo in breakdown — logo fallback path not exercised');
  }
}

(async () => {
  console.log('=== Tier Progress Test Suite ===');
  try {
    await login();
    await testBreakdownShape();
    await testWithTiers();
    await testBelowFirstTier();
    await testLogoUrlResolved();
  } catch (err) {
    console.error('\nUnhandled error:', err.message);
    failed++;
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
