const { query, getClient } = require('../../config/database');
const referralModel = require('./referral.model');
const { SHARE_BASE_URL } = require('../../config/shareUrl');

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FR-';
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code; // e.g. FR-X4RZMQP7KD
}

function buildReferralUrl(code) {
  return `${SHARE_BASE_URL}/s/${code}`;
}

async function resolveProfileId(userId) {
  const { rows } = await query('SELECT active_profile_id FROM users WHERE id = $1', [userId]);
  const profileId = rows[0]?.active_profile_id ?? null;
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return profileId;
}

// Returns the caller's permanent app referral code, creating one on first request.
async function getMyReferral(userId) {
  const profileId = await resolveProfileId(userId);

  const existing = await referralModel.getAppReferralCode(null, profileId);
  if (existing) return { code: existing.code, url: buildReferralUrl(existing.code) };

  const code = generateReferralCode();
  const created = await referralModel.insertAppReferralCode(null, { profileId, code });
  // ON CONFLICT DO NOTHING may fire on a race — re-fetch if so.
  const row = created ?? (await referralModel.getAppReferralCode(null, profileId));
  return { code: row.code, url: buildReferralUrl(row.code) };
}

async function getMyReferrals(userId, { direction, search, excludeBusinessOwnerOf } = {}) {
  const profileId = await resolveProfileId(userId);
  return referralModel.getCombinedReferrals(profileId, { direction, search, excludeBusinessOwnerOf });
}

// Called inside the signup transaction. Links the referrer to the new profile and notifies the
// referrer. Never blocks registration: missing/invalid/self/already-linked codes are silently
// ignored.
async function resolveReferralOnRegister(client, code, newProfileId) {
  const referralCode = await referralModel.findAppReferralCodeByCode(client, code);
  if (!referralCode) return;
  if (referralCode.profile_id === newProfileId) return; // self-referral guard

  const alreadyLinked = await referralModel.referralExists(client, {
    referralCodeId: referralCode.id,
    referredProfileId: newProfileId,
  });
  if (alreadyLinked) return;

  await referralModel.insertReferral(client, {
    referralCodeId: referralCode.id,
    referrerProfileId: referralCode.profile_id,
    referredProfileId: newProfileId,
  });

  await notifyReferrer(client, referralCode.profile_id, newProfileId);
}

async function notifyReferrer(client, referrerProfileId, referredProfileId) {
  const alreadyNotified = await referralModel.notificationExistsForReferral(client, referrerProfileId, referredProfileId);
  if (alreadyNotified) return;

  await referralModel.insertNotification(client, {
    profileId: referrerProfileId,
    type: 'referral_joined',
    title: 'Someone joined using your referral link',
    body: 'A friend you invited just joined TouchPoints.',
    data: { referred_profile_id: referredProfileId },
  });
}

module.exports = {
  generateReferralCode,
  buildReferralUrl,
  getMyReferral,
  getMyReferrals,
  resolveReferralOnRegister,
};
