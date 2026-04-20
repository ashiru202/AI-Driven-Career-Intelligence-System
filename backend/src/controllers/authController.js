const crypto = require('crypto');
const User = require("../models/User");
const StaffApplication = require("../models/StaffApplication");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { successResponse } = require("../utils/responseHelper");
const AppError = require("../utils/AppError");
const { asyncHandler } = require("../middleware/errorMiddleware");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/emailService");
const { sendToUser } = require("../utils/sseManager");
const { logActivityWithActor } = require("../services/auditLogService");

// Helpers
function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function signAccessToken(userLike) {
  return jwt.sign(
    { id: userLike.id || userLike._id, role: userLike.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    throw AppError.conflict('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate email verification token
  const rawToken = generateRawToken();
  const hashedVerificationToken = hashToken(rawToken);
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'USER',
    emailVerified: false,
    emailVerificationToken: hashedVerificationToken,
    emailVerificationExpires: verificationExpires,
  });

  await sendVerificationEmail(email, name, rawToken);

  res.status(201).json(successResponse(
    { email: user.email },
    'Registration successful! Please check your email to verify your account.'
  ));
});

// POST /api/auth/staff-applications
exports.applyForStaff = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    currentRole,
    yearsExperience,
    expertiseAreas,
    motivation,
    linkedInUrl,
    portfolioUrl,
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw AppError.conflict('An account already exists with this email. Use a different email for staff application.');
  }

  const existingPending = await StaffApplication.findOne({ email, status: 'PENDING' });
  if (existingPending) {
    throw AppError.conflict('A pending staff application already exists for this email.');
  }

  const application = await StaffApplication.create({
    fullName,
    email,
    phone,
    currentRole,
    yearsExperience,
    expertiseAreas,
    motivation,
    linkedInUrl: linkedInUrl || '',
    portfolioUrl: portfolioUrl || '',
    status: 'PENDING',
  });

  logActivityWithActor(
    req,
    {
      email,
      name: fullName,
      role: "USER_REQUEST",
    },
    "SUBMIT_STAFF_APPLICATION",
    {
      type: "StaffApplication",
      id: application._id,
      email,
      name: fullName,
    },
    {
      source: "public_staff_application_form",
      currentRole: currentRole || "",
      yearsExperience: Number(yearsExperience || 0),
      expertiseAreasCount: Array.isArray(expertiseAreas)
        ? expertiseAreas.length
        : 0,
    }
  );

  const adminUsers = await User.find({ role: 'ADMIN', active: true }, '_id');
  const notification = {
    id: `staff_application_${String(application._id)}`,
    icon: 'ClipboardList',
    title: 'New staff application received',
    body: `${application.fullName} applied for staff (${application.currentRole}).`,
    link: '/staff-management',
    time: 'Just now',
    createdAt: application.createdAt,
  };

  (adminUsers || []).forEach((admin) => {
    sendToUser(String(admin._id), 'notification', notification);
  });

  res.status(201).json(
    successResponse(
      {
        applicationId: application._id,
        status: application.status,
      },
      'Staff application submitted successfully. Admin review is pending.'
    )
  );
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw AppError.unauthorized('Invalid credentials');
  }

  if (!user.active) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled');
  }

  if (!user.emailVerified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw AppError.unauthorized('Invalid credentials');
  }

  const token = signAccessToken(user);

  // Set JWT as an httpOnly cookie — JS cannot read this, eliminating XSS token theft
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",  // HTTPS only in production
    sameSite: "strict",                             // blocks cross-site request forgery
    maxAge: 7 * 24 * 60 * 60 * 1000,               // 7 days in ms
  });

  res.json(successResponse({
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  }));
});

// GET /api/auth/extension-token
exports.issueExtensionToken = asyncHandler(async (req, res) => {
  if (!req.user?.id || !req.user?.role) {
    throw AppError.unauthorized('Authentication required');
  }

  const token = signAccessToken(req.user);

  res.json(successResponse({
    token,
    tokenType: 'Bearer',
    expiresIn: '7d',
  }, 'Extension token issued successfully'));
});

// GET /api/auth/verify-email?token=...
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw AppError.badRequest('MISSING_TOKEN', 'Verification token is required');

  const hashedToken = hashToken(token);

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError(400, 'INVALID_TOKEN', 'Verification link is invalid or has expired');
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json(successResponse(null, 'Email verified successfully! You can now log in.'));
});

// POST /api/auth/resend-verification
exports.resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Always respond with success to avoid exposing whether the email is registered
  if (!user || user.emailVerified) {
    return res.json(successResponse(null, 'If that email is registered and unverified, a new verification email has been sent.'));
  }

  const rawToken = generateRawToken();
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  await sendVerificationEmail(email, user.name, rawToken);

  res.json(successResponse(null, 'If that email is registered and unverified, a new verification email has been sent.'));
});

// POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Always respond the same way (security: don't reveal whether email exists)
  if (user && user.emailVerified) {
    const rawToken = generateRawToken();
    user.passwordResetToken = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();
    await sendPasswordResetEmail(email, user.name, rawToken);
  }

  res.json(successResponse(null, 'If that email is registered, a password reset link has been sent.'));
});

// POST /api/auth/reset-password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token) throw AppError.badRequest('MISSING_TOKEN', 'Reset token is required');

  const hashedToken = hashToken(token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError(400, 'INVALID_TOKEN', 'Reset link is invalid or has expired');
  }

  user.password = await bcrypt.hash(password, 10);
  // Invite-based onboarding: completing password setup activates email verification.
  if (!user.emailVerified) {
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
  }
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json(successResponse(null, 'Password reset successfully. You can now log in with your new password.'));
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json(successResponse(null, 'Logged out successfully.'));
});
