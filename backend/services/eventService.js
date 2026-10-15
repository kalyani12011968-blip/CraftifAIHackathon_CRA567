const { addToCollection, readCollection } = require("./storageService");
const { db } = require("../config/firebase");

const classifyEvent = ({
  waterTrend,
  riseRate,
  rainfall,
  levelDeviation,
  sensorQuality = 1
}) => {
  if (sensorQuality < 0.4) {
    return "SENSOR_ANOMALY";
  }

  if (
    (waterTrend === "RAPID_RISE" && rainfall > 20) ||
    (waterTrend === "RAPID_RISE" && levelDeviation > 30)
  ) {
    return "FLOOD_ESCALATION";
  }

  if (
    waterTrend === "RAPID_FALL" &&
    rainfall < 10 &&
    levelDeviation < -20
  ) {
    return "ABNORMAL_WATER_LOSS";
  }

  if (riseRate > 8) {
    return "RAPID_WATER_RISE";
  }

  if (riseRate < -8) {
    return "RAPID_WATER_LOSS";
  }

  return "NORMAL";
};

const createEventRecord = (input) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  eventId: `EVT-${Date.now()}`,
  timestamp: new Date().toISOString(),
  ...input
});

const createEvent = async (data) => {
  const event = createEventRecord({
    deviceId: data.deviceId,
    type: data.type || data.event || "NORMAL",
    event: data.event || data.type || "NORMAL",
    riskScore: data.riskScore !== undefined ? Number(data.riskScore) : 0,
    confidence: data.confidence !== undefined ? Number(data.confidence) : 0.95,
    description: data.description || `Event: ${data.event || data.type || "Observation"}`,
    status: data.status || "ACTIVE",
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null
  });

  if (db) {
    try {
      const ref = await db.collection("events").add(event);
      event.id = ref.id;
    } catch (e) {
      // fallback
    }
  }

  addToCollection("events", event);
  return event;
};

const getEvents = async () => {
  if (db) {
    try {
      const snap = await db.collection("events").orderBy("timestamp", "desc").limit(500).get();
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {
      // fallback
    }
  }

  const events = readCollection("events") || [];
  return [...events].reverse();
};

module.exports = {
  classifyEvent,
  createEventRecord,
  createEvent,
  getEvents
};
