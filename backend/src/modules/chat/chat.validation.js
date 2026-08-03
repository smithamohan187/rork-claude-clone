const Joi = require('joi');

const createConversationSchema = Joi.object({
  targetProfileId: Joi.string().uuid().required(),
  type:            Joi.string().valid('business', 'friend').required(),
});

const sendMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(4000).required(),
});

// Query-param schema for GET /conversations. validateRequest only reads
// req.body, so the controller validates req.query against this itself.
const listConversationsQuerySchema = Joi.object({
  type: Joi.string().valid('business', 'friend').required(),
});

module.exports = {
  createConversationSchema,
  sendMessageSchema,
  listConversationsQuerySchema,
};
