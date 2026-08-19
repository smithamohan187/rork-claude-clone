const Joi = require('joi');

const toggleBodySchema = Joi.object({
  content_type: Joi.string().valid('offer', 'event', 'post', 'comment').required(),
  content_id: Joi.string().uuid().required(),
});

module.exports = { toggleBodySchema };
