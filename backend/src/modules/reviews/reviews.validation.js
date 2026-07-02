const Joi = require('joi');

const submitReviewSchema = Joi.object({
  business_id: Joi.string().uuid().required(),
  rating:      Joi.number().integer().min(1).max(5).required(),
  review_text: Joi.string().trim().max(300).allow('', null).optional(),
});

module.exports = { submitReviewSchema };
