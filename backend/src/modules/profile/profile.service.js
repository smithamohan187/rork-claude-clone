const {
  getProfileByUserId,
  getProfileInterests,
  updateProfileByUserId,
  updateUserPhone,
  getInterestCategories,
  deleteProfileInterests,
  insertProfileInterests,
  updateAvatarUrl,
} = require('./profile.model');
const { getClient } = require('../../config/database');

async function fetchProfile(userId) {
  const profile = await getProfileByUserId(userId);
  if (!profile) return null;
  const interests = await getProfileInterests(profile.profile_id);
  return { ...profile, interests };
}

async function fetchInterestCategories() {
  return getInterestCategories();
}

async function updateProfile(userId, data) {
  const { phone, display_name, bio, city, state, country, interest_ids } = data;

  const [updatedProfile] = await Promise.all([
    updateProfileByUserId(userId, { display_name, bio, city, state, country }),
    phone !== undefined ? updateUserPhone(userId, phone || null) : Promise.resolve(),
  ]);

  if (interest_ids !== undefined) {
    if (!updatedProfile) throw new Error('Profile not found');
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await deleteProfileInterests(client, updatedProfile.id);
      await insertProfileInterests(client, updatedProfile.id, interest_ids);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return fetchProfile(userId);
}

async function updateAvatar(userId, avatarUrl) {
  return updateAvatarUrl(userId, avatarUrl);
}

module.exports = { fetchProfile, fetchInterestCategories, updateProfile, updateAvatar };
