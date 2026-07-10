const Joi = require('joi');

const saveBodySchema = Joi.object({
  business_id: Joi.string().uuid().required(),
});

const unsaveBodySchema = Joi.object({
  business_id: Joi.string().uuid().required(),
});

module.exports = { saveBodySchema, unsaveBodySchema };
