const { errorResponse } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle operational errors (AppError instances)
  if (err.isOperational) {
    return res.status(statusCode).json(errorResponse(code, message, details));
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map(e => e.message);
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'Duplicate entry';
    const field = Object.keys(err.keyValue)[0];
    details = `${field} already exists`;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  }

  // Log error for debugging (exclude in production or use proper logger)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Don't expose stack traces in production
  return res.status(statusCode).json(errorResponse(code, message, details));
};

// Async wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  asyncHandler
};
