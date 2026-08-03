const { query } = require('../../config/database');

// Mutating helpers accept an optional `client` so callers can run them inside an
// existing transaction (business registration hook). Falls back to the pool otherwise.
const runner = (client) => (client ? (text, params) => client.query(text, params) : query);

// business_invites can no longer be created via any API (the named-invite screen/endpoints were
// removed — the personal business-referral code below is the only creation path now). These two
// lookups remain solely so any pre-existing legacy business_invites rows still resolve correctly.
//
// Read-only lookup used by the deep-link resolver and by registration-time resolution.
async function getInviteByCode(invite_code) {
  const { rows } = await query(
    `SELECT * FROM business_invites WHERE invite_code = $1`,
    [invite_code],
  );
  return rows[0] ?? null;
}

// Conditional UPDATE — only flips pending/sent -> converted. Returns no row (and thus no-ops
// downstream side effects) if the invite was already converted, making this the idempotency gate
// for the whole registration-time resolution.
async function markConverted(client, inviteId, businessId) {
  const q = runner(client);
  const { rows } = await q(
    `UPDATE business_invites
        SET status = 'converted',
            converted_at = NOW(),
            converted_business_id = $2
      WHERE id = $1
        AND status IN ('pending', 'sent')
      RETURNING *`,
    [inviteId, businessId],
  );
  return rows[0] ?? null;
}

// Permanent, reusable, per-profile business-referral code — mirrors referral.model.js's app-code
// get-or-create pattern exactly, but scoped to referral_codes.type='business' (declared in the
// schema, previously unused by any code path). business_id is always NULL: this code is not tied
// to one target business, unlike the named business_invites flow above.
//
// ORDER BY created_at/id ensures a deterministic "first" code even if a race ever produces more
// than one row for a profile — referral_codes' UNIQUE(profile_id, type, business_id) does not
// dedupe NULL business_id values (standard SQL: NULLs are never equal to each other).
async function getPersonalReferralCode(profileId) {
  const { rows } = await query(
    `SELECT * FROM referral_codes
      WHERE profile_id = $1 AND type = 'business' AND business_id IS NULL
      ORDER BY created_at ASC, id ASC
      LIMIT 1`,
    [profileId],
  );
  return rows[0] ?? null;
}

async function insertPersonalReferralCode(profileId, code) {
  const { rows } = await query(
    `INSERT INTO referral_codes (profile_id, business_id, code, type)
     VALUES ($1, NULL, $2, 'business')
     ON CONFLICT (profile_id, type, business_id) DO NOTHING
     RETURNING *`,
    [profileId, code],
  );
  return rows[0];
}

async function findPersonalReferralCodeByCode(code) {
  const { rows } = await query(
    `SELECT * FROM referral_codes WHERE code = $1 AND type = 'business' AND business_id IS NULL LIMIT 1`,
    [code],
  );
  return rows[0] ?? null;
}

// Idempotency guard for the permanent-code registration path, which has no per-invite "converted"
// row to gate on (unlike business_invites' markConverted). Reuses the notification as the source of
// truth for "has this inviter already been granted membership for this specific business".
async function hasGrantedBusinessReferralMembership(client, inviterProfileId, businessId) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT id FROM notifications
      WHERE profile_id = $1
        AND type = 'invited_business_joined'
        AND data->>'business_id' = $2
      LIMIT 1`,
    [inviterProfileId, businessId],
  );
  return !!rows[0];
}

module.exports = {
  getInviteByCode,
  markConverted,
  getPersonalReferralCode,
  insertPersonalReferralCode,
  findPersonalReferralCodeByCode,
  hasGrantedBusinessReferralMembership,
};
