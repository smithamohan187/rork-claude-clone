const offersModel = require('./offers.model');
const notificationsService = require('../notifications/notifications.service');
const likesModel = require('../likes/likes.model');
const commentsModel = require('../comments/comments.model');
const { getClient } = require('../../config/database');

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

  const client = await getClient();
  let offer;
  try {
    await client.query('BEGIN');
    offer = await offersModel.insertOffer(client, { ...payload, business_id: businessId });

    const businessName = await offersModel.getBusinessNameById(client, businessId);
    await notificationsService.createNotificationsBulk(client, businessId, {
      type: 'new_offer',
      title: 'New offer available',
      body: `${businessName ?? 'A business you follow'} just posted a new offer: ${offer.title}.`,
      data: { business_id: businessId, offer_id: offer.id },
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return offer;
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
  return offersModel.getOffersByBusinessId(businessId, filter, null);
}

async function getOffer(offerId, profileId) {
  const offer = await offersModel.getOfferById(offerId, profileId);
  if (!offer) throw new Error('Offer not found');
  return offer;
}

async function deleteOffer(userId, offerId) {
  await verifyOfferOwnership(userId, offerId);
  const deleted = await offersModel.deleteOffer(offerId);
  if (!deleted) throw new Error('Offer not found');
  // Redemptions cascade-delete via FK, but likes/comments are generic polymorphic tables
  // (content_type/content_id, no FK) — clean them up explicitly or they're orphaned forever.
  await likesModel.deleteLikesOnCommentsOfContent('offer', offerId);
  await Promise.all([
    likesModel.deleteByContent('offer', offerId),
    commentsModel.deleteByContent('offer', offerId),
  ]);
}

async function getActiveOffersForBusiness(businessId) {
  return offersModel.getActiveOffersByBusinessId(businessId);
}

async function getBusinessOffers(businessId, filter, profileId) {
  return offersModel.getOffersByBusinessId(businessId, filter, profileId);
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
  getBusinessOffers,
  uploadOfferImage,
};
