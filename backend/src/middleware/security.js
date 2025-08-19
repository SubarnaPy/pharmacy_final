// Security Configuration and Middleware
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import compression from 'compression';
import { body, param, query, validationResult } from 'express-validator';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import AppError from '../utils/AppError.js';

// Rate limiting configurations
export const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General rate limiter (env-configurable)
// Defaults: 100 requests/15m in production, 1000 requests/15m in development
const GENERAL_WINDOW_MS = parseInt(process.env.GENERAL_RATE_LIMIT_WINDOW_MS || '', 10) || (15 * 60 * 1000);
const GENERAL_MAX = parseInt(process.env.GENERAL_RATE_LIMIT_MAX || '', 10) || (process.env.NODE_ENV === 'development' ? 1000 : 100);
export const generalLimiter = createRateLimiter(
  GENERAL_WINDOW_MS,
  GENERAL_MAX,
  'Too many requests from this IP, please try again later.'
);

// Auth rate limiter (env-configurable)
// Defaults: 5 attempts/15m in production, 50 attempts/15m in development
const AUTH_WINDOW_MS = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '', 10) || (15 * 60 * 1000);
const AUTH_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '', 10) || (process.env.NODE_ENV === 'development' ? 50 : 5);
export const authLimiter = createRateLimiter(
  AUTH_WINDOW_MS,
  AUTH_MAX,
  'Too many authentication attempts, please try again later.',
  true
);

// Password reset rate limiter - 3 attempts per hour
export const passwordResetLimiter = createRateLimiter(
  60 * 60 * 1000,
  3,
  'Too many password reset attempts, please try again later.'
);

// File upload rate limiter - 10 uploads per 5 minutes
export const uploadLimiter = createRateLimiter(
  5 * 60 * 1000,
  10,
  'Too many file uploads, please try again later.'
);

// API rate limiter - 1000 requests per hour for authenticated users
export const apiLimiter = createRateLimiter(
  60 * 60 * 1000,
  1000,
  'API rate limit exceeded, please try again later.'
);

// Helmet security configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://maps.googleapis.com'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.stripe.com', 'wss:', 'ws:'],
      frameSrc: ["'self'", 'https://js.stripe.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173'
    ];
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
});

// Input validation and sanitization middleware
export const validateAndSanitize = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }));
      
      return next(new AppError('Validation failed', 400, errorMessages));
    }
    
    next();
  };
};

// Common validation rules
export const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    
  phone: body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
    
  mongoId: param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
    
  positiveNumber: (field) => body(field)
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a positive number`),
    
  alphanumeric: (field) => body(field)
    .isAlphanumeric()
    .withMessage(`${field} must contain only letters and numbers`),
    
  url: (field) => body(field)
    .isURL()
    .withMessage(`${field} must be a valid URL`),
    
  dateISO: (field) => body(field)
    .isISO8601()
    .toDate()
    .withMessage(`${field} must be a valid date`)
};

// File validation middleware
export const validateFileUpload = (allowedTypes, maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next(new AppError('No file uploaded', 400));
    }
    
    const files = req.files || [req.file];
    
    for (const file of files) {
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400));
      }
      
      // Check file size
      if (file.size > maxSize) {
        return next(new AppError(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`, 400));
      }
      
      // Check for malicious file extensions
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.js', '.jar'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (dangerousExtensions.includes(fileExtension)) {
        return next(new AppError('File type not allowed for security reasons', 400));
      }
    }
    
    next();
  };
};

// SQL injection prevention (for any raw queries)
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove common SQL injection patterns
  const sqlInjectionPatterns = [
    /('|\\')|(;|(\/\*)|(\\*\/))|(\\x00)|(\\n)|(\\r)|(\\x1a)/gi,
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/gi,
    /(script|javascript|vbscript|onload|onerror|onclick)/gi
  ];
  
  let sanitized = input;
  sqlInjectionPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized.trim();
};

// XSS prevention for user content
export const sanitizeUserContent = (content) => {
  if (typeof content !== 'string') return content;
  
  // Remove script tags and javascript: protocols
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
};

// Data encryption utilities
export const encryptSensitiveData = (data, secretKey = process.env.ENCRYPTION_KEY) => {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

export const decryptSensitiveData = (encryptedData, secretKey = process.env.ENCRYPTION_KEY) => {
  const algorithm = 'aes-256-gcm';
  const decipher = crypto.createDecipher(algorithm, secretKey);
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Password strength validation
export const validatePasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
    noCommon: !isCommonPassword(password)
  };
  
  const strength = Object.values(checks).filter(Boolean).length;
  
  return {
    isValid: strength >= 5,
    strength: strength,
    checks: checks,
    score: Math.min(100, (strength / 6) * 100)
  };
};

// Common password blacklist (simplified - in production, use a comprehensive list)
const commonPasswords = [
  'password', '123456', 'password123', 'admin', 'qwerty',
  'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
];

const isCommonPassword = (password) => {
  return commonPasswords.includes(password.toLowerCase());
};

// Secure session configuration
export const sessionConfig = {
  name: 'pharmacare_session',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  }
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// IP whitelist/blacklist middleware
export const ipFilter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Blacklisted IPs (in production, use Redis or database)
  const blacklistedIPs = process.env.BLACKLISTED_IPS?.split(',') || [];
  
  if (blacklistedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
};

// Request logging for security monitoring
export const securityLogger = (req, res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    userId: req.user?.id || null
  };
  
  // Log suspicious activities
  const suspiciousPatterns = [
    /admin/i,
    /\.php$/,
    /\.asp$/,
    /\/wp-/,
    /\/etc\/passwd/,
    /base64/i,
    /javascript:/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || pattern.test(req.get('User-Agent') || '')
  );
  
  if (isSuspicious) {
    console.warn('Suspicious request detected:', logData);
    // In production, send to security monitoring service
  }
  
  next();
};

export default {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  apiLimiter,
  helmetConfig,
  corsConfig,
  validateAndSanitize,
  commonValidations,
  validateFileUpload,
  sanitizeInput,
  sanitizeUserContent,
  encryptSensitiveData,
  decryptSensitiveData,
  validatePasswordStrength,
  sessionConfig,
  securityHeaders,
  ipFilter,
  securityLogger
};
