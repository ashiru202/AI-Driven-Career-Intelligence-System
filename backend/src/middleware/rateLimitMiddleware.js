const rateLimit = require('express-rate-limit');

/**
 * Strict limiter for authentication endpoints.
 * Prevents brute-force login/register attacks.
 * 10 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,   // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders: false,     // Disable `X-RateLimit-*` headers
  message: {
    ok: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests from this IP, please try again after 15 minutes'
    }
  },
  skipSuccessfulRequests: false
});

/**
 * General API limiter for all other endpoints.
 * 300 requests per 15 minutes per IP.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests from this IP, please slow down'
    }
  }
});

/**
 * Upload limiter — resume uploads.
 * 10 uploads per hour per IP.
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Upload limit reached. You can upload up to 10 resumes per hour'
    }
  }
});

module.exports = { authLimiter, generalLimiter, uploadLimiter };
