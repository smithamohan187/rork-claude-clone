const { Router } = require('express');
const multer = require('multer');
const { authenticate } = require('../../middleware/authenticate');
const {
  uploadMediaHandler,
  listMediaHandler,
  deleteMediaHandler,
} = require('./businessMedia.controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB, matches posts image upload convention

const router = Router();

router.get('/',            authenticate, listMediaHandler);
router.post('/',           authenticate, upload.single('image'), uploadMediaHandler);
router.delete('/:id',      authenticate, deleteMediaHandler);

module.exports = router;
