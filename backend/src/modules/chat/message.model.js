// message.model.js — raw SQL for chat messages. No business logic here.
const { query } = require('../../config/database');

async function insertMessage(conversationId, senderProfileId, body) {
  const { rows } = await query(
    `INSERT INTO messages (conversation_id, sender_profile_id, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [conversationId, senderProfileId, body],
  );
  return rows[0];
}

// All messages for a conversation, ASC for chronological rendering. When
// `afterMessageId` is provided, returns only messages created after that
// message (the polling path). Rows created at the same instant are ordered by
// id to keep paging deterministic.
async function getMessages(conversationId, afterMessageId) {
  if (afterMessageId) {
    const { rows } = await query(
      `SELECT m.*
         FROM messages m
         JOIN messages anchor ON anchor.id = $2
        WHERE m.conversation_id = $1
          AND (m.created_at, m.id) > (anchor.created_at, anchor.id)
        ORDER BY m.created_at ASC, m.id ASC`,
      [conversationId, afterMessageId],
    );
    return rows;
  }
  const { rows } = await query(
    `SELECT * FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC, id ASC`,
    [conversationId],
  );
  return rows;
}

// Resolves a profile to its business row iff it is a business profile, using
// the existing profile_type = 'business' JOIN pattern. Never reads
// users.active_profile_id. Returns { business_id, name } or null.
async function getBusinessForProfile(profileId) {
  const { rows } = await query(
    `SELECT b.id AS business_id, b.name
       FROM profiles p
       JOIN businesses b ON b.profile_id = p.id
      WHERE p.id = $1 AND p.profile_type = 'business'
      LIMIT 1`,
    [profileId],
  );
  return rows[0] ?? null;
}

module.exports = {
  insertMessage,
  getMessages,
  getBusinessForProfile,
};
