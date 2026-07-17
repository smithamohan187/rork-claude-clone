const pointsModel = require('./points.model');
const subscriptionModel = require('../subscriptions/subscription.model');
const rewardConfigModel = require('../rewardConfig/rewardConfig.model');

async function getUserPointsSummary(userId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const [total, breakdownRows] = await Promise.all([
    pointsModel.getTotalPointsByProfile(profileId),
    pointsModel.getPointsSplitByProfile(profileId),
  ]);

  // Fetch active tiers for all businesses in the breakdown in parallel
  const tiersArrays = await Promise.all(
    breakdownRows.map(row => rewardConfigModel.getActiveTiers(row.business_id))
  );

  return {
    total,
    breakdown: breakdownRows.map((row, i) => {
      const userPoints = row.points;
      const tiers = tiersArrays[i].map(t => ({
        id:        t.id,
        name:      t.name,
        minPoints: t.min_points,
        color:     t.color ?? null,
      }));

      // Highest tier whose minPoints <= user's points for this business
      const currentTier = [...tiers].reverse().find(t => t.minPoints <= userPoints) ?? null;
      // First tier the user hasn't reached yet
      const nextTier = tiers.find(t => t.minPoints > userPoints) ?? null;
      const pointsToNextTier = nextTier ? nextTier.minPoints - userPoints : null;

      let progressPercent = 0;
      if (tiers.length > 0) {
        if (!currentTier) {
          // Below first threshold — show partial progress toward it
          const firstMin = tiers[0].minPoints;
          progressPercent = firstMin > 0
            ? Math.min(Math.round((userPoints / firstMin) * 100), 99)
            : 0;
        } else if (!nextTier) {
          progressPercent = 100;
        } else {
          progressPercent = Math.round(
            ((userPoints - currentTier.minPoints) /
             (nextTier.minPoints - currentTier.minPoints)) * 100
          );
        }
      }

      return {
        businessId:      row.business_id,
        businessName:    row.business_name,
        logoUrl:         row.logo_url,  // raw relative path — resolved in frontend service
        points:          userPoints,
        tiers,
        currentTier,
        nextTier,
        pointsToNextTier,
        progressPercent,
      };
    }),
  };
}

module.exports = { getUserPointsSummary };
