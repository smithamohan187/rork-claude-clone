const { query } = require('../../config/database');

async function createInvite({
  inviter_profile_id,
  business_name,
  contact_name,
  contact_method,
  contact_value,
  invite_code,
}) {
  const { rows } = await query(
    `INSERT INTO business_invites
       (inviter_profile_id, business_name, contact_name, contact_method, contact_value, invite_code)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (inviter_profile_id, contact_value) WHERE contact_value IS NOT NULL
     DO NOTHING
     RETURNING *`,
    [inviter_profile_id, business_name, contact_name ?? null, contact_method, contact_value ?? null, invite_code],
  );
  return rows[0]; // undefined when DO NOTHING fired (duplicate)
}

async function getInvitesByProfile(inviter_profile_id) {
  const { rows } = await query(
    `SELECT * FROM business_invites
     WHERE inviter_profile_id = $1
     ORDER BY created_at DESC`,
    [inviter_profile_id],
  );
  return rows;
}

module.exports = { createInvite, getInvitesByProfile };
