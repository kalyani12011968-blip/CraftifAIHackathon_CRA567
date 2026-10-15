const visionService = require("../services/visionService");

const recordVisionEvent = async (req, res, next) => {
  try {
    const result = await visionService.recordVisionEvent(req.body);

    if (result.deduped) {
      return res.status(200).json({
        success: true,
        message: result.message,
        deduped: true,
        data: result
      });
    }

    res.status(201).json({
      success: true,
      message: "Vision event recorded successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getVisionEvents = async (req, res, next) => {
  try {
    const filters = {
      cameraId: req.query.cameraId,
      className: req.query.className,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };

    const events = await visionService.getVisionEvents(filters);

    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

const getVisionEventById = async (req, res, next) => {
  try {
    const event = await visionService.getVisionEventById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Vision event not found"
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

const getVisionStatus = (req, res) => {
  const status = visionService.getVisionStatus();
  res.json({
    success: true,
    data: status
  });
};

const recordHeartbeat = (req, res) => {
  const status = visionService.recordHeartbeat(req.body);
  res.json({
    success: true,
    message: "Pipeline heartbeat updated",
    data: status
  });
};

const getCorrelatedRisk = async (req, res, next) => {
  try {
    const latestEvents = await visionService.getVisionEvents({ limit: 1 });
    const latestVision = latestEvents.length ? latestEvents[0] : null;
    const assessment = await visionService.correlateVisionWithSensor(latestVision);

    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordVisionEvent,
  getVisionEvents,
  getVisionEventById,
  getVisionStatus,
  recordHeartbeat,
  getCorrelatedRisk
};
