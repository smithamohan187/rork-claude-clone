const Joi = require('joi');

const uuid = Joi.string().guid({ version: 'uuidv4' });

const registerSchema = Joi.object({
  full_name:          Joi.string().trim().min(2).max(100).required(),
  alias_name:         Joi.string().trim().max(50).optional(),
  email:              Joi.string().trim().lowercase().email().required(),
  phone:              Joi.string().trim().pattern(/^[0-9]{10,15}$/).optional(),
  password:           Joi.string().min(8).max(64).required(),
  location:           Joi.string().trim().max(200).optional(),
  interest_area_ids:  Joi.array().items(uuid).optional().default([]),
  referral_code:      Joi.string().trim().max(20).allow('').optional(),
});

const loginSchema = Joi.object({
  email:    Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
