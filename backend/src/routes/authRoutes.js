const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const { validate, schemas } = require("../middleware/validationMiddleware");

router.post("/register", validate(schemas.register), register);
router.post("/login", validate(schemas.login), login);

module.exports = router;
