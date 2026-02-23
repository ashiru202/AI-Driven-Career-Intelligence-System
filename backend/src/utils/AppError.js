// Custom Application Error class for consistent error handling

class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(code, message, details = null) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'Unauthorized', details = null) {
    return new AppError(401, 'UNAUTHORIZED', message, details);
  }

  static forbidden(message = 'Forbidden', details = null) {
    return new AppError(403, 'FORBIDDEN', message, details);
  }

  static notFound(message = 'Resource not found', details = null) {
    return new AppError(404, 'NOT_FOUND', message, details);
  }

  static conflict(message, details = null) {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static internal(message = 'Internal server error', details = null) {
    return new AppError(500, 'INTERNAL_ERROR', message, details);
  }

  static validationError(message, details = null) {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }
}

module.exports = AppError;
