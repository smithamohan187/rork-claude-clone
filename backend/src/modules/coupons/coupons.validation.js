const Joi = require('joi');

const uuid = Joi.string().uuid({ version: 'uuidv4' });

const businessIdParam = Joi.object({ businessId: uuid.required() });
const redeemParams    = Joi.object({ businessId: uuid.required(), rewardId: uuid.required() });
const couponIdParam   = Joi.object({ id: uuid.required() });

module.exports = { businessIdParam, redeemParams, couponIdParam };
