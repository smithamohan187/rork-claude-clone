const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { createRecipientsBodySchema, resolveReferralBodySchema, shareContentToFriendsBodySchema } = require('./shareReferrals.validation');
const { createRecipientsHandler, resolveReferralHandler, shareContentToFriendsHandler } = require('./shareReferrals.controller');

const router = Router();

// Sharer creates per-recipient referral rows (auth required).
router.post('/share-recipients', authenticate, validateRequest(createRecipientsBodySchema), createRecipientsHandler);

// Public: an unregistered user's link must resolve without a token.
router.post('/resolve-share-referral', validateRequest(resolveReferralBodySchema), resolveReferralHandler);

// Share an offer/event/post directly to one or more trusted friends via chat (auth required).
// Route path kept as /offer-to-friends for backward compatibility even though it now handles all
// three content types — only consumer is ReferOfferSheet.tsx, updated in the same change.
router.post('/offer-to-friends', authenticate, validateRequest(shareContentToFriendsBodySchema), shareContentToFriendsHandler);

module.exports = router;
