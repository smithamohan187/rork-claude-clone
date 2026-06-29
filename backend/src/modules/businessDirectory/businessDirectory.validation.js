// Validation layer — Joi schemas only. No logic here.
const Joi = require('joi');

/**
 * Schema for GET /business-directory query params.
 * All fields are optional — missing fields use defaults or skip filtering.
 */
const listBusinessesSchema = Joi.object({
  // Free-text search against business name; allow empty string (treated as no filter in model)
  search: Joi.string().max(100).allow('').optional(),

  // Filter by business category name (from business_categories table); any string accepted
  category: Joi.string().max(100).optional(),

  // Page number for pagination; defaults to 1 if omitted
  page: Joi.number().integer().min(1).default(1),
});

module.exports = {
  listBusinessesSchema,
};
