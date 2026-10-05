const { uploadFileToGCS } = require('../../config/storage');
const businessMediaService = require('./businessMedia.service');
const { paginationSchema } = require('./businessMedia.validation');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function parsePagination(req, res) {
  const { error, value } = paginationSchema.validate(req.query, { stripUnknown: true });
  if (error) {
    res.status(400).json(fail(error.details[0].message));
    return null;
  }
  return value;
}

const uploadMediaHandler = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json(fail('No file uploaded'));
  const imageUrl = await uploadFileToGCS(req.file, 'media');
  const media = await businessMediaService.uploadMedia(req.user.userId, imageUrl);
  res.status(201).json(ok({ media }));
});

const listMediaHandler = asyncHandler(async (req, res) => {
  const page = parsePagination(req, res);
  if (!page) return;
  const items = await businessMediaService.listMyMedia(req.user.userId, page.limit, page.offset);
  res.json(ok({ items, hasMore: items.length === page.limit }));
});

const deleteMediaHandler = asyncHandler(async (req, res) => {
  try {
    await businessMediaService.deleteMedia(req.user.userId, req.params.id);
    res.json(ok({ id: req.params.id }));
  } catch (err) {
    if (err.message === 'Media not found') {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

module.exports = {
  uploadMediaHandler,
  listMediaHandler,
  deleteMediaHandler,
};
