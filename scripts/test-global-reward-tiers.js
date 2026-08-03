// scripts/test-global-reward-tiers.js
// Global reward tier end-to-end test — net balance across businesses, tier boundaries,
// removal of the old per-business tier endpoints, and balance drop on redemption.
//
// NOTE: scripts/test-tier-progress.js (the old per-business tier test) has been deleted —
// this script replaces it now that tiers are a single global setting.
//
// TEST_EMAIL must belong to a user subscribed to 2+ businesses with existing points.

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE          = process.env.BASE_URL     || 'http://localhost:3000';
const TEST_EMAIL     = process.env.TEST_EMAIL    || 'pinky@test.com';
const TEST_PASSWORD  = process.env.TEST_PASSWORD || 'Pinky123#';

let token = '';
let passed = 0;
let failed = 0;

function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data !== undefined) console.log('   ', JSON.stringify(data, null, 2));
  if (status === 'PASS') passed++;
  if (status === 'FAIL') failed++;
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
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

async function run() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  TouchPoints Global Reward Tier Test         ');
  console.log('══════════════════════════════════════════════');
  console.log(`  User: ${TEST_EMAIL}`);

  // ── Step 1: Login ──────────────────────────────────────────
  const login = await req('POST', '/auth/login', { identifier: TEST_EMAIL, password: TEST_PASSWORD });
  if (login.status !== 200 || !login.body.data?.accessToken) {
    log(1, 'FAIL', 'Login failed — aborting', login.body);
    return;
  }
  token = login.body.data.accessToken;
  log(1, 'PASS', 'Login success');

  // ── Step 2: GET /rewards/tier — net balance matches /points/summary total ──
  const tierRes = await req('GET', '/rewards/tier');
  const summaryRes = await req('GET', '/points/summary');
  if (tierRes.status !== 200 || summaryRes.status !== 200) {
    log(2, 'FAIL', 'Could not fetch /rewards/tier or /points/summary', { tierRes, summaryRes });
    return;
  }
  const tierData = tierRes.body.data;
  const summaryTotal = summaryRes.body.data.total;
  if (tierData.netBalance === summaryTotal) {
    log(2, 'PASS', `netBalance (${tierData.netBalance}) matches /points/summary total (${summaryTotal}) — same underlying SUM across all businesses`);
  } else {
    log(2, 'FAIL', 'netBalance does not match /points/summary total', { netBalance: tierData.netBalance, summaryTotal });
  }

  // ── Step 3: Tier boundary correctness ───────────────────────
  const { tier, nextTier, tiers } = tierData;
  if (!Array.isArray(tiers) || tiers.length === 0) {
    log(3, 'FAIL', 'No active global_reward_tiers found — seed the table first');
  } else {
    const balanceOk = !tier || tier.min_points <= tierData.netBalance;
    const nextOk = !nextTier || nextTier.min_points > tierData.netBalance;
    if (balanceOk && nextOk) {
      log(3, 'PASS', `Correct tier at boundary — current="${tier?.tier_name ?? 'none'}" (min ${tier?.min_points ?? 'n/a'}), next="${nextTier?.tier_name ?? 'none'}" (min ${nextTier?.min_points ?? 'n/a'}), balance=${tierData.netBalance}`);
    } else {
      log(3, 'FAIL', 'Tier boundary mismatch', tierData);
    }
  }

  // ── Step 4: Badge + progress rendering ──────────────────────
  log(4, 'INFO', 'Manual check — open the Rewards tab and confirm the hero badge + progress bar render the tier/nextTier/progressPercent values above');

  // ── Step 5: GET /reward-config/:businessId — no `tiers` key ──
  const summaryBreakdown = summaryRes.body.data.breakdown;
  if (summaryBreakdown.length === 0) {
    log(5, 'FAIL', 'No businesses in points breakdown — cannot test /reward-config/:businessId (subscribe user to a business first)');
  } else {
    const businessId = summaryBreakdown[0].businessId;
    const configRes = await req('GET', `/reward-config/${businessId}`);
    if (configRes.status === 200 && !('tiers' in (configRes.body.data ?? {}))) {
      log(5, 'PASS', 'GET /reward-config/:businessId response has no `tiers` key');
    } else {
      log(5, 'FAIL', 'GET /reward-config/:businessId still returns tiers or failed', configRes.body);
    }

    // ── Step 6: old per-business tier routes are gone ─────────
    const postRes = await req('POST', '/reward-tiers', { name: 'X', min_points: 0 });
    const putRes = await req('PUT', '/reward-tiers/00000000-0000-0000-0000-000000000000', { name: 'X' });
    const delRes = await req('DELETE', '/reward-tiers/00000000-0000-0000-0000-000000000000');
    const allGone = [postRes, putRes, delRes].every(r => r.status === 404);
    if (allGone) {
      log(6, 'PASS', 'POST/PUT/DELETE /reward-tiers all return 404 — routes removed');
    } else {
      log(6, 'FAIL', 'Some /reward-tiers routes still respond', { postRes: postRes.status, putRes: putRes.status, delRes: delRes.status });
    }

    // ── Step 7: redeeming a coupon lowers net balance ──────────
    const rewardsRes = await req('GET', `/businesses/${businessId}/rewards`);
    const affordable = (rewardsRes.body.data?.rewards ?? []).find(r => r.affordable);
    if (!affordable) {
      log(7, 'INFO', 'No affordable reward found for this business — skipping redemption balance-drop check');
    } else {
      const before = (await req('GET', '/rewards/tier')).body.data;
      const redeemRes = await req('POST', `/businesses/${businessId}/rewards/${affordable.id}/redeem`, {});
      if (redeemRes.status !== 201) {
        log(7, 'FAIL', 'Redemption failed', redeemRes.body);
      } else {
        const after = (await req('GET', '/rewards/tier')).body.data;
        if (after.netBalance === before.netBalance - affordable.pointsRequired) {
          log(7, 'PASS', `netBalance dropped by ${affordable.pointsRequired} after redemption (${before.netBalance} → ${after.netBalance})`);
        } else {
          log(7, 'FAIL', 'netBalance did not drop as expected', { before: before.netBalance, after: after.netBalance, cost: affordable.pointsRequired });
        }
      }
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
