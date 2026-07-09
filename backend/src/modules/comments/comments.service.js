const commentsModel = require('./comments.model');

async function addComment(contentType, contentId, profileId, body, parentCommentId) {
  if (parentCommentId) {
    const parent = await commentsModel.getParentInfo(parentCommentId);
    if (!parent) {
      const err = new Error('Parent comment not found');
      err.status = 404;
      throw err;
    }
    if (parent.parent_comment_id !== null) {
      const err = new Error('Replies cannot be replied to');
      err.status = 400;
      throw err;
    }
  }
  return commentsModel.addComment(contentType, contentId, profileId, body, parentCommentId);
}

async function getComments(contentType, contentId, limit, offset) {
  const topLevel = await commentsModel.getTopLevelComments(contentType, contentId, limit, offset);
  if (!topLevel.length) return [];
  const parentIds = topLevel.map((c) => c.id);
  const replies = await commentsModel.getRepliesBatch(parentIds);

  const replyMap = {};
  for (const r of replies) {
    if (!replyMap[r.parent_comment_id]) replyMap[r.parent_comment_id] = [];
    replyMap[r.parent_comment_id].push(r);
  }

  return topLevel.map((c) => ({ ...c, replies: replyMap[c.id] ?? [] }));
}

async function getReplies(commentId, limit, offset) {
  return commentsModel.getRepliesPaginated(commentId, limit, offset);
}

async function deleteComment(commentId, requesterProfileId) {
  const comment = await commentsModel.getCommentById(commentId);
  if (!comment || comment.is_deleted) {
    const err = new Error('Comment not found');
    err.status = 404;
    throw err;
  }

  const isAuthor = comment.profile_id === requesterProfileId;
  if (!isAuthor) {
    const ownerProfileId = await commentsModel.getContentOwnerProfileId(
      comment.content_type,
      comment.content_id
    );
    const isContentOwner = ownerProfileId === requesterProfileId;
    if (!isContentOwner) {
      // TODO: wire to admin panel once built
      const err = new Error('Not authorized to delete this comment');
      err.status = 403;
      throw err;
    }
  }

  return commentsModel.softDeleteComment(commentId);
}

async function getCommentCount(contentType, contentId) {
  return commentsModel.getCommentCount(contentType, contentId);
}

module.exports = { addComment, getComments, getReplies, deleteComment, getCommentCount };
