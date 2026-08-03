const Joi = require('joi');

// No request bodies on this module's routes (GET-only). This module's only input is the query
// string on GET /referrals/mine, validated inline in referral.controller.js (no route here takes
// a body, so the shared validateRequest middleware doesn't apply).
const myReferralsQuerySchema = Joi.object({
  direction: Joi.string().valid('all', 'joined_via_me', 'i_joined_via').default('all'),
  search: Joi.string().trim().max(200).optional().allow('', null),
  excludeBusinessOwnerOf: Joi.string().uuid().optional(),
});

module.exports = { myReferralsQuerySchema };
