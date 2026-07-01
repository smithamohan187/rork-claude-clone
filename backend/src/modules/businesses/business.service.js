const {
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
  getBusinessById,
  insertBusinessProfile,
  getBusinessProfileByUserId,
  getPersonalProfileByUserId,
  setUserActiveProfile,
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
  const {
    business_name, category_id, business_type, description,
    phone, website, address, city, state, country,
    inhouse_referral, inhouse_referral_url, hours,
  } = payload;

  // Copy avatar and location defaults from personal profile when creating business profile
  const personalProfile = await getPersonalProfileByUserId(userId);
  if (!personalProfile) throw new Error('User has no personal profile');

  // Check if a business profile already exists (edit path vs create path)
  const existingBusinessProfile = await getBusinessProfileByUserId(userId);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let businessProfileId;
    let business;

    if (existingBusinessProfile) {
      // ── Edit path: business profile exists, find and update the business ──
      businessProfileId = existingBusinessProfile.id;
      const existingBusiness = await getBusinessByProfileId(businessProfileId);

      if (existingBusiness) {
        business = await updateBusiness(client, existingBusiness.id, {
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
        // Replace hours entirely on edit
        await deleteBusinessHours(client, existingBusiness.id);
        if (hours && hours.length > 0) {
          await insertBusinessHours(client, existingBusiness.id, hours);
        }
      } else {
        // Edge case: business profile exists but business row is missing — create it
        const freePlanId = await getFreePlanId();
        if (!freePlanId) throw new Error('No free subscription plan found');

        const slug = slugify(business_name);
        business = await insertBusiness(client, {
          profile_id: businessProfileId,
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
    } else {
      // ── Create path: no business profile exists yet ──

      // Step 1: Create a dedicated business profile row (never reuse the personal profile)
      const newBusinessProfile = await insertBusinessProfile(client, {
        userId,
        displayName: business_name,
        avatarUrl: personalProfile.avatar_url,
        city: city ?? personalProfile.city,
        state: state ?? personalProfile.state,
        country: country ?? personalProfile.country,
      });
      businessProfileId = newBusinessProfile.id;

      const freePlanId = await getFreePlanId();
      if (!freePlanId) throw new Error('No free subscription plan found');

      // Step 2: Insert business linked to the new business profile (not the personal one)
      const slug = slugify(business_name);
      business = await insertBusiness(client, {
        profile_id: businessProfileId,
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

    // Always switch the user into business mode after create/edit
    await setUserActiveProfile(client, userId, businessProfileId);

    await client.query('COMMIT');
    return { ...business, business_profile_id: businessProfileId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function fetchMyBusiness(userId) {
  // Always look up via business profile — works regardless of which profile is currently active
  const businessProfile = await getBusinessProfileByUserId(userId);
  if (!businessProfile) return null;

  const business = await getBusinessByProfileId(businessProfile.id);
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

/**
 * Fetch public business profile by id — used by the unauthenticated GET /businesses/:id endpoint.
 * Runs both queries in parallel since hours and business details are independent.
 * Returns null if no business found (controller handles the 404).
 */
async function getPublicBusinessProfile(businessId) {
  const [business, hours] = await Promise.all([
    getBusinessById(businessId),
    getBusinessHours(businessId),
  ]);
  if (!business) return null;
  return { ...business, hours };
}

module.exports = {
  registerBusiness,
  uploadBusinessLogo,
  uploadBusinessCoverPhoto,
  completeOnboarding,
  fetchMyBusiness,
  getPublicBusinessProfile,
};
