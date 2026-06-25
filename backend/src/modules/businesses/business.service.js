const {
  getActiveProfileId,
  getFreePlanId,
  insertBusiness,
  updateBusiness,
  insertBusinessHours,
  deleteBusinessHours,
  getBusinessHours,
  insertBusinessSubscription,
  updateBusinessLogo,
  updateBusinessCoverPhoto,
  setOnboardingComplete,
  getBusinessByProfileId,
} = require('./business.model');
const { getClient } = require('../../config/database');

function slugify(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

async function registerBusiness(userId, payload) {
  const profileId = await getActiveProfileId(userId);
  if (!profileId) throw new Error('User has no active profile');

  const {
    business_name, category_id, business_type, description,
    phone, website, address, city, state, country,
    inhouse_referral, inhouse_referral_url, hours,
  } = payload;

  const existing = await getBusinessByProfileId(profileId);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let business;
    if (existing) {
      // Upsert — update the existing row, never create a duplicate
      business = await updateBusiness(client, existing.id, {
        category_id: category_id ?? null,
        name: business_name,
        description,
        phone,
        website,
        address,
        city,
        state,
        country,
        business_type,
        inhouse_referral: inhouse_referral ?? false,
        inhouse_referral_url: inhouse_referral ? inhouse_referral_url : null,
      });
      // Replace hours entirely
      await deleteBusinessHours(client, existing.id);
      if (hours && hours.length > 0) {
        await insertBusinessHours(client, existing.id, hours);
      }
    } else {
      const freePlanId = await getFreePlanId();
      if (!freePlanId) throw new Error('No free subscription plan found');

      const slug = slugify(business_name);
      business = await insertBusiness(client, {
        profile_id: profileId,
        category_id: category_id ?? null,
        name: business_name,
        slug,
        description,
        phone,
        website,
        address,
        city,
        state,
        country,
        business_type,
        inhouse_referral: inhouse_referral ?? false,
        inhouse_referral_url: inhouse_referral ? inhouse_referral_url : null,
      });
      if (hours && hours.length > 0) {
        await insertBusinessHours(client, business.id, hours);
      }
      await insertBusinessSubscription(client, business.id, freePlanId);
    }

    await client.query('COMMIT');
    return business;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function fetchMyBusiness(userId) {
  const profileId = await getActiveProfileId(userId);
  if (!profileId) throw new Error('User has no active profile');

  const business = await getBusinessByProfileId(profileId);
  if (!business) return null;

  const hours = await getBusinessHours(business.id);
  return { ...business, hours };
}

async function uploadBusinessLogo(businessId, filePath) {
  return updateBusinessLogo(businessId, filePath);
}

async function uploadBusinessCoverPhoto(businessId, filePath) {
  return updateBusinessCoverPhoto(businessId, filePath);
}

async function completeOnboarding(businessId) {
  return setOnboardingComplete(businessId);
}

module.exports = {
  registerBusiness,
  uploadBusinessLogo,
  uploadBusinessCoverPhoto,
  completeOnboarding,
  fetchMyBusiness,
};
