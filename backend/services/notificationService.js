let gsmSms = null;
let gpsLocation = null;
let buzzerSvc = null;
let displaySvc = null;

try {
  gsmSms = require("../../alerts/gsm/smsService");
  gpsLocation = require("../../alerts/gps/locationService");
  buzzerSvc = require("../../alerts/local/buzzerService");
  displaySvc = require("../../alerts/local/displayService");
} catch (e) {
  // alerts modules are optional in local development
}

const buildAlertMessage = (data) => {
  return [
    "JAL-RAKSHAK ALERT",
    `Device: ${data.deviceId || "Unknown"}`,
    `Event: ${data.event || data.eventType || "Unknown"}`,
    `Risk: ${data.riskScore ?? "N/A"}/100`,
    `Status: ${data.status || "UNKNOWN"}`,
    `Water Level: ${data.waterLevel ?? "N/A"} cm`,
    `Rise Rate: ${data.riseRate ?? "N/A"} cm/s`,
    `Location: ${data.latitude ?? "N/A"}, ${data.longitude ?? "N/A"}`
  ].join("\n");
};

const sendSMS = async (data) => {
  const message = buildAlertMessage(data);

  if (gsmSms && typeof gsmSms.sendSMS === "function") {
    try {
      return await gsmSms.sendSMS({
        alertType: data.event || "GENERAL",
        data
      });
    } catch (err) {
      console.warn("GSM SMS failure:", err.message);
    }
  }

  if (!process.env.ALERT_PHONE_NUMBER) {
    return {
      sent: false,
      reason: "ALERT_PHONE_NUMBER is not configured",
      message
    };
  }

  return {
    sent: false,
    reason: "GSM gateway simulated in development environment",
    message
  };
};

function getStatusFromRisk(score) {
  if (score >= 76) return "CRITICAL";
  if (score >= 51) return "WARNING";
  if (score >= 26) return "WATCH";
  return "SAFE";
}

async function processNotification(data) {
  const riskScore = Number(data.riskScore ?? 0);
  const event = data.event || data.eventType || "NORMAL";
  const status = data.status || getStatusFromRisk(riskScore);

  if (displaySvc && typeof displaySvc.showStatus === "function") {
    displaySvc.showStatus({
      status,
      waterLevel: data.waterLevel,
      riskScore,
      waterTrend: data.waterTrend
    });
  }

  if (riskScore < 51) {
    return {
      success: true,
      alertTriggered: false,
      status: "SAFE"
    };
  }

  let buzzer = null;
  if (buzzerSvc && typeof buzzerSvc.activateBuzzer === "function") {
    buzzer = buzzerSvc.activateBuzzer(riskScore >= 76 ? "CRITICAL" : "WARNING");
  }

  if (displaySvc && typeof displaySvc.showAlert === "function") {
    displaySvc.showAlert(`WATER RISK: ${status} | Risk ${riskScore}/100`);
  }

  const location = gpsLocation && typeof gpsLocation.getLocation === "function" ? gpsLocation.getLocation(data) : null;
  const mapLink = gpsLocation && typeof gpsLocation.getGoogleMapsLink === "function" ? gpsLocation.getGoogleMapsLink(data) : null;
  const sms = await sendSMS(data);

  return {
    success: true,
    alertTriggered: true,
    status,
    riskScore,
    event,
    buzzer,
    sms,
    location,
    mapLink,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  buildAlertMessage,
  sendSMS,
  processNotification,
  getStatusFromRisk
};
