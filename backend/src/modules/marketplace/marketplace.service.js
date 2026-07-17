const { query } = require('../../config/database');
const marketplaceModel = require('./marketplace.model');

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TP-BIZ-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code; // e.g. TP-BIZ-X4RZMQP7
}

async function resolveProfileId(userId) {
  const { rows } = await query('SELECT active_profile_id FROM users WHERE id = $1', [userId]);
  const profileId = rows[0]?.active_profile_id ?? null;
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return profileId;
}

async function createBusinessInvite(userId, { business_name, contact_name, contact_method, contact_value }) {
  const inviter_profile_id = await resolveProfileId(userId);
  const invite_code = generateInviteCode();

  const row = await marketplaceModel.createInvite({
    inviter_profile_id,
    business_name,
    contact_name,
    contact_method,
    contact_value,
    invite_code,
  });

  // TODO: future points hook — award points when invite.status transitions to 'converted'
  // e.g. await pointsService.awardPoints(inviter_profile_id, INVITE_REWARD_POINTS)

  return row ?? null; // null = ON CONFLICT DO NOTHING fired (duplicate contact_value)
}

async function getBusinessInvites(userId) {
  const inviter_profile_id = await resolveProfileId(userId);
  return marketplaceModel.getInvitesByProfile(inviter_profile_id);
}

module.exports = { createBusinessInvite, getBusinessInvites };
