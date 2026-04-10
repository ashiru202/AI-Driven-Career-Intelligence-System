const rateLimit = require('express-rate-limit');

/**
 * Strict limiter for authentication endpoints.
 * Prevents brute-force login/register attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // raised from 10 → 100 for dev
  standardHeaders: true,
  legacyHeaders: false,
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
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,                 // raised from 300 → 2000 for dev
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
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,                  // raised from 10 → 100 for dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Upload limit reached. You can upload up to 100 resumes per hour'
    }
  }
});

/**
 * Extension limiter — for browser extension API endpoints.
 * Allow frequent comparisons but prevent abuse.
 */
const extensionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 requests per 15 minutes (2 per minute)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many comparison requests. Please try again after 15 minutes'
    }
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});

module.exports = { authLimiter, generalLimiter, uploadLimiter, extensionLimiter };

