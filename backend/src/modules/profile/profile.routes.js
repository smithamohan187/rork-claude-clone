const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { getMyProfile, updateMyProfile, getInterests, updateMyAvatar } = require('./profile.controller');
const { updateProfileSchema } = require('./profile.validation');

const router = Router();

router.get('/me',          authenticate, getMyProfile);
router.put('/me',          authenticate, validateRequest(updateProfileSchema), updateMyProfile);
router.patch('/me/avatar', authenticate, updateMyAvatar);
router.get('/interests',               getInterests);

module.exports = router;
