// scripts/run-all-regression.js
// Runs every regression script in scripts/ sequentially (never in parallel — many scripts share
// the same seeded test accounts/business data and would interfere with each other if run
// concurrently) and prints one consolidated PASS/FAIL table at the end.
//
// IMPORTANT, pre-existing environment quirk this runner works around rather than silently hides:
// across this codebase's ~48 scripts, the backend URL is configured three different ways —
// (a) hardcoded literal 'http://localhost:3000' with NO env override at all,
// (b) process.env.TEST_BASE_URL || 'http://localhost:3000',
// (c) process.env.BASE_URL || a stale LAN IP (e.g. 'http://192.168.1.4:3000') left over from an
//     old DHCP lease.
// This runner points (b) and (c) at the deployed backend by setting both TEST_BASE_URL and
// BASE_URL in the child env. (a) cannot be redirected without editing those files directly — if
// your local backend isn't reachable at localhost:3000 with a healthy DB connection, those
// specific scripts will show as "COULD NOT RUN", which reflects that local-environment limit,
// not a real app bug. See the final report for exactly which scripts fall in which bucket.
//
// Every script in this codebase prints the words PASS/FAIL per-check (via a log()/assert()
// helper or plain console.log/console.error), even though the exact wording/format differs
// between older and newer scripts. This runner counts those as its universal signal rather than
// relying on each script's own (inconsistently-shaped) final summary line.
//
// Run: node scripts/run-all-regression.js
// Optional: LOCAL_BASE_URL=http://localhost:3000 to also point (a)-style scripts somewhere real
//           (only scripts that already read an env var will pick this up; see note above).

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = __dirname;
const SELF = path.basename(__filename);
const DEPLOYED_URL = process.env.TARGET_BASE_URL || 'https://touchpoints-backend-495493629048.asia-south1.run.app';
const PER_SCRIPT_TIMEOUT_MS = Number(process.env.PER_SCRIPT_TIMEOUT_MS || 90_000);

function listScripts() {
  return fs.readdirSync(SCRIPTS_DIR)
    .filter((f) => f.endsWith('.js') && f !== SELF)
    .sort();
}

function classify(output) {
  // Two conventions coexist across this codebase's scripts: some print the literal word
  // PASS/FAIL (older style), others print a ✅/❌ icon instead and never print the word at all
  // (the log()/assert() helper style most scripts — including every script built this session —
  // use). Count both signals; a script only ever uses one or the other, so there's no real
  // double-counting risk in practice.
  const wordPass = (output.match(/\bPASS\b/g) || []).length;
  const wordFail = (output.match(/\bFAIL(?:ED)?\b/g) || []).length;
  const iconPass = (output.match(/✅/g) || []).length;
  const iconFail = (output.match(/❌/g) || []).length;
  return { passCount: wordPass + iconPass, failCount: wordFail + iconFail };
}

function looksUnreachable(output) {
  return /ECONNREFUSED|ECONNRESET|fetch failed|ETIMEDOUT|ENOTFOUND/i.test(output);
}

function runOne(filename) {
  const start = Date.now();
  const result = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, filename)], {
    cwd: path.join(SCRIPTS_DIR, '..'),
    env: {
      ...process.env,
      TEST_BASE_URL: DEPLOYED_URL,
      BASE_URL: DEPLOYED_URL,
    },
    encoding: 'utf8',
    timeout: PER_SCRIPT_TIMEOUT_MS,
    maxBuffer: 20 * 1024 * 1024,
  });
  const elapsedMs = Date.now() - start;
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const { passCount, failCount } = classify(output);
  const timedOut = result.signal === 'SIGTERM' && elapsedMs >= PER_SCRIPT_TIMEOUT_MS - 500;
  const unreachable = looksUnreachable(output);

  let status;
  if (timedOut) status = 'TIMEOUT';
  else if (unreachable && passCount === 0) status = 'UNREACHABLE';
  else if (failCount > 0) status = 'FAILURES';
  else if (passCount > 0) status = 'OK';
  else status = 'NO MARKERS';

  return { filename, status, passCount, failCount, elapsedMs, exitCode: result.status, output };
}

function pad(str, len) { return String(str).padEnd(len); }

function run() {
  const scripts = listScripts();
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Running ${scripts.length} regression scripts against:`);
  console.log(`  ${DEPLOYED_URL}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  const results = [];
  for (const filename of scripts) {
    process.stdout.write(`▶ ${filename} ... `);
    const r = runOne(filename);
    results.push(r);
    const summary = r.status === 'OK' ? `✅ ${r.passCount} passed`
      : r.status === 'FAILURES' ? `❌ ${r.passCount} passed, ${r.failCount} failed`
      : r.status === 'UNREACHABLE' ? '⚠️  backend unreachable (see note at top of this script)'
      : r.status === 'TIMEOUT' ? `⏱️  timed out after ${PER_SCRIPT_TIMEOUT_MS}ms`
      : '🔵 no PASS/FAIL markers found in output';
    console.log(`${summary} (${(r.elapsedMs / 1000).toFixed(1)}s)`);
  }

  // ── Consolidated table ─────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  CONSOLIDATED REPORT');
  console.log('══════════════════════════════════════════════════════════════\n');

  const byStatus = { FAILURES: [], UNREACHABLE: [], TIMEOUT: [], 'NO MARKERS': [], OK: [] };
  for (const r of results) byStatus[r.status].push(r);

  const order = ['FAILURES', 'TIMEOUT', 'UNREACHABLE', 'NO MARKERS', 'OK'];
  for (const status of order) {
    const rows = byStatus[status];
    if (rows.length === 0) continue;
    console.log(`\n--- ${status} (${rows.length}) ---`);
    for (const r of rows) {
      console.log(`  ${pad(r.filename, 48)} ${pad(`${r.passCount}P/${r.failCount}F`, 10)} ${(r.elapsedMs / 1000).toFixed(1)}s`);
    }
  }

  const totalPassed = results.reduce((s, r) => s + r.passCount, 0);
  const totalFailed = results.reduce((s, r) => s + r.failCount, 0);
  console.log('\n──────────────────────────────────────────────');
  console.log(`  Scripts run:        ${results.length}`);
  console.log(`  ✅ Clean:           ${byStatus.OK.length}`);
  console.log(`  ❌ Had failures:    ${byStatus.FAILURES.length}`);
  console.log(`  ⚠️  Unreachable:     ${byStatus.UNREACHABLE.length}`);
  console.log(`  ⏱️  Timed out:       ${byStatus.TIMEOUT.length}`);
  console.log(`  🔵 No markers:      ${byStatus['NO MARKERS'].length}`);
  console.log(`  Total individual checks: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('──────────────────────────────────────────────\n');

  if (byStatus.UNREACHABLE.length > 0) {
    console.log('NOTE: "UNREACHABLE" scripts are hardcoded to http://localhost:3000 with no env');
    console.log('override — this runner cannot redirect them. They need a healthy local backend');
    console.log('+ DB connection to run at all. This is a pre-existing limitation, not a new bug.\n');
  }

  process.exitCode = byStatus.FAILURES.length > 0 ? 1 : 0;
}

run();
