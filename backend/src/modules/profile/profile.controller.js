const { fetchProfile, fetchInterestCategories, updateProfile, updateAvatar } = require('./profile.service');
const { ok } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await fetchProfile(req.user.userId);
  if (!profile) {
    return res.status(404).json({ success: false, data: null, error: 'Profile not found' });
  }
  res.status(200).json(ok(profile));
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const updated = await updateProfile(req.user.userId, req.body);
  res.status(200).json(ok(updated));
});

const getInterests = asyncHandler(async (req, res) => {
  const categories = await fetchInterestCategories();
  res.status(200).json(ok(categories));
});

const updateMyAvatar = asyncHandler(async (req, res) => {
  const { avatar_url } = req.body;
  if (!avatar_url) {
    return res.status(400).json({ success: false, data: null, error: 'avatar_url is required' });
  }
  const result = await updateAvatar(req.user.userId, avatar_url);
  res.status(200).json(ok(result));
});

module.exports = { getMyProfile, updateMyProfile, getInterests, updateMyAvatar };
