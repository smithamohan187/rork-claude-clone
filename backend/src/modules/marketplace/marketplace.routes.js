const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { getMyBusinessReferralCodeHandler } = require('./marketplace.controller');

const router = Router();

router.get('/my-referral-code', authenticate, getMyBusinessReferralCodeHandler);

module.exports = router;
