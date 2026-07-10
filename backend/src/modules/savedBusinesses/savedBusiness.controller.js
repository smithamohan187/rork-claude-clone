const savedBusinessService = require('./savedBusiness.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const saveHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.body;
  try {
    const result = await savedBusinessService.saveBusiness(req.user.userId, business_id);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 404) return res.status(404).json(fail(err.message));
    if (err.status === 400) return res.status(400).json(fail(err.message));
    throw err;
  }
});

const unsaveHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.body;
  try {
    const result = await savedBusinessService.unsaveBusiness(req.user.userId, business_id);
    res.json(ok(result));
  } catch (err) {
    if (err.status === 400) return res.status(400).json(fail(err.message));
    throw err;
  }
});

const statusHandler = asyncHandler(async (req, res) => {
  const { business_id } = req.query;
  if (!business_id) return res.status(400).json(fail('business_id is required'));

  const result = await savedBusinessService.getSavedStatus(req.user.userId, business_id);
  res.json(ok(result));
});

const myBusinessesHandler = asyncHandler(async (req, res) => {
  const result = await savedBusinessService.getSavedBusinesses(req.user.userId);
  res.json(ok(result));
});

module.exports = { saveHandler, unsaveHandler, statusHandler, myBusinessesHandler };
