const Joi = require('joi');

const subscribeBodySchema = Joi.object({
  business_id: Joi.string().uuid().required(),
});

const unsubscribeBodySchema = Joi.object({
  business_id: Joi.string().uuid().required(),
});

module.exports = { subscribeBodySchema, unsubscribeBodySchema };
