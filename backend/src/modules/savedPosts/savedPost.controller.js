const savedPostService = require('./savedPost.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const toggleHandler = asyncHandler(async (req, res) => {
  const { post_id } = req.body;
  try {
    const result = await savedPostService.toggleSavePost(req.user.userId, post_id);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 404) return res.status(404).json(fail(err.message));
    if (err.status === 400) return res.status(400).json(fail(err.message));
    throw err;
  }
});

const myPostsHandler = asyncHandler(async (req, res) => {
  const result = await savedPostService.getSavedPosts(req.user.userId);
  res.json(ok(result));
});

module.exports = { toggleHandler, myPostsHandler };
