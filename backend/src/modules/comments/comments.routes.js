const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { addCommentSchema } = require('./comments.validation');
const {
  addCommentHandler,
  getCommentsHandler,
  getRepliesHandler,
  deleteCommentHandler,
} = require('./comments.controller');

const router = Router();

router.post('/', authenticate, validateRequest(addCommentSchema), addCommentHandler);
// replies route registered BEFORE /:content_type/:content_id to avoid Express ambiguity
router.get('/:comment_id/replies', authenticate, getRepliesHandler);
router.get('/:content_type/:content_id', authenticate, getCommentsHandler);
router.delete('/:comment_id', authenticate, deleteCommentHandler);

module.exports = router;
