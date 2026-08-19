const likesModel = require('./likes.model');

async function toggleLike(content_type, content_id, callerProfileId) {
  // Comments aren't owned by a business, so the self-like block doesn't apply to them.
  if (content_type !== 'comment') {
    const ownerProfileId = await likesModel.getContentOwnerProfileId(content_type, content_id);
    if (ownerProfileId && ownerProfileId === callerProfileId) {
      const err = new Error('Content owner cannot like their own content');
      err.status = 403;
      throw err;
    }
  }
  return likesModel.toggleLike(content_type, content_id, callerProfileId);
}

async function getLikeStatus(content_type, content_id, callerProfileId) {
  const [like_count, liked_by_me] = await Promise.all([
    likesModel.getLikeCount(content_type, content_id),
    likesModel.getUserLikedStatus(content_type, content_id, callerProfileId),
  ]);
  return { like_count, liked_by_me };
}

async function getLikers(content_type, content_id, limit, offset) {
  return likesModel.getLikers(content_type, content_id, limit, offset);
}

module.exports = { toggleLike, getLikeStatus, getLikers };
