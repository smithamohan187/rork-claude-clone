const Joi = require('joi');

const createInviteSchema = Joi.object({
  business_name:  Joi.string().trim().min(1).max(200).required(),
  contact_name:   Joi.string().trim().max(200).optional().allow('', null),
  contact_method: Joi.string().valid('sms', 'email', 'whatsapp', 'link').required(),
  contact_value:  Joi.string().trim().max(300).optional().allow('', null),
});

module.exports = { createInviteSchema };
