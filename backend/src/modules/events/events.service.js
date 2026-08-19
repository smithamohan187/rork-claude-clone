// events.service.js — business logic for the events module. No pool.query() calls.
const eventsModel = require('./events.model');
const notificationsService = require('../notifications/notifications.service');
const { getClient } = require('../../config/database');

async function verifyEventOwnership(userId, eventId) {
  const businessId = await eventsModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');

  const event = await eventsModel.getEventById(eventId);
  if (!event) throw new Error('Event not found');
  if (event.business_id !== businessId) throw new Error('Not authorised to modify this event');

  return { event, businessId };
}

async function createEvent(userId, payload) {
  const businessId = await eventsModel.getBusinessIdByUserId(userId);
  if (!businessId) throw new Error('No business found for this user');

  const client = await getClient();
  let event;
  try {
    await client.query('BEGIN');
    event = await eventsModel.insertEvent(client, { ...payload, business_id: businessId });

    const businessName = await eventsModel.getBusinessNameById(client, businessId);
    await notificationsService.createNotificationsBulk(client, businessId, {
      type: 'new_event',
      title: 'New event coming up',
      body: `${businessName ?? 'A business you follow'} just posted a new event: ${event.title}.`,
      data: { business_id: businessId, event_id: event.id },
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return event;
}

async function listMyEvents(userId, filter) {
  const businessId = await eventsModel.getBusinessIdByUserId(userId);
  if (!businessId) return [];
  return eventsModel.getEventsByBusiness(businessId, filter, null);
}

async function getEvent(eventId, profileId) {
  const event = await eventsModel.getEventById(eventId, profileId);
  if (!event) throw new Error('Event not found');
  return event;
}

async function editEvent(userId, eventId, payload) {
  await verifyEventOwnership(userId, eventId);
  const updated = await eventsModel.updateEvent(eventId, payload);
  if (!updated) throw new Error('Event not found');
  return updated;
}

async function cancelEvent(userId, eventId) {
  const { event } = await verifyEventOwnership(userId, eventId);
  if (event.status === 'cancelled') throw new Error('Event is already cancelled');
  const updated = await eventsModel.cancelEvent(eventId);
  if (!updated) throw new Error('Event not found');
  return updated;
}

async function getEventsForBusiness(businessId, filter, profileId) {
  return eventsModel.getEventsByBusiness(businessId, filter, profileId);
}

async function toggleEventStatus(userId, eventId) {
  const { event } = await verifyEventOwnership(userId, eventId);
  if (event.effective_status === 'past') throw new Error('Cannot modify a past event');
  if (event.status === 'upcoming') return eventsModel.cancelEvent(eventId);
  const restored = await eventsModel.restoreEvent(eventId);
  if (!restored) throw new Error('Event has already passed and cannot be restored');
  return restored;
}

async function uploadEventImage(userId, eventId, imageUrl) {
  await verifyEventOwnership(userId, eventId);
  return eventsModel.updateEventImageUrl(eventId, imageUrl);
}

module.exports = {
  createEvent,
  listMyEvents,
  getEvent,
  editEvent,
  cancelEvent,
  getEventsForBusiness,
  toggleEventStatus,
  uploadEventImage,
};
