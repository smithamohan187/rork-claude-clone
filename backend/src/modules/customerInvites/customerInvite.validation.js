const Joi = require('joi');

const createInviteSchema = Joi.object({
  business_id: Joi.string().uuid().required(),
  channel:     Joi.string().valid('contact', 'email', 'manual', 'csv').required(),
  name:        Joi.string().trim().max(200).optional().allow('', null),
  email:       Joi.string().trim().max(255).optional().allow('', null),
  phone:       Joi.string().trim().max(30).optional().allow('', null),
});

const bulkCreateInviteSchema = Joi.object({
  business_id: Joi.string().uuid().required(),
  rows: Joi.array()
    .items(
      Joi.object({
        name:  Joi.string().trim().max(200).optional().allow('', null),
        email: Joi.string().trim().max(255).optional().allow('', null),
        phone: Joi.string().trim().max(30).optional().allow('', null),
      }),
    )
    .min(1)
    .max(500)
    .required(),
});

const resolvePendingInviteSchema = Joi.object({
  customer_invite_code: Joi.string().trim().required(),
});

module.exports = { createInviteSchema, bulkCreateInviteSchema, resolvePendingInviteSchema };
