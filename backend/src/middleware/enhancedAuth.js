// Enhanced Authentication Middleware with Security Features
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import AuditLogService from '../services/AuditLogService.js';
import { authLimiter } from './security.js';
import crypto from 'crypto';

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Set();

// Failed login attempt tracking (in production, use Redis)
const failedAttempts = new Map();

// Session fingerprinting for additional security
const generateSessionFingerprint = (req) => {
  const components = [
    req.get('User-Agent') || '',
    req.get('Accept-Language') || '',
    req.get('Accept-Encoding') || '',
    req.ip || ''
  ];
  
  return crypto.createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
};

// Enhanced JWT token verification
export const authenticateToken = async (req, res, next) => {
  try {
    let token;
    
    // Get token from header or cookie
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    if (!token) {
      await AuditLogService.logSecurityViolation('MISSING_AUTH_TOKEN', req);
      return next(new AppError('Access denied. No token provided.', 401));
    }
    
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      await AuditLogService.logSecurityViolation('BLACKLISTED_TOKEN_USED', req);
      return next(new AppError('Token has been revoked.', 401));
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token expiration with buffer
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp - now < 300) { // Token expires in less than 5 minutes
      // Log potential token hijacking attempt
      await AuditLogService.logSecurityViolation('NEAR_EXPIRED_TOKEN', req, null, {
        tokenExp: decoded.exp,
        currentTime: now,
        timeRemaining: decoded.exp - now
      });
    }
    
    // Get user from database
    const user = await User.findById(decoded.id).select('+isActive +lastLogin +securitySettings');
    
    if (!user) {
      await AuditLogService.logSecurityViolation('INVALID_USER_TOKEN', req, null, { userId: decoded.id });
      return next(new AppError('Token is invalid. User not found.', 401));
    }
    
    // Check if user account is active
    if (!user.isActive) {
      await AuditLogService.logSecurityViolation('INACTIVE_USER_ACCESS', req, user);
      return next(new AppError('Account has been deactivated.', 401));
    }
    
    // Check if user changed password after token was issued
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      await AuditLogService.logSecurityViolation('TOKEN_AFTER_PASSWORD_CHANGE', req, user);
      return next(new AppError('Password was changed. Please log in again.', 401));
    }
    
    // Session fingerprinting check
    const currentFingerprint = generateSessionFingerprint(req);
    if (decoded.fingerprint && decoded.fingerprint !== currentFingerprint) {
      await AuditLogService.logSecurityViolation('SESSION_FINGERPRINT_MISMATCH', req, user, {
        expectedFingerprint: decoded.fingerprint,
        actualFingerprint: currentFingerprint
      });
      
      // Allow but log suspicious activity
      console.warn(`Session fingerprint mismatch for user ${user.id} from IP ${req.ip}`);
    }
    
    // Check for concurrent sessions (if enabled)
    if (user.securitySettings?.singleSessionOnly && decoded.sessionId !== user.lastSessionId) {
      await AuditLogService.logSecurityViolation('CONCURRENT_SESSION_DETECTED', req, user);
      return next(new AppError('Another session is active. Please log in again.', 401));
    }
    
    // Update last activity
    user.lastActivity = new Date();
    await user.save({ validateBeforeSave: false });
    
    // Add user to request object
    req.user = user;
    req.token = token;
    req.sessionFingerprint = currentFingerprint;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      await AuditLogService.logSecurityViolation('INVALID_JWT_TOKEN', req, null, {
        error: error.message
      });
      return next(new AppError('Invalid token.', 401));
    } else if (error.name === 'TokenExpiredError') {
      await AuditLogService.logSecurityViolation('EXPIRED_JWT_TOKEN', req, null, {
        expiredAt: error.expiredAt
      });
      return next(new AppError('Token expired.', 401));
    }
    
    await AuditLogService.logSecurityViolation('AUTH_MIDDLEWARE_ERROR', req, null, {
      error: error.message
    });
    return next(new AppError('Authentication failed.', 401));
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      await AuditLogService.logSecurityViolation('AUTHORIZATION_WITHOUT_AUTH', req);
      return next(new AppError('Authentication required.', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      await AuditLogService.logSecurityViolation('INSUFFICIENT_PERMISSIONS', req, req.user, {
        requiredRoles: roles,
        userRole: req.user.role
      });
      return next(new AppError('Insufficient permissions.', 403));
    }
    
    next();
  };
};

// Enhanced login middleware with security features
export const secureLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const clientIP = req.ip;
    
    // Check for too many failed attempts from this IP
    const attempts = failedAttempts.get(clientIP) || { count: 0, lastAttempt: null };
    
    if (attempts.count >= 5) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      const lockoutTime = 15 * 60 * 1000; // 15 minutes
      
      if (timeSinceLastAttempt < lockoutTime) {
        await AuditLogService.logSecurityViolation('BRUTE_FORCE_ATTEMPT', req, null, {
          attempts: attempts.count,
          timeRemaining: lockoutTime - timeSinceLastAttempt
        });
        
        return next(new AppError('Too many failed attempts. Try again later.', 429));
      } else {
        // Reset attempts after lockout period
        failedAttempts.delete(clientIP);
      }
    }
    
    // Find user and include password for verification
    const user = await User.findOne({ email }).select('+password +loginAttempts +accountLockUntil +isActive');
    
    if (!user) {
      // Record failed attempt
      attempts.count++;
      attempts.lastAttempt = Date.now();
      failedAttempts.set(clientIP, attempts);
      
      await AuditLogService.logAuthEvent('AUTH_LOGIN_FAILED', null, req, {
        email,
        reason: 'USER_NOT_FOUND',
        ipAddress: clientIP
      });
      
      return next(new AppError('Invalid credentials.', 401));
    }
    
    // Check if account is locked
    if (user.accountLockUntil && user.accountLockUntil > Date.now()) {
      await AuditLogService.logSecurityViolation('LOCKED_ACCOUNT_ACCESS', req, user);
      return next(new AppError('Account is temporarily locked.', 423));
    }
    
    // Check if account is active
    if (!user.isActive) {
      await AuditLogService.logSecurityViolation('INACTIVE_ACCOUNT_LOGIN', req, user);
      return next(new AppError('Account has been deactivated.', 401));
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.accountLockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await AuditLogService.logSecurityViolation('ACCOUNT_LOCKED', req, user, {
          attempts: user.loginAttempts
        });
      }
      
      await user.save({ validateBeforeSave: false });
      
      // Record failed attempt
      attempts.count++;
      attempts.lastAttempt = Date.now();
      failedAttempts.set(clientIP, attempts);
      
      await AuditLogService.logAuthEvent('AUTH_LOGIN_FAILED', user, req, {
        reason: 'INVALID_PASSWORD',
        attempts: user.loginAttempts
      });
      
      return next(new AppError('Invalid credentials.', 401));
    }
    
    // Reset failed attempts on successful login
    failedAttempts.delete(clientIP);
    user.loginAttempts = 0;
    user.accountLockUntil = undefined;
    user.lastLogin = new Date();
    
    // Generate session fingerprint
    const fingerprint = generateSessionFingerprint(req);
    
    // Generate session ID for concurrent session control
    const sessionId = crypto.randomUUID();
    user.lastSessionId = sessionId;
    
    await user.save({ validateBeforeSave: false });
    
    // Generate JWT token with additional security claims
    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: user.role,
      fingerprint,
      sessionId,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
    
    // Log successful login
    await AuditLogService.logAuthEvent('AUTH_LOGIN_SUCCESS', user, req, {
      sessionId,
      fingerprint
    });
    
    // Add user and token to request
    req.user = user;
    req.token = token;
    req.sessionId = sessionId;
    
    next();
  } catch (error) {
    await AuditLogService.logSecurityViolation('LOGIN_MIDDLEWARE_ERROR', req, null, {
      error: error.message
    });
    return next(new AppError('Login failed.', 500));
  }
};

// Token blacklisting for logout
export const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  
  // In production, set expiration in Redis
  // redis.setex(token, tokenExpirationTime, 'blacklisted');
};

// Clear expired tokens from blacklist (cleanup job)
export const cleanupBlacklist = () => {
  // In production, this would be handled by Redis TTL
  // For in-memory implementation, this is a simplified version
  console.log('Cleaning up token blacklist...');
};

// Two-factor authentication middleware
export const require2FA = async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }
  
  // Check if 2FA is enabled for user
  if (req.user.twoFactorEnabled) {
    const { twoFactorCode } = req.body;
    
    if (!twoFactorCode) {
      return next(new AppError('Two-factor authentication code required.', 400));
    }
    
    // Verify 2FA code (implementation depends on 2FA method)
    const isValid = await req.user.verify2FACode(twoFactorCode);
    
    if (!isValid) {
      await AuditLogService.logSecurityViolation('INVALID_2FA_CODE', req, req.user);
      return next(new AppError('Invalid two-factor authentication code.', 401));
    }
    
    await AuditLogService.logAuthEvent('AUTH_2FA_SUCCESS', req.user, req);
  }
  
  next();
};

// API key authentication for service-to-service communication
export const authenticateAPIKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      await AuditLogService.logSecurityViolation('MISSING_API_KEY', req);
      return next(new AppError('API key required.', 401));
    }
    
    // Validate API key format
    if (!/^[a-zA-Z0-9]{32,}$/.test(apiKey)) {
      await AuditLogService.logSecurityViolation('INVALID_API_KEY_FORMAT', req);
      return next(new AppError('Invalid API key format.', 401));
    }
    
    // In production, validate against database or cache
    const validAPIKeys = process.env.VALID_API_KEYS?.split(',') || [];
    
    if (!validAPIKeys.includes(apiKey)) {
      await AuditLogService.logSecurityViolation('INVALID_API_KEY', req);
      return next(new AppError('Invalid API key.', 401));
    }
    
    // Log API access
    await AuditLogService.log({
      eventType: 'API_ACCESS',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      action: 'API_KEY_AUTH',
      description: 'API key authentication successful',
      requestData: {
        method: req.method,
        url: req.originalUrl
      }
    });
    
    req.apiKeyAuth = true;
    next();
  } catch (error) {
    await AuditLogService.logSecurityViolation('API_KEY_AUTH_ERROR', req, null, {
      error: error.message
    });
    return next(new AppError('API key authentication failed.', 500));
  }
};

export default {
  authenticateToken,
  authorize,
  secureLogin,
  blacklistToken,
  cleanupBlacklist,
  require2FA,
  authenticateAPIKey
};
