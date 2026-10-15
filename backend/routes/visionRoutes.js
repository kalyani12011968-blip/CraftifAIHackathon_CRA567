const express = require("express");
const { validateVisionEvent } = require("../middleware/validation");
const controller = require("../controllers/visionController");

const router = express.Router();

// Public / operational endpoints
router.get("/status", controller.getVisionStatus);
router.post("/heartbeat", controller.recordHeartbeat);
router.get("/correlated-risk", controller.getCorrelatedRisk);

// Vision event ingestion and retrieval
router.post("/events", validateVisionEvent, controller.recordVisionEvent);
router.get("/events", controller.getVisionEvents);
router.get("/events/:id", controller.getVisionEventById);

module.exports = router;
