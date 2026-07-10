const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { getFeedHandler } = require('./feed.controller');

const router = Router();

router.get('/', authenticate, getFeedHandler);

module.exports = router;
