const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const {
  getRecentActivityHandler,
  getRecentRedemptionsHandler,
} = require('./dashboardFeed.controller');

// Mounted at /dashboard/feed — business-owner only (ownership enforced in the service).
const router = Router();

router.get('/recent-activity', authenticate, getRecentActivityHandler);
router.get('/redemptions', authenticate, getRecentRedemptionsHandler);

module.exports = router;
