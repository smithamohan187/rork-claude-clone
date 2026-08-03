const path   = require('path');
const fs     = require('fs');
const multer = require('multer');
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { getMyProfile, updateMyProfile, getInterests, updateMyAvatar, uploadMyAvatarFile, getPublicProfileHandler } = require('./profile.controller');
const { updateProfileSchema } = require('./profile.validation');

const avatarUploadDir = path.join(__dirname, '../../../../uploads/avatars');
fs.mkdirSync(avatarUploadDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarUploadDir),
  filename:    (_req, _file, cb) => cb(null, `${Date.now()}-avatar.jpg`),
});
const avatarUpload = multer({ storage: avatarStorage });

const router = Router();

router.get('/me',                authenticate, getMyProfile);
router.put('/me',                authenticate, validateRequest(updateProfileSchema), updateMyProfile);
router.patch('/me/avatar',       authenticate, updateMyAvatar);
router.post('/me/avatar-upload', authenticate, avatarUpload.single('avatar'), uploadMyAvatarFile);
router.get('/interests',                       getInterests);
router.get('/:profileId/public',  authenticate, getPublicProfileHandler);

module.exports = router;
