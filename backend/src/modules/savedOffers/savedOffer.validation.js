const Joi = require('joi');

const toggleSchema = Joi.object({
  offer_id: Joi.string().uuid().required(),
});

module.exports = { toggleSchema };
