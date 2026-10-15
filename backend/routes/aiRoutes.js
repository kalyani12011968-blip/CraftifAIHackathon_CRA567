const express = require("express");

const {
    prediction,
    analyze,
    chat
} = require("../controllers/aiController");

const router = express.Router();

router.post("/predict", prediction);

router.post("/analyze", analyze);

router.post("/chat", chat);

module.exports = router;