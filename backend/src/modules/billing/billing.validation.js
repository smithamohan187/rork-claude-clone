const Joi = require('joi');

const checkoutSessionSchema = Joi.object({
  plan_id: Joi.string().uuid().required(),
  success_url: Joi.string().uri().required(),
  cancel_url: Joi.string().uri().required(),
});

const changePlanSchema = Joi.object({
  plan_id: Joi.string().uuid().required(),
});

const portalSessionSchema = Joi.object({
  plan_id: Joi.string().uuid().required(),
  return_url: Joi.string().uri().required(),
});

module.exports = { checkoutSessionSchema, changePlanSchema, portalSessionSchema };
