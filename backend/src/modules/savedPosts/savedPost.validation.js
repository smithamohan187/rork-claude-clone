const Joi = require('joi');

const toggleSchema = Joi.object({
  post_id: Joi.string().uuid().required(),
});

module.exports = { toggleSchema };
