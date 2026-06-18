const { registerUser, loginUser } = require('./auth.service');
const { registerSchema, loginSchema } = require('./auth.schema');
const { AppError } = require('../../middleware/errorHandler');
const { ok } = require('../../utils/apiResponse');

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

module.exports = { signupHandler, loginHandler };
