// events.validation.js — Joi schemas for the events module.
const Joi = require('joi');

const EVENT_TYPE = Joi.string().valid('In Person', 'Online', 'Hybrid').optional();

const createEventSchema = Joi.object({
  title:       Joi.string().max(200).required(),
  description: Joi.string().max(2000).optional().allow('', null),
  location:    Joi.string().max(500).optional().allow('', null),
  starts_at:   Joi.string().isoDate().required(),
  ends_at:     Joi.string().isoDate().optional().allow(null),
  event_type:  EVENT_TYPE,
});

const updateEventSchema = Joi.object({
  title:       Joi.string().max(200).optional(),
  description: Joi.string().max(2000).optional().allow('', null),
  location:    Joi.string().max(500).optional().allow('', null),
  starts_at:   Joi.string().isoDate().optional(),
  ends_at:     Joi.string().isoDate().optional().allow(null),
  image_url:   Joi.string().optional().allow('', null),
  event_type:  EVENT_TYPE,
});

module.exports = { createEventSchema, updateEventSchema };
