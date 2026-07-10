const savedEventModel = require('./savedEvent.model');
const { query } = require('../../config/database');

async function toggleSaveEvent(userId, eventId) {
  const profileId = await savedEventModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });

  const { rows } = await query('SELECT id FROM events WHERE id = $1', [eventId]);
  if (!rows[0]) throw Object.assign(new Error('Event not found'), { status: 404 });

  return savedEventModel.toggleSaveEvent(profileId, eventId);
}

async function getSavedEvents(userId) {
  const profileId = await savedEventModel.getActiveProfileId(userId);
  if (!profileId) throw Object.assign(new Error('No active profile found'), { status: 400 });
  return savedEventModel.getSavedEvents(profileId);
}

module.exports = { toggleSaveEvent, getSavedEvents };
