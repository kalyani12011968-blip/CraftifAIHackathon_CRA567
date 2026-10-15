const express = require("express");
const controller = require("../controllers/alertController");

const router = express.Router();

router.get("/", controller.getAlerts);
router.post("/", controller.sendAlert);
router.post("/test", controller.testAlert);

module.exports = router;
