const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getClient } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const {
  findUserByEmail,
  findUserByPhone,
  findProfileByReferralCode,
  insertUser,
  insertProfile,
  insertUserInterests,
  insertRefreshToken,
  findUserForLogin,
} = require('./auth.queries');

const SALT_ROUNDS = 12;
console.log('jwt secret', process.env.JWT_SECRET);
console.log('refresh token secret', process.env.REFRESH_TOKEN_SECRET);
console.log('jwt expires in', process.env.JWT_EXPIRES_IN);
console.log('refresh token expires in', process.env.REFRESH_TOKEN_EXPIRES_IN);
//const ACCESS_TOKEN_EXPIRY = '15m';
//const REFRESH_TOKEN_EXPIRY = '30d';
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

async function signup(body, deviceInfo, ipAddress) {
  const {
    full_name,
    alias_name,
    email,
    phone,
    password,
    location,
    interest_area_ids,
    referral_code,
  } = body;

  // Step 2 — Uniqueness checks
  const existingByEmail = await findUserByEmail(email);
  if (existingByEmail) {
    throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');
  }
  if (phone) {
    const existingByPhone = await findUserByPhone(phone);
    if (existingByPhone) {
      throw new AppError('Phone already registered', 409, 'PHONE_TAKEN');
    }
  }

  // Step 3 — Referral code lookup (silent on not found)
  let referredByProfileId = null;

  // Step 4 — Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Step 5 — DB transaction
  const client = await getClient();
  let user, profile;
  try {
    await client.query('BEGIN');

    if (referral_code) {
      const referrer = await findProfileByReferralCode(client, referral_code);
      if (referrer) referredByProfileId = referrer.id;
    }

    user = await insertUser(client, email, phone, passwordHash);
    profile = await insertProfile(
      client,
      user.id,
      full_name.trim(),
      alias_name,
      location,
      referredByProfileId
    );

    if (Array.isArray(interest_area_ids) && interest_area_ids.length > 0) {
      await insertUserInterests(client, profile.id, interest_area_ids);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Step 6 — Generate tokens
  const accessToken = jwt.sign(
    { user_id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  const refreshToken = jwt.sign(
    { user_id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
  );

  // Step 7 — Store refresh token
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await insertRefreshToken(user.id, refreshToken, expiresAt, deviceInfo, ipAddress);

  // Step 8 — Return
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      alias_name: profile.alias_name,
      location: profile.location,
      referral_code: profile.referral_code,
      profile_type: profile.profile_type,
    },
  };
}

async function login(body) {
  const { email, password } = body;

  const user = await findUserForLogin(email);
  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.is_active) {
    throw new AppError('Account disabled', 403, 'ACCOUNT_DISABLED');
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = jwt.sign(
    { user_id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  const refreshToken = jwt.sign(
    { user_id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
  );

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await insertRefreshToken(user.id, refreshToken, expiresAt, null, null);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

module.exports = { signup, login };
