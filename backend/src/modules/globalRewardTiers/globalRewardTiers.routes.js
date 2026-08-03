const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { getTierHandler } = require('./globalRewardTiers.controller');

const router = express.Router();

router.get('/tier', authenticate, getTierHandler);

module.exports = router;
