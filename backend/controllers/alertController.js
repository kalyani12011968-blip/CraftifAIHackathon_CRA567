const alertService = require("../services/alertService");
const notificationService = require("../services/notificationService");

const sendAlert = async (req, res, next) => {
  try {
    const alert = await alertService.createAlert(req.body);
    const sms = await notificationService.sendSMS(req.body);

    res.status(201).json({
      success: true,
      data: {
        alert,
        sms
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAlerts = async (req, res, next) => {
  try {
    const data = await alertService.getAlerts();

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
  sendAlert,
  getAlerts,
  listAlerts: getAlerts,
  testAlert: sendAlert
};
