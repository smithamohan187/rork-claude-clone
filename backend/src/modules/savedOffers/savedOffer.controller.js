const savedOfferService = require('./savedOffer.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const toggleHandler = asyncHandler(async (req, res) => {
  const { offer_id } = req.body;
  try {
    const result = await savedOfferService.toggleSaveOffer(req.user.userId, offer_id);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 404) return res.status(404).json(fail(err.message));
    if (err.status === 400) return res.status(400).json(fail(err.message));
    throw err;
  }
});

const myOffersHandler = asyncHandler(async (req, res) => {
  const result = await savedOfferService.getSavedOffers(req.user.userId);
  res.json(ok(result));
});

module.exports = { toggleHandler, myOffersHandler };
