const postsService = require('./posts.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getPostsHandler = asyncHandler(async (req, res) => {
  const filter = req.query.status; // 'active' | 'disabled' | undefined
  const posts = await postsService.listMyPosts(req.user.userId, filter);
  res.json(ok({ posts }));
});

const getPostByIdHandler = asyncHandler(async (req, res) => {
  try {
    const post = await postsService.getPost(req.params.id);
    res.json(ok({ post }));
  } catch (err) {
    if (err.message === 'Post not found') {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

const createPostHandler = asyncHandler(async (req, res) => {
  const post = await postsService.createPost(req.user.userId, req.body);
  res.status(201).json(ok({ post }));
});

const updatePostHandler = asyncHandler(async (req, res) => {
  try {
    const post = await postsService.editPost(req.user.userId, req.params.id, req.body);
    res.json(ok({ post }));
  } catch (err) {
    if (err.message === 'Post not found') {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

const toggleStatusHandler = asyncHandler(async (req, res) => {
  try {
    const post = await postsService.toggleStatus(
      req.user.userId,
      req.params.id,
      req.body.is_active,
    );
    res.json(ok({ post }));
  } catch (err) {
    if (err.message === 'Post not found') {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

const deletePostHandler = asyncHandler(async (req, res) => {
  try {
    await postsService.deletePost(req.user.userId, req.params.id);
    res.json(ok({ id: req.params.id }));
  } catch (err) {
    if (err.message === 'Post not found') {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

const uploadPostImageHandler = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json(fail('No file uploaded'));
  const imageUrl = `/uploads/posts/${req.file.filename}`;
  const post = await postsService.uploadPostImage(req.user.userId, req.params.id, imageUrl);
  res.json(ok({ post }));
});

module.exports = {
  getPostsHandler,
  getPostByIdHandler,
  createPostHandler,
  updatePostHandler,
  toggleStatusHandler,
  deletePostHandler,
  uploadPostImageHandler,
};
