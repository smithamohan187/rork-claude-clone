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

module.exports = { getUserPointsSummary };
