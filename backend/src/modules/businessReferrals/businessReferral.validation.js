const Joi = require('joi');

const resolvePendingSchema = Joi.object({
  referral_code: Joi.string().required(),
});

module.exports = { resolvePendingSchema };
