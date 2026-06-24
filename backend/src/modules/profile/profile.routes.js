const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { getMyProfile, updateMyProfile, getInterests, updateMyAvatar } = require('./profile.controller');

const router = Router();

router.get('/me',          authenticate, getMyProfile);
router.put('/me',          authenticate, updateMyProfile);
router.patch('/me/avatar', authenticate, updateMyAvatar);
router.get('/interests',               getInterests);

module.exports = router;
