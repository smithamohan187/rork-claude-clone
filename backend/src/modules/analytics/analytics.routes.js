const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { getSummaryHandler } = require('./analytics.controller');

// Mounted at /analytics — business-owner only (ownership resolved in the service, same as dashboardFeed).
const router = Router();

router.get('/summary', authenticate, getSummaryHandler);

module.exports = router;
