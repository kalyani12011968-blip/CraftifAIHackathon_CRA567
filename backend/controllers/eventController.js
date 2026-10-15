const eventService = require("../services/eventService");

const createEvent = async (req, res, next) => {
  try {
    const event = await eventService.createEvent(req.body);
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const data = await eventService.getEvents();
    const filtered = req.query.deviceId
      ? data.filter(e => e.deviceId === req.query.deviceId)
      : data;

    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    next(error);
  }
};

const getEvent = async (req, res, next) => {
  try {
    const id = req.params.id || req.params.eventId;
    const events = await eventService.getEvents();
    const event = events.find(e => e.id === id || e.eventId === id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEvent,
  listEvents: getEvents
};
