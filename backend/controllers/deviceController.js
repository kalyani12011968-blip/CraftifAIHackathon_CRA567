const deviceService = require("../services/deviceService");

const registerDevice = async (req, res, next) => {
  try {
    const device = await deviceService.registerDevice(req.body);
    res.status(201).json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
};

const getDevices = async (req, res, next) => {
  try {
    const data = await deviceService.getDevices();
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

const getDevice = async (req, res, next) => {
  try {
    const id = req.params.deviceId || req.params.id;
    const device = await deviceService.getDevice(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
};

const deviceHeartbeat = async (req, res, next) => {
  try {
    const id = req.params.deviceId || req.params.id;
    const device = await deviceService.heartbeat(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }
    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerDevice,
  getDevices,
  getDevice,
  listDevices: getDevices,
  getDeviceById: getDevice,
  createDevice: registerDevice,
  deviceHeartbeat
};
