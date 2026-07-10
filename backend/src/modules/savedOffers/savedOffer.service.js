const savedOfferModel = require('./savedOffer.model');
const { query } = require('../../config/database');

async function toggleSaveOffer(userId, offerId) {
  const profileId = await savedOfferModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const { rows } = await query('SELECT id FROM offers WHERE id = $1', [offerId]);
  if (!rows[0]) throw Object.assign(new Error('Offer not found'), { status: 404 });

  return savedOfferModel.toggleSaveOffer(profileId, offerId);
}

async function getSavedOffers(userId) {
  const profileId = await savedOfferModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return savedOfferModel.getSavedOffers(profileId);
}

module.exports = { toggleSaveOffer, getSavedOffers };
