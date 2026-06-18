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
};
