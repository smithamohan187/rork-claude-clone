const commentsService = require('./comments.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const addCommentHandler = asyncHandler(async (req, res, next) => {
  const { content_type, content_id, body, parent_comment_id } = req.body;
  const profileId = req.user.activeProfileId;
  try {
    const comment = await commentsService.addComment(
      content_type, content_id, profileId, body, parent_comment_id
    );
    res.status(201).json(ok({ comment }));
  } catch (err) {
    if (err.status === 400 || err.status === 404) {
      return res.status(err.status).json(fail(err.message));
    }
    next(err);
  }
});

const getCommentsHandler = asyncHandler(async (req, res) => {
  const { content_type, content_id } = req.params;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const callerProfileId = req.user.activeProfileId;
  const comments = await commentsService.getComments(content_type, content_id, limit, offset, callerProfileId);
  res.json(ok({ comments }));
});

const getRepliesHandler = asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const callerProfileId = req.user.activeProfileId;
  const replies = await commentsService.getReplies(comment_id, limit, offset, callerProfileId);
  res.json(ok({ replies }));
});

const deleteCommentHandler = asyncHandler(async (req, res, next) => {
  const { comment_id } = req.params;
  const profileId = req.user.activeProfileId;
  try {
    await commentsService.deleteComment(comment_id, profileId);
    res.json(ok({ deleted: true }));
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      return res.status(err.status).json(fail(err.message));
    }
    next(err);
  }
});

module.exports = {
  addCommentHandler,
  getCommentsHandler,
  getRepliesHandler,
  deleteCommentHandler,
};
