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
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) return { isSubscribed: false };

  const row = await subscriptionModel.getSubscription(profileId, businessId);
  return { isSubscribed: row?.is_active ?? false };
}

module.exports = {
  subscribeToBusiness,
  unsubscribeFromBusiness,
  getSubscriptionStatus,
};
