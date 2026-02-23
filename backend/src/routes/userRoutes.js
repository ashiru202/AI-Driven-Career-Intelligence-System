const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { getAllUsers, toggleUserStatus } = require("../controllers/userController");

// Roles must match the User model exactly: "STAFF", "Admin"
router.get("/", authMiddleware(["STAFF", "ADMIN"]), getAllUsers);
router.put("/:id/status", authMiddleware(["STAFF", "ADMIN"]), toggleUserStatus);

module.exports = router;