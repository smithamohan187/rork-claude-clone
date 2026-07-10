const Joi = require('joi');

const getFeedQuerySchema = Joi.object({
  category: Joi.string().uuid().optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

module.exports = { getFeedQuerySchema };
