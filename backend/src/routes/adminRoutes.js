const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { validate, schemas } = require("../middleware/validationMiddleware");
const { 
  createStaff, 
  listUsers, 
  toggleUserStatus, 
  getAdminStats,
  deleteUser
} = require("../controllers/adminController");

// All routes require admin role
router.use(requireAuth, requireRole('ADMIN'));

// Admin dashboard stats
router.get("/stats", getAdminStats);

// Create staff account
router.post("/staff", validate(schemas.createStaff), createStaff);

// List users (with filters)
router.get("/users", listUsers);

// Enable/disable user account
router.patch("/users/:userId/status", toggleUserStatus);

// Permanently delete a job seeker account
router.delete("/users/:userId", deleteUser);

module.exports = router;