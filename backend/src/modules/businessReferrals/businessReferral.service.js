const { getClient } = require('../../config/database');
const businessReferralModel = require('./businessReferral.model');
const subscriptionModel = require('../subscriptions/subscription.model');
const subscriptionService = require('../subscriptions/subscription.service');
const rewardConfigModel = require('../rewardConfig/rewardConfig.model');
const pointsModel = require('../points/points.model');
const notificationsService = require('../notifications/notifications.service');
const { SHARE_BASE_URL } = require('../../config/shareUrl');

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BR-';
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code; // e.g. BR-X4RZMQP7KD
}

async function resolveProfileId(userId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return profileId;
}

// Returns (lazily creating on first call) the caller's standing referral code for a business they
// subscribe to, plus live stats. Gated on an active subscription — mirrors the ReferralCard's own
// isSubscribed render guard as defense in depth, same pattern used throughout this codebase
// (see getBusinessMembers/removeBusinessMember in subscription.service.js).
async function getMyReferralForBusiness(userId, businessId) {
  const profileId = await resolveProfileId(userId);

  const subscription = await subscriptionModel.getSubscription(profileId, businessId);
  if (!subscription?.is_active) {
    throw Object.assign(new Error('Subscribe to this business to get your referral link'), { status: 403 });
  }

  const row = await businessReferralModel.getOrCreateReferralCode(businessId, profileId, generateReferralCode());
  const stats = await businessReferralModel.getStats(row.id);
  const rewardConfig = await rewardConfigModel.getRewardConfig(businessId);
  const bonusPerReferral = rewardConfig?.referral_bonus_points ?? 0;

  return {
    referralCode: row.referral_code,
    referralLink: `${SHARE_BASE_URL}/s/${row.referral_code}`,
    bonusPerReferral,
    stats: {
      referredCount: stats.referred_count,
      completedCount: stats.completed_count,
      pointsEarned: stats.completed_count * bonusPerReferral,
    },
  };
}

// Called once a logged-in friend lands via a sharer's /s/<code> link (same call shape as
// customerInviteService.resolvePendingCustomerInvite — see useShareDeepLink.ts/useSignUp.ts/
// useSignIn.ts's 'business' content_type branch, which this reuses unmodified on the client side).
async function resolvePendingBusinessReferral(userId, referralCode) {
  const profileId = await resolveProfileId(userId);

  const referral = await businessReferralModel.findByReferralCode(referralCode);
  if (!referral) {
    return { matched: false, welcomePoints: 0 };
  }
  if (referral.sharer_profile_id === profileId) {
    // Someone opening their own referral link — nothing to credit, just let them land normally.
    return { matched: false, welcomePoints: 0 };
  }

  const join = await businessReferralModel.markJoined(referral.id, profileId);

  // Already an active subscriber (e.g. re-opening the link, or they subscribed some other way
  // in between) — report matched so the UI still lands correctly, but never re-subscribe or
  // re-credit.
  const existingSub = await subscriptionModel.getSubscription(profileId, referral.business_id);
  if (existingSub?.is_active) {
    return { matched: true, welcomePoints: 0 };
  }

  const result = await subscriptionService.subscribeToBusiness(userId, referral.business_id);

  const subscribedJoin = await businessReferralModel.markSubscribed(join.id);
  if (subscribedJoin && !subscribedJoin.bonus_awarded) {
    const rewardConfig = await rewardConfigModel.getRewardConfig(referral.business_id);
    const bonus = rewardConfig?.referral_bonus_points ?? 0;
    if (bonus > 0) {
      const client = await getClient();
      try {
        await client.query('BEGIN');
        await pointsModel.insertReferralBonusWithClient(client, referral.sharer_profile_id, referral.business_id, bonus, {
          referenceType: 'business_referral_join',
          referenceId: join.id,
        });
        await notificationsService.createNotification(client, {
          profileId: referral.sharer_profile_id,
          type: 'business_referral_subscribed',
          title: 'Someone joined using your referral link',
          body: `Someone subscribed to ${result.business.name} using your referral link. You earned ${bonus} points.`,
          data: { business_id: referral.business_id, points: bonus },
        });
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      await businessReferralModel.markBonusAwarded(join.id);
    }
  }

  return { matched: true, welcomePoints: result.welcomePoints };
}

module.exports = { getMyReferralForBusiness, resolvePendingBusinessReferral };
