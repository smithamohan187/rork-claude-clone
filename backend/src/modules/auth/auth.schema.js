const Joi = require('joi');

const uuid = Joi.string().guid({ version: 'uuidv4' });

const registerSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  phone: Joi.string().min(10).max(15).optional(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one number, and one special character',
    }),
  display_name: Joi.string().min(2).max(100).required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  country: Joi.string().default('IN').optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  location_label: Joi.string().max(255).optional(),
  interests: Joi.array().items(uuid).max(10).allow(null, '').optional(),
  referral_code: Joi.string().max(30).allow('').optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
