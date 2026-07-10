const likesService = require('./likes.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const toggleLikeHandler = asyncHandler(async (req, res, next) => {
  const { content_type, content_id } = req.body;
  const callerProfileId = req.user.activeProfileId;
  try {
    const result = await likesService.toggleLike(content_type, content_id, callerProfileId);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 403) return res.status(403).json(fail(err.message));
    next(err);
  }
});

const getLikeStatusHandler = asyncHandler(async (req, res) => {
  const { content_type, content_id } = req.params;
  const callerProfileId = req.user.activeProfileId;
  const result = await likesService.getLikeStatus(content_type, content_id, callerProfileId);
  res.json(ok(result));
});

const getLikersHandler = asyncHandler(async (req, res) => {
  const { content_type, content_id } = req.params;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const rows = await likesService.getLikers(content_type, content_id, limit, offset);
  res.json(ok(rows));
});

module.exports = { toggleLikeHandler, getLikeStatusHandler, getLikersHandler };
