/**
 * Custom Application Error class
 * Extends the built-in Error class to provide additional functionality
 * for handling different types of errors in the application
 */
class AppError extends Error {
  /**
   * Creates an instance of AppError
   * @param {string} message - The error message
   * @param {number} statusCode - HTTP status code
   * @param {Array|Object} details - Additional error details or validation errors
   * @param {boolean} isOperational - Whether this is an operational error
   */
  constructor(message, statusCode = 500, details = null, isOperational = true) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format for API responses
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    const errorObj = {
      success: false,
      status: this.status,
      message: this.message,
      timestamp: this.timestamp
    };

    // Include details if present (validation errors, etc.)
    if (this.details) {
      errorObj.details = this.details;
    }

    // Include stack trace in development mode
    if (process.env.NODE_ENV === 'development') {
      errorObj.stack = this.stack;
    }

    return errorObj;
  }

  /**
   * Check if error is a client error (4xx)
   * @returns {boolean}
   */
  isClientError() {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is a server error (5xx)
   * @returns {boolean}
   */
  isServerError() {
    return this.statusCode >= 500;
  }

  /**
   * Static method to create a 400 Bad Request error
   * @param {string} message - Error message
   * @param {Array|Object} details - Additional details
   * @returns {AppError}
   */
  static badRequest(message = 'Bad Request', details = null) {
    return new AppError(message, 400, details);
  }

  /**
   * Static method to create a 401 Unauthorized error
   * @param {string} message - Error message
   * @returns {AppError}
   */
  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  /**
   * Static method to create a 403 Forbidden error
   * @param {string} message - Error message
   * @returns {AppError}
   */
  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  /**
   * Static method to create a 404 Not Found error
   * @param {string} message - Error message
   * @returns {AppError}
   */
  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  /**
   * Static method to create a 409 Conflict error
   * @param {string} message - Error message
   * @returns {AppError}
   */
  static conflict(message = 'Conflict') {
    return new AppError(message, 409);
  }

  /**
   * Static method to create a 422 Unprocessable Entity error
   * @param {string} message - Error message
   * @param {Array|Object} details - Validation details
   * @returns {AppError}
   */
  static unprocessableEntity(message = 'Unprocessable Entity', details = null) {
    return new AppError(message, 422, details);
  }

  /**
   * Static method to create a 429 Too Many Requests error
   * @param {string} message - Error message
   * @returns {AppError}
   */
  static tooManyRequests(message = 'Too Many Requests') {
    return new AppError(message, 429);
  }

  /**
   * Static method to create a 500 Internal Server Error
   * @param {string} message - Error message
   * @returns {AppError}
   */
  static internalServer(message = 'Internal Server Error') {
    return new AppError(message, 500);
  }

  /**
   * Static method to create a 503 Service Unavailable error
   * @param {string} message - Error message
   * @returns {AppError}
   */
  static serviceUnavailable(message = 'Service Unavailable') {
    return new AppError(message, 503);
  }

  /**
   * Static method to create validation error
   * @param {Array} errors - Array of validation errors
   * @param {string} message - General error message
   * @returns {AppError}
   */
  static validationError(errors, message = 'Validation failed') {
    return new AppError(message, 400, errors);
  }

  /**
   * Static method to create authentication error
   * @param {string} message - Error message
   * @returns {AppError}
   */
  static authenticationError(message = 'Authentication failed') {
    return new AppError(message, 401);
  }

  /**
   * Static method to create authorization error
   * @param {string} message - Error message
   * @returns {AppError}
   */
  static authorizationError(message = 'Authorization failed') {
    return new AppError(message, 403);
  }

  /**
   * Static method to create database error
   * @param {string} message - Error message
   * @param {Object} details - Database error details
   * @returns {AppError}
   */
  static databaseError(message = 'Database operation failed', details = null) {
    return new AppError(message, 500, details);
  }

  /**
   * Static method to create external service error
   * @param {string} service - Service name
   * @param {string} message - Error message
   * @returns {AppError}
   */
  static externalServiceError(service, message = 'External service error') {
    return new AppError(`${service}: ${message}`, 503);
  }

  /**
   * Static method to wrap and convert unknown errors
   * @param {Error} error - Original error
   * @param {string} defaultMessage - Default message if error message is not available
   * @returns {AppError}
   */
  static wrap(error, defaultMessage = 'An unexpected error occurred') {
    if (error instanceof AppError) {
      return error;
    }

    // Handle specific error types
    if (error.name === 'ValidationError') {
      // Mongoose validation error
      const details = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return new AppError('Validation failed', 400, details);
    }

    if (error.name === 'CastError') {
      // Mongoose cast error (invalid ObjectId, etc.)
      return new AppError('Invalid data format', 400);
    }

    if (error.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return new AppError(`${field} already exists`, 409);
    }

    if (error.name === 'JsonWebTokenError') {
      return new AppError('Invalid token', 401);
    }

    if (error.name === 'TokenExpiredError') {
      return new AppError('Token expired', 401);
    }

    // Default wrap
    return new AppError(
      error.message || defaultMessage,
      error.statusCode || 500,
      process.env.NODE_ENV === 'development' ? { originalError: error.stack } : null,
      false // Not operational since it's unexpected
    );
  }
}

export default AppError;
