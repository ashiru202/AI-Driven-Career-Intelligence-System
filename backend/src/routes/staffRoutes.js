const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { validate, schemas } = require("../middleware/validationMiddleware");
const { getPriorityQueue, setManualPriority } = require("../controllers/staffController");

router.use(requireAuth, requireRole("STAFF", "ADMIN"));

router.get("/priority-queue", getPriorityQueue);
router.patch(
  "/priority-queue/:userId/manual-priority",
  validate(schemas.staffSetManualPriority),
  setManualPriority
);

module.exports = router;
