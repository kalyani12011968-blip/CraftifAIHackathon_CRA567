const { db } = require("../config/firebase");
const { readCollection, writeCollection } = require("./storageService");

const defaultDevices = [
  { deviceId: "JR-001", name: "Adyar Bridge", location: "Adyar, Chennai", latitude: 13.0012, longitude: 80.2565, status: "ONLINE", lastSeen: new Date().toISOString() },
  { deviceId: "JR-002", name: "River Bend A", location: "Saidapet, Chennai", latitude: 13.0150, longitude: 80.2200, status: "ONLINE", lastSeen: new Date().toISOString() },
  { deviceId: "JR-003", name: "Lowland Gate", location: "Kotturpuram, Chennai", latitude: 13.0234, longitude: 80.2412, status: "ONLINE", lastSeen: new Date().toISOString() },
  { deviceId: "JR-004", name: "Community Tank", location: "Velachery, Chennai", latitude: 12.9815, longitude: 80.2180, status: "ONLINE", lastSeen: new Date().toISOString() },
  { deviceId: "JR-005", name: "Canal North", location: "Madipakkam, Chennai", latitude: 12.9642, longitude: 80.1985, status: "ONLINE", lastSeen: new Date().toISOString() },
  { deviceId: "JR-006", name: "Drainage Point", location: "Pallikaranai, Chennai", latitude: 12.9372, longitude: 80.2154, status: "ONLINE", lastSeen: new Date().toISOString() }
];

function initDevices() {
  const current = readCollection("devices");
  if (!current || current.length === 0) {
    writeCollection("devices", defaultDevices);
    return defaultDevices;
  }
  return current;
}

const getDevices = async () => {
  if (db) {
    try {
      const snap = await db.collection("devices").get();
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {
      console.warn("Firestore getDevices fallback to local:", e.message);
    }
  }
  return initDevices();
};

const getDevice = async (id) => {
  if (db) {
    try {
      const doc = await db.collection("devices").doc(id).get();
      if (doc.exists) return { id: doc.id, ...doc.data() };
    } catch (e) {
      console.warn("Firestore getDevice fallback to local:", e.message);
    }
  }
  const devices = initDevices();
  return devices.find(d => d.deviceId === id || d.id === id) || null;
};

const registerDevice = async (data) => {
  const device = {
    deviceId: data.deviceId,
    name: data.name || data.deviceId,
    location: data.location || "Field Station",
    latitude: data.latitude !== undefined ? Number(data.latitude) : null,
    longitude: data.longitude !== undefined ? Number(data.longitude) : null,
    status: data.status || "ONLINE",
    battery: data.battery !== undefined ? Number(data.battery) : 100,
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  };

  if (db) {
    try {
      await db.collection("devices").doc(device.deviceId).set(device, { merge: true });
    } catch (e) {
      console.warn("Firestore registerDevice fallback to local:", e.message);
    }
  }

  const devices = initDevices();
  const index = devices.findIndex(d => d.deviceId === device.deviceId);
  if (index >= 0) {
    devices[index] = { ...devices[index], ...device };
  } else {
    devices.push(device);
  }
  writeCollection("devices", devices);

  return device;
};

const updateLastSeen = async (deviceId) => {
  const now = new Date().toISOString();
  if (db) {
    try {
      await db.collection("devices").doc(deviceId).set({ status: "ONLINE", lastSeen: now }, { merge: true });
    } catch (e) {
      // fallback
    }
  }
  const devices = initDevices();
  const device = devices.find(d => d.deviceId === deviceId);
  if (device) {
    device.status = "ONLINE";
    device.lastSeen = now;
    writeCollection("devices", devices);
  }
};

const heartbeat = async (deviceId) => {
  await updateLastSeen(deviceId);
  return getDevice(deviceId);
};

module.exports = {
  getDevices,
  getDevice,
  registerDevice,
  updateLastSeen,
  heartbeat
};
