// chat.service.js — business logic for direct chat. Orchestrates transactions;
// never issues raw SQL directly (delegates to the models). Only READS
// trusted_friends / subscriptions — never writes them.
const conversationModel = require('./conversation.model');
const messageModel = require('./message.model');
const subscriptionModel = require('../subscriptions/subscription.model');
const referralModel = require('../referrals/referral.model');
const notificationsService = require('../notifications/notifications.service');
const { getClient } = require('../../config/database');

// Maps the public API `type` (business|friend) to the stored conversation type.
const CONV_TYPE = {
  business: 'direct_business',
  friend: 'direct_friend',
};

// Inverse of CONV_TYPE — used to label new-message notifications with the public type.
const PUBLIC_TYPE_BY_STORED = {
  direct_business: 'business',
  direct_friend: 'friend',
};

function resolveType(publicType) {
  const type = CONV_TYPE[publicType];
  if (!type) throw Object.assign(new Error('Invalid conversation type'), { status: 400 });
  return type;
}

async function requireProfileId(userId) {
  const profileId = await subscriptionModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return profileId;
}

// Get-or-create a direct conversation between the caller and targetProfileId.
// For 'friend': the pair must exist in trusted_friends, else 403.
// For 'business': targetProfileId must be a business profile, else 400.
async function getOrCreateConversation(userId, targetProfileId, publicType) {
  const type = resolveType(publicType);
  const callerProfileId = await requireProfileId(userId);

  if (callerProfileId === targetProfileId) {
    throw Object.assign(new Error('Cannot start a conversation with yourself'), { status: 400 });
  }

  if (type === 'direct_friend') {
    // trusted_friends (content-share / business-invite) OR an app-referral / customer-invite
    // connection both count as eligible — widened so My Referrals connections can chat too,
    // without writing new trusted_friends rows.
    const linked = (await conversationModel.areTrustedFriends(callerProfileId, targetProfileId))
      || (await referralModel.isReferralConnected(callerProfileId, targetProfileId));
    if (!linked) {
      throw Object.assign(new Error('You can only message trusted friends'), { status: 403 });
    }
  } else {
    // direct_business is symmetric between a member (personal profile) and the
    // business profile that represents the owner. Detect the direction by which
    // side is the business profile.
    const targetBusiness = await messageModel.getBusinessForProfile(targetProfileId);
    const callerBusiness = await messageModel.getBusinessForProfile(callerProfileId);

    if (targetBusiness && !callerBusiness) {
      // member / customer → business (existing behavior; membership not enforced here)
    } else if (callerBusiness && !targetBusiness) {
      // owner (acting as the business profile) → member: the target must be an
      // active subscriber of the caller's business, else 403.
      const sub = await subscriptionModel.getSubscription(targetProfileId, callerBusiness.business_id);
      if (!sub || !sub.is_active) {
        throw Object.assign(new Error('Not a member of your business'), { status: 403 });
      }
    } else {
      // business↔business or personal↔personal are not valid business conversations
      throw Object.assign(new Error('Invalid participants for a business conversation'), { status: 400 });
    }
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let conversation = await conversationModel.findDirectConversation(
      client, callerProfileId, targetProfileId, type,
    );
    let created = false;

    if (!conversation) {
      conversation = await conversationModel.insertConversation(client, type);
      await conversationModel.insertParticipant(client, conversation.id, callerProfileId);
      await conversationModel.insertParticipant(client, conversation.id, targetProfileId);
      created = true;
    }

    await client.query('COMMIT');

    // Decorate with the other party's real display info (name + photo, business-aware)
    // so chat-detail can render an actual avatar instead of only colored initials.
    const otherDisplay = await conversationModel.getProfileDisplay(targetProfileId);
    return {
      conversation: {
        ...conversation,
        other_profile_id: targetProfileId,
        other_name: otherDisplay?.display_name ?? null,
        other_avatar_url: otherDisplay?.avatar_url ?? null,
        other_business_id: otherDisplay?.business_id ?? null,
      },
      created,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function requireParticipant(conversationId, profileId) {
  const isMember = await conversationModel.isParticipant(conversationId, profileId);
  if (!isMember) {
    throw Object.assign(new Error('Not a participant in this conversation'), { status: 403 });
  }
}

async function sendMessage(userId, conversationId, body) {
  const profileId = await requireProfileId(userId);
  await requireParticipant(conversationId, profileId);
  const message = await messageModel.insertMessage(conversationId, profileId, body);

  // Best-effort: a notification failure must never block message delivery.
  try {
    const participants = await conversationModel.getParticipants(conversationId);
    const sender = participants.find((p) => p.profile_id === profileId);
    const others = participants.filter((p) => p.profile_id !== profileId);
    const publicType = PUBLIC_TYPE_BY_STORED[participants[0]?.conversation_type] ?? 'friend';
    const preview = body.length > 80 ? `${body.slice(0, 77)}...` : body;
    await Promise.all(
      others.map((other) =>
        notificationsService.createNotification(null, {
          profileId: other.profile_id,
          type: 'new_message',
          title: `New message from ${sender?.display_name ?? 'someone'}`,
          body: preview,
          data: { conversation_id: conversationId, sender_profile_id: profileId, conversation_type: publicType },
        }),
      ),
    );
  } catch {
    /* notification best-effort — message already sent */
  }

  return message;
}

async function getMessages(userId, conversationId, afterMessageId) {
  const profileId = await requireProfileId(userId);
  await requireParticipant(conversationId, profileId);
  return messageModel.getMessages(conversationId, afterMessageId ?? null);
}

async function listConversations(userId, publicType) {
  const type = resolveType(publicType);
  const profileId = await requireProfileId(userId);
  return conversationModel.listConversationsForProfile(profileId, type);
}

async function markRead(userId, conversationId) {
  const profileId = await requireProfileId(userId);
  await requireParticipant(conversationId, profileId);
  await conversationModel.updateLastRead(conversationId, profileId);
  return { read: true };
}

// Friends roster (Messages > Trusted Friends tab): merges trusted_friends with
// My-Referrals connections (app referrals + customer invites), same widened source
// the send gate above already accepts. A person can appear in both sources — dedupe
// by profile_id, keep whichever occurrence is seen first.
async function listFriends(userId) {
  const profileId = await requireProfileId(userId);
  const [trusted, referred] = await Promise.all([
    conversationModel.listFriends(profileId),
    referralModel.getCombinedReferrals(profileId, {}),
  ]);
  const seen = new Set();
  const merged = [];
  for (const r of [...trusted, ...referred]) {
    if (seen.has(r.profile_id)) continue;
    seen.add(r.profile_id);
    merged.push({ profile_id: r.profile_id, display_name: r.display_name, avatar_url: r.avatar_url });
  }
  merged.sort((a, b) => a.display_name.localeCompare(b.display_name));
  return merged;
}

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  listConversations,
  markRead,
  listFriends,
};
