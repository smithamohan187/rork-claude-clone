// events.validation.js — Joi schemas for the events module.
const Joi = require('joi');

const EVENT_TYPE = Joi.string().valid('In Person', 'Online', 'Hybrid').optional();
const EVENT_CATEGORY = Joi.string().valid(
  'food', 'fitness', 'music', 'art', 'community', 'wellness', 'market', 'nightlife'
).optional();

const createEventSchema = Joi.object({
  title:       Joi.string().max(200).required(),
  description: Joi.string().max(2000).optional().allow('', null),
  location:    Joi.string().max(500).optional().allow('', null),
  starts_at:   Joi.string().isoDate().required(),
  ends_at:     Joi.string().isoDate().optional().allow(null),
  event_type:  EVENT_TYPE,
  category:    EVENT_CATEGORY,
  is_free:     Joi.boolean().optional(),
  price:       Joi.string().max(50).optional().allow('', null),
  tags:        Joi.array().items(Joi.string().max(50)).optional(),
  is_hot:      Joi.boolean().optional(),
});

const updateEventSchema = Joi.object({
  title:       Joi.string().max(200).optional(),
  description: Joi.string().max(2000).optional().allow('', null),
  location:    Joi.string().max(500).optional().allow('', null),
  starts_at:   Joi.string().isoDate().optional(),
  ends_at:     Joi.string().isoDate().optional().allow(null),
  image_url:   Joi.string().optional().allow('', null),
  event_type:  EVENT_TYPE,
  category:    EVENT_CATEGORY,
  is_free:     Joi.boolean().optional(),
  price:       Joi.string().max(50).optional().allow('', null),
  tags:        Joi.array().items(Joi.string().max(50)).optional(),
  is_hot:      Joi.boolean().optional(),
});

module.exports = { createEventSchema, updateEventSchema };
