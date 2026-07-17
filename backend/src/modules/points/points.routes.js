const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { getPointsSummaryHandler } = require('./points.controller');

const router = express.Router();

router.get('/summary', authenticate, getPointsSummaryHandler);

module.exports = router;
