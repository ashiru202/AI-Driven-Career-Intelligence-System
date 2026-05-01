const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const StaffApplication = require("../models/StaffApplication");
const { successResponse } = require("../utils/responseHelper");
const AppError = require("../utils/AppError");
const { asyncHandler } = require("../middleware/errorMiddleware");
const Comparison = require("../models/Comparison");
const analyticsService = require("../services/analyticsService");
const AuditLog = require("../models/AuditLog");
const { logActivity } = require("../services/auditLogService");
const { parsePagination, paginationMeta } = require("../utils/pagination");
const { sendStaffInviteEmail } = require("../utils/emailService");

function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function createInvitedStaffUser({ name, email, staffProfile = null }) {
  // Admin should never set or know staff passwords.
  // We generate a random secret and require the staff member to set their own password via invite link.
  const generatedPassword = crypto.randomBytes(48).toString("hex");
  const hashedPassword = await bcrypt.hash(generatedPassword, 10);
  const rawInviteToken = generateRawToken();
  const hashedInviteToken = hashToken(rawInviteToken);
  const inviteExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const payload = {
    name,
    email,
    password: hashedPassword,
    role: "STAFF",
    emailVerified: false,
    passwordResetToken: hashedInviteToken,
    passwordResetExpires: inviteExpires,
  };

  if (staffProfile) {
    payload.staffProfile = staffProfile;
  }

  const user = await User.create(payload);

  return {
    user,
    rawInviteToken,
    inviteExpires,
  };
}

function mapStaffProfileFromApplication(application) {
  return {
    phone: application.phone,
    currentRole: application.currentRole,
    yearsExperience: application.yearsExperience,
    expertiseAreas: Array.isArray(application.expertiseAreas)
      ? application.expertiseAreas
      : [],
    motivation: application.motivation,
    linkedInUrl: application.linkedInUrl || "",
    portfolioUrl: application.portfolioUrl || "",
  };
}

// Admin can create STAFF accounts only
const createStaff = asyncHandler(async (req, res) => {
  const { name, email, nicOrTempPassword } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw AppError.conflict("A user account already exists with this email");
  }

  const hashedPassword = await bcrypt.hash(nicOrTempPassword, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "STAFF",
    active: true,
    emailVerified: true,
    mustChangePassword: true,
    createdByAdmin: true,
  });

  logActivity(
    req,
    "CREATE_STAFF_ACCOUNT",
    { type: "User", id: user._id, email: user.email, name: user.name },
    { createdByAdmin: true, mustChangePassword: true }
  );

  res.status(201).json(
    successResponse(
      {
        staff: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          mustChangePassword: user.mustChangePassword,
          createdByAdmin: user.createdByAdmin,
        },
      },
      "Staff account created. Staff can log in with email and temporary password, then must change password."
    )
  );
});

// Admin can list staff applications with filters
const listStaffApplications = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 20);

  const query = {};
  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(String(status).toUpperCase())) {
    query.status = String(status).toUpperCase();
  }

  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { currentRole: { $regex: search, $options: "i" } },
    ];
  }

  const [applications, total] = await Promise.all([
    StaffApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reviewedBy", "name email role")
      .populate("invitedUser", "name email role")
      .lean(),
    StaffApplication.countDocuments(query),
  ]);

  res.json(
    successResponse({
      applications,
      pagination: paginationMeta(total, page, limit),
    })
  );
});

// Admin can approve or reject staff applications
const reviewStaffApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { decision, reviewNotes = "" } = req.body;

  const application = await StaffApplication.findById(applicationId);
  if (!application) {
    throw AppError.notFound("Staff application not found");
  }

  if (application.status !== "PENDING") {
    throw AppError.badRequest("BAD_REQUEST", "Only pending applications can be reviewed");
  }

  if (decision === "APPROVE") {
    const existingUser = await User.findOne({ email: application.email });
    if (existingUser) {
      throw AppError.conflict("A user account already exists with this applicant email");
    }

    const { user, rawInviteToken, inviteExpires } = await createInvitedStaffUser({
      name: application.fullName,
      email: application.email,
      staffProfile: mapStaffProfileFromApplication(application),
    });

    await sendStaffInviteEmail(user.email, user.name, rawInviteToken);

    application.status = "APPROVED";
    application.reviewNotes = reviewNotes;
    application.reviewedAt = new Date();
    application.reviewedBy = req.user.id;
    application.invitedUser = user._id;
    await application.save();

    logActivity(
      req,
      "APPROVE_STAFF_APPLICATION",
      { type: "StaffApplication", id: application._id, email: application.email, name: application.fullName },
      { invitedUserId: user._id, inviteExpiresAt: inviteExpires }
    );

    return res.json(
      successResponse(
        {
          application: {
            id: application._id,
            status: application.status,
            reviewedAt: application.reviewedAt,
          },
          staff: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        "Application approved. Invite email sent to the staff applicant."
      )
    );
  }

  application.status = "REJECTED";
  application.reviewNotes = reviewNotes;
  application.reviewedAt = new Date();
  application.reviewedBy = req.user.id;
  await application.save();

  logActivity(
    req,
    "REJECT_STAFF_APPLICATION",
    { type: "StaffApplication", id: application._id, email: application.email, name: application.fullName },
    { reviewNotes }
  );

  res.json(
    successResponse(
      {
        application: {
          id: application._id,
          status: application.status,
          reviewedAt: application.reviewedAt,
          reviewNotes: application.reviewNotes,
        },
      },
      "Application rejected successfully"
    )
  );
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
  const roleFilter = (role) => ({ role: { $regex: new RegExp(`^${role}$`, 'i') } });

  const [totalUsers, totalStaff, totalAdmins, activeUsers] = await Promise.all([
    User.countDocuments(roleFilter('USER')),
    User.countDocuments(roleFilter('STAFF')),
    User.countDocuments(roleFilter('ADMIN')),
    User.countDocuments({ ...roleFilter('USER'), active: true }),
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

  const normalizeActionKey = (value) => String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const inviteAliases = ["INVITE_STAFF_ACCOUNT", "INVITE_STAFF", "STAFF_INVITE", "CREATE_STAFF_INVITE"];

  const filter = {};
  if (action) {
    const normalizedAction = normalizeActionKey(action);

    if (normalizedAction === "INVITE_STAFF_ACCOUNT") {
      filter.action = {
        $regex: new RegExp(`^(${inviteAliases.join("|")})\\s*$`, "i"),
      };
    } else {
      const flexiblePattern = escapeRegex(normalizedAction).replace(/_/g, "[\\s_-]+");
      filter.action = { $regex: new RegExp(`^${flexiblePattern}\\s*$`, "i") };
    }
  }
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
  listStaffApplications,
  reviewStaffApplication,
  listUsers,
  toggleUserStatus,
  getAdminStats,
  deleteUser,
  getAuditLogs,
};
