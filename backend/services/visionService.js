const { sql, queryDatabase } = require("../config/database");
const { addToCollection, readCollection, writeCollection } = require("./storageService");
const { getLatest } = require("./sensorService");
const { emit } = require("./socketService");

// Configurable constants
const DEDUPE_WINDOW_MS = Number(process.env.VISION_EVENT_DEDUPE_SECONDS || 30) * 1000;
const CORRELATION_WINDOW_MS = Number(process.env.VISION_CORRELATION_WINDOW_SECONDS || 300) * 1000;

// Camera to Sensor device mapping
const CAMERA_SENSOR_MAP = {
  "CAM-001": { deviceId: "JR-001", locationId: "SITE-001", name: "Adyar Bridge Observation" },
  "CAM-002": { deviceId: "JR-002", locationId: "SITE-002", name: "River Bend Observation" },
  "CAM-003": { deviceId: "JR-003", locationId: "SITE-003", name: "Lowland Gate Observation" }
};

// In-memory state for fast deduplication, status tracking, and pipeline heartbeat
const recentDetections = new Map(); // key -> timestamp

let pipelineState = {
  status: "NOT_CONFIGURED", // "RUNNING" | "STOPPED" | "ERROR" | "NOT_CONFIGURED"
  adapterConnected: false,
  lastHeartbeat: null,
  lastEventTimestamp: null,
  modelName: process.env.VISION_MODEL_NAME || "yolov8_waterlogging.onnx",
  engineName: process.env.VISION_ENGINE_NAME || "yolov8_waterlogging.engine",
  measuredFps: null,
  measuredLatencyMs: null,
  lastError: null
};

// Initialize PostgreSQL table if database is connected
async function initVisionTable() {
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS vision_events (
        event_id BIGSERIAL PRIMARY KEY,
        source VARCHAR(50) DEFAULT 'vision',
        event_type VARCHAR(100) NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        confidence DOUBLE PRECISION NOT NULL,
        camera_id VARCHAR(100) NOT NULL,
        location_id VARCHAR(100),
        timestamp TIMESTAMPTZ NOT NULL,
        bbox JSONB,
        evidence_url TEXT,
        track_id VARCHAR(100),
        model_id VARCHAR(100),
        payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_vision_events_timestamp ON vision_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_vision_events_camera ON vision_events(camera_id);
    `;
  } catch (err) {
    console.warn("Could not auto-create vision_events table:", err.message);
  }
}
initVisionTable().catch(() => {});

/**
 * Ingest and persist a vision hazard event
 */
async function recordVisionEvent(rawEvent) {
  const timestamp = new Date(rawEvent.timestamp || Date.now()).toISOString();
  const cameraId = rawEvent.cameraId || "CAM-001";
  const className = rawEvent.className || "standing_water";
  const confidence = Number(rawEvent.confidence);
  const locationId = rawEvent.locationId || (CAMERA_SENSOR_MAP[cameraId]?.locationId ?? null);

  // De-duplication check: same camera + class within DEDUPE_WINDOW_MS (test events bypass dedupe)
  const isTestEvent = Boolean(rawEvent.isTestEvent);
  const dedupeKey = `${cameraId}:${className}`;
  const nowMs = Date.now();
  const lastTime = recentDetections.get(dedupeKey);

  if (!isTestEvent && lastTime && (nowMs - lastTime) < DEDUPE_WINDOW_MS) {
    return {
      duplicate: true,
      deduped: true,
      message: `Event de-duplicated: repeated detection within ${DEDUPE_WINDOW_MS / 1000}s window`,
      cameraId,
      className,
      timestamp
    };
  }


  recentDetections.set(dedupeKey, nowMs);

  const eventRecord = {
    id: `VIS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: rawEvent.source || "vision",
    eventType: rawEvent.eventType || "WATER_HAZARD_OBSERVATION",
    className,
    confidence: Number(confidence.toFixed(4)),
    cameraId,
    locationId,
    timestamp,
    bbox: rawEvent.bbox || null,
    evidenceUrl: rawEvent.evidenceUrl || null,
    trackId: rawEvent.trackId !== undefined ? String(rawEvent.trackId) : null,
    modelId: rawEvent.modelId || pipelineState.modelName,
    isTestEvent: Boolean(rawEvent.isTestEvent),
    createdAt: new Date().toISOString()
  };

  // 1. Persist to Neon PostgreSQL if available
  let dbPersisted = false;
  if (sql) {
    try {
      const rows = await sql`
        INSERT INTO vision_events (
          source, event_type, class_name, confidence, camera_id, location_id,
          timestamp, bbox, evidence_url, track_id, model_id, payload
        ) VALUES (
          ${eventRecord.source}, ${eventRecord.eventType}, ${eventRecord.className},
          ${eventRecord.confidence}, ${eventRecord.cameraId}, ${eventRecord.locationId},
          ${eventRecord.timestamp}, ${JSON.stringify(eventRecord.bbox)}, ${eventRecord.evidenceUrl},
          ${eventRecord.trackId}, ${eventRecord.modelId}, ${JSON.stringify(rawEvent)}
        )
        RETURNING event_id, created_at;
      `;
      if (rows && rows.length > 0) {
        eventRecord.dbId = rows[0].event_id;
        dbPersisted = true;
      }
    } catch (dbErr) {
      console.warn("Neon DB persistence warning (using local fallback):", dbErr.message);
    }
  }

  // 2. Persist to local JSON collection
  addToCollection("vision_events", eventRecord);

  // Update pipeline state
  pipelineState.lastEventTimestamp = eventRecord.timestamp;
  pipelineState.status = "RUNNING";
  pipelineState.adapterConnected = true;

  // 3. Emit real-time Socket.IO event
  emit("vision:event", eventRecord);

  // 4. Compute and emit updated multi-source correlation
  const correlation = await correlateVisionWithSensor(eventRecord);
  emit("vision:correlation", correlation);

  return {
    ...eventRecord,
    dbPersisted
  };
}

/**
 * Retrieve vision events with filtering
 */
async function getVisionEvents(filters = {}) {
  const { cameraId, className, limit = 50, offset = 0 } = filters;

  if (sql) {
    try {
      let query;
      if (cameraId && className) {
        query = await sql`
          SELECT * FROM vision_events
          WHERE camera_id = ${cameraId} AND class_name = ${className}
          ORDER BY timestamp DESC
          LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;
      } else if (cameraId) {
        query = await sql`
          SELECT * FROM vision_events
          WHERE camera_id = ${cameraId}
          ORDER BY timestamp DESC
          LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;
      } else if (className) {
        query = await sql`
          SELECT * FROM vision_events
          WHERE class_name = ${className}
          ORDER BY timestamp DESC
          LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;
      } else {
        query = await sql`
          SELECT * FROM vision_events
          ORDER BY timestamp DESC
          LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;
      }

      if (query && query.length > 0) {
        return query.map(row => ({
          id: row.event_id,
          source: row.source,
          eventType: row.event_type,
          className: row.class_name,
          confidence: row.confidence,
          cameraId: row.camera_id,
          locationId: row.location_id,
          timestamp: row.timestamp,
          bbox: row.bbox,
          evidenceUrl: row.evidence_url,
          trackId: row.track_id,
          modelId: row.model_id,
          createdAt: row.created_at
        }));
      }
    } catch (err) {
      console.warn("DB query fallback to local collection:", err.message);
    }
  }

  // Local collection fallback
  let events = readCollection("vision_events") || [];
  if (cameraId) events = events.filter(e => e.cameraId === cameraId);
  if (className) events = events.filter(e => e.className === className);

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return events.slice(Number(offset), Number(offset) + Number(limit));
}

async function getVisionEventById(id) {
  const events = await getVisionEvents({ limit: 1000 });
  return events.find(e => String(e.id) === String(id) || String(e.dbId) === String(id)) || null;
}

/**
 * Adapter heartbeat endpoint
 */
function recordHeartbeat(data = {}) {
  pipelineState.status = data.status || "RUNNING";
  pipelineState.adapterConnected = true;
  pipelineState.lastHeartbeat = new Date().toISOString();
  if (data.modelName) pipelineState.modelName = data.modelName;
  if (data.engineName) pipelineState.engineName = data.engineName;
  if (data.fps !== undefined) pipelineState.measuredFps = Number(data.fps);
  if (data.latencyMs !== undefined) pipelineState.measuredLatencyMs = Number(data.latencyMs);
  if (data.error) pipelineState.lastError = data.error;

  emit("vision:status", pipelineState);
  return pipelineState;
}

/**
 * Return comprehensive pipeline status
 */
function getVisionStatus() {
  const now = Date.now();
  const heartbeatAge = pipelineState.lastHeartbeat ? (now - new Date(pipelineState.lastHeartbeat).getTime()) : Infinity;

  // If no heartbeat for > 60 seconds, transition status to STOPPED or UNKNOWN
  let operationalStatus = pipelineState.status;
  if (operationalStatus === "RUNNING" && heartbeatAge > 60000) {
    operationalStatus = "UNKNOWN";
  }

  return {
    ...pipelineState,
    status: operationalStatus,
    databaseConfigured: Boolean(sql),
    heartbeatAgeSeconds: isFinite(heartbeatAge) ? Math.round(heartbeatAge / 1000) : null,
    serverTimestamp: new Date().toISOString()
  };
}

/**
 * Multi-Source Risk Correlation (Step Seven)
 * Combines independent sensor risk prediction with visual observation.
 */
async function correlateVisionWithSensor(visionEvent) {
  const cameraId = visionEvent ? visionEvent.cameraId : "CAM-001";
  const mapping = CAMERA_SENSOR_MAP[cameraId];

  if (!mapping) {
    return {
      category: "VISUAL_OBSERVATION_ONLY",
      reason: `Camera ${cameraId} has no mapped sensor station. Visual observation remains independent.`,
      visionEvent,
      sensorReading: null,
      correlated: false,
      timestamp: new Date().toISOString()
    };
  }

  const latestSensor = await getLatest(mapping.deviceId);
  const visionTime = visionEvent ? new Date(visionEvent.timestamp).getTime() : 0;
  const sensorTime = latestSensor ? new Date(latestSensor.timestamp).getTime() : 0;
  const timeDiffMs = Math.abs(visionTime - sensorTime);

  const withinWindow = timeDiffMs <= CORRELATION_WINDOW_MS;
  const sensorRiskScore = latestSensor?.riskScore ?? (latestSensor?.waterLevel ? Math.min(100, latestSensor.waterLevel * 2) : 20);
  const isSensorRiskElevated = sensorRiskScore >= 50;
  const isVisionHazardObserved = Boolean(visionEvent && visionEvent.confidence >= 0.50);

  let category = "SENSOR_PREDICTION_ONLY";
  let explanation = "";

  if (withinWindow && isSensorRiskElevated && isVisionHazardObserved) {
    category = "MULTI_SOURCE_RISK";
    explanation = `High flood risk verified across multiple independent sources: Sensor ${mapping.deviceId} reports elevated water risk (${sensorRiskScore}/100) and Camera ${cameraId} confirms visual standing water (${(visionEvent.confidence * 100).toFixed(1)}% confidence) at ${mapping.name} within a ${Math.round(timeDiffMs / 1000)}s correlation window.`;
  } else if (isVisionHazardObserved) {
    category = "VISUAL_OBSERVATION_ONLY";
    explanation = `Standing water detected visually by Camera ${cameraId} (${(visionEvent.confidence * 100).toFixed(1)}% confidence), but sensor station ${mapping.deviceId} risk score is currently normal or not within correlation window (${Math.round(timeDiffMs / 1000)}s diff).`;
  } else if (isSensorRiskElevated) {
    category = "SENSOR_PREDICTION_ONLY";
    explanation = `Sensor station ${mapping.deviceId} indicates elevated water risk (${sensorRiskScore}/100), but no visual standing water is confirmed by camera ${cameraId}.`;
  } else {
    category = "SENSOR_PREDICTION_ONLY";
    explanation = `All observations normal. Sensor station ${mapping.deviceId} risk is safe (${sensorRiskScore}/100).`;
  }

  return {
    category,
    reason: explanation,
    cameraId,
    deviceId: mapping.deviceId,
    locationId: mapping.locationId,
    locationName: mapping.name,
    correlationWindowSeconds: CORRELATION_WINDOW_MS / 1000,
    timeDeltaSeconds: Math.round(timeDiffMs / 1000),
    sensorRiskScore,
    visionConfidence: visionEvent ? visionEvent.confidence : null,
    visionClass: visionEvent ? visionEvent.className : null,
    correlated: withinWindow && isSensorRiskElevated && isVisionHazardObserved,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  recordVisionEvent,
  getVisionEvents,
  getVisionEventById,
  recordHeartbeat,
  getVisionStatus,
  correlateVisionWithSensor,
  CAMERA_SENSOR_MAP
};
