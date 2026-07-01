// events.service.js — business logic for the events module. No pool.query() calls.
const eventsModel = require('./events.model');

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
  return eventsModel.insertEvent({ ...payload, business_id: businessId });
}

async function listMyEvents(userId, filter) {
  const businessId = await eventsModel.getBusinessIdByUserId(userId);
  if (!businessId) return [];
  return eventsModel.getEventsByBusiness(businessId, filter);
}

async function getEvent(eventId) {
  const event = await eventsModel.getEventById(eventId);
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
  uploadEventImage,
};
