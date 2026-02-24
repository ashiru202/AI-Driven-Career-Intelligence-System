const express = require("express");
const router  = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getAllUsers,
  toggleUserStatus,
  getMyProfile,
  updateMyProfile,
} = require("../controllers/userController");

// ── Self profile (any authenticated user) ────────────────────────────────────
router.get("/me",     authMiddleware([]), getMyProfile);
router.put("/me",     authMiddleware([]), updateMyProfile);

// ── Admin / Staff routes ─────────────────────────────────────────────────────
router.get("/",           authMiddleware(["STAFF", "ADMIN"]), getAllUsers);
router.put("/:id/status", authMiddleware(["STAFF", "ADMIN"]), toggleUserStatus);

module.exports = router;