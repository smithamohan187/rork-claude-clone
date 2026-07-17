const pointsService = require('./points.service');
const { ok } = require('../../utils/apiResponse');

async function getPointsSummaryHandler(req, res, next) {
  try {
    const summary = await pointsService.getUserPointsSummary(req.user.userId);
    res.json(ok(summary));
  } catch (err) {
    next(err);
  }
}

module.exports = { getPointsSummaryHandler };
