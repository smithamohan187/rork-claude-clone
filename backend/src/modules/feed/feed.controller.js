const feedService = require('./feed.service');
const { ok } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getFeedHandler = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const category = req.query.category || null;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  const result = await feedService.getFeed(userId, category, limit, offset);
  res.json(ok(result));
});

module.exports = { getFeedHandler };
