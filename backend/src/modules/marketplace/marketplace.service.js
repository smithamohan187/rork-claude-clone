const { query } = require('../../config/database');
const marketplaceModel = require('./marketplace.model');
const shareReferralsModel = require('../shareReferrals/shareReferrals.model');
const subscriptionModel = require('../subscriptions/subscription.model');
const notificationsService = require('../notifications/notifications.service');
const { SHARE_BASE_URL } = require('../../config/shareUrl');

function buildInviteUrl(invite_code) {
  return `${SHARE_BASE_URL}/s/${invite_code}`;
}

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

// Returns the caller's permanent, reusable business-referral code, creating one on first request.
// Profile-type-agnostic (personal or business active profile) — resolveProfileId doesn't care.
// Unlike a named business_invites code, this one is not tied to a single target business: every
// distinct business that registers through it independently grants the inviter membership (see
// resolveBusinessInviteOnRegister's fallback path below).
async function getMyBusinessReferralCode(userId) {
  const profileId = await resolveProfileId(userId);

  const existing = await marketplaceModel.getPersonalReferralCode(profileId);
  if (existing) return { code: existing.code, url: buildInviteUrl(existing.code) };

  const code = generateInviteCode();
  const created = await marketplaceModel.insertPersonalReferralCode(profileId, code);
  // ON CONFLICT DO NOTHING may fire on a race — re-fetch if so.
  const row = created ?? (await marketplaceModel.getPersonalReferralCode(profileId));
  return { code: row.code, url: buildInviteUrl(row.code) };
}

// Shared by both registration-time resolution paths below — subscribes the inviter as a member of
// the new business, notifies them, and logs a pending points entry.
async function grantMembershipAndNotify(client, { inviterProfileId, newBusinessId, businessName, sourceType, sourceId }) {
  await subscriptionModel.subscribeWithClient(client, inviterProfileId, newBusinessId);

  await notificationsService.createNotification(client, {
    profileId: inviterProfileId,
    type: 'invited_business_joined',
    title: "You're now a member",
    body: businessName ? `You joined ${businessName} as a member.` : 'You joined a business as a member.',
    data: { business_id: newBusinessId, source_type: sourceType, source_id: sourceId },
  });

  await shareReferralsModel.insertPointsLog(client, {
    profile_id: inviterProfileId,
    // points_type is CHECK-constrained to ('join','share') — 'share' is the existing convention
    // for "points pending for the person who referred someone in" (see maybeLinkTrustedFriend).
    points_type: 'share',
    source_type: sourceType,
    source_id: sourceId,
    points_amount: null,
    status: 'pending_credit',
  });
}

// Called inside the business-registration transaction. Resolves a business-invite code (if any) —
// first against a named business_invites row (legacy, no longer creatable via any API — kept only
// for backward compatibility with any pre-existing codes), then, if not found there, against a
// permanent per-profile business-referral code (the only creation path remaining, reusable across
// any number of businesses). Grants the inviter membership + notification + pending points entry
// either way. Never blocks registration: missing/invalid/already-used codes are silently ignored.
async function resolveBusinessInviteOnRegister(client, invite_code, { newBusinessId }) {
  const invite = await marketplaceModel.getInviteByCode(invite_code);
  if (invite) {
    // Idempotent via markConverted's conditional UPDATE — a retry of the same registration event
    // is a guaranteed no-op for everything below it.
    const converted = await marketplaceModel.markConverted(client, invite.id, newBusinessId);
    if (!converted) return; // already converted — nothing to do

    await grantMembershipAndNotify(client, {
      inviterProfileId: invite.inviter_profile_id,
      newBusinessId,
      businessName: invite.business_name,
      sourceType: 'business_invite',
      sourceId: invite.id,
    });
    return;
  }

  // Not a named invite code — check the permanent personal business-referral code namespace.
  const personalCode = await marketplaceModel.findPersonalReferralCodeByCode(invite_code);
  if (!personalCode) return;

  // No per-invite "converted" row to gate on here (this code is reusable across many businesses),
  // so idempotency is checked directly against the notification that would otherwise be duplicated.
  const alreadyGranted = await marketplaceModel.hasGrantedBusinessReferralMembership(
    client, personalCode.profile_id, newBusinessId,
  );
  if (alreadyGranted) return;

  await grantMembershipAndNotify(client, {
    inviterProfileId: personalCode.profile_id,
    newBusinessId,
    businessName: null,
    sourceType: 'business_referral_code',
    sourceId: personalCode.id,
  });
}

module.exports = {
  getMyBusinessReferralCode,
  resolveBusinessInviteOnRegister,
};
