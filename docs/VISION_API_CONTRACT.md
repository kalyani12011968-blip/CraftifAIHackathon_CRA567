# JAL-RAKSHAK Edge: Vision Event API Contract

## Overview
The **JAL-RAKSHAK Edge Vision API** allows edge nodes running PipeGen / TensorRT / DeepStream pipelines to ingest real-time visual hazard detections, stream pipeline health heartbeats, query event history, and compute sensor/vision correlated risk.

Base URL: `http://localhost:5001/api/vision`

---

## 1. Endpoints

### 1.1 Ingest Vision Event
- **Endpoint:** `POST /api/vision/events`
- **Content-Type:** `application/json`
- **Purpose:** Ingests a normalized visual hazard event detected by the edge computer vision pipeline. Triggers event de-duplication, database persistence, and Socket.IO broadcast (`vision:event` and `vision:correlation`).

#### Request Headers
| Header | Value | Required | Description |
|---|---|---|---|
| `Content-Type` | `application/json` | Yes | Request payload format |
| `x-device-token` | `string` | Optional | Shared authentication secret / node token |

#### Request Payload Schema
```json
{
  "eventId": "vis_evt_1729000000_1234",
  "deviceId": "NODE-001",
  "cameraId": "CAM-01-NORTH",
  "timestamp": "2026-10-15T14:45:00.000Z",
  "hazardType": "waterlogging",
  "confidence": 0.91,
  "severity": "high",
  "boundingBox": [
    {
      "label": "water_accumulation",
      "confidence": 0.91,
      "xMin": 0.15,
      "yMin": 0.40,
      "xMax": 0.85,
      "yMax": 0.95
    }
  ],
  "opticalFlow": {
    "magnitude": 4.5,
    "directionDeg": 182.0,
    "flowStatus": "ACTIVE_RISING"
  },
  "isTestEvent": false,
  "pipelineMetrics": {
    "fps": 28.4,
    "inferenceLatencyMs": 14.2,
    "e2eLatencyMs": 32.1
  },
  "snapshotUrl": "/snapshots/cam01_waterlog_latest.jpg"
}
```

#### Field Specifications
| Field | Type | Required | Constraints / Description |
|---|---|---|---|
| `eventId` | String | No | Unique ID. Auto-generated if omitted (`vis_evt_<timestamp>_<rand>`). |
| `deviceId` | String | Yes | ID of the physical edge station (e.g., `NODE-001`). |
| `cameraId` | String | Yes | ID of the camera source (e.g., `CAM-01-NORTH`). |
| `timestamp` | ISO String | Yes | UTC timestamp in ISO 8601 format. |
| `hazardType` | String | Yes | One of: `waterlogging`, `debris_blockage`, `overflow`, `turbulence`, `rapid_rise`, `none`. |
| `confidence` | Number | Yes | Value between `0.0` and `1.0`. Filtered if below threshold (0.50). |
| `severity` | String | Yes | One of: `low`, `medium`, `high`, `critical`. |
| `boundingBox` | Array | No | Array of detected hazard bounding boxes normalized between 0.0 and 1.0. |
| `opticalFlow` | Object | No | Velocity magnitude and directional vector from temporal tracking. |
| `isTestEvent` | Boolean | No | Flags simulation or synthetic test events (default `false`). |
| `pipelineMetrics`| Object | No | Edge performance metrics: `fps`, `inferenceLatencyMs`, `e2eLatencyMs`. |
| `snapshotUrl` | String | No | URL or local path to frame thumbnail. |

#### Response (`201 Created` or `200 OK`)
```json
{
  "success": true,
  "action": "stored",
  "eventId": "vis_evt_1729000000_1234",
  "storedAt": "2026-10-15T14:45:00.120Z",
  "riskCorrelation": {
    "deviceId": "NODE-001",
    "physicalRiskScore": 42.5,
    "visualRiskScore": 85.0,
    "correlatedRiskScore": 68.0,
    "correlatedLevel": "HIGH",
    "correlationState": "VISUAL_GROUNDED_CONFIRMATION"
  }
}
```

---

### 1.2 Query Vision Event History
- **Endpoint:** `GET /api/vision/events`
- **Query Parameters:**
  - `limit` (default: 50, max: 200)
  - `deviceId` (optional filter)
  - `hazardType` (optional filter)
  - `severity` (optional filter)

#### Response (`200 OK`)
```json
{
  "success": true,
  "count": 12,
  "events": [
    {
      "eventId": "vis_evt_1729000000_1234",
      "deviceId": "NODE-001",
      "cameraId": "CAM-01-NORTH",
      "timestamp": "2026-10-15T14:45:00.000Z",
      "hazardType": "waterlogging",
      "confidence": 0.91,
      "severity": "high",
      "isTestEvent": false
    }
  ]
}
```

---

### 1.3 Ingest Pipeline Heartbeat
- **Endpoint:** `POST /api/vision/heartbeat`
- **Payload:**
```json
{
  "deviceId": "NODE-001",
  "cameraId": "CAM-01-NORTH",
  "status": "ACTIVE",
  "pipelineFps": 28.5,
  "inferenceLatencyMs": 13.8,
  "e2eLatencyMs": 31.2,
  "systemMetrics": {
    "gpuMemoryUsedMb": 1820,
    "gpuMemoryTotalMb": 6144,
    "gpuUtilPercent": 42,
    "pipelineEngine": "PipeGen-v0.5.1-TensorRT"
  }
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Heartbeat recorded",
  "recordedAt": "2026-10-15T14:45:10.000Z"
}
```

---

### 1.4 Get Pipeline Status & Telemetry
- **Endpoint:** `GET /api/vision/status`
#### Response (`200 OK`)
```json
{
  "success": true,
  "status": "OPERATIONAL",
  "activeNodes": ["NODE-001"],
  "lastHeartbeat": "2026-10-15T14:45:10.000Z",
  "recentEventsCount": 18,
  "persistenceStore": "LOCAL_JSON"
}
```

---

### 1.5 Get Sensor & Vision Correlated Risk
- **Endpoint:** `GET /api/vision/correlated-risk`
- **Query Parameter:** `deviceId=NODE-001`
#### Response (`200 OK`)
```json
{
  "success": true,
  "correlation": {
    "deviceId": "NODE-001",
    "timestamp": "2026-10-15T14:45:15.000Z",
    "physicalRiskScore": 38.0,
    "visualRiskScore": 85.0,
    "correlatedRiskScore": 66.2,
    "correlatedLevel": "HIGH",
    "correlationState": "VISUAL_GROUNDED_CONFIRMATION",
    "latestHazardType": "waterlogging",
    "latestHazardConfidence": 0.91
  }
}
```

---

## 2. Real-Time Socket.IO Channels

Connected clients listen on the default Socket.IO namespace `/`:

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `vision:event` | Server $\to$ Client | VisionEvent Object | Broadcast whenever a new hazard event is accepted. |
| `vision:status` | Server $\to$ Client | Status Object | Broadcast upon receiving edge heartbeat or node state update. |
| `vision:correlation` | Server $\to$ Client | CorrelatedRisk Object | Real-time correlated score computed from sensor + visual metrics. |

---

## 3. De-duplication and Cooldown Protocol
To avoid network flooding during continuous video stream inference:
1. Identical hazard events (`hazardType` + `severity` + `deviceId`) are subject to a **10,000 ms cooldown**.
2. If an event occurs within the cooldown period:
   - It is acknowledged with `action: "suppressed_duplicate"`.
   - It is not re-broadcast over Socket.IO.
3. Test events (`isTestEvent: true`) bypass the cooldown filter for immediate test verification.
