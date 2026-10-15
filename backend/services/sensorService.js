const fs = require("fs");
const path = require("path");
const { db } = require("../config/firebase");
const { analyzeWaterBehavior, calculateHistoricalBaseline } = require("./waterBehaviorService");
const { calculateRisk } = require("./riskService");
const { classifyEvent, createEvent } = require("./eventService");
const { createAlert } = require("./alertService");
const { addToCollection, readCollection } = require("./storageService");
const { emit } = require("./socketService");
const { updateLastSeen } = require("./deviceService");

const DATA_FILE = path.join(__dirname, "../data/sensorData.json");

const ensureFile = () => {
  const directory = path.dirname(DATA_FILE);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]");
  }
};

const readLocal = () => {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const writeLocal = (data) => {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const saveSensorReading = async (data) => {
  const reading = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: data.timestamp || new Date().toISOString(),
    deviceId: data.deviceId || data.device_id || "ESP32-001",
    waterLevel: Number(data.waterLevel !== undefined ? data.waterLevel : data.water_level || 0),
    rainfall: Number(data.rainfall !== undefined ? data.rainfall : 0),
    temperature: Number(data.temperature !== undefined ? data.temperature : 25),
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    sensorQuality: data.sensorQuality ?? 1
  };

  if (db) {
    try {
      const ref = await db.collection("sensor_readings").add(reading);
      reading.id = ref.id;
    } catch (e) {
      // fallback
    }
  }

  const history = readLocal();
  history.push(reading);
  if (history.length > 5000) {
    history.splice(0, history.length - 5000);
  }
  writeLocal(history);

  return reading;
};

const getHistory = async (deviceId) => {
  if (db) {
    try {
      let query = db.collection("sensor_readings").orderBy("timestamp", "desc").limit(1000);
      if (deviceId) {
        query = db.collection("sensor_readings").where("deviceId", "==", deviceId).orderBy("timestamp", "desc").limit(1000);
      }
      const snap = await query.get();
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {
      // fallback
    }
  }

  return readLocal()
    .filter((item) => !deviceId || item.deviceId === deviceId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 1000);
};

const getLatest = async (deviceId) => {
  const history = await getHistory(deviceId);
  return history.length ? history[0] : null;
};

const getPrevious = async (deviceId) => {
  const history = await getHistory(deviceId);
  return history.length > 1 ? history[1] : null;
};

async function processSensorData(data) {
  const reading = await saveSensorReading(data);
  const history = await getHistory(reading.deviceId);
  const previous = history.length > 1 ? history[1] : null;
  const baselineHistory = history.slice(2, 102).filter(item => Number.isFinite(item.waterLevel));
  const historical = calculateHistoricalBaseline(baselineHistory);

  let behavior = analyzeWaterBehavior(reading, previous, historical);
  const sensorQuality = reading.sensorQuality ?? 1;

  let eventType = classifyEvent({
    ...behavior,
    sensorQuality
  });

  let risk = calculateRisk({
    ...behavior,
    sensorQuality
  });

  behavior.event = eventType;
  behavior.riskScore = risk.riskScore;
  behavior.status = risk.status;

  await updateLastSeen(reading.deviceId);

  let createdEvent = null;
  if (eventType !== "NORMAL") {
    createdEvent = await createEvent({
      deviceId: reading.deviceId,
      event: eventType,
      type: eventType,
      riskScore: risk.riskScore,
      latitude: reading.latitude,
      longitude: reading.longitude,
      description: `Sensor event ${eventType} detected with risk score ${risk.riskScore}`
    });
  }

  let createdAlert = null;
  if (risk.riskScore >= 51) {
    createdAlert = await createAlert({
      deviceId: reading.deviceId,
      event: eventType,
      riskScore: risk.riskScore,
      status: risk.status,
      message: `Flood escalation alert for device ${reading.deviceId}: ${risk.status} (score: ${risk.riskScore})`
    });
  }

  // Real-time Socket.IO broadcasts
  emit("sensor:update", { ...reading, ...behavior });
  emit("sensorData", { ...reading, ...behavior });
  emit("risk:update", {
    deviceId: reading.deviceId,
    riskScore: risk.riskScore,
    status: risk.status,
    factors: risk.factors
  });

  if (createdEvent) {
    emit("event:new", createdEvent);
  }
  if (createdAlert) {
    emit("alert:new", createdAlert);
  }

  return {
    reading,
    behavior,
    event: createdEvent || { event: eventType },
    risk,
    alert: createdAlert
  };
}

module.exports = {
  saveSensorReading,
  getHistory,
  getLatest,
  getPrevious,
  processSensorData,
  getSensorHistory: getHistory
};
