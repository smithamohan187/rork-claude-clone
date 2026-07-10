const savedPostModel = require('./savedPost.model');
const { query } = require('../../config/database');

async function toggleSavePost(userId, postId) {
  const profileId = await savedPostModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const { rows } = await query('SELECT id FROM posts WHERE id = $1', [postId]);
  if (!rows[0]) throw Object.assign(new Error('Post not found'), { status: 404 });

  return savedPostModel.toggleSavePost(profileId, postId);
}

async function getSavedPosts(userId) {
  const profileId = await savedPostModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return savedPostModel.getSavedPosts(profileId);
}

module.exports = { toggleSavePost, getSavedPosts };
