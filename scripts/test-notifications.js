// scripts/test-notifications.js
// In-app notifications: points_earned, reward_redeemed, new_offer/new_event fanout, and the
// referral_joined regression check. Sequential, self-contained (creates its own fixtures), PASS/FAIL.
//
// Run (backend must be up on :3000):
//   node scripts/test-notifications.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

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

async function api(method, endpoint, { token, body } = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

async function registerUser({ email, phone, full_name, referral_code }) {
  const body = {
    email,
    phone,
    password: 'Test123#',
    full_name: full_name || 'Notif Test User',
    location: 'Test City',
    referral_code,
  };
  const r = await api('POST', '/auth/signup', { body });
  return {
    ok: r.ok,
    status: r.status,
    token: r.data?.data?.accessToken,
    profileId: r.data?.data?.profile?.id,
    data: r.data,
  };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  TouchPoints — In-App Notifications Test');
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
  const createdProfileIds = [];
  const createdEmails = [];
  let businessId = null;

  try {
    // ── Fixtures: business owner + business + reward config + a redeemable reward ─────────
    const Owner = await registerUser({
      email: `notif-owner-${stamp}@test.com`,
      phone: `+1710${String(stamp).slice(-7)}`,
      full_name: 'Owner Tester',
    });
    assert('T0-REGISTER-OWNER', Owner.ok && Owner.token && Owner.profileId, 'Business owner registers → 201', Owner.data);
    createdProfileIds.push(Owner.profileId); createdEmails.push(`notif-owner-${stamp}@test.com`);

    const catRow = (await db.query('SELECT id FROM business_categories LIMIT 1')).rows[0];
    assert('T0b-CATEGORY-FIXTURE', !!catRow, 'A business category exists in the dev DB', catRow);

    const registerRes = await api('POST', '/businesses/register', {
      token: Owner.token,
      body: {
        business_name: `Notif Test Biz ${stamp}`,
        business_type: 'incentivised',
        category_id: catRow.id,
        description: 'Notification test fixture business',
        phone: '1234567890',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        inhouse_referral: false,
        hours: [
          { day_of_week: 0, is_closed: true },
          { day_of_week: 1, is_closed: false, open_time: '09:00', close_time: '17:00' },
          { day_of_week: 2, is_closed: false, open_time: '09:00', close_time: '17:00' },
          { day_of_week: 3, is_closed: true },
          { day_of_week: 4, is_closed: false, open_time: '09:00', close_time: '17:00' },
          { day_of_week: 5, is_closed: false, open_time: '09:00', close_time: '17:00' },
          { day_of_week: 6, is_closed: true },
        ],
      },
    });
    businessId = registerRes.data?.data?.id;
    assert('T1-REGISTER-BUSINESS', registerRes.status === 201 && !!businessId, 'Owner registers a business → 201', registerRes.data);

    const configRes = await api('PUT', `/reward-config/${businessId}`, {
      token: Owner.token,
      body: { welcome_bonus_points: 30 },
    });
    assert('T2-SET-WELCOME-BONUS', configRes.status === 200 && configRes.data?.data?.config?.welcome_bonus_points === 30,
      'Owner sets welcome_bonus_points=30 on reward config', configRes.data);

    const rewardRes = await api('POST', '/rewards-catalog', {
      token: Owner.token,
      body: { name: 'Free Coffee', points_required: 10 },
    });
    const rewardId = rewardRes.data?.data?.reward?.id;
    assert('T3-CREATE-REWARD', rewardRes.status === 201 && !!rewardId, 'Owner creates a 10-point reward in the catalog', rewardRes.data);

    // ── Customer A subscribes → points_earned notification ────────────────────────────────
    const CustA = await registerUser({
      email: `notif-a-${stamp}@test.com`,
      phone: `+1711${String(stamp).slice(-7)}`,
      full_name: 'Customer A',
    });
    assert('T4-REGISTER-CUSTOMER-A', CustA.ok && CustA.token && CustA.profileId, 'Customer A registers → 201', CustA.data);
    createdProfileIds.push(CustA.profileId); createdEmails.push(`notif-a-${stamp}@test.com`);

    const subRes = await api('POST', '/subscriptions/subscribe', { token: CustA.token, body: { business_id: businessId } });
    assert('T5-SUBSCRIBE-A', subRes.status === 200 && subRes.data?.data?.subscribed === true,
      'Customer A subscribes to the business → 200', subRes.data);

    const pointsEarnedRows = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'points_earned'`,
      [CustA.profileId],
    )).rows;
    assert('T6-POINTS-EARNED-NOTIFICATION', pointsEarnedRows.length === 1 && pointsEarnedRows[0].data?.business_id === businessId,
      'Exactly one points_earned notification row inserted for the welcome bonus', pointsEarnedRows);

    // ── Redeem the reward → reward_redeemed notification ───────────────────────────────────
    const redeemRes = await api('POST', `/businesses/${businessId}/rewards/${rewardId}/redeem`, { token: CustA.token, body: {} });
    const couponId = redeemRes.data?.data?.couponId;
    assert('T7-REDEEM-REWARD', redeemRes.status === 201 && !!couponId, 'Customer A redeems the reward → coupon created', redeemRes.data);

    const rewardRedeemedRows = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'reward_redeemed'`,
      [CustA.profileId],
    )).rows;
    assert('T8-REWARD-REDEEMED-NOTIFICATION', rewardRedeemedRows.length === 1 && rewardRedeemedRows[0].data?.coupon_id === couponId,
      'Exactly one reward_redeemed notification row inserted for the coupon', rewardRedeemedRows);

    // ── Refund/compensating transaction must NOT fire a notification ──────────────────────
    const notifCountBeforeExpiry = (await db.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE profile_id = $1`,
      [CustA.profileId],
    )).rows[0].c;

    await db.query(`UPDATE coupons SET expires_at = NOW() - INTERVAL '1 second' WHERE id = $1`, [couponId]);
    const expireRes = await api('POST', `/coupons/${couponId}/expire-check`, { token: CustA.token, body: {} });
    assert('T9-EXPIRE-COUPON', expireRes.status === 200 && expireRes.data?.data?.expired === true,
      'Coupon expiry flips status and writes a redemption_refund transaction', expireRes.data);

    const notifCountAfterExpiry = (await db.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE profile_id = $1`,
      [CustA.profileId],
    )).rows[0].c;
    assert('T10-NO-NOTIFICATION-ON-REFUND', notifCountAfterExpiry === notifCountBeforeExpiry,
      'The compensating refund transaction does NOT insert a notification row', { before: notifCountBeforeExpiry, after: notifCountAfterExpiry });

    // ── Customer B also subscribes, to prove fanout hits every current subscriber ─────────
    const CustB = await registerUser({
      email: `notif-b-${stamp}@test.com`,
      phone: `+1712${String(stamp).slice(-7)}`,
      full_name: 'Customer B',
    });
    assert('T11-REGISTER-CUSTOMER-B', CustB.ok && CustB.token && CustB.profileId, 'Customer B registers → 201', CustB.data);
    createdProfileIds.push(CustB.profileId); createdEmails.push(`notif-b-${stamp}@test.com`);
    await api('POST', '/subscriptions/subscribe', { token: CustB.token, body: { business_id: businessId } });

    // ── Owner creates a new offer → new_offer fanout to A and B in one batched insert ─────
    const offerRes = await api('POST', '/offers', {
      token: Owner.token,
      body: { title: 'Weekend Special 20% Off', discount_type: 'percent', discount_value: 20 },
    });
    const offerId = offerRes.data?.data?.offer?.id;
    assert('T12-CREATE-OFFER', offerRes.status === 201 && !!offerId, 'Owner creates a new offer → 201', offerRes.data);

    const offerNotifRows = (await db.query(
      `SELECT profile_id FROM notifications WHERE type = 'new_offer' AND data->>'offer_id' = $1`,
      [offerId],
    )).rows;
    const offerNotifProfiles = offerNotifRows.map(r => r.profile_id).sort();
    const expectedSubscribers = [CustA.profileId, CustB.profileId].sort();
    assert('T13-NEW-OFFER-FANOUT', JSON.stringify(offerNotifProfiles) === JSON.stringify(expectedSubscribers),
      'Every current subscriber (A and B) received exactly one new_offer notification for this offer', offerNotifRows);

    // ── Owner creates a new event → new_event fanout ───────────────────────────────────────
    const eventRes = await api('POST', '/events', {
      token: Owner.token,
      body: { title: 'Weekend Tasting Event', starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
    });
    const eventId = eventRes.data?.data?.event?.id;
    assert('T14-CREATE-EVENT', eventRes.status === 201 && !!eventId, 'Owner creates a new event → 201', eventRes.data);

    const eventNotifRows = (await db.query(
      `SELECT profile_id FROM notifications WHERE type = 'new_event' AND data->>'event_id' = $1`,
      [eventId],
    )).rows;
    const eventNotifProfiles = eventNotifRows.map(r => r.profile_id).sort();
    assert('T15-NEW-EVENT-FANOUT', JSON.stringify(eventNotifProfiles) === JSON.stringify(expectedSubscribers),
      'Every current subscriber (A and B) received exactly one new_event notification for this event', eventNotifRows);

    // ── Referral flow regression: referral_joined still fires exactly once ────────────────
    const Referrer = await registerUser({
      email: `notif-referrer-${stamp}@test.com`,
      phone: `+1713${String(stamp).slice(-7)}`,
      full_name: 'Referrer Tester',
    });
    createdProfileIds.push(Referrer.profileId); createdEmails.push(`notif-referrer-${stamp}@test.com`);
    const codeRes = await api('GET', '/referrals/my-code', { token: Referrer.token });
    const referrerCode = codeRes.data?.data?.code;

    const Joiner = await registerUser({
      email: `notif-joiner-${stamp}@test.com`,
      phone: `+1714${String(stamp).slice(-7)}`,
      full_name: 'Joiner Tester',
      referral_code: referrerCode,
    });
    assert('T16-REGISTER-JOINER', Joiner.ok && Joiner.profileId, "Joiner registers with Referrer's app code → 201", Joiner.data);
    createdProfileIds.push(Joiner.profileId); createdEmails.push(`notif-joiner-${stamp}@test.com`);

    const referralJoinedRows = (await db.query(
      `SELECT * FROM notifications WHERE profile_id = $1 AND type = 'referral_joined' AND data->>'referred_profile_id' = $2`,
      [Referrer.profileId, Joiner.profileId],
    )).rows;
    assert('T17-REFERRAL-JOINED-REGRESSION', referralJoinedRows.length === 1,
      'referral_joined still fires exactly once (existing flow untouched)', referralJoinedRows);

    // ── List / read / mark-all / unread-count endpoints ────────────────────────────────────
    const listRes = await api('GET', '/notifications/mine', { token: CustA.token });
    const list = listRes.data?.data?.notifications ?? [];
    const types = list.map(n => n.type);
    assert('T18-LIST-NOTIFICATIONS', listRes.status === 200 && types.includes('points_earned') &&
      types.includes('reward_redeemed') && types.includes('new_offer') && types.includes('new_event'),
      'GET /notifications/mine returns all four inserted types for Customer A', types);

    const timestamps = list.map(n => new Date(n.created_at).getTime());
    const isSortedDesc = timestamps.every((t, i) => i === 0 || timestamps[i - 1] >= t);
    assert('T19-SORT-ORDER', isSortedDesc, 'Notifications are sorted newest first', timestamps);

    const unreadRes1 = await api('GET', '/notifications/mine/unread-count', { token: CustA.token });
    const unreadFromList = list.filter(n => !n.is_read).length;
    assert('T20-UNREAD-COUNT-MATCHES-LIST', unreadRes1.status === 200 && unreadRes1.data?.data?.count === unreadFromList,
      'Unread count endpoint matches the unread rows in the list', { endpoint: unreadRes1.data, computed: unreadFromList });

    const firstUnread = list.find(n => !n.is_read);
    assert('T21-HAS-UNREAD-TO-TEST', !!firstUnread, 'At least one unread notification exists to exercise mark-as-read', list);
    if (firstUnread) {
      const readRes = await api('PATCH', `/notifications/${firstUnread.id}/read`, { token: CustA.token, body: {} });
      assert('T22-MARK-READ', readRes.status === 200 && readRes.data?.data?.notification?.is_read === true,
        'PATCH /notifications/:id/read flips is_read to true', readRes.data);

      const unreadRes2 = await api('GET', '/notifications/mine/unread-count', { token: CustA.token });
      assert('T23-UNREAD-COUNT-DROPS-BY-ONE', unreadRes2.data?.data?.count === unreadFromList - 1,
        'Unread count drops by exactly one after marking one notification read', unreadRes2.data);
    }

    const markAllRes = await api('PATCH', '/notifications/mine/read-all', { token: CustA.token, body: {} });
    assert('T24-MARK-ALL-READ', markAllRes.status === 200, 'PATCH /notifications/mine/read-all succeeds', markAllRes.data);

    const unreadRes3 = await api('GET', '/notifications/mine/unread-count', { token: CustA.token });
    assert('T25-UNREAD-COUNT-ZERO', unreadRes3.data?.data?.count === 0,
      'Unread count is 0 after mark-all-read', unreadRes3.data);

  } finally {
    // Scoped cleanup — only rows tied to the profiles/emails/business this run created.
    if (createdProfileIds.length > 0) {
      await db.query(`DELETE FROM notifications WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM coupons WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM points_transactions WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM subscriptions WHERE profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM referrals WHERE referrer_profile_id = ANY($1) OR referred_profile_id = ANY($1)`, [createdProfileIds]);
      await db.query(`DELETE FROM referral_codes WHERE profile_id = ANY($1)`, [createdProfileIds]);
    }
    if (businessId) {
      await db.query(`DELETE FROM offers WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM events WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM rewards_catalog WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM reward_config WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM business_hours WHERE business_id = $1`, [businessId]);
      await db.query(`DELETE FROM businesses WHERE id = $1`, [businessId]);
    }
    if (createdProfileIds.length > 0) {
      await db.query(`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [createdEmails]);
      await db.query(`DELETE FROM profiles WHERE id = ANY($1) OR user_id IN (SELECT id FROM users WHERE email = ANY($2))`, [createdProfileIds, createdEmails]);
      await db.query(`DELETE FROM users WHERE email = ANY($1)`, [createdEmails]);
    }
    await db.end();
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
  console.log('══════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
