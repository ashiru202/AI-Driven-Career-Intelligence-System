const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(requireAuth);

// GET /api/analytics/users - List all users (STAFF + ADMIN only)
router.get(
  "/users",
  requireRole('STAFF', 'ADMIN'),
  analyticsController.getUserList
);

// GET /api/analytics/skill-demand - Get skill demand statistics
router.get("/skill-demand", analyticsController.getSkillDemand);

// GET /api/analytics/common-gaps - Get common skill gaps (STAFF/ADMIN only)
router.get(
  "/common-gaps",
  requireRole('STAFF', 'ADMIN'),
  analyticsController.getCommonGaps
);

// GET /api/analytics/user-insights/:userId - Get user insights (or current user)
router.get("/user-insights", analyticsController.getUserInsights);
router.get("/user-insights/:userId", analyticsController.getUserInsights);

// GET /api/analytics/cv-completeness/:userId - Get CV completeness score
router.get("/cv-completeness", analyticsController.getCVCompleteness);
router.get("/cv-completeness/:userId", analyticsController.getCVCompleteness);

// GET /api/analytics/user-report/:userId - Generate user report
router.get("/user-report", analyticsController.getUserReport);
router.get("/user-report/:userId", analyticsController.getUserReport);

// GET /api/analytics/my-resumes - Get current user's uploaded resumes (any role)
router.get("/my-resumes", analyticsController.getMyResumes);

// GET /api/analytics/cv-ai-suggestions?resumeId=... - AI-powered CV suggestions (Gemini)
router.get("/cv-ai-suggestions", analyticsController.getCVAISuggestions);

// GET /api/analytics/job-postings?skills=react,nodejs&country=us - Live job postings (Adzuna)
router.get("/job-postings", analyticsController.getJobPostings);

module.exports = router;
