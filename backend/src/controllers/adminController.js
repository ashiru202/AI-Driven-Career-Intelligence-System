const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { successResponse } = require("../utils/responseHelper");
const AppError = require("../utils/AppError");
const { asyncHandler } = require("../middleware/errorMiddleware");
const Comparison = require("../models/Comparison");
const analyticsService = require("../services/analyticsService");
const AuditLog = require("../models/AuditLog");
const { logActivity } = require("../services/auditLogService");
const { parsePagination, paginationMeta } = require("../utils/pagination");
const { sendVerificationEmail } = require("../utils/emailService");

function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Admin can create STAFF accounts only
const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    throw AppError.conflict("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const rawToken = generateRawToken();
  const hashedVerificationToken = hashToken(rawToken);
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "STAFF",
    emailVerified: false,
    emailVerificationToken: hashedVerificationToken,
    emailVerificationExpires: verificationExpires,
  });

  await sendVerificationEmail(email, name, rawToken);

  logActivity(req, "CREATE_STAFF_ACCOUNT",
    { type: "User", id: user._id, email: user.email, name: user.name },
    { role: "STAFF" }
  );

  res.status(201).json(successResponse(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
    "Staff account created. Verification email sent."
  ));
});

// Admin can list all users with filters
const listUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  
  const query = {};
  
  // Filter by role
  if (role && ['USER', 'STAFF', 'ADMIN'].includes(role.toUpperCase())) {
    query.role = role.toUpperCase();
  }
  
  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await User.countDocuments(query);
  
  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.json(successResponse({
    users,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
});

// Admin can enable/disable users
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { active } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  // Prevent disabling own account
  if (user._id.toString() === req.user.id) {
    throw AppError.badRequest('BAD_REQUEST', 'You cannot disable your own account');
  }

  user.active = active;
  await user.save();

  logActivity(req, "TOGGLE_USER_STATUS",
    { type: "User", id: user._id, email: user.email, name: user.name },
    { active }
  );

  res.json(successResponse(
    {
      id: user._id,
      email: user.email,
      active: user.active
    },
    `User account ${active ? 'enabled' : 'disabled'} successfully`
  ));
});

// Get admin dashboard stats (enriched with analytics)
const getAdminStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalStaff, totalAdmins, activeUsers] = await Promise.all([
    User.countDocuments({ role: 'USER' }),
    User.countDocuments({ role: 'STAFF' }),
    User.countDocuments({ role: 'ADMIN' }),
    User.countDocuments({ role: 'USER', active: true }),
  ]);

  // Average match score from all comparisons
  const matchScoreAgg = await Comparison.aggregate([
    { $group: { _id: null, avgScore: { $avg: '$matchScore' } } },
  ]);
  const avgMatchScore = matchScoreAgg.length > 0
    ? Math.round(matchScoreAgg[0].avgScore * 10) / 10
    : 0;

  // Top 5 demanding skills & common gaps
  const [skillDemand, commonGaps] = await Promise.all([
    analyticsService.getSkillDemandStats(),
    analyticsService.getCommonGaps(5),
  ]);

  const recentUsers = await User.find({ role: 'USER' })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email role createdAt active');

  res.json(successResponse({
    totalUsers,
    totalStaff,
    totalAdmins,
    activeUsers,
    avgMatchScore,
    topSkills: skillDemand.top.slice(0, 5),
    leastSkills: skillDemand.least.slice(0, 5),
    commonGaps: commonGaps.slice(0, 5),
    recentUsers,
  }));
});

// Admin can permanently delete a job seeker or staff account
const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  // Only allow deleting USER or STAFF role accounts
  if (!['USER', 'STAFF'].includes(user.role)) {
    throw AppError.badRequest('BAD_REQUEST', 'Admin accounts cannot be deleted from this endpoint');
  }

  // Prevent deleting own account
  if (user._id.toString() === req.user.id) {
    throw AppError.badRequest('BAD_REQUEST', 'You cannot delete your own account');
  }

  await User.findByIdAndDelete(userId);

  logActivity(req, "DELETE_USER",
    { type: "User", id: user._id, email: user.email, name: user.name },
    { role: user.role }
  );

  res.json(successResponse(null, `Account for ${user.name} has been permanently deleted`));
});

// Get paginated audit logs with optional filters
const getAuditLogs = asyncHandler(async (req, res) => {
  const { action, actorEmail, from, to } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const filter = {};
  if (action) filter.action = action.toUpperCase();
  if (actorEmail) filter.actorEmail = { $regex: actorEmail, $options: "i" };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json(successResponse({ logs, pagination: paginationMeta(total, page, limit) }));
});

module.exports = {
  createStaff,
  listUsers,
  toggleUserStatus,
  getAdminStats,
  deleteUser,
  getAuditLogs,
};
