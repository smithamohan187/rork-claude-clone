const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { toggleBodySchema } = require('./likes.validation');
const { toggleLikeHandler, getLikeStatusHandler, getLikersHandler } = require('./likes.controller');

const router = Router();

router.post('/toggle', authenticate, validateRequest(toggleBodySchema), toggleLikeHandler);
router.get('/:content_type/:content_id/likers', authenticate, getLikersHandler);
router.get('/:content_type/:content_id', authenticate, getLikeStatusHandler);

module.exports = router;
