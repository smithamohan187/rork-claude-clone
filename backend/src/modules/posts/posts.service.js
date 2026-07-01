const postsModel = require('./posts.model');

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
  return postsModel.insertPost(businessId, payload);
}

async function editPost(userId, postId, payload) {
  await verifyPostOwnership(userId, postId);
  const updated = await postsModel.updatePost(postId, payload);
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
  return postsModel.getPostsByBusinessId(businessId, isActive);
}

async function getPost(postId) {
  const post = await postsModel.getPostById(postId);
  if (!post) throw new Error('Post not found');
  return post;
}

async function deletePost(userId, postId) {
  await verifyPostOwnership(userId, postId);
  const deleted = await postsModel.deletePost(postId);
  if (!deleted) throw new Error('Post not found');
}

async function uploadPostImage(userId, postId, imageUrl) {
  await verifyPostOwnership(userId, postId);
  return postsModel.updatePostImageUrl(postId, imageUrl);
}

module.exports = {
  createPost,
  editPost,
  toggleStatus,
  listMyPosts,
  getPost,
  deletePost,
  uploadPostImage,
};
