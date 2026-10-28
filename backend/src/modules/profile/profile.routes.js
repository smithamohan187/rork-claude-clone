//const path   = require('path');
//const fs     = require('fs');
const multer = require('multer');
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { getMyProfile, updateMyProfile, getInterests, updateMyAvatar, uploadMyAvatarFile, getPublicProfileHandler } = require('./profile.controller');
const { updateProfileSchema } = require('./profile.validation');

  //const avatarUploadDir = path.join(__dirname, '../../../../uploads/avatars');
 // fs.mkdirSync(avatarUploadDir, { recursive: true });
/*const avatarUploadDir = path.join('/tmp', 'uploads', 'avatars');
fs.mkdirSync(avatarUploadDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarUploadDir),
  filename:    (_req, _file, cb) => cb(null, `${Date.now()}-avatar.jpg`),
});
const avatarUpload = multer({ storage: avatarStorage });*/
const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype));
  },
});

const router = Router();

router.get('/me',                authenticate, getMyProfile);
router.put('/me',                authenticate, validateRequest(updateProfileSchema), updateMyProfile);
router.patch('/me/avatar',       authenticate, updateMyAvatar);
router.post('/me/avatar-upload', authenticate, avatarUpload.single('avatar'), uploadMyAvatarFile);
router.get('/interests',                       getInterests);
router.get('/:profileId/public',  authenticate, getPublicProfileHandler);

module.exports = router;
