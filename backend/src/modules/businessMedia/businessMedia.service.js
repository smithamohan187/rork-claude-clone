const businessMediaModel = require('./businessMedia.model');

// No isBusinessUnlocked gate here, unlike posts/offers/events — building a personal photo
// library is harmless prep work and shouldn't require a completed Stripe trial. Only actually
// publishing a post/offer/event is gated, which those modules already enforce on their own.

async function uploadMedia(userId, imageUrl) {
  const businessId = await businessMediaModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');
  return businessMediaModel.insertMedia(businessId, imageUrl);
}

async function listMyMedia(userId, limit, offset) {
  const businessId = await businessMediaModel.getBusinessIdByUserId(userId);
  if (!businessId) return [];
  return businessMediaModel.listMedia(businessId, limit, offset);
}

async function deleteMedia(userId, mediaId) {
  const businessId = await businessMediaModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');
  const deleted = await businessMediaModel.deleteMedia(mediaId, businessId);
  if (!deleted) throw new Error('Media not found');
}

module.exports = {
  uploadMedia,
  listMyMedia,
  deleteMedia,
};
