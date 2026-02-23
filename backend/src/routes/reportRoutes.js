const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const reportController = require("../controllers/reportController");

// All report routes require authentication
router.use(requireAuth);

// GET /api/reports/summary - ADMIN only (JSON)
router.get("/summary", requireRole("ADMIN"), reportController.getPlatformSummaryReport);

// GET /api/reports/summary/pdf - ADMIN only (PDF download)
router.get("/summary/pdf", requireRole("ADMIN"), reportController.getPlatformSummaryPDF);

// GET /api/reports/user/:userId - ADMIN or STAFF (JSON)
router.get("/user/:userId", requireRole("STAFF", "ADMIN"), reportController.getUserReport);

// GET /api/reports/user/:userId/pdf - ADMIN or STAFF (PDF download)
router.get("/user/:userId/pdf", requireRole("STAFF", "ADMIN"), reportController.getUserReportPDF);

module.exports = router;
