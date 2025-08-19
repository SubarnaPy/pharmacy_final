import rateLimit from 'express-rate-limit';

console.log('📝 Using memory store for rate limiting (Redis removed)');

/**
 * Create rate limiter with optional Redis store
 * @param {Object} options - Rate limiting options
 * @returns {Function} - Express rate limiting middleware
 */
const createRateLimiter = (options) => {
  const config = {
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options.max || 100, // Default limit
    message: {
      success: false,
      error: options.message || 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  };

  // Using memory store (Redis removed)
  console.log(`📝 Using memory store for rate limiter: ${options.prefix || 'default'}`);

  return rateLimit(config);
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const rateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 10000, // 150 minutes
  max: 1000,
  message: 'Too many API requests, please try again later',
  prefix: 'api'
});

/**
 * Authentication rate limiter
 * 5 login attempts per 15 minutes per IP
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  prefix: 'auth',
  skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Registration rate limiter
 * 3 registration attempts per hour per IP
 */
export const registrationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many registration attempts, please try again later',
  prefix: 'register'
});

/**
 * Prescription processing rate limiter
 * 20 prescription uploads per hour per user
 */
export const prescriptionRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many prescription uploads, please try again later',
  prefix: 'prescription',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.user?.id || req.ip;
  }
});

/**
 * Password reset rate limiter
 * 3 password reset attempts per hour per IP
 */
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again later',
  prefix: 'password-reset'
});

/**
 * Email verification rate limiter
 * 5 verification emails per hour per IP
 */
export const emailVerificationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many email verification requests, please try again later',
  prefix: 'email-verify'
});

/**
 * Search rate limiter
 * 100 searches per 10 minutes per user
 */
export const searchRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100,
  message: 'Too many search requests, please try again later',
  prefix: 'search',
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

/**
 * File upload rate limiter
 * 50 file uploads per hour per user
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many file uploads, please try again later',
  prefix: 'upload',
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

/**
 * Admin operations rate limiter
 * 200 admin operations per hour per admin user
 */
export const adminRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200,
  message: 'Too many admin operations, please try again later',
  prefix: 'admin',
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting if user is not an admin
    return !req.user || !['admin', 'super_admin'].includes(req.user.role);
  }
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per hour per IP
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many sensitive operation requests, please try again later',
  prefix: 'strict'
});

/**
 * Dynamic rate limiter that adjusts based on user role
 * @param {Object} limits - Role-based limits
 * @returns {Function} - Express middleware
 */
export const dynamicRateLimiter = (limits = {}) => {
  const defaultLimits = {
    guest: { max: 10, windowMs: 15 * 60 * 1000 },
    user: { max: 50, windowMs: 15 * 60 * 1000 },
    pharmacist: { max: 100, windowMs: 15 * 60 * 1000 },
    admin: { max: 200, windowMs: 15 * 60 * 1000 }
  };

  const roleLimits = { ...defaultLimits, ...limits };

  return (req, res, next) => {
    const userRole = req.user?.role || 'guest';
    const limit = roleLimits[userRole] || roleLimits.guest;

    const limiter = createRateLimiter({
      ...limit,
      prefix: `dynamic-${userRole}`,
      keyGenerator: (req) => {
        return req.user?.id || req.ip;
      }
    });

    limiter(req, res, next);
  };
};

/**
 * Create custom rate limiter for specific endpoints
 * @param {Object} options - Custom rate limiting options
 * @returns {Function} - Express middleware
 */
export const customRateLimiter = (options) => {
  return createRateLimiter(options);
};

/**
 * Rate limiting bypass for testing and development
 */
export const bypassRateLimit = (req, res, next) => {
  if (process.env.NODE_ENV === 'test' || 
      (process.env.NODE_ENV === 'development' && process.env.BYPASS_RATE_LIMIT === 'true')) {
    return next();
  }
  
  // Apply default rate limiting in other environments
  rateLimiter(req, res, next);
};

/**
 * Get rate limiting status for a specific key
 * @param {string} key - Rate limiting key
 * @param {string} prefix - Rate limiting prefix
 * @returns {Promise<Object>} - Rate limiting status
 */
export const getRateLimitStatus = async (key, prefix = 'default') => {
  return { available: false, message: 'Rate limiting status not available (Redis removed)' };
};

/**
 * Clear rate limiting for a specific key (admin function)
 * @param {string} key - Rate limiting key
 * @param {string} prefix - Rate limiting prefix
 * @returns {Promise<boolean>} - Success status
 */
export const clearRateLimit = async (key, prefix = 'default') => {
  console.log('Rate limit clearing not available (Redis removed)');
  return false;
};

export default {
  rateLimiter,
  authRateLimiter,
  registrationRateLimiter,
  prescriptionRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
  searchRateLimiter,
  uploadRateLimiter,
  adminRateLimiter,
  strictRateLimiter,
  dynamicRateLimiter,
  customRateLimiter,
  bypassRateLimit,
  getRateLimitStatus,
  clearRateLimit
};
