// dashboardFeed.service.js — business logic for the dashboard activity/redemptions feed.
const dashboardFeedModel = require('./dashboardFeed.model');

const CONTENT_LABEL = { offer: 'offer', event: 'event', post: 'post' };
const PREVIEW_MAX_LENGTH = 60;

function truncatePreview(text) {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return '';
  return trimmed.length > PREVIEW_MAX_LENGTH ? `${trimmed.slice(0, PREVIEW_MAX_LENGTH - 1)}…` : trimmed;
}

// Build the human-readable message string per activity type.
function buildMessage(row) {
  const name = row.actor_name || 'Someone';
  const target = CONTENT_LABEL[row.content_type] || 'content';
  switch (row.activity_type) {
    case 'redemption':
      return `${name} redeemed a reward`;
    case 'subscriber':
      return `${name} subscribed to your business`;
    case 'like':
      return `${name} liked your ${target}`;
    case 'comment': {
      const preview = truncatePreview(row.content_preview);
      return preview
        ? `${name} commented on your ${target}: "${preview}"`
        : `${name} commented on your ${target}`;
    }
    case 'referral':
      return `${name} joined through your referral`;
    default:
      return `${name}`;
  }
}

async function fetchRecentActivity(userId, limit, offset) {
  const businessId = await dashboardFeedModel.getBusinessIdByUserId(userId);
  if (!businessId) throw Object.assign(new Error('Business not found'), { status: 404 });

  const rows = await dashboardFeedModel.getRecentActivity(businessId, limit, offset);
  return rows.map((row) => ({
    type: row.activity_type,
    actorName: row.actor_name,
    actorAvatar: row.actor_avatar, // raw relative path — resolved in frontend service
    message: buildMessage(row),
    timestamp: row.created_at,
    referenceId: row.reference_id,
  }));
}

async function fetchRecentRedemptions(userId, limit, offset) {
  const businessId = await dashboardFeedModel.getBusinessIdByUserId(userId);
  if (!businessId) throw Object.assign(new Error('Business not found'), { status: 404 });

  const rows = await dashboardFeedModel.getRecentRedemptions(businessId, limit, offset);
  return rows.map((row) => ({
    referenceId: row.reference_id,
    customerName: row.customer_name,
    customerAvatar: row.customer_avatar, // raw relative path — resolved in frontend service
    rewardName: row.reward_name,
    pointsCost: row.points_cost,
    redeemedAt: row.used_at,
  }));
}

module.exports = { fetchRecentActivity, fetchRecentRedemptions };
