const { query } = require('../../config/database');

// Mutating helpers accept an optional `client` so callers can run them inside an
// existing transaction (subscribe hook). Falls back to the pool otherwise.
const runner = (client) => (client ? (text, params) => client.query(text, params) : query);

async function insertInvite(client, {
  inviter_profile_id,
  business_id,
  channel,
  invitee_identifier,
  invitee_email,
  invitee_name,
  referral_code,
}) {
  const q = runner(client);
  const { rows } = await q(
    `INSERT INTO customer_invites
       (inviter_profile_id, business_id, channel, invitee_identifier, invitee_email, invitee_name, referral_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (business_id, invitee_identifier) DO NOTHING
     RETURNING *`,
    [inviter_profile_id, business_id, channel, invitee_identifier, invitee_email ?? null, invitee_name ?? null, referral_code],
  );
  return rows[0]; // undefined when DO NOTHING fired (duplicate)
}

async function getInvitesByProfile(inviterProfileId) {
  const { rows } = await query(
    `SELECT * FROM customer_invites
     WHERE inviter_profile_id = $1
     ORDER BY created_at DESC`,
    [inviterProfileId],
  );
  return rows;
}

async function findInviteByReferralCode(referral_code) {
  const { rows } = await query(
    `SELECT * FROM customer_invites WHERE referral_code = $1`,
    [referral_code],
  );
  return rows[0] ?? null;
}

async function getInvitesByBusiness(businessId) {
  const { rows } = await query(
    `SELECT * FROM customer_invites
     WHERE business_id = $1
     ORDER BY created_at DESC`,
    [businessId],
  );
  return rows;
}

// Transitions a 'sent' row to 'registered', stamping the profile that clicked the invite link and
// registered. Returns the updated row, or undefined if the code doesn't exist or was already
// consumed (not in 'sent' status) — mirrors shareReferrals.model.js's markRegistered.
async function markRegistered(client, referral_code, registered_profile_id) {
  const q = runner(client);
  const { rows } = await q(
    `UPDATE customer_invites
        SET status = 'registered',
            registered_profile_id = $2,
            registered_at = NOW()
      WHERE referral_code = $1
        AND status = 'sent'
      RETURNING *`,
    [referral_code, registered_profile_id],
  );
  return rows[0];
}

// Finds a 'registered' invite for this business matching the exact profile that registered via
// the invite link — robust, code-based match (doesn't depend on the subscriber's phone/email
// matching what was originally invited).
async function findRegisteredInviteForSubscriber(client, { registeredProfileId, businessId }) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT * FROM customer_invites
      WHERE registered_profile_id = $1
        AND business_id = $2
        AND status = 'registered'
      LIMIT 1`,
    [registeredProfileId, businessId],
  );
  return rows[0];
}

// Finds a non-subscribed invite for this business matching the subscriber's phone/email,
// checked against both invitee_identifier and invitee_email.
async function findInviteForSubscriber(client, { businessId, identifiers }) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT * FROM customer_invites
      WHERE business_id = $1
        AND status != 'subscribed'
        AND (invitee_identifier = ANY($2::text[]) OR invitee_email = ANY($2::text[]))
      LIMIT 1`,
    [businessId, identifiers],
  );
  return rows[0];
}

async function markSubscribed(client, inviteId) {
  const q = runner(client);
  const { rows } = await q(
    `UPDATE customer_invites
        SET status = 'subscribed',
            subscribed_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [inviteId],
  );
  return rows[0];
}

async function getBusinessProfileId(client, businessId) {
  const q = runner(client);
  const { rows } = await q(`SELECT profile_id FROM businesses WHERE id = $1`, [businessId]);
  return rows[0]?.profile_id ?? null;
}

async function getUserContactByProfileId(client, profileId) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT u.phone, u.email
       FROM profiles p
       JOIN users u ON u.id = p.user_id
      WHERE p.id = $1`,
    [profileId],
  );
  return rows[0] ?? null;
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

async function notificationExistsForInvite(client, profileId, inviteId) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT id FROM notifications
      WHERE profile_id = $1
        AND type = 'customer_subscribed'
        AND data->>'invite_id' = $2
      LIMIT 1`,
    [profileId, inviteId],
  );
  return !!rows[0];
}

module.exports = {
  insertInvite,
  getInvitesByProfile,
  findInviteByReferralCode,
  getInvitesByBusiness,
  markRegistered,
  findRegisteredInviteForSubscriber,
  findInviteForSubscriber,
  markSubscribed,
  getBusinessProfileId,
  getUserContactByProfileId,
  insertNotification,
  notificationExistsForInvite,
};
