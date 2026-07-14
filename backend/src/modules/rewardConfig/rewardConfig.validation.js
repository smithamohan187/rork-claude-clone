const Joi = require('joi');

const upsertConfigSchema = Joi.object({
  welcome_bonus_points:  Joi.number().integer().min(0),
  referral_bonus_points: Joi.number().integer().min(0),
  share_points:          Joi.number().integer().min(0),
  purchase_enabled:      Joi.boolean(),
  points_per_rupee:      Joi.number().min(0),
});

const createTierSchema = Joi.object({
  name:       Joi.string().max(100).required(),
  min_points: Joi.number().integer().min(0).required(),
  color:      Joi.string().max(20),
  perks:      Joi.array().items(Joi.string()),
});

const updateTierSchema = Joi.object({
  name:       Joi.string().max(100),
  min_points: Joi.number().integer().min(0),
  color:      Joi.string().max(20),
  perks:      Joi.array().items(Joi.string()),
});

const createRewardSchema = Joi.object({
  name:               Joi.string().max(200).required(),
  description:        Joi.string().allow('', null),
  type:               Joi.string().valid('discount', 'free_item', 'perk'),
  points_required:    Joi.number().integer().min(1).required(),
  quantity_available: Joi.number().integer().min(0).allow(null),
});

const updateRewardSchema = Joi.object({
  name:               Joi.string().max(200),
  description:        Joi.string().allow('', null),
  type:               Joi.string().valid('discount', 'free_item', 'perk'),
  points_required:    Joi.number().integer().min(1),
  quantity_available: Joi.number().integer().min(0).allow(null),
});

module.exports = {
  upsertConfigSchema,
  createTierSchema,
  updateTierSchema,
  createRewardSchema,
  updateRewardSchema,
};
