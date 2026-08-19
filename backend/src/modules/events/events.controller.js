// events.controller.js — HTTP request/response handlers for the events module.
const eventsService = require('./events.service');
const { ok, fail } = require('../../utils/apiResponse');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const listMyEventsHandler = asyncHandler(async (req, res) => {
  const filter = req.query.filter || 'all';
  const events = await eventsService.listMyEvents(req.user.userId, filter);
  res.json(ok({ events }));
});

const getEventHandler = asyncHandler(async (req, res) => {
  try {
    const event = await eventsService.getEvent(req.params.id, req.user?.activeProfileId);
    res.json(ok({ event }));
  } catch (err) {
    if (err.message === 'Event not found') {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

const createEventHandler = asyncHandler(async (req, res) => {
  const event = await eventsService.createEvent(req.user.userId, req.body);
  res.status(201).json(ok({ event }));
});

const updateEventHandler = asyncHandler(async (req, res) => {
  try {
    const event = await eventsService.editEvent(req.user.userId, req.params.id, req.body);
    res.json(ok({ event }));
  } catch (err) {
    if (err.message === 'Event not found') {
      return res.status(404).json(fail(err.message));
    }
    throw err;
  }
});

const cancelEventHandler = asyncHandler(async (req, res) => {
  try {
    const event = await eventsService.cancelEvent(req.user.userId, req.params.id);
    res.json(ok({ event }));
  } catch (err) {
    if (err.message === 'Event not found') {
      return res.status(404).json(fail(err.message));
    }
    if (err.message === 'Event is already cancelled') {
      return res.status(400).json(fail(err.message));
    }
    throw err;
  }
});

const getBusinessEventsHandler = asyncHandler(async (req, res) => {
  const events = await eventsService.getEventsForBusiness(req.params.businessId, req.query.filter, req.user.activeProfileId);
  res.json(ok({ events }));
});

const toggleEventStatusHandler = asyncHandler(async (req, res) => {
  try {
    const event = await eventsService.toggleEventStatus(req.user.userId, req.params.id);
    res.json(ok({ event }));
  } catch (err) {
    if (err.message === 'Event not found') return res.status(404).json(fail(err.message));
    if (err.message === 'Cannot modify a past event') return res.status(400).json(fail(err.message));
    if (err.message === 'Event has already passed and cannot be restored') return res.status(400).json(fail(err.message));
    throw err;
  }
});

const uploadEventImageHandler = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json(fail('No file uploaded'));
  const imageUrl = `/uploads/events/${req.file.filename}`;
  const event = await eventsService.uploadEventImage(req.user.userId, req.params.id, imageUrl);
  res.json(ok({ event }));
});

module.exports = {
  listMyEventsHandler,
  getEventHandler,
  getBusinessEventsHandler,
  createEventHandler,
  updateEventHandler,
  cancelEventHandler,
  toggleEventStatusHandler,
  uploadEventImageHandler,
};
