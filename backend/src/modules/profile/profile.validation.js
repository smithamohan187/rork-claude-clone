const Joi = require('joi');

const uuid = Joi.string().guid({ version: 'uuidv4' });

const updateProfileSchema = Joi.object({
  display_name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string()
    .pattern(/^\d{10,15}$/)
    .allow(null, '')
    .optional()
    .messages({ 'string.pattern.base': 'Phone must be 10–15 digits' }),
  bio:     Joi.string().max(500).allow(null, '').optional(),
  city:    Joi.string().max(100).allow(null, '').optional(),
  state:   Joi.string().max(100).allow(null, '').optional(),
  country: Joi.string().max(100).allow(null, '').optional(),
  interest_ids: Joi.array().items(uuid).max(20).optional(),
});

module.exports = { updateProfileSchema };
