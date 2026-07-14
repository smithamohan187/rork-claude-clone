const Joi = require('joi');

const logShareBodySchema = Joi.object({
  content_type: Joi.string().valid('offer', 'event', 'post', 'broadcast').required(),
  content_id:   Joi.string().uuid().required(),
  channel:      Joi.string().valid(
    'facebook', 'twitter', 'instagram', 'tiktok',
    'whatsapp', 'messenger', 'sms', 'email', 'native', 'contacts'
  ).required(),
});

module.exports = { logShareBodySchema };
