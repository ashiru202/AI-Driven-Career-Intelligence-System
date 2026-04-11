const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");
const { successResponse } = require("../utils/responseHelper");
const { logActivity } = require("../services/auditLogService");
const staffPriorityService = require("../services/staffPriorityService");
const User = require("../models/User");
const CaseNote = require("../models/CaseNote");
const StaffCase = require("../models/StaffCase");

async function assertTargetUser(userId) {
  const user = await User.findOne({ _id: userId, role: "USER" })
    .select("name email active createdAt")
    .lean();
  if (!user) {
    throw AppError.notFound("Target user not found");
  }
  return user;
}

exports.getPriorityQueue = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const data = await staffPriorityService.buildPriorityQueue({ search, page, limit });
  res.json(successResponse(data, "Priority queue retrieved successfully"));
});

exports.setManualPriority = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { manualPriority } = req.body;

  const item = await staffPriorityService.setManualPriority({ userId, manualPriority });

  logActivity(
    req,
    "SET_CASE_PRIORITY",
    { type: "User", id: userId, email: item.user.email, name: item.user.name },
    { manualPriority }
  );

  res.json(successResponse({ item }, "Manual priority updated successfully"));
});

exports.getCaseNotes = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await assertTargetUser(userId);

  const [notes, staffCase] = await Promise.all([
    CaseNote.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("author", "name email role")
      .lean(),
    StaffCase.findOne({ user: userId }).select("tags").lean(),
  ]);

  res.json(
    successResponse(
      {
        user,
        tags: staffCase?.tags || [],
        notes,
      },
      "Case notes retrieved successfully"
    )
  );
});

exports.createCaseNote = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { content } = req.body;
  const user = await assertTargetUser(userId);

  const created = await CaseNote.create({
    user: userId,
    author: req.user.id,
    content,
  });

  const note = await CaseNote.findById(created._id)
    .populate("author", "name email role")
    .lean();

  logActivity(
    req,
    "CREATE_CASE_NOTE",
    { type: "User", id: userId, email: user.email, name: user.name },
    { noteId: String(created._id) }
  );

  res.status(201).json(successResponse({ note }, "Case note created successfully"));
});

exports.updateCaseNote = asyncHandler(async (req, res) => {
  const { userId, noteId } = req.params;
  const { content } = req.body;
  const user = await assertTargetUser(userId);

  const noteDoc = await CaseNote.findOne({ _id: noteId, user: userId });
  if (!noteDoc) {
    throw AppError.notFound("Case note not found");
  }

  noteDoc.content = content;
  await noteDoc.save();

  const note = await CaseNote.findById(noteDoc._id)
    .populate("author", "name email role")
    .lean();

  logActivity(
    req,
    "UPDATE_CASE_NOTE",
    { type: "User", id: userId, email: user.email, name: user.name },
    { noteId: String(noteDoc._id) }
  );

  res.json(successResponse({ note }, "Case note updated successfully"));
});

exports.deleteCaseNote = asyncHandler(async (req, res) => {
  const { userId, noteId } = req.params;
  const user = await assertTargetUser(userId);

  const deleted = await CaseNote.findOneAndDelete({ _id: noteId, user: userId });
  if (!deleted) {
    throw AppError.notFound("Case note not found");
  }

  logActivity(
    req,
    "DELETE_CASE_NOTE",
    { type: "User", id: userId, email: user.email, name: user.name },
    { noteId: String(noteId) }
  );

  res.json(successResponse(null, "Case note deleted successfully"));
});

exports.updateCaseTags = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { tags } = req.body;
  const user = await assertTargetUser(userId);

  const normalizedTags = [...new Set((tags || []).map((t) => String(t || "").trim().toLowerCase()).filter(Boolean))].slice(0, 20);

  const caseDoc = await StaffCase.findOneAndUpdate(
    { user: userId },
    { user: userId, tags: normalizedTags },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  logActivity(
    req,
    "UPDATE_CASE_TAGS",
    { type: "User", id: userId, email: user.email, name: user.name },
    { tags: normalizedTags }
  );

  res.json(successResponse({ tags: caseDoc.tags || [] }, "Case tags updated successfully"));
});
