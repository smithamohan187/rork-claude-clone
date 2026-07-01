const Joi = require('joi');

const createOfferSchema = Joi.object({
  title:           Joi.string().trim().min(3).max(200).required(),
  description:     Joi.string().trim().max(2000).optional().allow('', null),
  discount_type:   Joi.string().valid('percent', 'flat', 'bogo', 'freebie').optional().allow(null),
  discount_value:  Joi.number().min(0).optional().allow(null),
  original_price:  Joi.number().min(0).optional().allow(null),
  terms:           Joi.string().trim().max(2000).optional().allow('', null),
  max_redemptions: Joi.number().integer().min(1).optional().allow(null),
  starts_at:       Joi.string().isoDate().optional().allow(null),
  expires_at:      Joi.string().isoDate().optional().allow(null),
  status:          Joi.string().valid('active', 'disabled').optional().default('active'),
});

const updateOfferSchema = Joi.object({
  title:           Joi.string().trim().min(3).max(200).optional(),
  description:     Joi.string().trim().max(2000).optional().allow('', null),
  image_url:       Joi.string().optional().allow('', null),
  discount_type:   Joi.string().valid('percent', 'flat', 'bogo', 'freebie').optional().allow(null),
  discount_value:  Joi.number().min(0).optional().allow(null),
  original_price:  Joi.number().min(0).optional().allow(null),
  terms:           Joi.string().trim().max(2000).optional().allow('', null),
  max_redemptions: Joi.number().integer().min(1).optional().allow(null),
  starts_at:       Joi.string().isoDate().optional().allow(null),
  expires_at:      Joi.string().isoDate().optional().allow(null),
  status:          Joi.string().valid('active', 'disabled').optional(),
});

const toggleStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'disabled').required(),
});

module.exports = { createOfferSchema, updateOfferSchema, toggleStatusSchema };
