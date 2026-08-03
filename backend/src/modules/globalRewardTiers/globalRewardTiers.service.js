const globalRewardTiersModel = require('./globalRewardTiers.model');
const pointsModel = require('../points/points.model');
const subscriptionModel = require('../subscriptions/subscription.model');

async function getUserNetPointBalance(profileId) {
  return pointsModel.getTotalPointsByProfile(profileId);
}

async function getUserGlobalTier(profileId) {
  const balance = await getUserNetPointBalance(profileId);
  const tiers = await globalRewardTiersModel.getActiveTiers();

  const currentTier = [...tiers].reverse().find(t => t.min_points <= balance) ?? null;
  const nextTier = tiers.find(t => t.min_points > balance) ?? null;
  const pointsToNextTier = nextTier ? nextTier.min_points - balance : null;

  let progressPercent = 0;
  if (tiers.length > 0) {
    if (!currentTier) {
      const firstMin = tiers[0].min_points;
      progressPercent = firstMin > 0
        ? Math.min(Math.round((balance / firstMin) * 100), 99)
        : 0;
    } else if (!nextTier) {
      progressPercent = 100;
    } else {
      progressPercent = Math.round(
        ((balance - currentTier.min_points) /
         (nextTier.min_points - currentTier.min_points)) * 100
      );
    }
  }

  return {
    netBalance: balance,
    tier: currentTier,
    nextTier,
    pointsToNextTier,
    progressPercent,
    tiers,
  };
}

async function getUserGlobalTierByUserId(userId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return getUserGlobalTier(profileId);
}

module.exports = { getUserNetPointBalance, getUserGlobalTier, getUserGlobalTierByUserId };
