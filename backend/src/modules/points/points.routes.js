const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { getPointsSummaryHandler, getPointsHistoryHandler } = require('./points.controller');

const router = express.Router();

router.get('/summary', authenticate, getPointsSummaryHandler);
router.get('/history', authenticate, getPointsHistoryHandler);

module.exports = router;
