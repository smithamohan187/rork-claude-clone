const Joi = require('joi');

const POST_TYPES = ['promotion', 'announcement', 'general'];

const createPostSchema = Joi.object({
  title:     Joi.string().trim().min(1).max(200).required(),
  content:   Joi.string().trim().min(1).required(),
  post_type: Joi.string().valid(...POST_TYPES).optional(),
});

const updatePostSchema = Joi.object({
  title:      Joi.string().trim().min(1).max(200).optional(),
  content:    Joi.string().trim().min(1).optional(),
  post_type:  Joi.string().valid(...POST_TYPES).optional(),
  image_url:  Joi.string().allow(null).optional(),
  video_url:  Joi.string().allow(null).optional(),
  video_type: Joi.string().valid('upload', 'link').allow(null).optional(),
});

const toggleStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

module.exports = { createPostSchema, updatePostSchema, toggleStatusSchema };
