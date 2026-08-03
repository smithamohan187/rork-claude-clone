const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { createRecipientsBodySchema, resolveReferralBodySchema, shareOfferToFriendsBodySchema } = require('./shareReferrals.validation');
const { createRecipientsHandler, resolveReferralHandler, shareOfferToFriendsHandler } = require('./shareReferrals.controller');

const router = Router();

// Sharer creates per-recipient referral rows (auth required).
router.post('/share-recipients', authenticate, validateRequest(createRecipientsBodySchema), createRecipientsHandler);

// Public: an unregistered user's link must resolve without a token.
router.post('/resolve-share-referral', validateRequest(resolveReferralBodySchema), resolveReferralHandler);

// Share an offer directly to one or more trusted friends via chat (auth required).
router.post('/offer-to-friends', authenticate, validateRequest(shareOfferToFriendsBodySchema), shareOfferToFriendsHandler);

module.exports = router;
