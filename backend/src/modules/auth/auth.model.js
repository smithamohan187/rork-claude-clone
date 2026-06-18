const bcrypt = require('bcrypt');
const { query, getClient } = require('../../config/database');

async function findUserByEmail(email) {
  const { rows } = await query(
    'SELECT id, email, phone FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows[0] ?? null;
}

async function findUserByPhone(phone) {
  const { rows } = await query(
    'SELECT id, phone FROM users WHERE phone = $1 LIMIT 1',
    [phone]
  );
  return rows[0] ?? null;
}

async function createUser(client, { email, phone, passwordHash, pendingReferralCode }) {
  const { rows } = await client.query(
    `INSERT INTO users (email, phone, password_hash, pending_referral_code)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, phone, created_at`,
    [email, phone ?? null, passwordHash, pendingReferralCode ?? null]
  );
  return rows[0];
}

async function createProfile(client, { userId, displayName, city, state, country, latitude, longitude, locationLabel }) {
  const { rows } = await client.query(
    `INSERT INTO profiles (user_id, profile_type, display_name, city, state, country, latitude, longitude, location_label)
     VALUES ($1, 'personal', $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id, profile_type, display_name, city, state, country, latitude, longitude, location_label, created_at`,
    [userId, displayName, city, state, country ?? 'IN', latitude ?? null, longitude ?? null, locationLabel ?? null]
  );
  return rows[0];
}

async function setActiveProfile(client, userId, profileId) {
  await client.query(
    'UPDATE users SET active_profile_id = $1 WHERE id = $2',
    [profileId, userId]
  );
}

async function insertProfileInterests(client, profileId, interestIds) {
  await client.query(
    `INSERT INTO profile_interests (profile_id, interest_id)
     SELECT $1, unnest($2::uuid[])`,
    [profileId, interestIds]
  );
}

async function findReferralCode(client, code) {
  const { rows } = await client.query(
    `SELECT id, code, profile_id, type
     FROM referral_codes
     WHERE code = $1 
     LIMIT 1`,
    [code]
  );
  return rows[0] ?? null;
}

async function createReferral(client, { referralCodeId, referrerUserId, referredUserId, type }) {
  await client.query(
    `INSERT INTO referrals (referral_code_id, referrer_user_id, referred_user_id, type, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [referralCodeId, referrerUserId, referredUserId, type]
  );
}

async function saveRefreshToken(client, { userId, token }) {
  const tokenHash = await bcrypt.hash(token, 12);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

async function findUserForLogin(email) {
  
  const { rows } = await query(
    `SELECT u.id, u.email, u.password_hash, p.profile_type, p.is_active
     FROM users u
     INNER JOIN profiles p ON p.user_id = u.id
     WHERE u.email = $1
     LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

async function insertRefreshToken(userId, token, expiresAt, deviceInfo, ipAddress) {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, token, expiresAt, deviceInfo ?? null, ipAddress ?? null]
  );
}

async function findUserWithActiveProfile(identifier, identifierType) {
  const column = identifierType === 'email' ? 'u.email' : 'u.phone';
  const { rows } = await query(
    `SELECT
       u.id AS user_id,
       u.email,
       u.phone,
       u.password_hash,
       u.is_verified,
       u.is_active,
       u.active_profile_id,
       p.id AS profile_id,
       p.profile_type,
       p.display_name,
       p.avatar_url,
       p.bio,
       p.city,
       p.state,
       p.country,
       p.latitude,
       p.longitude,
       p.location_label,
       p.is_active AS profile_is_active
     FROM users u
     JOIN profiles p ON p.id = u.active_profile_id
     WHERE ${column} = $1
       AND u.is_active = TRUE
       AND p.is_active = TRUE`,
    [identifier]
  );
  return rows[0] ?? null;
}

async function revokeUserRefreshTokensByDevice(client, userId, deviceInfo) {
  await client.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = $1
       AND device_info = $2
       AND revoked_at IS NULL`,
    [userId, deviceInfo]
  );
}

async function getUserInterests(userId, profileId) {
  const { rows } = await query(
    `SELECT ic.id, ic.name, ic.icon
     FROM profile_interests pi
     JOIN interest_categories ic ON ic.id = pi.interest_id
     WHERE pi.profile_id = $1`,
    [profileId]
  );
  return rows;
}

async function insertLoginRefreshToken(client, { userId, tokenHash, deviceInfo, expiresAt }) {
  await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, deviceInfo ?? null, expiresAt]
  );
}

async function touchUserUpdatedAt(client, userId) {
  await client.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [userId]);
}

async function findActiveRefreshTokensByUser(userId) {
  const { rows } = await query(
    `SELECT id, token_hash
     FROM refresh_tokens
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [userId]
  );
  return rows;
}

async function revokeRefreshTokenById(id, userId) {
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
}

module.exports = {
  findUserByEmail,
  findUserByPhone,
  createUser,
  createProfile,
  setActiveProfile,
  insertProfileInterests,
  findReferralCode,
  createReferral,
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
};
