const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { toggleSchema } = require('./savedPost.validation');
const { toggleHandler, myPostsHandler } = require('./savedPost.controller');

const router = Router();

router.post('/toggle',   authenticate, validateRequest(toggleSchema), toggleHandler);
router.get('/my-posts',  authenticate, myPostsHandler);

module.exports = router;
