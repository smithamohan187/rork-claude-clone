const { query } = require('../../config/database');

// Mutating helpers accept an optional `client` so callers can run them inside an
// existing transaction (register/subscribe hooks). Falls back to the pool otherwise.
const runner = (client) => (client ? (text, params) => client.query(text, params) : query);

async function insertRecipient({
  referral_code,
  content_type,
  content_id,
  business_id,
  sharer_profile_id,
  recipient_contact,
}) {
  const { rows } = await query(
    `INSERT INTO share_recipients
       (referral_code, content_type, content_id, business_id, sharer_profile_id, recipient_contact)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [referral_code, content_type, content_id, business_id, sharer_profile_id, recipient_contact ?? null],
  );
  return rows[0];
}

// Like insertRecipient, but for a recipient whose profile is already known upfront (e.g. an
// existing trusted friend selected from the chat "refer" flow) — inserts directly as 'registered'
// so the existing subscribe-time lookup (findRegisteredRecipient) finds it exactly like any other
// content-share, without ever passing through the 'sent' stage.
async function insertRegisteredRecipient({
  referral_code,
  content_type,
  content_id,
  business_id,
  sharer_profile_id,
  registered_profile_id,
}) {
  const { rows } = await query(
    `INSERT INTO share_recipients
       (referral_code, content_type, content_id, business_id, sharer_profile_id,
        status, registered_profile_id, registered_at)
     VALUES ($1, $2, $3, $4, $5, 'registered', $6, NOW())
     RETURNING *`,
    [referral_code, content_type, content_id, business_id, sharer_profile_id, registered_profile_id],
  );
  return rows[0];
}

// Existence check for de-duplicating repeat shares of the same content to the same friend — no
// unique constraint exists on this table to lean on, so this mirrors the check-then-insert idiom
// already used elsewhere (e.g. notificationExistsForInvite).
async function findRecipientForShare({ sharer_profile_id, business_id, content_type, content_id, registered_profile_id }) {
  const { rows } = await query(
    `SELECT * FROM share_recipients
      WHERE sharer_profile_id = $1
        AND business_id = $2
        AND content_type = $3
        AND content_id = $4
        AND registered_profile_id = $5
      LIMIT 1`,
    [sharer_profile_id, business_id, content_type, content_id, registered_profile_id],
  );
  return rows[0] ?? null;
}

async function findByReferralCode(referral_code) {
  const { rows } = await query(
    `SELECT * FROM share_recipients WHERE referral_code = $1`,
    [referral_code],
  );
  return rows[0];
}

// Transitions a 'sent' row to 'registered'. Returns the updated row, or undefined if the code
// does not exist or was already consumed (not in 'sent' status).
async function markRegistered(client, referral_code, registered_profile_id) {
  const q = runner(client);
  const { rows } = await q(
    `UPDATE share_recipients
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

// Finds a registered-but-not-yet-friend-linked recipient row for this new subscriber + business.
async function findRegisteredRecipient(client, { registered_profile_id, business_id }) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT * FROM share_recipients
      WHERE registered_profile_id = $1
        AND business_id = $2
        AND status = 'registered'
      LIMIT 1`,
    [registered_profile_id, business_id],
  );
  return rows[0];
}

async function markFriendLinked(client, id) {
  const q = runner(client);
  const { rows } = await q(
    `UPDATE share_recipients
        SET status = 'friend_linked',
            friend_linked_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [id],
  );
  return rows[0];
}

// Inserts an ordered friendship pair. The CHECK (one < two) + UNIQUE constraint mean a single row
// is queryable from either side; ON CONFLICT DO NOTHING makes repeat calls idempotent.
async function insertTrustedFriend(client, { profile_a, profile_b, source_type, source_id }) {
  const q = runner(client);
  const { rows } = await q(
    `INSERT INTO trusted_friends (profile_id_one, profile_id_two, source_type, source_id)
     VALUES (LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid), $3, $4)
     ON CONFLICT (profile_id_one, profile_id_two) DO NOTHING
     RETURNING *`,
    [profile_a, profile_b, source_type ?? 'content_share', source_id ?? null],
  );
  return rows[0]; // undefined when the pair already existed
}

async function insertPointsLog(client, { profile_id, points_type, source_type, source_id, points_amount, status }) {
  const q = runner(client);
  const { rows } = await q(
    `INSERT INTO referral_points_log
       (profile_id, points_type, source_type, source_id, points_amount, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [profile_id, points_type, source_type, source_id ?? null, points_amount ?? null, status ?? 'pending_credit'],
  );
  return rows[0];
}

module.exports = {
  insertRecipient,
  insertRegisteredRecipient,
  findRecipientForShare,
  findByReferralCode,
  markRegistered,
  findRegisteredRecipient,
  markFriendLinked,
  insertTrustedFriend,
  insertPointsLog,
};
