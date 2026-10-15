const validateSensorData = (req, res, next) => {
  const data = req.body;
  const deviceId = data.deviceId || data.device_id;
  const waterLevel = data.waterLevel !== undefined ? data.waterLevel : data.water_level;
  const rainfall = data.rainfall !== undefined ? data.rainfall : 0;
  const temperature = data.temperature !== undefined ? data.temperature : 25;
  const latitude = data.latitude;
  const longitude = data.longitude;

  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({
      success: false,
      message: "deviceId is required"
    });
  }

  if (typeof waterLevel !== "number" || !Number.isFinite(waterLevel)) {
    return res.status(400).json({
      success: false,
      message: "waterLevel must be a finite number"
    });
  }

  if (latitude !== undefined &&
      (typeof latitude !== "number" || latitude < -90 || latitude > 90)) {
    return res.status(400).json({
      success: false,
      message: "Invalid latitude"
    });
  }

  if (longitude !== undefined &&
      (typeof longitude !== "number" || longitude < -180 || longitude > 180)) {
    return res.status(400).json({
      success: false,
      message: "Invalid longitude"
    });
  }

  next();
};

const validateDevice = (req, res, next) => {
  const deviceId = req.body.deviceId || req.body.device_id;
  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({
      success: false,
      message: "deviceId is required"
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  next();
};

const validateVisionEvent = (req, res, next) => {
  const event = req.body;

  if (!event || typeof event !== "object") {
    return res.status(400).json({
      success: false,
      message: "Request body must be a valid JSON object"
    });
  }

  if (!event.className || typeof event.className !== "string" || event.className.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "className is required and must be a non-empty string"
    });
  }

  if (typeof event.confidence !== "number" || isNaN(event.confidence) || event.confidence < 0 || event.confidence > 1) {
    return res.status(400).json({
      success: false,
      message: "confidence is required and must be a number between 0.0 and 1.0"
    });
  }

  if (!event.cameraId || typeof event.cameraId !== "string" || event.cameraId.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "cameraId is required and must be a non-empty string"
    });
  }

  if (!event.timestamp || isNaN(Date.parse(event.timestamp))) {
    return res.status(400).json({
      success: false,
      message: "timestamp is required and must be a valid ISO-8601 date string"
    });
  }

  if (event.bbox !== undefined && event.bbox !== null && !Array.isArray(event.bbox)) {
    return res.status(400).json({
      success: false,
      message: "bbox must be an array of coordinates [x, y, w, h] or null"
    });
  }

  // Normalize defaults
  req.body.source = event.source || "vision";
  req.body.eventType = event.eventType || "WATER_HAZARD_OBSERVATION";
  req.body.timestamp = new Date(event.timestamp).toISOString();
  req.body.bbox = event.bbox || null;
  req.body.evidenceUrl = event.evidenceUrl || null;
  req.body.trackId = event.trackId !== undefined ? event.trackId : null;
  req.body.locationId = event.locationId || null;

  next();
};

module.exports = {
  validateSensorData,
  validateDevice,
  validateLogin,
  validateVisionEvent
};
