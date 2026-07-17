const Joi = require('joi');

const createRecipientsBodySchema = Joi.object({
  content_type: Joi.string().valid('post', 'offer', 'event', 'broadcast').required(),
  content_id:   Joi.string().uuid().required(),
  business_id:  Joi.string().uuid().required(),
  recipients: Joi.array()
    .items(Joi.object({ contact: Joi.string().max(255).allow(null, '').optional() }))
    .default([]),
});

const resolveReferralBodySchema = Joi.object({
  referral_code: Joi.string().max(30).required(),
});

module.exports = { createRecipientsBodySchema, resolveReferralBodySchema };
