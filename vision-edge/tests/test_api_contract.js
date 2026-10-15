const test = require("node:test");
const assert = require("node:assert");

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5001";

test("API Contract: Valid vision event accepted and persisted", async () => {
  const payload = {
    source: "integration-test",
    eventType: "WATER_HAZARD_OBSERVATION",
    className: "standing_water",
    confidence: 0.92,
    cameraId: "CAM-001",
    locationId: "SITE-001",
    timestamp: new Date().toISOString(),
    bbox: [100, 150, 200, 100],
    isTestEvent: true
  };

  const res = await fetch(`${BASE_URL}/api/vision/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(res.status, 201, "Expected HTTP 201 Created");
  const body = await res.json();
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.className, "standing_water");
  assert.strictEqual(body.data.confidence, 0.92);
  assert.ok(body.data.id, "Expected generated event id");
});

test("API Contract: Missing className is rejected with 400", async () => {
  const payload = {
    confidence: 0.85,
    cameraId: "CAM-001",
    timestamp: new Date().toISOString()
  };

  const res = await fetch(`${BASE_URL}/api/vision/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(res.status, 400, "Expected HTTP 400 Bad Request");
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.match(body.message, /className/);
});

test("API Contract: Invalid confidence (<0 or >1) rejected with 400", async () => {
  const payload = {
    className: "standing_water",
    confidence: 1.5,
    cameraId: "CAM-001",
    timestamp: new Date().toISOString()
  };

  const res = await fetch(`${BASE_URL}/api/vision/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(res.status, 400, "Expected HTTP 400 Bad Request");
});

test("API Contract: Invalid timestamp rejected with 400", async () => {
  const payload = {
    className: "standing_water",
    confidence: 0.88,
    cameraId: "CAM-001",
    timestamp: "invalid-date-string"
  };

  const res = await fetch(`${BASE_URL}/api/vision/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(res.status, 400, "Expected HTTP 400 Bad Request");
});

test("API Contract: GET /api/vision/events returns list with valid schema", async () => {
  const res = await fetch(`${BASE_URL}/api/vision/events?limit=5`);
  assert.strictEqual(res.status, 200, "Expected HTTP 200 OK");
  const body = await res.json();
  assert.strictEqual(body.success, true);
  assert.ok(Array.isArray(body.data), "Expected data to be an array");
  if (body.data.length > 0) {
    const event = body.data[0];
    assert.ok(event.id);
    assert.ok(event.className);
    assert.ok(typeof event.confidence === "number");
    assert.ok(event.timestamp);
  }
});

test("API Contract: GET /api/vision/status returns operational status", async () => {
  const res = await fetch(`${BASE_URL}/api/vision/status`);
  assert.strictEqual(res.status, 200, "Expected HTTP 200 OK");
  const body = await res.json();
  assert.strictEqual(body.success, true);
  assert.ok(body.data.status, "Expected status field");
  assert.ok("databaseConfigured" in body.data, "Expected databaseConfigured field");
});

test("API Contract: Multi-source correlated risk evaluation", async () => {
  const res = await fetch(`${BASE_URL}/api/vision/correlated-risk`);
  assert.strictEqual(res.status, 200, "Expected HTTP 200 OK");
  const body = await res.json();
  assert.strictEqual(body.success, true);
  assert.ok(
    ["MULTI_SOURCE_RISK", "VISUAL_OBSERVATION_ONLY", "SENSOR_PREDICTION_ONLY"].includes(body.data.category),
    `Unexpected category: ${body.data.category}`
  );
  assert.ok(body.data.reason, "Expected explanation reasoning");
});
