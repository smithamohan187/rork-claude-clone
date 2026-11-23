const { query } = require('../../config/database');
const shareReferralsModel = require('./shareReferrals.model');
const customerInviteModel = require('../customerInvites/customerInvite.model');
const businessReferralModel = require('../businessReferrals/businessReferral.model');
const referralModel = require('../referrals/referral.model');
const marketplaceModel = require('../marketplace/marketplace.model');
const offersModel = require('../offers/offers.model');
const eventsModel = require('../events/events.model');
const postsModel = require('../posts/posts.model');
const chatService = require('../chat/chat.service');

// Maps a Refer content_type to its model getter + the noun used in the chat message body.
const REFER_CONTENT_LOOKUP = {
  offer: { getById: (id) => offersModel.getOfferById(id, null), noun: 'offer' },
  event: { getById: (id) => eventsModel.getEventById(id, null), noun: 'event' },
  post:  { getById: (id) => postsModel.getPostById(id, null), noun: 'post' },
};
const { SHARE_BASE_URL } = require('../../config/shareUrl');
const { PLAY_STORE_URL, APP_STORE_URL } = require('../../config/appDownloadLinks');

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

  // Not a customer-invite code either — check the subscriber-referral namespace (a subscribed
  // customer's own standing per-business code, distinct from a one-shot customer-invite code;
  // read-only lookup, resolution/crediting happens in businessReferral.service.js).
  const subscriberReferral = await businessReferralModel.findByReferralCode(referral_code);
  if (subscriberReferral) {
    return {
      content_type: 'business_subscriber_referral',
      content_id: subscriberReferral.business_id,
      business_id: subscriberReferral.business_id,
      route: '/business-profile/[id]',
      id_param: 'id',
    };
  }

  // Not a subscriber-referral code either — check the business-invite namespace (read-only lookup;
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

// Builds the rork-app://... deep-link equivalent of a https://<domain>/s/<code> (or /b/<id>) web
// url, so the "Open in TouchPoints" button can try the app directly even on a device where
// Android App Links / iOS Universal Links verification hasn't succeeded (same custom scheme
// declared as app.json's "scheme").
function buildAppSchemeUrl(webUrl) {
  try {
    const parsed = new URL(webUrl);
    return `rork-app://${parsed.pathname.replace(/^\//, '')}${parsed.search}`;
  } catch {
    return 'rork-app://';
  }
}

function buildPreviewHtml({ title, description, image_url, url }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(truncate(description, 200));
  const safeUrl = escapeHtml(url);
  const imageTag = image_url ? `<meta property="og:image" content="${escapeHtml(image_url)}">\n` : '';
  const appSchemeUrl = escapeHtml(buildAppSchemeUrl(url));

  // Store buttons are always rendered (so the page never looks unfinished/broken), but stay
  // visually disabled until backend/src/config/appDownloadLinks.js has a real URL — see that
  // file's header comment for how to go live once published.
  const playStoreButton = PLAY_STORE_URL
    ? `<a class="btn btn-store" href="${escapeHtml(PLAY_STORE_URL)}">
         <span class="btn-store-kicker">GET IT ON</span><span class="btn-store-name">Google Play</span>
       </a>`
    : `<span class="btn btn-store btn-disabled" aria-disabled="true">
         <span class="btn-store-kicker">COMING SOON</span><span class="btn-store-name">Google Play</span>
       </span>`;
  const appStoreButton = APP_STORE_URL
    ? `<a class="btn btn-store" href="${escapeHtml(APP_STORE_URL)}">
         <span class="btn-store-kicker">DOWNLOAD ON THE</span><span class="btn-store-name">App Store</span>
       </a>`
    : `<span class="btn btn-store btn-disabled" aria-disabled="true">
         <span class="btn-store-kicker">COMING SOON</span><span class="btn-store-name">App Store</span>
       </span>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:url" content="${safeUrl}">
<meta property="og:type" content="website">
${imageTag}<meta name="description" content="${safeDescription}">
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: linear-gradient(180deg, #1A5C35 0%, #0D3D20 100%);
    color: #fff;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    width: 100%;
    max-width: 420px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 24px;
    padding: 32px 28px;
    text-align: center;
    backdrop-filter: blur(6px);
  }
  .logo {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    border-radius: 18px;
    background: #00B246;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 24px;
    color: #fff;
    letter-spacing: -0.5px;
  }
  h1 {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 10px;
    line-height: 1.3;
  }
  p.desc {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255,255,255,0.82);
    margin: 0 0 26px;
  }
  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 1px;
    text-decoration: none;
    border-radius: 14px;
    padding: 10px 16px;
    margin-bottom: 10px;
    font-family: inherit;
  }
  .btn-primary {
    background: #FFFFFF;
    color: #1A5C35;
    font-weight: 700;
    font-size: 15px;
    padding: 14px 16px;
  }
  .btn-store {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    min-height: 46px;
    justify-content: center;
  }
  .btn-store-kicker {
    font-size: 9px;
    letter-spacing: 0.6px;
    color: rgba(255,255,255,0.7);
  }
  .btn-store-name {
    font-size: 15px;
    font-weight: 700;
  }
  .btn-disabled {
    opacity: 0.45;
    cursor: default;
  }
  .footnote {
    margin-top: 16px;
    font-size: 11px;
    color: rgba(255,255,255,0.55);
  }
</style>
</head>
<body>
<div class="card">
  <div class="logo">TP</div>
  <h1>${safeTitle}</h1>
  <p class="desc">${safeDescription}</p>

  <a class="btn btn-primary" href="${appSchemeUrl}">Open in TouchPoints</a>
  ${playStoreButton}
  ${appStoreButton}

  <p class="footnote">Don't have the app yet? Get it above to see the full experience.</p>
</div>
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

// Shares a piece of content (offer/event/post) to one or more of the sender's trusted friends via
// the existing chat infra. Per-recipient, best-effort: a failure for one target (e.g. not a
// trusted friend, so getOrCreateConversation 403s) never blocks the others. No separate
// friendship check is performed here — getOrCreateConversation already enforces trusted_friends
// for type='friend'.
async function shareContentToFriends(userId, contentType, contentId, targetProfileIds) {
  const lookup = REFER_CONTENT_LOOKUP[contentType];
  if (!lookup) throw Object.assign(new Error('Unsupported content type'), { status: 400 });

  const senderProfileId = await resolveProfileId(userId);

  const content = await lookup.getById(contentId);
  if (!content) throw Object.assign(new Error(`${lookup.noun[0].toUpperCase()}${lookup.noun.slice(1)} not found`), { status: 404 });
  const businessName = await offersModel.getBusinessNameById(null, content.business_id);

  const results = [];
  for (const targetProfileId of targetProfileIds) {
    try {
      const { conversation } = await chatService.getOrCreateConversation(userId, targetProfileId, 'friend');

      const existing = await shareReferralsModel.findRecipientForShare({
        sharer_profile_id: senderProfileId,
        business_id: content.business_id,
        content_type: contentType,
        content_id: contentId,
        registered_profile_id: targetProfileId,
      });
      const recipient = existing ?? await shareReferralsModel.insertRegisteredRecipient({
        referral_code: generateReferralCode(),
        content_type: contentType,
        content_id: contentId,
        business_id: content.business_id,
        sharer_profile_id: senderProfileId,
        registered_profile_id: targetProfileId,
      });

      const body = `Check out this ${lookup.noun} from ${businessName ?? 'a business'}: ${content.title}\n${buildShareUrl(recipient.referral_code)}`;
      const message = await chatService.sendMessage(userId, conversation.id, body);

      results.push({ targetProfileId, conversationId: conversation.id, messageId: message.id, ok: true });
    } catch (err) {
      results.push({ targetProfileId, ok: false, error: err.message });
    }
  }
  return results;
}

module.exports = { createShareRecipients, resolveReferral, shareContentToFriends, renderSharePreviewHtml };
