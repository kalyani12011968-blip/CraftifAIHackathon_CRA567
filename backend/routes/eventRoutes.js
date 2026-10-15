const express = require("express");
const controller = require("../controllers/eventController");

const router = express.Router();

router.get("/", controller.getEvents);
router.get("/:id", controller.getEvent);
router.post("/", controller.createEvent);

module.exports = router;
