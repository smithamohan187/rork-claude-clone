const Joi = require('joi');

const createPostSchema = Joi.object({
  title:   Joi.string().trim().min(1).max(200).required(),
  content: Joi.string().trim().min(1).required(),
});

const updatePostSchema = Joi.object({
  title:   Joi.string().trim().min(1).max(200).optional(),
  content: Joi.string().trim().min(1).optional(),
});

const toggleStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

module.exports = { createPostSchema, updatePostSchema, toggleStatusSchema };
