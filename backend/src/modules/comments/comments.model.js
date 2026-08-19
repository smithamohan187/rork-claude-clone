const { query } = require('../../config/database');

async function addComment(contentType, contentId, profileId, body, parentCommentId) {
  const { rows } = await query(
    `INSERT INTO comments (content_type, content_id, profile_id, body, parent_comment_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [contentType, contentId, profileId, body, parentCommentId ?? null]
  );
  return rows[0];
}

async function getParentInfo(commentId) {
  const { rows } = await query(
    `SELECT id, parent_comment_id FROM comments WHERE id = $1`,
    [commentId]
  );
  return rows[0] ?? null;
}

async function getTopLevelComments(contentType, contentId, limit, offset, callerProfileId) {
  const { rows } = await query(
    `SELECT
       c.id, c.content_type, c.content_id, c.profile_id, c.parent_comment_id,
       CASE WHEN c.is_deleted THEN '[comment deleted]' ELSE c.body END AS body,
       c.is_deleted, c.created_at, c.updated_at,
       CASE WHEN c.is_deleted THEN NULL ELSE p.display_name END AS display_name,
       CASE WHEN c.is_deleted THEN NULL ELSE p.avatar_url END AS avatar_url,
       (SELECT COUNT(*)::int FROM comments r
        WHERE r.parent_comment_id = c.id AND r.is_deleted = FALSE) AS reply_count,
       (SELECT COUNT(*)::int FROM likes l
        WHERE l.content_type = 'comment' AND l.content_id = c.id) AS like_count,
       EXISTS(SELECT 1 FROM likes l
        WHERE l.content_type = 'comment' AND l.content_id = c.id AND l.profile_id = $5) AS liked_by_me
     FROM comments c
     JOIN profiles p ON p.id = c.profile_id
     WHERE c.content_type = $1 AND c.content_id = $2 AND c.parent_comment_id IS NULL
     ORDER BY c.created_at ASC
     LIMIT $3 OFFSET $4`,
    [contentType, contentId, limit, offset, callerProfileId]
  );
  return rows;
}

async function getRepliesBatch(parentIds, callerProfileId) {
  if (!parentIds.length) return [];
  const { rows } = await query(
    `SELECT
       c.id, c.content_type, c.content_id, c.profile_id, c.parent_comment_id,
       CASE WHEN c.is_deleted THEN '[comment deleted]' ELSE c.body END AS body,
       c.is_deleted, c.created_at, c.updated_at,
       CASE WHEN c.is_deleted THEN NULL ELSE p.display_name END AS display_name,
       CASE WHEN c.is_deleted THEN NULL ELSE p.avatar_url END AS avatar_url,
       (SELECT COUNT(*)::int FROM likes l
        WHERE l.content_type = 'comment' AND l.content_id = c.id) AS like_count,
       EXISTS(SELECT 1 FROM likes l
        WHERE l.content_type = 'comment' AND l.content_id = c.id AND l.profile_id = $2) AS liked_by_me
     FROM comments c
     JOIN profiles p ON p.id = c.profile_id
     WHERE c.parent_comment_id = ANY($1::uuid[])
     ORDER BY c.created_at ASC`,
    [parentIds, callerProfileId]
  );
  return rows;
}

async function getRepliesPaginated(commentId, limit, offset, callerProfileId) {
  const { rows } = await query(
    `SELECT
       c.id, c.content_type, c.content_id, c.profile_id, c.parent_comment_id,
       CASE WHEN c.is_deleted THEN '[comment deleted]' ELSE c.body END AS body,
       c.is_deleted, c.created_at, c.updated_at,
       CASE WHEN c.is_deleted THEN NULL ELSE p.display_name END AS display_name,
       CASE WHEN c.is_deleted THEN NULL ELSE p.avatar_url END AS avatar_url,
       (SELECT COUNT(*)::int FROM likes l
        WHERE l.content_type = 'comment' AND l.content_id = c.id) AS like_count,
       EXISTS(SELECT 1 FROM likes l
        WHERE l.content_type = 'comment' AND l.content_id = c.id AND l.profile_id = $4) AS liked_by_me
     FROM comments c
     JOIN profiles p ON p.id = c.profile_id
     WHERE c.parent_comment_id = $1
     ORDER BY c.created_at ASC
     LIMIT $2 OFFSET $3`,
    [commentId, limit, offset, callerProfileId]
  );
  return rows;
}

async function getCommentById(commentId) {
  const { rows } = await query(
    `SELECT c.*, p.display_name, p.avatar_url
     FROM comments c
     JOIN profiles p ON p.id = c.profile_id
     WHERE c.id = $1`,
    [commentId]
  );
  return rows[0] ?? null;
}

async function softDeleteComment(commentId) {
  const { rows } = await query(
    `UPDATE comments
     SET is_deleted = TRUE, body = '', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [commentId]
  );
  return rows[0] ?? null;
}

async function getContentOwnerProfileId(contentType, contentId) {
  let sql;
  if (contentType === 'offer') {
    sql = `SELECT b.profile_id FROM offers o
           JOIN businesses b ON b.id = o.business_id
           WHERE o.id = $1`;
  } else if (contentType === 'event') {
    sql = `SELECT b.profile_id FROM events e
           JOIN businesses b ON b.id = e.business_id
           WHERE e.id = $1`;
  } else {
    sql = `SELECT b.profile_id FROM posts p
           JOIN businesses b ON b.id = p.business_id
           WHERE p.id = $1`;
  }
  const { rows } = await query(sql, [contentId]);
  return rows[0]?.profile_id ?? null;
}

async function getCommentCount(contentType, contentId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS comment_count
     FROM comments
     WHERE content_type = $1 AND content_id = $2 AND is_deleted = FALSE`,
    [contentType, contentId]
  );
  return rows[0].comment_count;
}

async function deleteByContent(contentType, contentId) {
  await query(
    'DELETE FROM comments WHERE content_type = $1 AND content_id = $2',
    [contentType, contentId]
  );
}

module.exports = {
  addComment,
  getParentInfo,
  getTopLevelComments,
  getRepliesBatch,
  getRepliesPaginated,
  getCommentById,
  softDeleteComment,
  getContentOwnerProfileId,
  getCommentCount,
  deleteByContent,
};
