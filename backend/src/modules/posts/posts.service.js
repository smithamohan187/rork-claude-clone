const postsModel = require('./posts.model');
const likesModel = require('../likes/likes.model');
const commentsModel = require('../comments/comments.model');
const businessService = require('../businesses/business.service');
const subscriptionModel = require('../subscriptions/subscription.model');

async function verifyPostOwnership(userId, postId) {
  const businessId = await postsModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');

  const post = await postsModel.getPostById(postId);
  if (!post) throw new Error('Post not found');
  if (post.business_id !== businessId) throw new Error('Not authorised to modify this post');

  return { post, businessId };
}

async function createPost(userId, payload) {
  const businessId = await postsModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');
  if (!(await businessService.isBusinessUnlocked(businessId))) {
    throw Object.assign(
      new Error('Complete your business profile and start your Stripe trial to post'),
      { status: 403 }
    );
  }
  return postsModel.insertPost(businessId, payload);
}

async function editPost(userId, postId, payload) {
  await verifyPostOwnership(userId, postId);
  const hasImageUrl = Object.prototype.hasOwnProperty.call(payload, 'image_url');
  const hasVideoUrl = Object.prototype.hasOwnProperty.call(payload, 'video_url');
  // A post carries at most one of image/video — setting one clears the other.
  const finalPayload = { ...payload };
  if (hasImageUrl && payload.image_url) {
    finalPayload.video_url = null;
    finalPayload.video_type = null;
  } else if (hasVideoUrl && payload.video_url) {
    finalPayload.image_url = null;
  }
  const updated = await postsModel.updatePost(
    postId,
    finalPayload,
    Boolean(hasImageUrl || (hasVideoUrl && payload.video_url)),
    Boolean(hasVideoUrl || (hasImageUrl && payload.image_url)),
  );
  if (!updated) throw new Error('Post not found');
  return updated;
}

async function toggleStatus(userId, postId, isActive) {
  await verifyPostOwnership(userId, postId);
  const updated = await postsModel.updatePost(postId, { is_active: isActive });
  if (!updated) throw new Error('Post not found');
  return updated;
}

async function listMyPosts(userId, filter) {
  const businessId = await postsModel.getBusinessIdByUserId(userId);
  if (!businessId) return [];
  const isActive =
    filter === 'active'   ? true  :
    filter === 'disabled' ? false :
    undefined;
  return postsModel.getPostsByBusinessId(businessId, isActive, null);
}

async function getPost(postId, profileId) {
  const post = await postsModel.getPostById(postId, profileId);
  if (!post) throw new Error('Post not found');
  // Disabled posts are only visible to the owning business (same rule as the list endpoint).
  if (!post.is_active && !post.is_owner) throw new Error('Post not found');
  return post;
}

async function deletePost(userId, postId) {
  await verifyPostOwnership(userId, postId);
  const deleted = await postsModel.deletePost(postId);
  if (!deleted) throw new Error('Post not found');
  // Posts are hard-deleted, so their likes/comments (generic polymorphic tables keyed on
  // content_type/content_id, no FK) would otherwise be orphaned forever — clean them up too.
  await likesModel.deleteLikesOnCommentsOfContent('post', postId);
  await Promise.all([
    likesModel.deleteByContent('post', postId),
    commentsModel.deleteByContent('post', postId),
  ]);
}

async function getPostsForBusiness(businessId, filter, profileId) {
  const isOwner = await postsModel.isBusinessOwnedByProfile(businessId, profileId);
  // Disabled posts are meant to be hidden from everyone except the owning business.
  // Non-owners always get active-only, regardless of filter — including the default
  // 'all' filter, which would otherwise silently include disabled posts too.
  if (!isOwner) {
    const sub = await subscriptionModel.getSubscription(profileId, businessId);
    if (!sub?.is_active) return [];
    return postsModel.getPostsByBusinessId(businessId, true, profileId);
  }
  const isActive =
    filter === 'active'   ? true  :
    filter === 'disabled' ? false :
    undefined;
  return postsModel.getPostsByBusinessId(businessId, isActive, profileId);
}

async function uploadPostImage(userId, postId, imageUrl) {
  await verifyPostOwnership(userId, postId);
  return postsModel.updatePostImageUrl(postId, imageUrl);
}

async function uploadPostVideo(userId, postId, videoUrl) {
  await verifyPostOwnership(userId, postId);
  return postsModel.updatePostVideo(postId, videoUrl, 'upload');
}

module.exports = {
  createPost,
  editPost,
  toggleStatus,
  listMyPosts,
  getPost,
  getPostsForBusiness,
  deletePost,
  uploadPostImage,
  uploadPostVideo,
};
