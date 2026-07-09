const subscriptionModel = require('./subscription.model');
const { query } = require('../../config/database');

async function subscribeToBusiness(userId, businessId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const { rows } = await query('SELECT id FROM businesses WHERE id = $1', [businessId]);
  if (!rows[0]) throw Object.assign(new Error('Business not found'), { status: 404 });

  const subscription = await subscriptionModel.subscribe(profileId, businessId);
  return { subscribed: true, subscription };
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
