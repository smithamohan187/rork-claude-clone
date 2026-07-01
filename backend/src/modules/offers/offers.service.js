const offersModel = require('./offers.model');

async function verifyOfferOwnership(userId, offerId) {
  const businessId = await offersModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');

  const offer = await offersModel.getOfferById(offerId);
  if (!offer) throw new Error('Offer not found');
  if (offer.business_id !== businessId) throw new Error('Not authorised to modify this offer');

  return { offer, businessId };
}

async function createOffer(userId, payload) {
  const businessId = await offersModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');
  return offersModel.insertOffer({ ...payload, business_id: businessId });
}

async function editOffer(userId, offerId, payload) {
  await verifyOfferOwnership(userId, offerId);
  const updated = await offersModel.updateOffer(offerId, payload);
  if (!updated) throw new Error('Offer not found');
  return updated;
}

async function toggleStatus(userId, offerId, newStatus) {
  await verifyOfferOwnership(userId, offerId);
  return offersModel.toggleOfferStatus(offerId, newStatus);
}

async function listMyOffers(userId, filter) {
  const businessId = await offersModel.getBusinessIdByUserId(userId);
  if (!businessId) return [];
  return offersModel.getOffersByBusinessId(businessId, filter);
}

async function getOffer(offerId) {
  const offer = await offersModel.getOfferById(offerId);
  if (!offer) throw new Error('Offer not found');
  return offer;
}

async function deleteOffer(userId, offerId) {
  await verifyOfferOwnership(userId, offerId);
  const deleted = await offersModel.deleteOffer(offerId);
  if (!deleted) throw new Error('Offer not found');
}

async function getActiveOffersForBusiness(businessId) {
  return offersModel.getActiveOffersByBusinessId(businessId);
}

async function uploadOfferImage(userId, offerId, imageUrl) {
  await verifyOfferOwnership(userId, offerId);
  return offersModel.updateOfferImageUrl(offerId, imageUrl);
}

module.exports = {
  createOffer,
  editOffer,
  deleteOffer,
  toggleStatus,
  listMyOffers,
  getOffer,
  getActiveOffersForBusiness,
  uploadOfferImage,
};
