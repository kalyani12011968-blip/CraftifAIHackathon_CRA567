const sensorService = require("../services/sensorService");

const receiveSensorData = async (req, res, next) => {
  try {
    const result = await sensorService.processSensorData(req.body);

    res.status(201).json({
      success: true,
      message: "Sensor data processed",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getLatestSensorData = async (req, res, next) => {
  try {
    const data = await sensorService.getLatest(req.query.deviceId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

const getSensorHistory = async (req, res, next) => {
  try {
    const data = await sensorService.getHistory(req.query.deviceId);

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  receiveSensorData,
  getLatestSensorData,
  getSensorHistory,
  latestSensor: getLatestSensorData,
  sensorHistory: getSensorHistory
};
