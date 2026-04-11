const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");
const { successResponse } = require("../utils/responseHelper");
const { logActivity } = require("../services/auditLogService");
const staffPriorityService = require("../services/staffPriorityService");
const User = require("../models/User");
const CaseNote = require("../models/CaseNote");
const StaffCase = require("../models/StaffCase");
const StaffFollowUpTask = require("../models/StaffFollowUpTask");
const StaffReportWorkflow = require("../models/StaffReportWorkflow");

async function assertTargetUser(userId) {
  const user = await User.findOne({ _id: userId, role: "USER" })
    .select("name email active createdAt")
    .lean();
  if (!user) {
    throw AppError.notFound("Target user not found");
  }
  return user;
}

function getReminderState(task) {
  if (!task || task.status === "COMPLETED") return "NONE";
  const now = Date.now();
  const dueAt = new Date(task.dueDate).getTime();
  if (Number.isNaN(dueAt)) return "NONE";
  if (dueAt < now) return "OVERDUE";
  const diffHours = (dueAt - now) / 3600000;
  if (diffHours <= 48) return "DUE_SOON";
  return "UPCOMING";
}

function enrichFollowUpTask(task) {
  return {
    ...task,
    reminderState: getReminderState(task),
  };
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

exports.getFollowUpTasks = asyncHandler(async (req, res) => {
  const { userId, status, reminder, search } = req.query;

  const query = {};
  if (userId) query.user = userId;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const tasks = await StaffFollowUpTask.find(query)
    .sort({ dueDate: 1, createdAt: -1 })
    .populate("user", "name email active")
    .populate("createdBy", "name email role")
    .lean();

  const enriched = tasks.map(enrichFollowUpTask);
  const filtered = reminder ? enriched.filter((task) => task.reminderState === reminder) : enriched;

  const stats = {
    total: filtered.length,
    pending: filtered.filter((task) => task.status === "PENDING").length,
    completed: filtered.filter((task) => task.status === "COMPLETED").length,
    dueSoon: filtered.filter((task) => task.reminderState === "DUE_SOON").length,
    overdue: filtered.filter((task) => task.reminderState === "OVERDUE").length,
  };

  res.json(successResponse({ items: filtered, stats }, "Follow-up tasks retrieved successfully"));
});

exports.createFollowUpTask = asyncHandler(async (req, res) => {
  const { userId, title, description, dueDate, priority } = req.body;
  const targetUser = await assertTargetUser(userId);

  const created = await StaffFollowUpTask.create({
    user: userId,
    createdBy: req.user.id,
    title,
    description,
    dueDate,
    priority,
  });

  const task = await StaffFollowUpTask.findById(created._id)
    .populate("user", "name email active")
    .populate("createdBy", "name email role")
    .lean();

  logActivity(
    req,
    "CREATE_FOLLOWUP_TASK",
    { type: "User", id: userId, email: targetUser.email, name: targetUser.name },
    { taskId: String(created._id), dueDate, priority }
  );

  res
    .status(201)
    .json(successResponse({ item: enrichFollowUpTask(task) }, "Follow-up task created successfully"));
});

exports.updateFollowUpTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { userId, title, description, dueDate, priority, status } = req.body;

  const taskDoc = await StaffFollowUpTask.findById(taskId);
  if (!taskDoc) {
    throw AppError.notFound("Follow-up task not found");
  }

  let targetUser = null;
  if (userId && String(taskDoc.user) !== String(userId)) {
    targetUser = await assertTargetUser(userId);
    taskDoc.user = userId;
  }

  if (title !== undefined) taskDoc.title = title;
  if (description !== undefined) taskDoc.description = description;
  if (dueDate !== undefined) taskDoc.dueDate = dueDate;
  if (priority !== undefined) taskDoc.priority = priority;
  if (status !== undefined) {
    taskDoc.status = status;
    taskDoc.completedAt = status === "COMPLETED" ? new Date() : null;
  }

  await taskDoc.save();

  const task = await StaffFollowUpTask.findById(taskDoc._id)
    .populate("user", "name email active")
    .populate("createdBy", "name email role")
    .lean();

  logActivity(
    req,
    "UPDATE_FOLLOWUP_TASK",
    {
      type: "User",
      id: String(task.user?._id || userId || taskDoc.user),
      email: task.user?.email || targetUser?.email,
      name: task.user?.name || targetUser?.name,
    },
    { taskId: String(taskDoc._id), status: task.status, priority: task.priority, dueDate: task.dueDate }
  );

  res.json(successResponse({ item: enrichFollowUpTask(task) }, "Follow-up task updated successfully"));
});

exports.deleteFollowUpTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await StaffFollowUpTask.findByIdAndDelete(taskId)
    .populate("user", "name email active")
    .lean();

  if (!task) {
    throw AppError.notFound("Follow-up task not found");
  }

  logActivity(
    req,
    "DELETE_FOLLOWUP_TASK",
    {
      type: "User",
      id: String(task.user?._id || task.user),
      email: task.user?.email,
      name: task.user?.name,
    },
    { taskId: String(taskId), title: task.title }
  );

  res.json(successResponse(null, "Follow-up task deleted successfully"));
});

exports.getReportWorkflows = asyncHandler(async (req, res) => {
  const { search, state, userId } = req.query;

  const userQuery = { role: "USER" };
  if (userId) userQuery._id = userId;
  if (search) {
    userQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(userQuery)
    .select("name email active createdAt")
    .sort({ createdAt: -1 })
    .lean();

  if (!users.length) {
    return res.json(
      successResponse(
        {
          items: [],
          stats: { NEW: 0, IN_REVIEW: 0, FOLLOW_UP_REQUIRED: 0, RESOLVED: 0, total: 0 },
        },
        "Report workflows retrieved successfully"
      )
    );
  }

  const workflowDocs = await StaffReportWorkflow.find({ user: { $in: users.map((u) => u._id) } })
    .populate("updatedBy", "name email role")
    .lean();

  const workflowMap = new Map(workflowDocs.map((doc) => [String(doc.user), doc]));

  let items = users.map((user) => {
    const workflow = workflowMap.get(String(user._id));
    return {
      user,
      state: workflow?.state || "NEW",
      notes: workflow?.notes || "",
      updatedBy: workflow?.updatedBy || null,
      lastUpdatedAt: workflow?.lastUpdatedAt || workflow?.updatedAt || user.createdAt,
      workflowId: workflow?._id ? String(workflow._id) : null,
    };
  });

  if (state) {
    items = items.filter((item) => item.state === state);
  }

  const stats = {
    NEW: items.filter((item) => item.state === "NEW").length,
    IN_REVIEW: items.filter((item) => item.state === "IN_REVIEW").length,
    FOLLOW_UP_REQUIRED: items.filter((item) => item.state === "FOLLOW_UP_REQUIRED").length,
    RESOLVED: items.filter((item) => item.state === "RESOLVED").length,
    total: items.length,
  };

  items.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

  res.json(successResponse({ items, stats }, "Report workflows retrieved successfully"));
});

exports.updateReportWorkflow = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { state, notes = "" } = req.body;
  const user = await assertTargetUser(userId);

  const workflow = await StaffReportWorkflow.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      state,
      notes,
      updatedBy: req.user.id,
      lastUpdatedAt: new Date(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
    .populate("updatedBy", "name email role")
    .lean();

  logActivity(
    req,
    "UPDATE_REPORT_WORKFLOW_STATE",
    { type: "User", id: userId, email: user.email, name: user.name },
    { state, notesLength: String(notes || "").length }
  );

  res.json(
    successResponse(
      {
        item: {
          user: {
            _id: String(user._id),
            name: user.name,
            email: user.email,
            active: Boolean(user.active),
            createdAt: user.createdAt,
          },
          state: workflow.state,
          notes: workflow.notes || "",
          updatedBy: workflow.updatedBy || null,
          lastUpdatedAt: workflow.lastUpdatedAt || workflow.updatedAt,
          workflowId: String(workflow._id),
        },
      },
      "Report workflow updated successfully"
    )
  );
});
