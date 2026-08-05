// analytics.controller.js — HTTP handling only. Calls service, sends response.
const { getAnalytics } = require('./analytics.service');
const { summaryQuerySchema } = require('./analytics.validation');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getSummaryHandler = asyncHandler(async (req, res) => {
  const { error, value } = summaryQuerySchema.validate(req.query, { stripUnknown: true });
  if (error) return res.status(400).json(fail(error.details[0].message));

  try {
    const data = await getAnalytics(req.user.userId, value.period);
    res.status(200).json(ok(data));
  } catch (err) {
    if (err.status === 404) return res.status(404).json(fail(err.message));
    throw err;
  }
});

module.exports = { getSummaryHandler };
