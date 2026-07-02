const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../../middleware/authenticate');
const { validateRequest } = require('../../middleware/validateRequest');
const { createPostSchema, updatePostSchema, toggleStatusSchema } = require('./posts.validation');
const {
  getPostsHandler,
  getPostByIdHandler,
  getBusinessPostsHandler,
  createPostHandler,
  updatePostHandler,
  toggleStatusHandler,
  deletePostHandler,
  uploadPostImageHandler,
} = require('./posts.controller');

const uploadDir = path.join(__dirname, '../../../../uploads/posts');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const router = Router();

// /my and /business/:id must come before /:id — static routes precede dynamic params
router.get('/my', authenticate, getPostsHandler);
router.get('/business/:businessId', getBusinessPostsHandler);
router.get('/:id', getPostByIdHandler);

router.post('/',           authenticate, validateRequest(createPostSchema), createPostHandler);
router.put('/:id',         authenticate, validateRequest(updatePostSchema), updatePostHandler);
router.patch('/:id/status', authenticate, validateRequest(toggleStatusSchema), toggleStatusHandler);
router.delete('/:id',      authenticate, deletePostHandler);
router.post('/:id/image',  authenticate, upload.single('image'), uploadPostImageHandler);

module.exports = router;
