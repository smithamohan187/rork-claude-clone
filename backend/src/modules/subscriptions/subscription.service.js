const subscriptionModel = require('./subscription.model');
const { query, getClient } = require('../../config/database');
const shareReferralsModel = require('../shareReferrals/shareReferrals.model');
const pointsModel = require('../points/points.model');
const customerInviteService = require('../customerInvites/customerInvite.service');
const notificationsService = require('../notifications/notifications.service');
const rewardConfigModel = require('../rewardConfig/rewardConfig.model');

async function subscribeToBusiness(userId, businessId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const { rows } = await query('SELECT id, name FROM businesses WHERE id = $1', [businessId]);
  if (!rows[0]) throw Object.assign(new Error('Business not found'), { status: 404 });
  const business = rows[0];

  // Wrap subscription upsert + welcome-bonus award in a single transaction so
  // both succeed or both roll back. ON CONFLICT DO NOTHING on the unique partial
  // index prevents re-awarding on resubscribe.
  const client = await getClient();
  let subscription;
  try {
    await client.query('BEGIN');
    subscription = await subscriptionModel.subscribeWithClient(client, profileId, businessId);

    const welcomePoints = await pointsModel.getWelcomeBonusWithClient(client, businessId);
    if (welcomePoints > 0) {
      await pointsModel.insertJoinBonusWithClient(client, profileId, businessId, welcomePoints);
      await notificationsService.createNotification(client, {
        profileId,
        type: 'points_earned',
        title: 'Points earned!',
        body: `You earned ${welcomePoints} points from subscribing to ${business.name}.`,
        data: { business_id: businessId, points: welcomePoints },
      });
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Stage 2 of the content-share trigger: if this subscriber joined via a shared link for THIS
  // business, link them and the sharer as trusted friends and log pending 'share' points for the
  // sharer. No matching row => organic subscribe, zero behavior change. Idempotent via constraints.
  await maybeLinkTrustedFriend(profileId, businessId, business.name);

  // Customer-invite stage 2: if this subscriber matches a pending invite for this business,
  // mark it subscribed and notify the business owner. No match => organic subscribe, no-op.
  await customerInviteService.resolveCustomerInviteOnSubscribe(profileId, businessId);

  return { subscribed: true, subscription };
}

async function maybeLinkTrustedFriend(subscriberProfileId, businessId, businessName) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const recipient = await shareReferralsModel.findRegisteredRecipient(client, {
      registered_profile_id: subscriberProfileId,
      business_id: businessId,
    });
    if (recipient) {
      await shareReferralsModel.markFriendLinked(client, recipient.id);
      await shareReferralsModel.insertTrustedFriend(client, {
        profile_a: recipient.sharer_profile_id,
        profile_b: subscriberProfileId,
        source_type: 'content_share',
        source_id: recipient.id,
      });
      await shareReferralsModel.insertPointsLog(client, {
        profile_id: recipient.sharer_profile_id,
        points_type: 'share',
        source_type: 'content_share',
        source_id: recipient.id,
        points_amount: null,
        status: 'pending_credit',
      });

      // Offer-share only: credit a real referral bonus + notify the sharer. Other content types
      // (post/event/broadcast shares) are unaffected — this branch never fires for them.
      if (recipient.content_type === 'offer') {
        const alreadyCredited = await pointsModel.referralBonusAlreadyCredited(recipient.id);
        if (!alreadyCredited) {
          const rewardConfig = await rewardConfigModel.getRewardConfig(businessId);
          const bonus = rewardConfig?.referral_bonus_points ?? 0;
          if (bonus > 0) {
            await pointsModel.insertReferralBonusWithClient(client, recipient.sharer_profile_id, businessId, bonus, {
              referenceType: 'share_recipient',
              referenceId: recipient.id,
            });
          }
          await notificationsService.createNotification(client, {
            profileId: recipient.sharer_profile_id,
            type: 'offer_referral_subscribed',
            title: 'Your friend joined via your shared offer',
            body: `Someone subscribed to ${businessName ?? 'the business'} after you shared an offer with them.`,
            data: { business_id: businessId, offer_id: recipient.content_id, subscriber_profile_id: subscriberProfileId },
          });
        }
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function unsubscribeFromBusiness(userId, businessId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  await subscriptionModel.unsubscribe(profileId, businessId);
  return { subscribed: false };
}

async function getSubscriptionStatus(userId, businessId) {
  const row = await subscriptionModel.getSubscriptionByUserId(userId, businessId);
  return { isSubscribed: !!row };
}

async function getSubscribedBusinesses(userId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return subscriptionModel.getSubscribedBusinesses(profileId);
}

async function getBusinessMembers(userId, businessId = null) {
  const ownedId = await subscriptionModel.getBusinessIdByUserId(userId);
  if (!ownedId) throw Object.assign(new Error('No business found for this user'), { status: 403 });
  const targetId = businessId ?? ownedId;
  if (targetId !== ownedId) throw Object.assign(new Error('Not authorised to view these members'), { status: 403 });
  return subscriptionModel.getBusinessMembers(ownedId);
}

async function removeBusinessMember(userId, businessId = null, memberProfileId) {
  const ownedId = await subscriptionModel.getBusinessIdByUserId(userId);
  if (!ownedId) throw Object.assign(new Error('No business found for this user'), { status: 403 });
  const targetId = businessId ?? ownedId;
  if (targetId !== ownedId) throw Object.assign(new Error('Not authorised to remove this member'), { status: 403 });
  await subscriptionModel.removeSubscriber(ownedId, memberProfileId);
  return { removed: true };
}

module.exports = {
  subscribeToBusiness,
  unsubscribeFromBusiness,
  getSubscriptionStatus,
  getSubscribedBusinesses,
  getBusinessMembers,
  removeBusinessMember,
};
