const { db } = require("../config/firebase");
const { addToCollection, readCollection } = require("./storageService");

const createAlert = async (data) => {
  const alert = {
    id: `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    alertId: `ALT-${Date.now()}`,
    deviceId: data.deviceId || "ESP32-001",
    type: data.type || data.event || "WATER_RISK",
    severity: data.severity || data.status || "WARNING",
    riskScore: data.riskScore !== undefined ? Number(data.riskScore) : 0,
    message: data.message || `Water risk detected. Risk score: ${data.riskScore || 0}/100`,
    status: data.status || "ACTIVE",
    deliveryStatus: "SENT",
    timestamp: data.timestamp || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  if (db) {
    try {
      const ref = await db.collection("alerts").add(alert);
      alert.id = ref.id;
    } catch (e) {
      console.warn("Firestore alert save fallback:", e.message);
    }
  }

  addToCollection("alerts", alert);
  return alert;
};

const getAlerts = async () => {
  if (db) {
    try {
      const snap = await db.collection("alerts").orderBy("timestamp", "desc").limit(500).get();
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {
      // fallback
    }
  }
  const alerts = readCollection("alerts") || [];
  return [...alerts].reverse();
};

module.exports = {
  createAlert,
  getAlerts
};
