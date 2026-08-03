const { query } = require('../../config/database');

const runner = (client) => (client ? (text, params) => client.query(text, params) : query);

// ORDER BY created_at/id ensures a deterministic "first" code even if a race ever produces more
// than one 'app' row for a profile — referral_codes' UNIQUE(profile_id, type, business_id)
// constraint does not dedupe NULL business_id values (standard SQL: NULLs are never equal).
async function getAppReferralCode(client, profileId) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT * FROM referral_codes
      WHERE profile_id = $1 AND type = 'app'
      ORDER BY created_at ASC, id ASC
      LIMIT 1`,
    [profileId],
  );
  return rows[0] ?? null;
}

async function insertAppReferralCode(client, { profileId, code }) {
  const q = runner(client);
  const { rows } = await q(
    `INSERT INTO referral_codes (profile_id, business_id, code, type)
     VALUES ($1, NULL, $2, 'app')
     ON CONFLICT (profile_id, type, business_id) DO NOTHING
     RETURNING *`,
    [profileId, code],
  );
  return rows[0];
}

async function findAppReferralCodeByCode(client, code) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT * FROM referral_codes WHERE code = $1 AND type = 'app' LIMIT 1`,
    [code],
  );
  return rows[0] ?? null;
}

async function referralExists(client, { referralCodeId, referredProfileId }) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT id FROM referrals WHERE referral_code_id = $1 AND referred_profile_id = $2 LIMIT 1`,
    [referralCodeId, referredProfileId],
  );
  return !!rows[0];
}

async function insertReferral(client, { referralCodeId, referrerProfileId, referredProfileId }) {
  const q = runner(client);
  const { rows } = await q(
    `INSERT INTO referrals (referrer_profile_id, referred_profile_id, referral_code_id, type, status, completed_at)
     VALUES ($1, $2, $3, 'app', 'completed', NOW())
     RETURNING *`,
    [referrerProfileId, referredProfileId, referralCodeId],
  );
  return rows[0];
}

// Combined app-level + business-level "who joined because of me / who I joined via" list.
// direction: 'all' | 'joined_via_me' | 'i_joined_via'; search matches display_name or business_name.
// excludeBusinessOwnerOf: optional business id — drops that business's own owner (personal profile)
// from the results, so a business owner never appears as a referable "friend" for their own content.
async function getCombinedReferrals(profileId, { direction, search, excludeBusinessOwnerOf }) {
  const { rows } = await query(
    `SELECT * FROM (
       SELECT p.id AS profile_id, p.display_name, p.avatar_url,
              CASE WHEN r.referrer_profile_id = $1 THEN 'joined_via_me' ELSE 'i_joined_via' END AS direction,
              'touchpoints' AS joined_context,
              NULL::text AS business_name,
              COALESCE(r.completed_at, r.created_at) AS joined_at,
              rc.code AS referral_code_used
         FROM referrals r
         JOIN referral_codes rc ON rc.id = r.referral_code_id
         JOIN profiles p ON p.id = (CASE WHEN r.referrer_profile_id = $1 THEN r.referred_profile_id ELSE r.referrer_profile_id END)
        WHERE r.type = 'app' AND (r.referrer_profile_id = $1 OR r.referred_profile_id = $1)

       UNION ALL

       SELECT p.id AS profile_id, p.display_name, p.avatar_url,
              CASE WHEN ci.inviter_profile_id = $1 THEN 'joined_via_me' ELSE 'i_joined_via' END AS direction,
              'business' AS joined_context,
              b.name AS business_name,
              COALESCE(ci.subscribed_at, ci.registered_at) AS joined_at,
              ci.referral_code AS referral_code_used
         FROM customer_invites ci
         JOIN businesses b ON b.id = ci.business_id
         JOIN profiles p ON p.id = (CASE WHEN ci.inviter_profile_id = $1 THEN ci.registered_profile_id ELSE ci.inviter_profile_id END)
        WHERE ci.status IN ('registered', 'subscribed')
          AND (ci.inviter_profile_id = $1 OR ci.registered_profile_id = $1)
     ) combined
     WHERE ($2::text IS NULL OR $2 = 'all' OR direction = $2)
       AND ($3::text IS NULL OR display_name ILIKE '%' || $3 || '%' OR business_name ILIKE '%' || $3 || '%')
       AND ($4::uuid IS NULL OR profile_id NOT IN (
             SELECT p2.id FROM businesses b
             JOIN profiles p1 ON p1.id = b.profile_id
             JOIN profiles p2 ON p2.user_id = p1.user_id
             WHERE b.id = $4
           ))
     ORDER BY joined_at DESC`,
    [profileId, direction ?? null, search ?? null, excludeBusinessOwnerOf ?? null],
  );
  return rows;
}

// True when the pair is connected via an app-level referral or a business customer-invite
// (either direction, any completed/registered state). Used to widen chat friend-eligibility
// beyond trusted_friends without writing new trusted_friends rows.
async function isReferralConnected(profileA, profileB) {
  const { rows } = await query(
    `SELECT 1 FROM referrals
      WHERE type = 'app'
        AND ((referrer_profile_id = $1 AND referred_profile_id = $2)
          OR (referrer_profile_id = $2 AND referred_profile_id = $1))
     UNION
     SELECT 1 FROM customer_invites
      WHERE status IN ('registered', 'subscribed')
        AND ((inviter_profile_id = $1 AND registered_profile_id = $2)
          OR (inviter_profile_id = $2 AND registered_profile_id = $1))
     LIMIT 1`,
    [profileA, profileB],
  );
  return rows.length > 0;
}

async function insertNotification(client, { profileId, type, title, body, data }) {
  const q = runner(client);
  const { rows } = await q(
    `INSERT INTO notifications (profile_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [profileId, type, title ?? null, body ?? null, data ? JSON.stringify(data) : null],
  );
  return rows[0];
}

async function notificationExistsForReferral(client, referrerProfileId, referredProfileId) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT id FROM notifications
      WHERE profile_id = $1
        AND type = 'referral_joined'
        AND data->>'referred_profile_id' = $2
      LIMIT 1`,
    [referrerProfileId, referredProfileId],
  );
  return !!rows[0];
}

module.exports = {
  getAppReferralCode,
  insertAppReferralCode,
  findAppReferralCodeByCode,
  referralExists,
  insertReferral,
  getCombinedReferrals,
  isReferralConnected,
  insertNotification,
  notificationExistsForReferral,
};
