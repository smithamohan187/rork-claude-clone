const feedModel = require('./feed.model');

async function getFeed(userId, category, limit, offset) {
  const profileId = await feedModel.getUserActiveProfileId(userId);
  if (!profileId) {
    return { mode: 'top_rated', items: await feedModel.getTopRatedBusinesses(10, userId) };
  }

  const items = await feedModel.getSubscribedFeed(profileId, category, limit, offset);
  if (items.length > 0) {
    return { mode: 'feed', items };
  }

  const byCategory = await feedModel.getRecommendedBusinesses(profileId, 10);
  if (byCategory.length > 0) {
    return { mode: 'category_recommendations', items: byCategory };
  }

  const byLocation = await feedModel.getRecommendedByLocation(profileId, 10);
  if (byLocation.length > 0) {
    return { mode: 'location_recommendations', items: byLocation };
  }

  // Terminal tier — no filter to fail, so no further fallback needed.
  return { mode: 'top_rated', items: await feedModel.getTopRatedBusinesses(10, userId) };
}

module.exports = { getFeed };
