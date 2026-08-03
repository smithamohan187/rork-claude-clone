const notificationsService = require('./notifications.service');
const { ok } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const listMineHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { unreadOnly, limit, offset } = req.query;
  try {
    const notifications = await notificationsService.getMyNotifications(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    res.json(ok({ notifications }));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

const unreadCountHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  try {
    const result = await notificationsService.getUnreadCount(userId);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

const markReadHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  const { id } = req.params;
  try {
    const result = await notificationsService.markAsRead(userId, id);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 400 || err.status === 404) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    next(err);
  }
});

const markAllReadHandler = asyncHandler(async (req, res, next) => {
  const userId = req.user.userId;
  try {
    const result = await notificationsService.markAsRead(userId, 'all');
    res.json(ok(result));
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = {
  listMineHandler,
  unreadCountHandler,
  markReadHandler,
  markAllReadHandler,
};
