const asyncHandler = require("../middleware/asyncHandler");
const { successResponse } = require("../utils/responseHelper");
const { logActivity } = require("../services/auditLogService");
const staffPriorityService = require("../services/staffPriorityService");

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
