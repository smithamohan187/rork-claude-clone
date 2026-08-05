const { query } = require('../../config/database');
const shareReferralsModel = require('./shareReferrals.model');
const customerInviteModel = require('../customerInvites/customerInvite.model');
const referralModel = require('../referrals/referral.model');
const marketplaceModel = require('../marketplace/marketplace.model');
const offersModel = require('../offers/offers.model');
const chatService = require('../chat/chat.service');
const { SHARE_BASE_URL } = require('../../config/shareUrl');

// Maps a content type to its in-app detail route + the id param name that route expects.
const ROUTE_BY_CONTENT = {
  post:      { route: '/view-post',  idParam: 'postId' },
  offer:     { route: '/view-offer', idParam: 'offerId' },
  event:     { route: '/view-event', idParam: 'eventId' },
  broadcast: { route: '/view-post',  idParam: 'postId' }, // broadcast shares open the post view
};

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SH-';
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code; // e.g. SH-X4RZMQP7KD
}

async function resolveProfileId(userId) {
  const { rows } = await query('SELECT active_profile_id FROM users WHERE id = $1', [userId]);
  const profileId = rows[0]?.active_profile_id ?? null;
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return profileId;
}

function buildShareUrl(referral_code) {
  return `${SHARE_BASE_URL}/s/${referral_code}`;
}

// Creates one share_recipients row per recipient (or a single null-contact row for social/native
// single-link shares) and returns the referral_code + share url for each.
async function createShareRecipients(userId, { content_type, content_id, business_id, recipients }) {
  const sharer_profile_id = await resolveProfileId(userId);
  const list = Array.isArray(recipients) && recipients.length > 0 ? recipients : [{ contact: null }];

  const created = [];
  for (const r of list) {
    const referral_code = generateReferralCode();
    const row = await shareReferralsModel.insertRecipient({
      referral_code,
      content_type,
      content_id,
      business_id,
      sharer_profile_id,
      recipient_contact: r?.contact ?? null,
    });
    created.push({
      recipient_contact: row.recipient_contact,
      referral_code: row.referral_code,
      url: buildShareUrl(row.referral_code),
    });
  }
  return created;
}

// Read-only: resolves a referral code to its content + the detail route to open. Throws 404 if the
// code does not exist.
async function resolveReferral(referral_code) {
  const row = await shareReferralsModel.findByReferralCode(referral_code);
  if (row) {
    const mapping = ROUTE_BY_CONTENT[row.content_type] ?? ROUTE_BY_CONTENT.post;
    return {
      content_type: row.content_type,
      content_id: row.content_id,
      business_id: row.business_id,
      route: mapping.route,
      id_param: mapping.idParam,
    };
  }

  // Not a content-share code — check the customer-invites namespace, which reuses the same
  // SHARE_BASE_URL/s/<code> link shape (read-only lookup; does not touch customer_invites state).
  const invite = await customerInviteModel.findInviteByReferralCode(referral_code);
  if (invite) {
    return {
      content_type: 'business',
      content_id: invite.business_id,
      business_id: invite.business_id,
      route: '/business-profile/[id]',
      id_param: 'id',
    };
  }

  // Not a customer-invite code either — check the business-invite namespace (read-only lookup;
  // actual linking only happens later, at business-registration time, not here).
  const businessInvite = await marketplaceModel.getInviteByCode(referral_code);
  if (businessInvite) {
    return {
      content_type: 'business_invite',
      content_id: '',
      business_id: '',
      route: '/create-business-profile',
      id_param: 'ref',
    };
  }

  // Not a named business-invite code either — check the permanent per-profile business-referral
  // code namespace (reusable across any number of businesses; read-only lookup, same as above).
  const personalBizCode = await marketplaceModel.findPersonalReferralCodeByCode(referral_code);
  if (personalBizCode) {
    return {
      content_type: 'business_invite',
      content_id: '',
      business_id: '',
      route: '/create-business-profile',
      id_param: 'ref',
    };
  }

  // Not a business-invite code either — check the app-level (Invite Friends) referral namespace,
  // which also reuses the same SHARE_BASE_URL/s/<code> shape (read-only; does not touch referral state).
  const appReferral = await referralModel.findAppReferralCodeByCode(null, referral_code);
  if (appReferral) {
    return {
      content_type: 'app_referral',
      content_id: '',
      business_id: '',
      route: '/(tabs)/feed',
      id_param: 'referral',
    };
  }

  throw Object.assign(new Error('Referral code not found'), { status: 404 });
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

const DEFAULT_OG = {
  title: 'TouchPoints',
  description: 'Discover local businesses, earn rewards, and get exclusive offers.',
  image_url: '',
};

function buildPreviewHtml({ title, description, image_url, url }) {
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
<p>Open this in the TouchPoints app to see more.</p>
</body>
</html>`;
}

// og:image must be an absolute URL for scrapers to fetch it, but content image_url columns store
// relative paths (e.g. '/uploads/offers/x.jpg') — same reason the frontend has its own resolveUrl
// helper (api/services/businessProfileService.ts) against EXPO_PUBLIC_API_BASE_URL. This page is
// served by the backend itself, so the request's own host is always the correct absolute origin
// (dev IP or production domain, whichever it was actually reached on) without needing a new env var.
function resolveAbsoluteImageUrl(imageUrl, requestOrigin) {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${requestOrigin}${imageUrl}`;
}

// Server-rendered HTML page for GET /s/:code (link-preview scrapers like Facebook/WhatsApp don't
// execute JS, so this must be a plain HTML response, not an Expo Router screen). Reuses the
// existing resolveReferral resolution — not duplicated — then looks up OG-relevant content fields.
// Unknown/expired codes still get a valid 200 page with generic branding rather than a bare 404
// with no tags, so scrapers always have something sane to read.
async function renderSharePreviewHtml(referral_code, requestOrigin) {
  const url = buildShareUrl(referral_code);
  try {
    const resolved = await resolveReferral(referral_code);
    const og = await shareReferralsModel.getOgDataForContent(resolved.content_type, resolved.content_id, resolved.business_id);
    return buildPreviewHtml({
      title: og?.title || DEFAULT_OG.title,
      description: og?.description || DEFAULT_OG.description,
      image_url: resolveAbsoluteImageUrl(og?.image_url, requestOrigin),
      url,
    });
  } catch {
    return buildPreviewHtml({ ...DEFAULT_OG, url });
  }
}

// Shares an offer to one or more of the sender's trusted friends via the existing chat infra.
// Per-recipient, best-effort: a failure for one target (e.g. not a trusted friend, so
// getOrCreateConversation 403s) never blocks the others. No separate friendship check is
// performed here — getOrCreateConversation already enforces trusted_friends for type='friend'.
async function shareOfferToFriends(userId, offerId, targetProfileIds) {
  const senderProfileId = await resolveProfileId(userId);

  const offer = await offersModel.getOfferById(offerId);
  if (!offer) throw Object.assign(new Error('Offer not found'), { status: 404 });
  const businessName = await offersModel.getBusinessNameById(null, offer.business_id);

  const results = [];
  for (const targetProfileId of targetProfileIds) {
    try {
      const { conversation } = await chatService.getOrCreateConversation(userId, targetProfileId, 'friend');

      const existing = await shareReferralsModel.findRecipientForShare({
        sharer_profile_id: senderProfileId,
        business_id: offer.business_id,
        content_type: 'offer',
        content_id: offerId,
        registered_profile_id: targetProfileId,
      });
      const recipient = existing ?? await shareReferralsModel.insertRegisteredRecipient({
        referral_code: generateReferralCode(),
        content_type: 'offer',
        content_id: offerId,
        business_id: offer.business_id,
        sharer_profile_id: senderProfileId,
        registered_profile_id: targetProfileId,
      });

      const body = `Check out this offer from ${businessName ?? 'a business'}: ${offer.title}\n${buildShareUrl(recipient.referral_code)}`;
      const message = await chatService.sendMessage(userId, conversation.id, body);

      results.push({ targetProfileId, conversationId: conversation.id, messageId: message.id, ok: true });
    } catch (err) {
      results.push({ targetProfileId, ok: false, error: err.message });
    }
  }
  return results;
}

module.exports = { createShareRecipients, resolveReferral, shareOfferToFriends, renderSharePreviewHtml };
