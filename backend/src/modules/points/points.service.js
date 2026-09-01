const pointsModel = require('./points.model');
const subscriptionModel = require('../subscriptions/subscription.model');

async function getUserPointsSummary(userId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const [total, breakdownRows] = await Promise.all([
    pointsModel.getTotalPointsByProfile(profileId),
    pointsModel.getPointsSplitByProfile(profileId),
  ]);

  return {
    total,
    breakdown: breakdownRows.map((row) => ({
      businessId:   row.business_id,
      businessName: row.business_name,
      logoUrl:      row.logo_url,  // raw relative path — resolved in frontend service
      points:       row.points,
    })),
  };
}

// Build the human-readable title/description per transaction type — mirrors
// dashboardFeed.service.js's buildMessage() approach for the equivalent business-side feed.
function buildActivityText(row) {
  const name = row.business_name || 'a business';
  switch (row.type) {
    case 'earn_welcome':
      return { title: `Joined ${name}`, description: 'Welcome bonus' };
    case 'earn_referral':
      return { title: 'Referral bonus', description: `Friend joined via your link at ${name}` };
    case 'earn_visit':
      return { title: `Visited ${name}`, description: 'Points earned for a visit' };
    case 'earn_purchase':
      return { title: `Purchase at ${name}`, description: 'Points earned for a purchase' };
    case 'earn_event':
      return { title: 'Attended an event', description: `at ${name}` };
    case 'redeem_reward':
      return { title: 'Redeemed a reward', description: `at ${name}` };
    case 'expire':
      return { title: 'Points expired', description: `at ${name}` };
    case 'adjust':
      return { title: 'Points adjusted', description: `at ${name}` };
    case 'redemption_refund':
      return { title: 'Redemption refunded', description: `at ${name}` };
    default:
      return { title: 'Activity', description: name };
  }
}

async function getUserPointsHistory(userId, limit, offset) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const rows = await pointsModel.getRecentTransactionsByProfile(profileId, limit, offset);
  return rows.map((row) => {
    const { title, description } = buildActivityText(row);
    return {
      id:              row.id,
      type:            row.type,
      title,
      description,
      points:          row.points,
      businessId:      row.business_id,
      businessName:    row.business_name,
      businessLogoUrl: row.logo_url, // raw relative path — resolved in frontend service
      timestamp:       row.created_at,
    };
  });
}

module.exports = { getUserPointsSummary, getUserPointsHistory };
