const express = require("express");
const { validateDevice } = require("../middleware/validation");
const controller = require("../controllers/deviceController");

const router = express.Router();

router.get("/", controller.getDevices);
router.get("/:deviceId", controller.getDevice);
router.post("/", validateDevice, controller.registerDevice);
router.post("/:deviceId/heartbeat", controller.deviceHeartbeat);

module.exports = router;
