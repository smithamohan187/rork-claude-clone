// scripts/test-business-owner-member-chat.js
// Owner <-> member direct chat (reuses direct_business; owner = business profile
// participant). Login-first, sequential PASS/FAIL, self-contained fixtures.
//
// Run (backend up on :3000):  node scripts/test-business-owner-member-chat.js

const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
let passed = 0, failed = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(step, status, msg, data) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔵';
  console.log(`\n${icon} [${step}] ${msg}`);
  if (data !== undefined) console.log('   ', JSON.stringify(data, null, 2));
}
function assert(step, cond, msg, details) {
  if (cond) { log(step, 'PASS', msg); passed++; }
  else      { log(step, 'FAIL', msg, details); failed++; }
}
async function api(method, endpoint, { token, body } = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}
async function signup({ email, phone, full_name }) {
  const r = await api('POST', '/auth/signup', {
    body: { email, phone, password: 'Test123#', full_name, location: 'Test City' },
  });
  return { token: r.data?.data?.accessToken, profileId: r.data?.data?.profile?.id, status: r.status, data: r.data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — Owner <-> Member Chat Test');
  console.log('══════════════════════════════════════════════════');

  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'touchpoint',
    user: process.env.DB_USER || 'touchpoint_user',
    password: process.env.DB_PASSWORD || 'touchpoint123',
  });
  await db.connect();

  const stamp = Date.now();
  const emailTag = `ownmem-${stamp}`;
  const createdConversationIds = [];

  // helper: point the owner's active profile at a given business profile
  const setOwnerActive = (userId, profileId) =>
    db.query(`UPDATE users SET active_profile_id = $1 WHERE id = $2`, [profileId, userId]);

  const makeBusiness = async (ownerUserId, name, slug) => {
    const row = (await db.query(
      `WITH p AS (
         INSERT INTO profiles (user_id, profile_type, display_name, city, state)
         VALUES ($1,'business',$2,'Test City','TS') RETURNING id
       )
       INSERT INTO businesses (profile_id, name, slug)
       SELECT id,$2,$3 FROM p RETURNING id, profile_id`,
      [ownerUserId, name, slug],
    )).rows[0];
    return { businessId: row.id, businessProfileId: row.profile_id };
  };

  try {
    // ── Setup ───────────────────────────────────────────────────────────────
    const owner = await signup({ email: `${emailTag}-owner@test.com`, phone: `+1530${String(stamp).slice(-7)}`, full_name: 'Owner O' });
    const A = await signup({ email: `${emailTag}-a@test.com`, phone: `+1531${String(stamp).slice(-7)}`, full_name: 'Member A' });
    const B = await signup({ email: `${emailTag}-b@test.com`, phone: `+1532${String(stamp).slice(-7)}`, full_name: 'Member B' });
    assert('SETUP-USERS', owner.profileId && A.profileId && B.profileId, 'Owner, A, B registered');
    if (!owner.profileId || !A.profileId || !B.profileId) { console.log('cannot continue'); process.exit(1); }

    const ownerUserId = (await db.query(`SELECT user_id FROM profiles WHERE id = $1`, [owner.profileId])).rows[0].user_id;

    const X = await makeBusiness(ownerUserId, 'Owner Biz X', `ownmem-x-${stamp}`);
    const Y = await makeBusiness(ownerUserId, 'Owner Biz Y', `ownmem-y-${stamp}`);
    await setOwnerActive(ownerUserId, X.businessProfileId); // owner acts as Business X

    // Members subscribe to X (Y subscription added later for the edge case).
    await api('POST', '/subscriptions/subscribe', { token: A.token, body: { business_id: X.businessId } });
    await api('POST', '/subscriptions/subscribe', { token: B.token, body: { business_id: X.businessId } });

    // ── 2. business-members card source lists A and B ────────────────────────
    const membersRes = await api('GET', '/subscriptions/members', { token: owner.token });
    const memberIds = (Array.isArray(membersRes.data?.data) ? membersRes.data.data : []).map((m) => m.profile_id);
    assert('T2-MEMBER-LIST', membersRes.status === 200 && memberIds.includes(A.profileId) && memberIds.includes(B.profileId),
      'GET /subscriptions/members returns A and B (card source)', memberIds);

    // ── 3. owner opens chat with A (owner→member) → created ──────────────────
    const openA = await api('POST', '/conversations', { token: owner.token, body: { targetProfileId: A.profileId, type: 'business' } });
    const convAX = openA.data?.data?.conversation?.id;
    if (convAX) createdConversationIds.push(convAX);
    assert('T3-OWNER-OPEN-A', openA.status === 201 && !!convAX, 'Owner→Member A conversation created', openA.data);

    // ── 4. owner sends; A picks it up via polling ────────────────────────────
    const s4 = await api('POST', `/conversations/${convAX}/messages`, { token: owner.token, body: { body: 'welcome from the owner' } });
    assert('T4-OWNER-SEND', s4.status === 201, 'Owner sends message', s4.data);
    let seen = false;
    for (let i = 0; i < 3 && !seen; i++) {
      await sleep(1500);
      const poll = await api('GET', `/conversations/${convAX}/messages`, { token: A.token });
      seen = (poll.data?.data?.messages ?? []).some((m) => m.body === 'welcome from the owner');
    }
    assert('T4-A-POLL', seen, "Member A's poll receives the owner's message within ~5s");

    // ── 5. A replies; owner's list shows preview + unread on A's conversation ─
    await api('POST', `/conversations/${convAX}/messages`, { token: A.token, body: { body: 'thanks, glad to be here' } });
    const ownerList = await api('GET', '/conversations?type=business', { token: owner.token });
    const aConv = (ownerList.data?.data?.conversations ?? []).find((c) => c.other_profile_id === A.profileId);
    assert('T5-OWNER-PREVIEW-UNREAD',
      ownerList.status === 200 && aConv && aConv.last_message_body === 'thanks, glad to be here' && aConv.unread_count >= 1,
      "Owner's list shows A's last-message preview + unread >= 1", aConv);

    // ── 6. B has no conversation yet — no cross-contamination ────────────────
    const bConvBefore = (ownerList.data?.data?.conversations ?? []).find((c) => c.other_profile_id === B.profileId);
    assert('T6-NO-CROSS', !bConvBefore, "Member B's row has no conversation (isolated from A's)", bConvBefore);

    // ── 7. owner↔B exists → A cannot read it (403) ───────────────────────────
    const openB = await api('POST', '/conversations', { token: owner.token, body: { targetProfileId: B.profileId, type: 'business' } });
    const convBX = openB.data?.data?.conversation?.id;
    if (convBX) createdConversationIds.push(convBX);
    const aReadsB = await api('GET', `/conversations/${convBX}/messages`, { token: A.token });
    assert('T7-403-CROSS-MEMBER', aReadsB.status === 403, "Member A gets 403 reading B's conversation with the owner", { status: aReadsB.status });

    // ── 8. member cannot start a member↔member "business" conversation ───────
    const aToB = await api('POST', '/conversations', { token: A.token, body: { targetProfileId: B.profileId, type: 'business' } });
    assert('T8-NO-MEMBER-MEMBER', aToB.status === 400, 'Member A cannot open a business conversation with member B (400)', { status: aToB.status });

    // ── 9. idempotency — owner opens A again → same conversation ─────────────
    const openA2 = await api('POST', '/conversations', { token: owner.token, body: { targetProfileId: A.profileId, type: 'business' } });
    assert('T9-IDEMPOTENT', openA2.status === 200 && openA2.data?.data?.created === false && openA2.data?.data?.conversation?.id === convAX,
      'Re-opening A returns the same conversation (created=false)', openA2.data?.data);

    // ── 10. two businesses, same owner → two scoped conversations ────────────
    await api('POST', '/subscriptions/subscribe', { token: A.token, body: { business_id: Y.businessId } });
    await setOwnerActive(ownerUserId, Y.businessProfileId); // owner now acts as Business Y
    const openAY = await api('POST', '/conversations', { token: owner.token, body: { targetProfileId: A.profileId, type: 'business' } });
    const convAY = openAY.data?.data?.conversation?.id;
    if (convAY) createdConversationIds.push(convAY);
    assert('T10-SCOPED-PER-BUSINESS', [200, 201].includes(openAY.status) && !!convAY && convAY !== convAX,
      'Owner↔A under Business Y is a DISTINCT conversation from Business X', { convAX, convAY });

  } finally {
    try {
      if (createdConversationIds.length) {
        await db.query(`DELETE FROM conversations WHERE id = ANY($1::uuid[])`, [createdConversationIds]);
      }
      await db.query(`DELETE FROM users WHERE email LIKE $1`, [`${emailTag}-%@test.com`]);
    } catch (e) {
      console.log('   ⚠️ cleanup warning:', e.message);
    }
    await db.end();
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
  console.log('══════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => { console.error('\n💥', err); process.exit(1); });
