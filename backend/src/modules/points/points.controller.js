const pointsService = require('./points.service');
const { paginationSchema } = require('./points.validation');
const { ok, fail } = require('../../utils/apiResponse');

async function getPointsSummaryHandler(req, res, next) {
  try {
    const summary = await pointsService.getUserPointsSummary(req.user.userId);
    res.json(ok(summary));
  } catch (err) {
    next(err);
  }
}

// Validate & coerce the limit/offset query params via the Joi schema.
function parsePagination(req, res) {
  const { error, value } = paginationSchema.validate(req.query, { stripUnknown: true });
  if (error) {
    res.status(400).json(fail(error.details[0].message));
    return null;
  }
  return value;
}

async function getPointsHistoryHandler(req, res, next) {
  const page = parsePagination(req, res);
  if (!page) return;
  try {
    const items = await pointsService.getUserPointsHistory(req.user.userId, page.limit, page.offset);
    res.status(200).json(ok(items));
  } catch (err) {
    if (err.status) return res.status(err.status).json(fail(err.message));
    next(err);
  }
}

module.exports = { getPointsSummaryHandler, getPointsHistoryHandler };
