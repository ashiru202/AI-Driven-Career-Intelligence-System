const asyncHandler = require("../middleware/asyncHandler");
const analyticsService = require("../services/analyticsService");
const { streamPlatformSummaryPDF, streamUserReportPDF } = require("../services/reportService");
const AppError = require("../utils/AppError");

/**
 * GET /api/reports/summary
 * Return platform summary report as JSON (ADMIN only)
 */
exports.getPlatformSummaryReport = asyncHandler(async (req, res) => {
  const report = await analyticsService.getPlatformSummaryReport();
  res.json({ ok: true, data: report, message: "Platform summary report generated successfully" });
});

/**
 * GET /api/reports/user/:userId
 * Return per-user report as JSON (ADMIN or STAFF)
 */
exports.getUserReport = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const report = await analyticsService.generateUserReport(userId);
  res.json({ ok: true, data: report, message: "User report generated successfully" });
});

/**
 * GET /api/reports/summary/pdf
 * Return platform summary report as PDF (ADMIN only)
 */
exports.getPlatformSummaryPDF = asyncHandler(async (req, res) => {
  const report = await analyticsService.getPlatformSummaryReport();
  streamPlatformSummaryPDF(report, res);
});

/**
 * GET /api/reports/user/:userId/pdf
 * Return per-user report as PDF (ADMIN or STAFF)
 */
exports.getUserReportPDF = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const report = await analyticsService.generateUserReport(userId);
  streamUserReportPDF(report, res);
});
