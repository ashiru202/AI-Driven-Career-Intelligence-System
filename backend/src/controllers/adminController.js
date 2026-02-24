const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const AppError = require("../utils/AppError");
const { asyncHandler } = require("../middleware/errorMiddleware");
const Comparison = require("../models/Comparison");
const analyticsService = require("../services/analyticsService");

// Admin can create staff accounts
const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const exists = await User.findOne({ email });
  if (exists) {
    throw AppError.conflict('User with this email already exists');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create staff user
  const staff = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "STAFF"
  });

  res.status(201).json(successResponse(
    {
      id: staff._id,
      name: staff.name,
      email: staff.email,
      role: staff.role
    },
    'Staff account created successfully'
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

  res.json(successResponse(null, `Account for ${user.name} has been permanently deleted`));
});

module.exports = { 
  createStaff, 
  listUsers, 
  toggleUserStatus, 
  getAdminStats,
  deleteUser
};
