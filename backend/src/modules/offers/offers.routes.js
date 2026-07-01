const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const {
  createOfferSchema,
  updateOfferSchema,
  toggleStatusSchema,
} = require('./offers.validation');
const {
  listMyOffersHandler,
  getOfferHandler,
  getBusinessOffersHandler,
  createOfferHandler,
  updateOfferHandler,
  deleteOfferHandler,
  toggleStatusHandler,
  uploadOfferImageHandler,
} = require('./offers.controller');

const uploadDir = path.join(__dirname, '../../../../uploads/offers');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const router = Router();

// Public routes — no auth required
router.get('/business/:businessId', getBusinessOffersHandler);

// /my must come before /:id to avoid being captured as a param
router.get('/my', authenticate, listMyOffersHandler);
router.get('/:id', getOfferHandler);

// Protected mutation routes
router.post('/', authenticate, validateRequest(createOfferSchema), createOfferHandler);
router.put('/:id', authenticate, validateRequest(updateOfferSchema), updateOfferHandler);
router.delete('/:id', authenticate, deleteOfferHandler);
router.patch('/:id/status', authenticate, validateRequest(toggleStatusSchema), toggleStatusHandler);
router.post('/:id/image', authenticate, upload.single('image'), uploadOfferImageHandler);

module.exports = router;
