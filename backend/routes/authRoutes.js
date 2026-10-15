const express = require("express");
const { validateLogin } = require("../middleware/validation");
const controller = require("../controllers/authController");

const router = express.Router();

router.post("/register", controller.register);
router.post("/login", validateLogin, controller.login);
router.get("/me", controller.me);

module.exports = router;
