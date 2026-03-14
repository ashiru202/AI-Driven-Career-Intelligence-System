const asyncHandler = require("../middleware/asyncHandler");
const analyticsService = require("../services/analyticsService");
const User = require("../models/User");
const Resume = require("../models/Resume");

/**
 * @route   GET /api/analytics/users
 * @desc    List all users (STAFF + ADMIN only)
 * @access  Private (STAFF, ADMIN)
 */
exports.getUserList = asyncHandler(async (req, res) => {
  const { search, role } = req.query;
  const query = {};
  if (role && ['USER', 'STAFF', 'ADMIN'].includes(role.toUpperCase())) {
    query.role = role.toUpperCase();
  }
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 });
  res.json({ ok: true, data: { users }, message: 'Users retrieved successfully' });
});

/**
 * @route   GET /api/analytics/skill-demand
 * @desc    Get skill demand statistics (top 10 + bottom 10)
 * @access  Private (any authenticated user)
 */
exports.getSkillDemand = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const stats = await analyticsService.getSkillDemandStats({
    startDate,
    endDate,
  });

  res.json({
    ok: true,
    data: stats,
    message: "Skill demand statistics retrieved successfully",
  });
});

/**
 * @route   GET /api/analytics/common-gaps
 * @desc    Get most common missing skills across all users
 * @access  Private (STAFF, ADMIN)
 */
exports.getCommonGaps = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const gaps = await analyticsService.getCommonGaps(limit);

  res.json({
    ok: true,
    data: gaps,
    message: "Common skill gaps retrieved successfully",
  });
});

/**
 * @route   GET /api/analytics/user-insights/:userId?
 * @desc    Get insights for a specific user (or current user if no userId)
 * @access  Private (USER can see own, STAFF/ADMIN can see any)
 */
exports.getUserInsights = asyncHandler(async (req, res) => {
  // Determine target user
  let targetUserId = req.params.userId || req.user.id;

  // Authorization: Users can only see their own insights unless STAFF/ADMIN
  if (targetUserId !== req.user.id) {
    if (req.user.role !== "STAFF" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        ok: false,
        error: "Forbidden: You can only view your own insights",
      });
    }
  }

  const { roadmapId, resumeId } = req.query;

  const insights = await analyticsService.getUserInsights(
    targetUserId,
    roadmapId,
    resumeId
  );

  res.json({
    ok: true,
    data: insights,
    message: "User insights retrieved successfully",
  });
});

/**
 * @route   GET /api/analytics/cv-completeness/:userId?
 * @desc    Get CV completeness score for a user
 * @access  Private (USER can see own, STAFF/ADMIN can see any)
 */
exports.getCVCompleteness = asyncHandler(async (req, res) => {
  // Determine target user
  let targetUserId = req.params.userId || req.user.id;

  // Authorization: Users can only see their own score unless STAFF/ADMIN
  if (targetUserId !== req.user.id) {
    if (req.user.role !== "STAFF" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        ok: false,
        error: "Forbidden: You can only view your own CV completeness",
      });
    }
  }

  const { resumeId } = req.query;

  const completeness = await analyticsService.getCVCompleteness(targetUserId, resumeId);

  res.json({
    ok: true,
    data: completeness,
    message: "CV completeness retrieved successfully",
  });
});

/**
 * @route   GET /api/analytics/cv-ai-suggestions
 * @desc    Generate AI-powered CV improvement suggestions using Gemini
 * @access  Private
 */
exports.getCVAISuggestions = asyncHandler(async (req, res) => {
  const { resumeId } = req.query;

  const result = await analyticsService.getCVAISuggestions(req.user.id, resumeId);

  res.json({
    ok: true,
    data: result,
    message: "AI suggestions generated successfully",
  });
});

/**
 * @route   GET /api/analytics/my-resumes
 * @desc    Get all resumes for the current user (any role)
 * @access  Private
 */
exports.getMyResumes = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const resumes = await Resume.find({ user: userId })
    .select("-extractedText -filePath")
    .sort({ createdAt: -1 });

  res.json({
    ok: true,
    data: { resumes },
    message: "Resumes retrieved successfully",
  });
});

/**
 * @route   GET /api/analytics/job-postings
 * @desc    Get live job postings from Adzuna API for given skills
 * @access  Private
 */
exports.getJobPostings = asyncHandler(async (req, res) => {
  const { skills, country = "us" } = req.query;
  const skillsArray = skills
    ? skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const result = await analyticsService.getJobPostings(skillsArray, country);

  res.json({
    ok: true,
    data: result,
    message: result.available ? "Job postings retrieved" : result.message,
  });
});

/**
 * @route   GET /api/analytics/skill-growth
 * @desc    Get skill count over time across the user's resume uploads
 * @access  Private
 */
exports.getSkillGrowth = asyncHandler(async (req, res) => {
  const result = await analyticsService.getSkillGrowthTimeline(req.user.id);
  res.json({ ok: true, data: result, message: "Skill growth timeline retrieved successfully" });
});

/**
 * @route   GET /api/analytics/comparison-history-chart
 * @desc    Get match score history for the current user (for charting)
 * @access  Private
 */
exports.getComparisonHistoryChart = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const result = await analyticsService.getComparisonHistoryChart(req.user.id, limit);
  res.json({ ok: true, data: result, message: "Comparison history chart data retrieved successfully" });
});

/**
 * @route   GET /api/analytics/user-report/:userId?
 * @desc    Generate comprehensive analytics report for a user
 * @access  Private (USER can see own, STAFF/ADMIN can see any)
 */
exports.getUserReport = asyncHandler(async (req, res) => {
  // Determine target user
  let targetUserId = req.params.userId || req.user.id;

  // Authorization: Users can only see their own report unless STAFF/ADMIN
  if (targetUserId !== req.user.id) {
    if (req.user.role !== "STAFF" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        ok: false,
        error: "Forbidden: You can only view your own report",
      });
    }
  }

  const report = await analyticsService.generateUserReport(targetUserId);

  res.json({
    ok: true,
    data: report,
    message: "User report generated successfully",
  });
});
