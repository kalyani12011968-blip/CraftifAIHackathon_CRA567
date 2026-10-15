const express = require("express");
const { validateSensorData } = require("../middleware/validation");
const controller = require("../controllers/sensorController");

const router = express.Router();

router.post("/", validateSensorData, controller.receiveSensorData);
router.get("/latest", controller.getLatestSensorData);
router.get("/history", controller.getSensorHistory);
router.get("/", controller.getSensorHistory);

module.exports = router;
