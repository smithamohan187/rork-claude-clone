const {
  registerBusiness,
  fetchMyBusiness,
  uploadBusinessLogo,
  uploadBusinessCoverPhoto,
  completeOnboarding,
  getPublicBusinessProfile,
  getBusinessScanCode,
  renderBusinessScanPageHtml,
  fetchDashboardSummary,
} = require('./business.service');
const { ok, fail } = require('../../utils/apiResponse');

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
 * GET /businesses/:id — public, auth optional.
 * Returns full business profile with hours, rating aggregates, and subscriber count.
 * Hidden (404) from non-owners while the business's own subscription isn't active/trialing.
 */
const getBusinessProfileHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const business = await getPublicBusinessProfile(id, req.user?.userId ?? null);
  if (!business) {
    return res.status(404).json({ success: false, data: null, error: 'Business not found' });
  }
  return res.status(200).json(ok({ business }));
});

/**
 * GET /businesses/:id/scan-code — owner-only.
 * Returns the QR deep-link URL for the business. 403 for non-owners, 404 if not found.
 */
const getScanCodeHandler = asyncHandler(async (req, res) => {
  try {
    const result = await getBusinessScanCode(req.params.id, req.user.userId);
    res.status(200).json(ok(result));
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      return res.status(err.status).json(fail(err.message));
    }
    throw err;
  }
});

/**
 * GET /b/:id — public, no auth. The landing page a "Scan to subscribe" QR code actually opens.
 * Always 200s with a valid HTML/OG page (even for an unknown business) — never a bare 404.
 */
const getScanLandingPageHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requestOrigin = `${req.protocol}://${req.get('host')}`;
  const html = await renderBusinessScanPageHtml(id, requestOrigin);
  res.type('html').send(html);
});

const getDashboardSummaryHandler = asyncHandler(async (req, res) => {
  const summary = await fetchDashboardSummary(req.user.userId);
  if (!summary) return res.status(404).json({ success: false, data: null, error: 'Business not found' });
  res.status(200).json(ok(summary));
});

module.exports = {
  getMyBusinessHandler,
  registerBusinessHandler,
  uploadLogoHandler,
  uploadPhotoHandler,
  completeOnboardingHandler,
  getBusinessProfileHandler,
  getScanCodeHandler,
  getScanLandingPageHandler,
  getDashboardSummaryHandler,
};
