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
  getFollowUpTasks,
  createFollowUpTask,
  updateFollowUpTask,
  deleteFollowUpTask,
  getReportWorkflows,
  updateReportWorkflow,
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

router.get(
  "/follow-up-tasks",
  validate(schemas.staffFollowUpQuery),
  getFollowUpTasks
);

router.post(
  "/follow-up-tasks",
  validate(schemas.staffCreateFollowUpTask),
  createFollowUpTask
);

router.patch(
  "/follow-up-tasks/:taskId",
  validate(schemas.staffUpdateFollowUpTask),
  updateFollowUpTask
);

router.delete(
  "/follow-up-tasks/:taskId",
  validate(schemas.staffFollowUpTaskParam),
  deleteFollowUpTask
);

router.get(
  "/report-workflows",
  validate(schemas.staffReportWorkflowQuery),
  getReportWorkflows
);

router.patch(
  "/report-workflows/:userId",
  validate(schemas.staffUpdateReportWorkflow),
  updateReportWorkflow
);

module.exports = router;
