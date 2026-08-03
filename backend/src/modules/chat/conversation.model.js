// conversation.model.js — raw SQL for conversations, participants, and the
// derived conversation-list / friends-list reads. No business logic here.
const { query } = require('../../config/database');

// Mutating helpers accept an optional `client` so callers can run them inside an
// existing transaction (get-or-create). Falls back to the pool otherwise.
const runner = (client) => (client ? (text, params) => client.query(text, params) : query);

// Finds an existing direct conversation of `type` whose participant set is
// exactly {profileA, profileB}. The HAVING guard prevents matching a
// conversation that merely includes both plus others (future-proofing).
async function findDirectConversation(client, profileA, profileB, type) {
  const q = runner(client);
  const { rows } = await q(
    `SELECT c.id
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.type = $3
        AND cp.profile_id IN ($1, $2)
      GROUP BY c.id
     HAVING COUNT(DISTINCT cp.profile_id) = 2
        AND COUNT(*) = 2
      LIMIT 1`,
    [profileA, profileB, type],
  );
  return rows[0] ?? null;
}

async function insertConversation(client, type) {
  const q = runner(client);
  const { rows } = await q(
    `INSERT INTO conversations (type) VALUES ($1) RETURNING *`,
    [type],
  );
  return rows[0];
}

async function insertParticipant(client, conversationId, profileId) {
  const q = runner(client);
  await q(
    `INSERT INTO conversation_participants (conversation_id, profile_id)
     VALUES ($1, $2)
     ON CONFLICT (conversation_id, profile_id) DO NOTHING`,
    [conversationId, profileId],
  );
}

async function isParticipant(conversationId, profileId) {
  const { rows } = await query(
    `SELECT 1 FROM conversation_participants
      WHERE conversation_id = $1 AND profile_id = $2
      LIMIT 1`,
    [conversationId, profileId],
  );
  return rows.length > 0;
}

async function updateLastRead(conversationId, profileId) {
  await query(
    `UPDATE conversation_participants
        SET last_read_at = NOW()
      WHERE conversation_id = $1 AND profile_id = $2`,
    [conversationId, profileId],
  );
}

// Every conversation `profileId` is in, filtered by `type`, with the OTHER
// party's display info, a last-message preview, and a read-time-computed unread
// count (messages newer than the caller's last_read_at, not sent by them).
// For direct_business the "other party" display prefers the business name/logo.
async function listConversationsForProfile(profileId, type) {
  const { rows } = await query(
    `SELECT
       c.id,
       c.type,
       c.created_at,
       other.profile_id                                 AS other_profile_id,
       COALESCE(b.name, other_p.display_name)           AS other_name,
       COALESCE(b.logo_url, other_p.avatar_url)         AS other_avatar_url,
       b.id                                             AS other_business_id,
       lm.body                                          AS last_message_body,
       lm.created_at                                    AS last_message_at,
       lm.sender_profile_id                             AS last_message_sender_id,
       (
         SELECT COUNT(*)::int FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_profile_id <> $1
            AND m.created_at > COALESCE(me.last_read_at, 'epoch'::timestamptz)
       )                                                AS unread_count
     FROM conversation_participants me
     JOIN conversations c ON c.id = me.conversation_id
     JOIN conversation_participants other
          ON other.conversation_id = c.id AND other.profile_id <> $1
     JOIN profiles other_p ON other_p.id = other.profile_id
     LEFT JOIN businesses b ON b.profile_id = other_p.id
     LEFT JOIN LATERAL (
       SELECT body, created_at, sender_profile_id
         FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
     ) lm ON TRUE
     WHERE me.profile_id = $1
       AND c.type = $2
     ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
    [profileId, type],
  );
  return rows;
}

// Read-only friends list from trusted_friends. A single row stores the pair as
// (one < two), so the "other" side is whichever column isn't the caller.
async function listFriends(profileId) {
  const { rows } = await query(
    `SELECT p.id AS profile_id, p.display_name, p.avatar_url
       FROM trusted_friends tf
       JOIN profiles p
         ON p.id = CASE WHEN tf.profile_id_one = $1
                        THEN tf.profile_id_two
                        ELSE tf.profile_id_one END
      WHERE tf.profile_id_one = $1 OR tf.profile_id_two = $1
      ORDER BY p.display_name ASC`,
    [profileId],
  );
  return rows;
}

// Real display info (name/avatar, business-aware) for a single profile — used to
// decorate getOrCreateConversation's response with the other party's actual photo,
// same COALESCE(business, personal) shape listConversationsForProfile already uses.
async function getProfileDisplay(profileId) {
  const { rows } = await query(
    `SELECT p.id AS profile_id,
            COALESCE(b.name, p.display_name) AS display_name,
            COALESCE(b.logo_url, p.avatar_url) AS avatar_url,
            b.id AS business_id
       FROM profiles p
       LEFT JOIN businesses b ON b.profile_id = p.id
      WHERE p.id = $1`,
    [profileId],
  );
  return rows[0] ?? null;
}

// All participants of a conversation with display names, plus the conversation's
// stored type — used to build new-message notifications (sender name + who to notify).
async function getParticipants(conversationId) {
  const { rows } = await query(
    `SELECT cp.profile_id, p.display_name, c.type AS conversation_type
       FROM conversation_participants cp
       JOIN profiles p ON p.id = cp.profile_id
       JOIN conversations c ON c.id = cp.conversation_id
      WHERE cp.conversation_id = $1`,
    [conversationId],
  );
  return rows;
}

// True when the pair (in either orientation) exists in trusted_friends.
async function areTrustedFriends(profileA, profileB) {
  const { rows } = await query(
    `SELECT 1 FROM trusted_friends
      WHERE (profile_id_one = LEAST($1::uuid, $2::uuid)
             AND profile_id_two = GREATEST($1::uuid, $2::uuid))
      LIMIT 1`,
    [profileA, profileB],
  );
  return rows.length > 0;
}

module.exports = {
  findDirectConversation,
  insertConversation,
  insertParticipant,
  isParticipant,
  updateLastRead,
  listConversationsForProfile,
  listFriends,
  getParticipants,
  getProfileDisplay,
  areTrustedFriends,
};
