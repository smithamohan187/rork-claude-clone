const savedBusinessModel = require('./savedBusiness.model');
const { query } = require('../../config/database');

async function saveBusiness(userId, businessId) {
  const profileId = await savedBusinessModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const { rows } = await query('SELECT id FROM businesses WHERE id = $1', [businessId]);
  if (!rows[0]) throw Object.assign(new Error('Business not found'), { status: 404 });

  await savedBusinessModel.saveBusiness(profileId, businessId);
  return { saved: true };
}

async function unsaveBusiness(userId, businessId) {
  const profileId = await savedBusinessModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  await savedBusinessModel.unsaveBusiness(profileId, businessId);
  return { saved: false };
}

async function getSavedStatus(userId, businessId) {
  const saved = await savedBusinessModel.isSavedByUserId(userId, businessId);
  return { isSaved: saved };
}

async function getSavedBusinesses(userId) {
  const profileId = await savedBusinessModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return savedBusinessModel.getSavedBusinesses(profileId);
}

module.exports = { saveBusiness, unsaveBusiness, getSavedStatus, getSavedBusinesses };
