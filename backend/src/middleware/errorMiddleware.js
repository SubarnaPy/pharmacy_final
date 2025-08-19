/**
 * Error handling middleware using ES6 modules and modern JavaScript
 */

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found middleware
 */
export const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error Details:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value for ${field}. Please use another value.`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map(error => error.message)
      .join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again.';
    error = new AppError(message, 401);
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large. Please upload a smaller file.';
    error = new AppError(message, 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field. Please check your file upload.';
    error = new AppError(message, 400);
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = 'Too many requests. Please try again later.';
    error = new AppError(message, 429);
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  const errorResponse = {
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: err 
      })
    }
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * Validation error formatter for express-validator
 */
export const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value
  }));
};

/**
 * Create standardized API response
 */
export const createResponse = (success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

/**
 * Success response helper
 */
export const successResponse = (res, message, data = null, statusCode = 200, meta = null) => {
  return res.status(statusCode).json(createResponse(true, message, data, meta));
};

/**
 * Error response helper
 */
export const errorResponse = (res, message, statusCode = 500, data = null) => {
  return res.status(statusCode).json(createResponse(false, message, data));
};
