// events.routes.js — route definitions and Multer config for the events module.
const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { createEventSchema, updateEventSchema } = require('./events.validation');
const {
  listMyEventsHandler,
  getEventHandler,
  createEventHandler,
  updateEventHandler,
  cancelEventHandler,
  uploadEventImageHandler,
} = require('./events.controller');

const uploadDir = path.join(__dirname, '../../../../uploads/events');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const router = Router();

// Protected list — must come before /:id
router.get('/', authenticate, listMyEventsHandler);

// Public single-event fetch
router.get('/:id', getEventHandler);

// Protected mutations
router.post('/', authenticate, validateRequest(createEventSchema), createEventHandler);
router.patch('/:id', authenticate, validateRequest(updateEventSchema), updateEventHandler);
router.patch('/:id/cancel', authenticate, cancelEventHandler);
router.post('/:id/image', authenticate, upload.single('image'), uploadEventImageHandler);

module.exports = router;
