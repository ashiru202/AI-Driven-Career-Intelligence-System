const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { validate, schemas } = require("../middleware/validationMiddleware");
const {
  createStaff,
  listStaffApplications,
  reviewStaffApplication,
  listUsers,
  toggleUserStatus,
  getAdminStats,
  deleteUser,
  getAuditLogs,
} = require("../controllers/adminController");
const {
  triggerScrape,
  triggerForecast,
  getScrapeStatus,
} = require("../controllers/trendController");

// All routes require admin role
router.use(requireAuth, requireRole('ADMIN'));

// Admin dashboard stats
router.get("/stats", getAdminStats);

// Create staff account (admin only)
router.post("/staff", validate(schemas.adminCreateStaff), createStaff);

// Staff application review flow (admin only)
router.get(
  "/staff-applications",
  validate(schemas.adminListStaffApplications),
  listStaffApplications
);
router.patch(
  "/staff-applications/:applicationId/review",
  validate(schemas.adminReviewStaffApplication),
  reviewStaffApplication
);

// List users (with filters)
router.get("/users", listUsers);

// Enable/disable user account
router.patch("/users/:userId/status", toggleUserStatus);

// Permanently delete a job seeker account
router.delete("/users/:userId", deleteUser);

// Activity audit log
router.get("/audit-logs", getAuditLogs);

// Industry Trends — admin controls
router.post("/trends/trigger-scrape",   triggerScrape);
router.post("/trends/trigger-forecast", triggerForecast);
router.get("/trends/scrape-status",     getScrapeStatus);

module.exports = router;