const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const AppError = require("../utils/AppError");
const { asyncHandler } = require("../middleware/errorMiddleware");

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Check if user already exists
  const exists = await User.findOne({ email });
  if (exists) {
    throw AppError.conflict('User with this email already exists');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the user in MongoDB
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: (role || "USER").toUpperCase()
  });

  // Generate token for immediate login
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(201).json(successResponse(
    { 
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    },
    'User registered successfully'
  ));
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw AppError.unauthorized('Invalid credentials');
  }

  // Check if account is active
  if (!user.active) {
    throw AppError.forbidden('Your account has been disabled', 'ACCOUNT_DISABLED');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw AppError.unauthorized('Invalid credentials');
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json(successResponse({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  }));
});

