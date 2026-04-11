const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { validate, schemas } = require("../middleware/validationMiddleware");
const {
  getPriorityQueue,
  setManualPriority,
  getCaseNotes,
  createCaseNote,
  updateCaseNote,
  deleteCaseNote,
  updateCaseTags,
} = require("../controllers/staffController");

router.use(requireAuth, requireRole("STAFF", "ADMIN"));

router.get("/priority-queue", getPriorityQueue);
router.patch(
  "/priority-queue/:userId/manual-priority",
  validate(schemas.staffSetManualPriority),
  setManualPriority
);

router.get(
  "/cases/:userId/notes",
  validate(schemas.staffCaseUserParam),
  getCaseNotes
);

router.post(
  "/cases/:userId/notes",
  validate(schemas.staffCreateCaseNote),
  createCaseNote
);

router.patch(
  "/cases/:userId/notes/:noteId",
  validate(schemas.staffUpdateCaseNote),
  updateCaseNote
);

router.delete(
  "/cases/:userId/notes/:noteId",
  validate(schemas.staffCaseNoteParam),
  deleteCaseNote
);

router.patch(
  "/cases/:userId/tags",
  validate(schemas.staffUpdateCaseTags),
  updateCaseTags
);

module.exports = router;
