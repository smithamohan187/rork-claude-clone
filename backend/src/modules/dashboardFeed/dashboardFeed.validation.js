// dashboardFeed.validation.js — Joi schema for pagination query params.
const Joi = require('joi');

const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = { paginationSchema };
