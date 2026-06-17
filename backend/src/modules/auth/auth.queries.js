const { query } = require('../../config/database');

async function findUserByEmail(email) {
  const { rows } = await query(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows[0] ?? null;
}

async function findUserByPhone(phone) {
  const { rows } = await query(
    'SELECT id FROM users WHERE phone = $1 LIMIT 1',
    [phone]
  );
  return rows[0] ?? null;
}

async function findProfileByReferralCode(client, referralCode) {
  const { rows } = await client.query(
    'SELECT id FROM profiles WHERE referral_code = $1 LIMIT 1',
    [referralCode]
  );
  return rows[0] ?? null;
}

async function insertUser(client, email, phone, passwordHash) {
  const { rows } = await client.query(
    `INSERT INTO users (email, phone, password_hash, role)
     VALUES ($1, $2, $3, 'customer')
     RETURNING id, email, phone, role`,
    [email, phone ?? null, passwordHash]
  );
  return rows[0];
}

async function insertProfile(client, userId, fullName, aliasName, location, referredBy) {
  const { rows } = await client.query(
    `INSERT INTO profiles (user_id, profile_type, full_name, alias_name, location, referred_by)
     VALUES ($1, 'personal', $2, $3, $4, $5)
     RETURNING id, full_name, alias_name, location, referral_code, profile_type`,
    [userId, fullName, aliasName ?? null, location ?? null, referredBy ?? null]
  );
  return rows[0];
}

async function insertUserInterests(client, profileId, interestAreaIds) {
  await client.query(
    `INSERT INTO user_interests (profile_id, interest_area_id)
     SELECT $1, unnest($2::uuid[])`,
    [profileId, interestAreaIds]
  );
}

async function insertRefreshToken(userId, token, expiresAt, deviceInfo, ipAddress) {
  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, device_info, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, token, expiresAt, deviceInfo ?? null, ipAddress ?? null]
  );
}

async function findUserForLogin(email) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.password_hash, u.role, p.is_active
     FROM users u
     INNER JOIN profiles p ON p.user_id = u.id
     WHERE u.email = $1
     LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

module.exports = {
  findUserByEmail,
  findUserByPhone,
  findProfileByReferralCode,
  insertUser,
  insertProfile,
  insertUserInterests,
  insertRefreshToken,
  findUserForLogin,
};
