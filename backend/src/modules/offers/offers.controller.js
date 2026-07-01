const offersService = require('./offers.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const listMyOffersHandler = asyncHandler(async (req, res) => {
  const filter = req.query.status;
  const offers = await offersService.listMyOffers(req.user.userId, filter);
  res.json(ok({ offers }));
});

const getOfferHandler = asyncHandler(async (req, res) => {
  try {
    const offer = await offersService.getOffer(req.params.id);
    res.json(ok({ offer }));
  } catch (err) {
    if (err.message === 'Offer not found') {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

const getBusinessOffersHandler = asyncHandler(async (req, res) => {
  const offers = await offersService.getActiveOffersForBusiness(req.params.businessId);
  res.json(ok({ offers }));
});

const createOfferHandler = asyncHandler(async (req, res) => {
  const offer = await offersService.createOffer(req.user.userId, req.body);
  res.status(201).json(ok({ offer }));
});

const updateOfferHandler = asyncHandler(async (req, res) => {
  try {
    const offer = await offersService.editOffer(req.user.userId, req.params.id, req.body);
    res.json(ok({ offer }));
  } catch (err) {
    if (err.message === 'Offer not found') {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

const deleteOfferHandler = asyncHandler(async (req, res) => {
  try {
    await offersService.deleteOffer(req.user.userId, req.params.id);
    res.json(ok({ id: req.params.id }));
  } catch (err) {
    if (err.message === 'Offer not found') {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

const toggleStatusHandler = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  try {
    const offer = await offersService.toggleStatus(req.user.userId, req.params.id, status);
    res.json(ok({ offer }));
  } catch (err) {
    if (err.message === 'Cannot re-enable an expired offer') {
      return res.status(400).json(fail(err.message));
    }
    throw err;
  }
});

const uploadOfferImageHandler = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json(fail('No file uploaded'));
  const imageUrl = `/uploads/offers/${req.file.filename}`;
  const offer = await offersService.uploadOfferImage(req.user.userId, req.params.id, imageUrl);
  res.json(ok({ offer }));
});

module.exports = {
  listMyOffersHandler,
  getOfferHandler,
  getBusinessOffersHandler,
  createOfferHandler,
  updateOfferHandler,
  deleteOfferHandler,
  toggleStatusHandler,
  uploadOfferImageHandler,
};
