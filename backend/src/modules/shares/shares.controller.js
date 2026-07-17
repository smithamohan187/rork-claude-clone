const sharesService = require('./shares.service');
const { ok } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const logShareHandler = asyncHandler(async (req, res, next) => {
  const { content_type, content_id, channel } = req.body;
  const userId = req.user.userId;
  try {
    await sharesService.logShare({ userId, content_type, content_id, channel });
    res.json(ok({ logged: true }));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
}); 

module.exports = { logShareHandler };
