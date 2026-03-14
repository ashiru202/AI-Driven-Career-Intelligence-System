const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { errorResponse } = require("../utils/responseHelper");

// Verify JWT and attach user to req
const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // Primary: httpOnly cookie (browser clients)
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    // Fallback: Authorization header (API clients, automated tests)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'No token provided'));
    }

    if (!process.env.JWT_SECRET) {
      throw AppError.internal('Server misconfigured: JWT_SECRET missing');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      if (e.name === "TokenExpiredError") {
        return res.status(401).json(errorResponse('TOKEN_EXPIRED', 'Token has expired'));
      }
      return res.status(401).json(errorResponse('INVALID_TOKEN', 'Invalid token'));
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'User not found'));
    }

    // Check if user account is active
    if (!user.active) {
      return res.status(403).json(errorResponse('ACCOUNT_DISABLED', 'Your account has been disabled'));
    }

    // Attach user info to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Role-based access control middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(errorResponse('FORBIDDEN', 'You do not have permission to access this resource'));
    }

    next();
  };
};

// Legacy middleware for backward compatibility
const authMiddleware = (allowedRoles = []) => {
  return async (req, res, next) => {
    await requireAuth(req, res, async () => {
      if (allowedRoles.length > 0) {
        requireRole(...allowedRoles)(req, res, next);
      } else {
        next();
      }
    });
  };
};

module.exports = {
  requireAuth,
  requireRole,
  authMiddleware
};
