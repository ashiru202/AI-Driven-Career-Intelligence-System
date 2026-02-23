const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const roadmapController = require("../controllers/roadmapController");

/**
 * USER ONLY (learning workflow)
 */
router.get(
  "/my",
  authMiddleware(["USER"]),
  roadmapController.getMyRoadmaps
);

router.post(
  "/recommendations",
  authMiddleware(["USER"]),
  roadmapController.recommendations
);

router.post(
  "/analyze-resume",
  authMiddleware(["USER"]),
  upload.single("resume"),
  roadmapController.analyzeResume
);

router.post(
  "/compare-job",
  authMiddleware(["USER"]),
  roadmapController.compareJob
);

router.post(
  "/generate",
  authMiddleware(["USER"]),
  roadmapController.generateRoadmap
);

router.patch(
  "/skill-status",
  authMiddleware(["USER"]),
  roadmapController.updateSkillStatus
);

/**
 * STAFF / ADMIN (management + analytics)
 */
router.get(
  "/stats",
  authMiddleware(["STAFF", "ADMIN"]),
  roadmapController.getRoadmapStats
);

router.get(
  "/",
  authMiddleware(["STAFF", "ADMIN"]),
  roadmapController.getAllRoadmaps
);

/**
 * Debug (keep restricted)
 */
router.post(
  "/debug",
  authMiddleware(["STAFF", "ADMIN"]),
  roadmapController.debugAuthAndBody
);

module.exports = router;
