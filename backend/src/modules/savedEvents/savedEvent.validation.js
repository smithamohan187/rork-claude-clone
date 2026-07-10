const Joi = require('joi');

const toggleSchema = Joi.object({
  event_id: Joi.string().uuid().required(),
});

module.exports = { toggleSchema };
