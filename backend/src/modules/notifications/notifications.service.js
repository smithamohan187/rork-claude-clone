const notificationsModel = require('./notifications.model');
const subscriptionModel = require('../subscriptions/subscription.model');

// Called by other modules' services inside their own transaction (client required).
async function createNotification(client, { profileId, type, title, body, data }) {
  return notificationsModel.insertNotification(client, { profileId, type, title, body, data });
}

// Fans out to every active subscriber of a business in a single batched insert.
async function createNotificationsBulk(client, businessId, { type, title, body, data }) {
  const profileIds = await notificationsModel.getActiveSubscriberProfileIds(client, businessId);
  return notificationsModel.insertNotificationsBulk(client, profileIds, { type, title, body, data });
}

async function resolveProfileId(userId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return profileId;
}

async function getMyNotifications(userId, { unreadOnly, limit, offset } = {}) {
  const profileId = await resolveProfileId(userId);
  return notificationsModel.getNotificationsByProfile(profileId, {
    unreadOnly: unreadOnly === true,
    limit: limit ?? 20,
    offset: offset ?? 0,
  });
}

async function markAsRead(userId, notificationIdOrAll) {
  const profileId = await resolveProfileId(userId);
  if (notificationIdOrAll === 'all') {
    const count = await notificationsModel.markAllRead(profileId);
    return { markedCount: count };
  }
  const notification = await notificationsModel.markReadById(profileId, notificationIdOrAll);
  if (!notification) throw Object.assign(new Error('Notification not found'), { status: 404 });
  return { notification };
}

async function getUnreadCount(userId) {
  const profileId = await resolveProfileId(userId);
  const count = await notificationsModel.getUnreadCount(profileId);
  return { count };
}

module.exports = {
  createNotification,
  createNotificationsBulk,
  getMyNotifications,
  markAsRead,
  getUnreadCount,
};
