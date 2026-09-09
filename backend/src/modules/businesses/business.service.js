const {
  insertBusiness,
  updateBusiness,
  insertBusinessHours,
  deleteBusinessHours,
  getBusinessHours,
  updateBusinessLogo,
  updateBusinessCoverPhoto,
  setOnboardingComplete,
  getBusinessByProfileId,
  getBusinessById,
  insertBusinessProfile,
  getBusinessProfileByUserId,
  getPersonalProfileByUserId,
  setUserActiveProfile,
  getDashboardSummary,
} = require('./business.model');
const { getClient } = require('../../config/database');
const marketplaceService = require('../marketplace/marketplace.service');
const billingService = require('../billing/billing.service');
const { SHARE_BASE_URL } = require('../../config/shareUrl');

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
    inhouse_referral, inhouse_referral_url, hours, invite_code,
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
        // Edge case: business profile exists but business row is missing — create it.
        // Plan assignment (free or paid) now happens via the billing module's plan-selection
        // step, not here — see .claude/modules/billing.md.
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
      // Plan assignment (free or paid) happens via the billing module's plan-selection
      // step after this transaction commits — see .claude/modules/billing.md.

      // Resolve a business-invite referral code, if this business was created via one — subscribes
      // the inviter as a member, notifies them, and logs a pending points entry. No-op for
      // missing/invalid codes.
      if (invite_code) {
        await marketplaceService.resolveBusinessInviteOnRegister(client, invite_code, {
          newBusinessId: business.id,
        });
      }
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
 * Fetch public business profile by id — used by the optionally-authenticated
 * GET /businesses/:id endpoint. Runs both queries in parallel since hours and business details
 * are independent. Returns null if no business found, or if the requester isn't the owner and
 * the business's own platform subscription isn't active/trialing (controller handles the 404
 * either way) — the owner can always see their own (even cancelled) profile.
 */
async function getPublicBusinessProfile(businessId, requestingUserId = null) {
  const [business, hours] = await Promise.all([
    getBusinessById(businessId),
    getBusinessHours(businessId),
  ]);
  if (!business) return null;
  const isOwner = requestingUserId != null && business.owner_user_id === requestingUserId;
  if (!isOwner && !(await billingService.isSubscriptionActive(businessId))) {
    return null;
  }
  return { ...business, hours };
}

/**
 * Owner-only: return the QR deep-link URL for a business.
 * The scan target is the business's public /b/:id landing page (identity-only, no per-invite code).
 * Enforces ownership server-side — throws 404 if the business is missing, 403 if the requester
 * isn't the owner. Reuses the existing getBusinessById (which returns owner_user_id).
 */
async function getBusinessScanCode(businessId, requestingUserId) {
  const business = await getBusinessById(businessId);
  if (!business) throw Object.assign(new Error('Business not found'), { status: 404 });
  if (business.owner_user_id !== requestingUserId) {
    throw Object.assign(new Error('Not authorised to view this scan code'), { status: 403 });
  }
  return { businessId, url: `${SHARE_BASE_URL}/b/${businessId}` };
}

async function fetchDashboardSummary(userId) {
  const businessProfile = await getBusinessProfileByUserId(userId);
  if (!businessProfile) return null;
  const business = await getBusinessByProfileId(businessProfile.id);
  if (!business) return null;
  return getDashboardSummary(business.id);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(str, max) {
  const s = String(str ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function resolveAbsoluteImageUrl(imageUrl, requestOrigin) {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${requestOrigin}${imageUrl}`;
}

const DEFAULT_SCAN_OG = {
  title: 'TouchPoints',
  description: 'Discover local businesses, earn rewards, and get exclusive offers.',
  image_url: '',
};

function buildScanPreviewHtml({ title, description, image_url, url }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(truncate(description, 200));
  const safeUrl = escapeHtml(url);
  const imageTag = image_url ? `<meta property="og:image" content="${escapeHtml(image_url)}">\n` : '';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:url" content="${safeUrl}">
<meta property="og:type" content="website">
${imageTag}<meta name="description" content="${safeDescription}">
</head>
<body>
<h1>${safeTitle}</h1>
<p>${safeDescription}</p>
<p>Open this in the TouchPoints app to see more, or subscribe to earn rewards.</p>
</body>
</html>`;
}

// Public HTML page for GET /b/:id — the target of a business's "Scan to subscribe" QR code
// (built by getBusinessScanCode above). Mirrors shareReferrals.service.js's renderSharePreviewHtml
// for /s/:code (same OG-page-for-scrapers/browsers pattern, deliberately duplicated per this repo's
// convention of not sharing small helpers across modules — see analytics.md's getBusinessIdByUserId
// note). Always 200s with a valid HTML/OG page, even for an unknown/deleted business, so a stale
// printed QR code never shows a bare "Cannot GET" error to whoever scans it.
async function renderBusinessScanPageHtml(businessId, requestOrigin) {
  const url = `${SHARE_BASE_URL}/b/${businessId}`;
  const business = await getBusinessById(businessId);
  if (!business) {
    return buildScanPreviewHtml({ ...DEFAULT_SCAN_OG, url });
  }
  return buildScanPreviewHtml({
    title: business.name || DEFAULT_SCAN_OG.title,
    description: business.description || DEFAULT_SCAN_OG.description,
    image_url: resolveAbsoluteImageUrl(business.logo_url, requestOrigin),
    url,
  });
}

module.exports = {
  registerBusiness,
  uploadBusinessLogo,
  uploadBusinessCoverPhoto,
  completeOnboarding,
  fetchMyBusiness,
  getPublicBusinessProfile,
  getBusinessScanCode,
  renderBusinessScanPageHtml,
  fetchDashboardSummary,
};
