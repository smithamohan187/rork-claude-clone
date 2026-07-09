const Joi = require('joi');

const addCommentSchema = Joi.object({
  content_type: Joi.string().valid('offer', 'event', 'post').required(),
  content_id: Joi.string().uuid().required(),
  body: Joi.string().min(1).max(2000).required(),
  parent_comment_id: Joi.string().uuid().optional(),
});

module.exports = { addCommentSchema };
