import jwt from 'jsonwebtoken';
import { asyncHandler, AppError } from './errorMiddleware.js';
import User from '../models/User.js';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
// import jwt from 'jsonwebtoken';
// import asyncHandler from 'express-async-handler';
// import { User } from '../models/User.js';
// import AppError from '../utils/appError.js';
// import redisUtils from '../utils/redisUtils.js';
// import logger from '../utils/logger.js'; // optional: custom logging utility

export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Extract token from headers or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('[DEBUG] Token extracted from Authorization header:', token);
  } else if (req.cookies.token) {
    token = req.cookies.token;
    console.log('[DEBUG] Token extracted from cookie:', token);
  }

  if (!token) {
    console.warn('[WARN] No token provided in request');
    throw new AppError('Access denied. No token provided.', 401);
  }

  try {
    // 2. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[DEBUG] Token verified. Decoded payload:', decoded);

    // 3. Check token blacklist
    // const isBlacklisted = await redisUtils.get(`blacklist_${token}`);
    // if (isBlacklisted) {
    //   console.warn('[WARN] Token is blacklisted:', token);
    //   throw new AppError('Token has been invalidated', 401);
    // }

    // 4. Fetch user
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      console.warn('[WARN] User not found for token payload ID:', decoded.userId);
      throw new AppError('User not found', 401);
    }

    // 5. Check user status
    if (!user.isActive) {
      console.warn('[WARN] User account is deactivated:', user.email);
      throw new AppError('Account has been deactivated', 401);
    }

    if (user.isLocked) {
      console.warn('[WARN] User account is locked:', user.email);
      throw new AppError('Account is temporarily locked due to multiple failed login attempts', 423);
    }

    // 6. Attach user and token to request
    req.user = user;
    req.token = token;

    console.log('[DEBUG] Authentication successful for user:', user.email);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.error('[ERROR] JWT token expired');
      throw new AppError('Token has expired. Please log in again.', 401);
    } else if (error.name === 'JsonWebTokenError') {
      console.error('[ERROR] JWT token invalid');
      throw new AppError('Invalid token. Please log in again.', 401);
    } else {
      console.error('[ERROR] Authentication error:', error.message);
      throw error;
    }
  }
});


/**
 * Role-based Authorization Middleware
 * Restricts access based on user roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Access denied. Please authenticate first.', 401);
    }

    // Handle both array and rest parameter formats
    // If first argument is an array, use it; otherwise use all arguments
    const roleList = Array.isArray(roles[0]) ? roles[0] : roles;

    // Normalize the user role by trimming whitespace and converting to lowercase
    const userRole = (req.user.role || '').toString().trim().toLowerCase();
    const normalizedRoles = roleList.map(role => role.toString().trim().toLowerCase());

    console.log('[DEBUG] Authorization check - Required roles:', roleList);
    console.log('[DEBUG] Authorization check - Normalized required roles:', normalizedRoles);
    console.log('[DEBUG] Authorization check - User role (raw):', `"${req.user.role}"`);
    console.log('[DEBUG] Authorization check - User role (normalized):', `"${userRole}"`);
    console.log('[DEBUG] Authorization check - Role type:', typeof req.user.role);
    console.log('[DEBUG] Authorization check - Includes check:', normalizedRoles.includes(userRole));

    if (!normalizedRoles.includes(userRole)) {
      console.error('[ERROR] Role authorization failed');
      throw new AppError(
        `Access denied. Required role: ${roleList.join(' or ')}. Your role: ${req.user.role}`,
        403
      );
    }

    console.log('[DEBUG] Authorization successful');
    next();
  };
};

/**
 * Optional Authentication Middleware
 * Attaches user if token is present but doesn't require it
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id; // Support both userId and id fields
      const user = await User.findById(userId).select('-password');
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
        req.token = token;
      }
    } catch (error) {
      // Silently fail for optional auth
      console.log('Optional auth failed:', error.message);
    }
  }

  next();
});

/**
 * Account Ownership Middleware
 * Ensures user can only access their own resources
 */
export const requireOwnership = (resourceUserField = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('Access denied. Please authenticate first.', 401);
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if resource belongs to authenticated user
    const resourceUserId = req.params[resourceUserField] || req.body[resourceUserField];
    
    if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
      throw new AppError('Access denied. You can only access your own resources.', 403);
    }

    next();
  });
};

/**
 * Two-Factor Authentication Middleware
 * Requires 2FA verification for sensitive operations
 */
export const require2FA = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('Access denied. Please authenticate first.', 401);
  }

  if (req.user.twoFactorAuth.enabled) {
    const { twoFactorToken } = req.body;
    
    if (!twoFactorToken) {
      throw new AppError('Two-factor authentication token required', 400);
    }

    // Verify 2FA token (implementation depends on 2FA method)
    // This would integrate with authenticator apps, SMS, etc.
    const isValid = await verify2FAToken(req.user, twoFactorToken);
    
    if (!isValid) {
      throw new AppError('Invalid two-factor authentication token', 400);
    }
  }

  next();
});

/**
 * Rate Limiting Middleware for Authentication Routes
 */
export const authRateLimit = asyncHandler(async (req, res, next) => {
  // Rate limiting disabled (Redis removed)
  // In production, consider using express-rate-limit with memory store
  next();
});

/**
 * Email Verification Required Middleware
 */
export const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Access denied. Please authenticate first.', 401);
  }

  if (!req.user.emailVerification.isVerified) {
    throw new AppError('Email verification required. Please verify your email address.', 403);
  }

  next();
};

/**
 * Admin Only Middleware
 */
export const adminOnly = authorize('admin');

/**
 * Patient Only Middleware
 */
export const patientOnly = authorize('patient');

/**
 * Pharmacy Only Middleware
 */
export const pharmacyOnly = authorize('pharmacy');

/**
 * Patient or Pharmacy Middleware
 */
export const patientOrPharmacy = authorize('patient', 'pharmacy');

/**
 * Helper function to verify 2FA token
 * This would be implemented based on your 2FA provider
 */
const verify2FAToken = async (user, token) => {
  // Placeholder implementation
  // In a real app, this would verify with authenticator app, SMS service, etc.
  return true;
};

/**
 * Logout helper - adds token to blacklist
 */
export const blacklistToken = async (token) => {
  // Token blacklisting disabled (Redis removed)
  // In production, consider using a database table or memory store
  console.log('Token blacklisting disabled - Redis removed');
};

// Alias for backward compatibility
export const protect = authenticate;

export default {
  authenticate,
  protect,
  authorize,
  optionalAuth,
  requireOwnership,
  require2FA,
  authRateLimit,
  requireEmailVerification,
  adminOnly,
  patientOnly,
  pharmacyOnly,
  patientOrPharmacy,
  blacklistToken
};
