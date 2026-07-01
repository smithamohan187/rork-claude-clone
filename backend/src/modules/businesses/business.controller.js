const {
  registerBusiness,
  fetchMyBusiness,
  uploadBusinessLogo,
  uploadBusinessCoverPhoto,
  completeOnboarding,
  getPublicBusinessProfile,
} = require('./business.service');
const { ok } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getMyBusinessHandler = asyncHandler(async (req, res) => {
  const business = await fetchMyBusiness(req.user.userId);
  if (!business) return res.status(404).json({ success: false, data: null, error: 'Business not found' });
  res.status(200).json(ok(business));
});

const registerBusinessHandler = asyncHandler(async (req, res) => {
  const business = await registerBusiness(req.user.userId, req.body);
  res.status(201).json(ok(business));
});

const uploadLogoHandler = asyncHandler(async (req, res) => {
  console.log('[multer] req.file:', req.file);
  if (!req.file) {
    return res.status(400).json({ success: false, data: null, error: 'No file uploaded' });
  }
  const logoUrl = `/uploads/businesses/${req.file.filename}`;
  const result = await uploadBusinessLogo(req.params.id, logoUrl);
  res.status(200).json(ok(result));
});

const uploadPhotoHandler = asyncHandler(async (req, res) => {
  console.log('[photo upload] req.file:', req.file);
  console.log('[photo upload] content-type:', req.headers['content-type']);
  if (!req.file) {
    return res.status(400).json({ success: false, data: null, error: 'No file uploaded' });
  }
  const photoUrl = `/uploads/businesses/${req.file.filename}`;
  const result = await uploadBusinessCoverPhoto(req.params.id, photoUrl);
  res.status(200).json(ok(result));
});

const completeOnboardingHandler = asyncHandler(async (req, res) => {
  await completeOnboarding(req.params.id);
  res.status(200).json(ok({ onboarding_complete: true }));
});

/**
 * GET /businesses/:id — public, no auth required.
 * Returns full business profile with hours, rating aggregates, and subscriber count.
 */
const getBusinessProfileHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const business = await getPublicBusinessProfile(id);
  if (!business) {
    return res.status(404).json({ success: false, data: null, error: 'Business not found' });
  }
  return res.status(200).json(ok({ business }));
});

module.exports = {
  getMyBusinessHandler,
  registerBusinessHandler,
  uploadLogoHandler,
  uploadPhotoHandler,
  completeOnboardingHandler,
  getBusinessProfileHandler,
};
