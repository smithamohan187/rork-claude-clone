const { registerUser, loginUser, logout, refreshAccessToken, getSession } = require('./auth.service');
const authModel = require('./auth.model');
const { registerSchema, loginSchema } = require('./auth.schema');
const { AppError } = require('../../middleware/errorHandler');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const loginHandler = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw new AppError(error.details.map((d) => d.message).join('; '), 400);
  }

  const result = await loginUser(value);

  res
    .cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .status(200)
    .json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
        profile: result.profile,
        interests: result.interests,
      },
    });
});

const signupHandler = asyncHandler(async (req, res) => {
  const result = await registerUser(req);
  res
    .cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    })
    .status(201)
    .json({
      success: true,
      message: 'Registration successful',
      data: {
        user: result.user,
        profile: result.profile,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
});
const registerHandler = asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw new AppError(error.details.map((d) => d.message).join('; '), 400);
  }

  const result = await registerUser(value);

  res
    .cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    })
    .status(201)
    .json({
      success: true,
      message: 'Registration successful',
      data: {
        user: result.user,
        profile: result.profile,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
});

const logoutHandler = asyncHandler(async (req, res, next) => {
  try {
    await logout(req.user.userId, req.body.refreshToken);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

const refreshHandler = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json(fail('Refresh token is required'));
  }
  const result = await refreshAccessToken(refreshToken);
  return res.status(200).json(ok({
    accessToken:  result.accessToken,
    refreshToken: result.refreshToken,
  }));
});

const sessionHandler = asyncHandler(async (req, res) => {
  try {
    const result = await getSession(req.user.userId);
    return res.status(200).json(ok({
      user_id:      result.user_id,
      email:        result.email,
      phone:        result.phone,
      profile_id:   result.profile_id,
      profile_type: result.profile_type,
      display_name: result.display_name,
      avatar_url:   result.avatar_url,
      profiles:     result.profiles,
    }));
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json(fail(err.message));
    return res.status(500).json(fail('Failed to fetch session'));
  }
});

const switchProfileHandler = asyncHandler(async (req, res) => {
  const { profile_id } = req.body;
  if (!profile_id) {
    return res.status(400).json(fail('profile_id is required'));
  }
  const profile = await authModel.switchActiveProfile(req.user.userId, profile_id);
  return res.json(ok({
    active_profile_id:   profile.id,
    active_profile_type: profile.profile_type,
    display_name:        profile.display_name,
    avatar_url:          profile.avatar_url,
  }));
});

module.exports = { signupHandler, loginHandler, logoutHandler, refreshHandler, sessionHandler, switchProfileHandler };
