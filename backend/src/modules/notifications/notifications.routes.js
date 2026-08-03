const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const {
  listMineHandler,
  unreadCountHandler,
  markReadHandler,
  markAllReadHandler,
} = require('./notifications.controller');

const router = Router();

router.get('/mine',                authenticate, listMineHandler);
router.get('/mine/unread-count',   authenticate, unreadCountHandler);
router.patch('/mine/read-all',     authenticate, markAllReadHandler);
router.patch('/:id/read',          authenticate, markReadHandler);

module.exports = router;
