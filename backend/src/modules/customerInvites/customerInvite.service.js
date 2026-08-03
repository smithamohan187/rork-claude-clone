const { query, getClient } = require('../../config/database');
const customerInviteModel = require('./customerInvite.model');
const subscriptionModel = require('../subscriptions/subscription.model');
const { SHARE_BASE_URL } = require('../../config/shareUrl');

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CI-';
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code; // e.g. CI-X4RZMQP7KD
}

function buildInviteUrl(referral_code) {
  return `${SHARE_BASE_URL}/s/${referral_code}`;
}

function normalizePhone(raw) {
  if (!raw) return null;
  const stripped = String(raw).trim().replace(/[\s\-().]/g, '');
  return /^\+?[1-9]\d{6,14}$/.test(stripped) ? stripped : null;
}

function isValidEmail(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

async function resolveProfileId(userId) {
  const { rows } = await query('SELECT active_profile_id FROM users WHERE id = $1', [userId]);
  const profileId = rows[0]?.active_profile_id ?? null;
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return profileId;
}

// Resolves { identifier, email } for a single recipient per the parsing spec:
// phone wins as the identifier when both are present; email is retained separately.
function resolveIdentifier({ name, email, phone }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = isValidEmail(email);

  if (phone && !normalizedPhone) return { error: 'invalid phone' };
  if (email && !normalizedEmail) return { error: 'invalid email' };
  if (!normalizedPhone && !normalizedEmail) return { error: 'at least one of email or phone is required' };

  return {
    invitee_identifier: normalizedPhone ?? normalizedEmail,
    invitee_email: normalizedPhone && normalizedEmail ? normalizedEmail : null,
    invitee_name: name ? String(name).trim() : null,
  };
}

async function createCustomerInvite(userId, { business_id, channel, name, email, phone }) {
  const inviter_profile_id = await resolveProfileId(userId);

  const resolved = resolveIdentifier({ name, email, phone });
  if (resolved.error) throw Object.assign(new Error(resolved.error), { status: 400 });

  const referral_code = generateReferralCode();
  const row = await customerInviteModel.insertInvite(null, {
    inviter_profile_id,
    business_id,
    channel,
    invitee_identifier: resolved.invitee_identifier,
    invitee_email: resolved.invitee_email,
    invitee_name: resolved.invitee_name,
    referral_code,
  });

  if (!row) return null; // ON CONFLICT DO NOTHING fired (already invited)
  return { ...row, url: buildInviteUrl(row.referral_code) };
}

// Applies the parsing/dedup spec to a pre-parsed row array, then inserts all valid,
// non-duplicate rows in a single transaction. Returns a per-row status report.
async function bulkCreateCustomerInvites(userId, { business_id, rows }) {
  const inviter_profile_id = await resolveProfileId(userId);

  const seenInFile = new Set();
  const results = [];
  const toInsert = [];

  for (const raw of rows) {
    const name = raw.name ? String(raw.name).trim() : '';
    const email = raw.email ? String(raw.email).trim() : '';
    const phone = raw.phone ? String(raw.phone).trim() : '';

    if (!name) {
      results.push({ ...raw, status: 'invalid', reason: 'name is required' });
      continue;
    }

    const resolved = resolveIdentifier({ name, email, phone });
    if (resolved.error) {
      results.push({ ...raw, status: 'invalid', reason: resolved.error });
      continue;
    }

    const dedupeKey = resolved.invitee_identifier;
    if (seenInFile.has(dedupeKey)) {
      results.push({ ...raw, status: 'skipped-duplicate', reason: 'duplicate within file' });
      continue;
    }
    seenInFile.add(dedupeKey);

    toInsert.push({ raw, resolved });
  }

  if (toInsert.length === 0) {
    return { results, inserted: 0 };
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const { raw, resolved } of toInsert) {
      const referral_code = generateReferralCode();
      const row = await customerInviteModel.insertInvite(client, {
        inviter_profile_id,
        business_id,
        channel: 'csv',
        invitee_identifier: resolved.invitee_identifier,
        invitee_email: resolved.invitee_email,
        invitee_name: resolved.invitee_name,
        referral_code,
      });
      if (!row) {
        results.push({ ...raw, status: 'already-invited', reason: 'already invited' });
      } else {
        results.push({ ...raw, status: 'inserted', referral_code: row.referral_code, url: buildInviteUrl(row.referral_code) });
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { results, inserted: results.filter((r) => r.status === 'inserted').length };
}

// Called after a successful subscribe. Matches the new subscriber's phone/email against
// any pending invite for this business, marks it subscribed, and notifies the business owner.
// No match => no-op; organic subscribe behavior is unchanged.
async function resolveCustomerInviteOnSubscribe(subscriberProfileId, businessId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Primary path: this profile registered via the invite link (customer_invite_code at
    // signup), so match by registered_profile_id — robust, doesn't depend on the subscriber's
    // phone/email matching what was originally invited.
    let invite = await customerInviteModel.findRegisteredInviteForSubscriber(client, {
      registeredProfileId: subscriberProfileId,
      businessId,
    });

    // Fallback: no registration-time link (e.g. already-registered user subscribing directly,
    // with no signup step in between) — match by the subscriber's own phone/email.
    if (!invite) {
      const contact = await customerInviteModel.getUserContactByProfileId(client, subscriberProfileId);
      const identifiers = [contact?.phone, contact?.email].filter(Boolean);
      if (identifiers.length > 0) {
        invite = await customerInviteModel.findInviteForSubscriber(client, { businessId, identifiers });
      }
    }

    if (!invite) {
      await client.query('COMMIT');
      return;
    }

    const updated = await customerInviteModel.markSubscribed(client, invite.id);
    await notifyBusinessOwner(client, businessId, updated);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function notifyBusinessOwner(client, businessId, invite) {
  const ownerProfileId = await customerInviteModel.getBusinessProfileId(client, businessId);
  if (!ownerProfileId) return;

  const alreadyNotified = await customerInviteModel.notificationExistsForInvite(client, ownerProfileId, invite.id);
  if (alreadyNotified) return;

  await customerInviteModel.insertNotification(client, {
    profileId: ownerProfileId,
    type: 'customer_subscribed',
    title: 'A customer you invited just subscribed',
    body: invite.invitee_name ? `${invite.invitee_name} subscribed to your business.` : 'An invited customer subscribed to your business.',
    data: { invite_id: invite.id, business_id: businessId, invitee_name: invite.invitee_name },
  });
}

async function getMyCustomerInvites(userId) {
  const inviter_profile_id = await resolveProfileId(userId);
  return customerInviteModel.getInvitesByProfile(inviter_profile_id);
}

async function getBusinessCustomerInvites(userId, businessId) {
  const ownedId = await subscriptionModel.getBusinessIdByUserId(userId);
  if (!ownedId) throw Object.assign(new Error('No business found for this user'), { status: 403 });
  if (businessId !== ownedId) throw Object.assign(new Error('Not authorised to view these invites'), { status: 403 });
  return customerInviteModel.getInvitesByBusiness(ownedId);
}

module.exports = {
  createCustomerInvite,
  bulkCreateCustomerInvites,
  resolveCustomerInviteOnSubscribe,
  getMyCustomerInvites,
  getBusinessCustomerInvites,
};
