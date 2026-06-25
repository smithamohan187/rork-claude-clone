const Joi = require('joi');

const registerBusinessSchema = Joi.object({
  business_name: Joi.string().trim().required(),
  category_id: Joi.string().uuid().required(),
  business_type: Joi.string().valid('goodwill', 'incentivised').required(),
  description: Joi.string().max(500).optional().allow(''),
  phone: Joi.string().pattern(/^\+?[\d\s\-()+]{7,20}$/).optional().allow(''),
  website: Joi.string().uri().optional().allow(''),
  address: Joi.string().optional().allow(''),
  city: Joi.string().optional().allow(''),
  state: Joi.string().optional().allow(''),
  country: Joi.string().optional().allow(''),
  inhouse_referral: Joi.boolean().default(false),
  inhouse_referral_url: Joi.when('inhouse_referral', {
    is: true,
    then: Joi.string().uri().required(),
    otherwise: Joi.string().optional().allow(''),
  }),
  hours: Joi.array().items(
    Joi.object({
      day_of_week: Joi.number().integer().min(0).max(6).required(),
      open_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).optional().allow(''),
      close_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).optional().allow(''),
      is_closed: Joi.boolean().default(false),
    })
  ).optional(),
});

module.exports = { registerBusinessSchema };
