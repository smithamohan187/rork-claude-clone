const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { registerBusinessSchema } = require('./business.validation');
const {
  getMyBusinessHandler,
  registerBusinessHandler,
  uploadLogoHandler,
  uploadPhotoHandler,
  completeOnboardingHandler,
} = require('./business.controller');

const uploadDir = path.join(__dirname, '../../../../uploads/businesses');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const router = Router();

router.get('/me', authenticate, getMyBusinessHandler);
router.post('/register', authenticate, validateRequest(registerBusinessSchema), registerBusinessHandler);
router.post('/:id/logo', authenticate, upload.single('logo'), uploadLogoHandler);
router.post('/:id/photo', authenticate, upload.single('photo'), uploadPhotoHandler);
router.patch('/:id/onboarding-complete', authenticate, completeOnboardingHandler);

module.exports = router;
