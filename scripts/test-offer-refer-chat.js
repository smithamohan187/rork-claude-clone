// scripts/test-offer-refer-chat.js
// Refer-an-offer-to-trusted-friends-via-chat — end-to-end test.
// Sequential, login-first, PASS/FAIL. Self-contained fixtures; cleans up after itself.
//
// Run (backend up on :3000):  node scripts/test-offer-refer-chat.js

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
  console.log('  TouchPoints — Refer Offer to Friends via Chat Test');
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
  const emailTag = `referoffer-${stamp}`;
  const createdConversationIds = [];

  try {
    // ── Setup: A + Business X (A subscribed, so A can refer its offer), friends B, C, D ──────
    const A = await signup({ email: `${emailTag}-a@test.com`, phone: `+1540${String(stamp).slice(-7)}`, full_name: 'Sharer A' });
    const B = await signup({ email: `${emailTag}-b@test.com`, phone: `+1541${String(stamp).slice(-7)}`, full_name: 'Friend B' });
    const C = await signup({ email: `${emailTag}-c@test.com`, phone: `+1542${String(stamp).slice(-7)}`, full_name: 'Friend C' });
    const D = await signup({ email: `${emailTag}-d@test.com`, phone: `+1543${String(stamp).slice(-7)}`, full_name: 'Friend D' });
    assert('SETUP-USERS', A.profileId && B.profileId && C.profileId && D.profileId, 'A, B, C, D registered');
    if (!A.profileId || !B.profileId || !C.profileId || !D.profileId) { console.log('cannot continue'); process.exit(1); }

    // A <-> B, A <-> C trusted friends (D deliberately NOT trusted, for the isolation check).
    for (const other of [B, C]) {
      await db.query(
        `INSERT INTO trusted_friends (profile_id_one, profile_id_two, source_type)
         VALUES (LEAST($1::uuid,$2::uuid), GREATEST($1::uuid,$2::uuid), 'content_share')
         ON CONFLICT DO NOTHING`,
        [A.profileId, other.profileId],
      );
    }

    // Business X with a real reward_config (both welcome + referral bonus > 0, so step 4 can
    // assert TWO independent points_transactions rows, not one overwriting the other).
    const biz = (await db.query(
      `WITH u AS (
         INSERT INTO users (email, password_hash, is_verified) VALUES ($1,'x',TRUE) RETURNING id
       ), p AS (
         INSERT INTO profiles (user_id, profile_type, display_name, city, state)
         SELECT id,'business','Refer Offer Biz X','Test City','TS' FROM u RETURNING id
       )
       INSERT INTO businesses (profile_id, name, slug)
       SELECT id,'Refer Offer Biz X',$2 FROM p RETURNING id, profile_id`,
      [`${emailTag}-biz@test.com`, `refer-offer-biz-${stamp}`],
    )).rows[0];
    const businessId = biz.id;

    await db.query(
      `INSERT INTO reward_config (business_id, welcome_bonus_points, referral_bonus_points)
       VALUES ($1, 25, 50)`,
      [businessId],
    );

    const offer = (await db.query(
      `INSERT INTO offers (business_id, title, description, discount_type, discount_value)
       VALUES ($1, 'Test Offer', 'A great deal', 'percent', 20)
       RETURNING id, title`,
      [businessId],
    )).rows[0];
    const offerId = offer.id;

    // ── T1: share offer with B and C ────────────────────────────────────────────────────────
    const t1 = await api('POST', '/feed/share/offer-to-friends', {
      token: A.token, body: { content_type: 'offer', content_id: offerId, targetProfileIds: [B.profileId, C.profileId] },
    });
    const t1Results = t1.data?.data?.results ?? [];
    t1Results.forEach((r) => r.conversationId && createdConversationIds.push(r.conversationId));
    assert('T1-SHARE', t1.status === 201 && t1Results.every((r) => r.ok) && t1Results.length === 2,
      'Offer shared with B and C — both succeed', t1Results);

    // ── T2: D was NOT selected — no conversation/message exists for D ──────────────────────
    const dConvos = await api('GET', '/conversations?type=friend', { token: D.token });
    const dHasAny = (dConvos.data?.data?.conversations ?? []).length > 0;
    assert('T2-D-UNAFFECTED', dConvos.status === 200 && !dHasAny, 'D has no conversations (was not selected)', dConvos.data?.data);

    // ── T3: B received the message with the offer's share link ─────────────────────────────
    const bConvId = t1Results.find((r) => r.targetProfileId === B.profileId)?.conversationId;
    const bMsgs = await api('GET', `/conversations/${bConvId}/messages`, { token: B.token });
    const linkMsg = (bMsgs.data?.data?.messages ?? []).find((m) => m.body.includes('/s/'));
    assert('T3-MESSAGE-LINK', bMsgs.status === 200 && !!linkMsg, 'B received a message containing the share link', linkMsg);

    // ── T4: B (not yet subscribed) subscribes to Business X ─────────────────────────────────
    const subB = await api('POST', '/subscriptions/subscribe', { token: B.token, body: { business_id: businessId } });
    assert('T4-B-SUBSCRIBE', subB.status === 200, 'B subscribes to Business X', subB.data);
    await sleep(300); // let the subscribe-time transaction settle

    const welcomeRow = (await db.query(
      `SELECT * FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_welcome'`,
      [B.profileId, businessId],
    )).rows[0];
    const referralRow = (await db.query(
      `SELECT * FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_referral'`,
      [A.profileId, businessId],
    )).rows[0];
    assert('T4-TWO-INDEPENDENT-POINTS-ROWS',
      !!welcomeRow && welcomeRow.points === 25 && !!referralRow && referralRow.points === 50,
      "B's earn_welcome (25) and A's earn_referral (50) both exist as separate rows",
      { welcomeRow, referralRow });

    const trustedRow = (await db.query(
      `SELECT 1 FROM trusted_friends WHERE (profile_id_one = LEAST($1::uuid,$2::uuid) AND profile_id_two = GREATEST($1::uuid,$2::uuid))`,
      [A.profileId, B.profileId],
    )).rows[0];
    assert('T4-TRUSTED-FRIENDS-INTACT', !!trustedRow, 'trusted_friends(A,B) still present after subscribe', trustedRow);

    // ── T5: A is notified that B subscribed via the shared offer ───────────────────────────
    const notifsA = await api('GET', '/notifications/mine', { token: A.token });
    const offerNotif = (notifsA.data?.data?.notifications ?? []).find((n) => n.type === 'offer_referral_subscribed' && n.data?.subscriber_profile_id === B.profileId);
    assert('T5-NOTIFY-A', notifsA.status === 200 && !!offerNotif, "A received an offer_referral_subscribed notification for B", offerNotif);

    // ── T6: repeat for C independently — no cross-contamination with B's chain ─────────────
    const subC = await api('POST', '/subscriptions/subscribe', { token: C.token, body: { business_id: businessId } });
    assert('T6-C-SUBSCRIBE', subC.status === 200, 'C subscribes to Business X', subC.data);
    await sleep(300);

    const referralRowC = (await db.query(
      `SELECT * FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_referral' AND reference_id IN
         (SELECT id FROM share_recipients WHERE registered_profile_id = $3)`,
      [A.profileId, businessId, C.profileId],
    )).rows[0];
    const referralRowCount = (await db.query(
      `SELECT COUNT(*)::int AS c FROM points_transactions WHERE profile_id = $1 AND business_id = $2 AND type = 'earn_referral'`,
      [A.profileId, businessId],
    )).rows[0].c;
    assert('T6-C-INDEPENDENT', !!referralRowC && referralRowCount === 2,
      "C's subscribe creates its OWN earn_referral row for A (2 total, not merged with B's)", { referralRowCount });

    const notifsA2 = await api('GET', '/notifications/mine', { token: A.token });
    const offerNotifC = (notifsA2.data?.data?.notifications ?? []).find((n) => n.type === 'offer_referral_subscribed' && n.data?.subscriber_profile_id === C.profileId);
    assert('T6-NOTIFY-A-FOR-C', !!offerNotifC, 'A also received a separate notification for C', offerNotifC);

    // ── T7: idempotency — re-share the same offer to B again ───────────────────────────────
    const t7 = await api('POST', '/feed/share/offer-to-friends', {
      token: A.token, body: { content_type: 'offer', content_id: offerId, targetProfileIds: [B.profileId] },
    });
    const t7Result = t7.data?.data?.results?.[0];
    assert('T7-IDEMPOTENT-CONVERSATION', t7.status === 201 && t7Result?.ok && t7Result.conversationId === bConvId,
      'Re-sharing to B reuses the SAME conversation (idempotent), message still sends', t7Result);

    const recipientCount = (await db.query(
      `SELECT COUNT(*)::int AS c FROM share_recipients WHERE sharer_profile_id=$1 AND business_id=$2 AND content_type='offer' AND content_id=$3 AND registered_profile_id=$4`,
      [A.profileId, businessId, offerId, B.profileId],
    )).rows[0].c;
    assert('T7-NO-DUPLICATE-RECIPIENT-ROW', recipientCount === 1, 'Only one share_recipients row exists for (A, B, offer) despite re-sharing', { recipientCount });

    // ── T8/T9: generalized shareContentToFriends also works for event/post content types ────
    // (module-by-module bug-hunt pass: shareOfferToFriends was hardcoded to offers; generalized
    // to accept content_type — these two steps close the gap in this script's own coverage that
    // let that go untested for event/post.)
    const event = (await db.query(
      `INSERT INTO events (business_id, title, description, location, starts_at)
       VALUES ($1, 'Test Event', 'A fun event', 'Test Venue', NOW() + interval '7 days')
       RETURNING id, title`,
      [businessId],
    )).rows[0];
    // Reuse C (already trusted with A, but hasn't received an event/post share yet — B already has
    // 2 messages from T1/T7 which would make message-count assertions ambiguous).
    const t8 = await api('POST', '/feed/share/offer-to-friends', {
      token: A.token, body: { content_type: 'event', content_id: event.id, targetProfileIds: [C.profileId] },
    });
    const t8Result = t8.data?.data?.results?.[0];
    const cConvId = t8Result?.conversationId;
    if (cConvId && !createdConversationIds.includes(cConvId)) createdConversationIds.push(cConvId);
    const cMsgs = cConvId ? await api('GET', `/conversations/${cConvId}/messages`, { token: C.token }) : null;
    const cLinkMsg = (cMsgs?.data?.data?.messages ?? []).find((m) => m.body.includes('/s/'));
    assert('T8-EVENT-REFER', t8.status === 201 && !!t8Result?.ok && !!cLinkMsg,
      'Sharing an EVENT via the same endpoint creates a real conversation + message', { t8Result, cLinkMsg });

    const post = (await db.query(
      `INSERT INTO posts (business_id, title, content)
       VALUES ($1, 'Test Post', 'A great update from the business')
       RETURNING id, title`,
      [businessId],
    )).rows[0];
    // C already has a conversation with A — one link message from T1's offer share, one from
    // T8's event share — reuse it for the post share too (tests idempotent conversation reuse
    // across three different content types, not just a same-content reshare like T7 covers).
    const t9 = await api('POST', '/feed/share/offer-to-friends', {
      token: A.token, body: { content_type: 'post', content_id: post.id, targetProfileIds: [C.profileId] },
    });
    const t9Result = t9.data?.data?.results?.[0];
    const cMsgs2 = cConvId ? await api('GET', `/conversations/${cConvId}/messages`, { token: C.token }) : null;
    const postLinkMsgCount = (cMsgs2?.data?.data?.messages ?? []).filter((m) => m.body.includes('/s/')).length;
    assert('T9-POST-REFER', t9.status === 201 && !!t9Result?.ok && t9Result.conversationId === cConvId && postLinkMsgCount === 3,
      'Sharing a POST via the same endpoint reuses the existing A<->C conversation (now 3 link messages: offer/event/post)', { t9Result, postLinkMsgCount });

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
