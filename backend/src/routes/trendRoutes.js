const express = require("express");
const router  = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const {
  getSkillsList,
  getSkillDetail,
  getRisingSkills,
  getFallingSkills,
  getSnapshotSummary,
} = require("../controllers/trendController");

// All trend routes require a valid auth token (any role).
router.use(requireAuth);

router.get("/snapshot-summary", getSnapshotSummary);
router.get("/rising",           getRisingSkills);
router.get("/falling",          getFallingSkills);
router.get("/skills",           getSkillsList);
router.get("/skills/:skill",    getSkillDetail);

module.exports = router;
