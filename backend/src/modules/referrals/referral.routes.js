const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { getMyReferralHandler, getMyReferralsHandler } = require('./referral.controller');

const router = Router();

router.get('/my-code', authenticate, getMyReferralHandler);
router.get('/mine',    authenticate, getMyReferralsHandler);

module.exports = router;
