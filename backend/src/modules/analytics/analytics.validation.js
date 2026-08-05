// analytics.validation.js — Joi schema for the summary query params.
const Joi = require('joi');

const summaryQuerySchema = Joi.object({
  period: Joi.number().valid(7, 30, 90).default(30),
});

module.exports = { summaryQuerySchema };
