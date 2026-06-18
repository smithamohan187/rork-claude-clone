const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getClient } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const {
  findUserByEmail: findUserByEmailNew,
  findUserByPhone: findUserByPhoneNew,
  createUser,
  createProfile,
  setActiveProfile,
  insertProfileInterests,
  findReferralCode,
  createReferral,
  saveRefreshToken,
} = require('./auth.model');

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS, 10) || 10;
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

async function registerUser(data) {
  const {
    email,
    phone,
    password,
    display_name,
    city,
    state,
    country,
    latitude,
    longitude,
    location_label,
    interests,
    referral_code,
  } = data.body;
  
  const existingByEmail = await findUserByEmailNew(email);
  if (existingByEmail) {
    throw new AppError('Email already registered', 409);
  }
  if (phone) {
    const existingByPhone = await findUserByPhoneNew(phone);
    if (existingByPhone) {
      throw new AppError('Phone already registered', 409);
    }
  }
console.log(('password', password));
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const client = await getClient();
  let user, profile, accessToken, rawRefreshToken;
  try {
    await client.query('BEGIN');

    user = await createUser(client, {
      email,
      phone,
      passwordHash,
      pendingReferralCode: referral_code ?? null,
    });

    profile = await createProfile(client, {
      userId: user.id,
      displayName: display_name,
      city,
      state,
      country,
      latitude,
      longitude,
      locationLabel: location_label,
    });

    await setActiveProfile(client, user.id, profile.id);

    if (Array.isArray(interests) && interests.length > 0) {
      await insertProfileInterests(client, profile.id, interests);
    }

    if (referral_code) {
      const referralCodeRow = await findReferralCode(client, referral_code);
      if (referralCodeRow) {
        await createReferral(client, {
          referralCodeId: referralCodeRow.id,
          referrerUserId: referralCodeRow.owner_user_id,
          referredUserId: user.id,
          type: referralCodeRow.type,
        });
      }
    }

    rawRefreshToken = `${crypto.randomUUID()}-${Date.now()}`;

    accessToken = jwt.sign(
      { userId: user.id, activeProfileId: profile.id, profileType: 'personal' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    await saveRefreshToken(client, { userId: user.id, token: rawRefreshToken });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
  client.release();

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
    },
    profile: {
      id: profile.id,
      display_name: profile.display_name,
      city: profile.city,
      state: profile.state,
      country: profile.country,
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

module.exports = { registerUser, login };
