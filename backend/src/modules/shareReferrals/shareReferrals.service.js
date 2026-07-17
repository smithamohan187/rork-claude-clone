const { query } = require('../../config/database');
const shareReferralsModel = require('./shareReferrals.model');

const SHARE_BASE_URL = (process.env.SHARE_BASE_URL || 'https://touchpoints.app').replace(/\/$/, '');

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
  if (!row) throw Object.assign(new Error('Referral code not found'), { status: 404 });
  const mapping = ROUTE_BY_CONTENT[row.content_type] ?? ROUTE_BY_CONTENT.post;
  return {
    content_type: row.content_type,
    content_id: row.content_id,
    business_id: row.business_id,
    route: mapping.route,
    id_param: mapping.idParam,
  };
}

module.exports = { createShareRecipients, resolveReferral };
