const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getClient } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const shareReferralsModel = require('../shareReferrals/shareReferrals.model');
const customerInviteModel = require('../customerInvites/customerInvite.model');
const referralService = require('../referrals/referral.service');
const {
  findUserByEmail: findUserByEmailNew,
  findUserByPhone: findUserByPhoneNew,
  createUser,
  createProfile,
  setActiveProfile,
  insertProfileInterests,
  saveRefreshToken,
  findUserForLogin,
  insertRefreshToken,
  findUserWithActiveProfile,
  revokeUserRefreshTokensByDevice,
  getUserInterests,
  insertLoginRefreshToken,
  touchUserUpdatedAt,
  findActiveRefreshTokensByUser,
  revokeRefreshTokenById,
  getActiveRefreshTokenByHash,
  getAllActiveRefreshTokens,
  getUserByIdWithProfile,
  getSessionByUserId,
 } = require('./auth.model');

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS, 10) || 10;
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

async function registerUser(data) {
  const {
    email,
    phone,
    password,
    full_name,
    location,
    state,
    country,
    latitude,
    longitude,
    location_label,
    interests,
    referral_code,
    share_referral_code,
    customer_invite_code,
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
      displayName: full_name,
      location,
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

    // App-level referral (Invite Friends): if this signup came with a referral code, link the
    // referrer to this new profile and notify the referrer. Never blocks registration — a
    // missing/invalid/self/already-used code is silently ignored.
    if (referral_code) {
      await referralService.resolveReferralOnRegister(client, referral_code, profile.id);
    }

    // Content-share referral: if this signup came from a shared link, transition the recipient row
    // to 'registered' and log pending 'join' points for the new user. Never blocks registration —
    // a missing/invalid/already-used code is silently ignored.
    if (share_referral_code) {
      const recipient = await shareReferralsModel.markRegistered(client, share_referral_code, profile.id);
      if (recipient) {
        await shareReferralsModel.insertPointsLog(client, {
          profile_id: profile.id,
          points_type: 'join',
          source_type: 'content_share',
          source_id: recipient.id,
          points_amount: null,
          status: 'pending_credit',
        });
      }
    }

    // Customer-invite referral (Invite Customers): if this signup came from an invite link,
    // link this exact profile to the invite row so subscribe-time matching doesn't have to guess
    // by phone/email. Never blocks registration — a missing/invalid/already-used code is
    // silently ignored.
    if (customer_invite_code) {
      await customerInviteModel.markRegistered(client, customer_invite_code, profile.id);
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
      location: profile.location,
      state: profile.state,
      country: profile.country,
      profile_type: profile.profile_type,
    },
  };
}

async function loginUser(data) {
  const { identifier, password, device_info } = data;

  const identifierType = identifier.includes('@') ? 'email' : 'phone';
  const user = await findUserWithActiveProfile(identifier, identifierType);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.is_verified) {
    throw new AppError('Please verify your email before logging in', 403);
  }

  const client = await getClient();
  let rawRefreshToken;
  try {
    await client.query('BEGIN');

    if (device_info) {
      await revokeUserRefreshTokensByDevice(client, user.user_id, device_info);
    }

    rawRefreshToken = `${crypto.randomUUID()}-${Date.now()}`;
    const tokenHash = await bcrypt.hash(rawRefreshToken, 12);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await insertLoginRefreshToken(client, { userId: user.user_id, tokenHash, deviceInfo: device_info, expiresAt });

    await touchUserUpdatedAt(client, user.user_id);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
  client.release();

  const interests = await getUserInterests(user.user_id, user.profile_id);

  const accessToken = jwt.sign(
    {
      userId: user.user_id,
      activeProfileId: user.active_profile_id,
      profileType: user.profile_type,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const safeUser = {
    id: user.user_id,
    email: user.email,
    phone: user.phone,
    isVerified: user.is_verified,
    activeProfileId: user.active_profile_id,
  };

  const safeProfile = {
    id: user.profile_id,
    profileType: user.profile_type,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    location: user.location,
    state: user.state,
    country: user.country,
    latitude: user.latitude,
    longitude: user.longitude,
    locationLabel: user.location_label,
  };

  return { accessToken, refreshToken: rawRefreshToken, user: safeUser, profile: safeProfile, interests };
}

async function logout(userId, refreshToken) {
  // Fast path: SHA-256 lookup for tokens issued by /auth/refresh
  const sha256Hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  let tokenRecord = await getActiveRefreshTokenByHash(sha256Hash);

  // Slow path: bcrypt scan for tokens issued by /auth/login
  if (!tokenRecord) {
    const rows = await findActiveRefreshTokensByUser(userId);
    for (const row of rows) {
      const match = await bcrypt.compare(refreshToken, row.token_hash);
      if (match) { tokenRecord = row; break; }
    }
  }

  if (!tokenRecord) return { success: true };

  await revokeRefreshTokenById(tokenRecord.id, userId);

  return { success: true };
}

async function refreshAccessToken(incomingToken) {
  // Fast path: SHA-256 lookup for tokens issued by this endpoint
  const sha256Hash = crypto.createHash('sha256').update(incomingToken).digest('hex');
  let tokenRecord = await getActiveRefreshTokenByHash(sha256Hash);

  // Slow path: bcrypt scan for tokens issued by the login endpoint
  if (!tokenRecord) {
    const allActive = await getAllActiveRefreshTokens();
    for (const row of allActive) {
      const match = await bcrypt.compare(incomingToken, row.token_hash);
      if (match) { tokenRecord = row; break; }
    }
  }

  if (!tokenRecord) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Rotate: revoke the old token immediately before issuing a new one
  await revokeRefreshTokenById(tokenRecord.id, tokenRecord.user_id);

  // Load user + active profile for JWT payload (same shape as loginUser)
  const user = await getUserByIdWithProfile(tokenRecord.user_id);
  if (!user) {
    throw new AppError('User not found', 401);
  }

  // New access token — identical payload to loginUser
  const accessToken = jwt.sign(
    {
      userId:          user.user_id,
      activeProfileId: user.active_profile_id,
      profileType:     user.profile_type,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // New refresh token — stored as SHA-256 hash for direct lookup next time
  const newRawToken  = `${crypto.randomUUID()}-${Date.now()}`;
  const newTokenHash = crypto.createHash('sha256').update(newRawToken).digest('hex');
  const expiresAt    = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await insertRefreshToken(user.user_id, newTokenHash, expiresAt);

  return { accessToken, refreshToken: newRawToken };
}

async function getSession(userId) {
  const session = await getSessionByUserId(userId);
  if (!session) throw new AppError('Session not found', 404);
  return session;
}

module.exports = { registerUser, loginUser, logout, refreshAccessToken, getSession };
