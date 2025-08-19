import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

/**
 * Password hashing utilities using bcrypt
 */
export const passwordUtils = {
  /**
   * Hash a password with bcrypt
   */
  hash: async (password) => {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const salt = await bcrypt.genSalt(rounds);
    return await bcrypt.hash(password, salt);
  },

  /**
   * Compare password with hash
   */
  compare: async (password, hash) => {
    return await bcrypt.compare(password, hash);
  },

  /**
   * Validate password strength
   */
  validate: (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Generate secure random password
   */
  generate: (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }
};

/**
 * JWT token utilities
 */
export const tokenUtils = {
  /**
   * Generate access token
   */
  generateAccessToken: (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });
  },

  /**
   * Generate refresh token
   */
  generateRefreshToken: (payload) => {
    return jwt.sign(
      { ...payload, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
    );
  },

  /**
   * Verify token
   */
  verify: (token, secret = process.env.JWT_SECRET) => {
    return jwt.verify(token, secret);
  },

  /**
   * Decode token without verification
   */
  decode: (token) => {
    return jwt.decode(token);
  },

  /**
   * Get token expiration time
   */
  getExpiration: (token) => {
    const decoded = jwt.decode(token);
    return decoded ? new Date(decoded.exp * 1000) : null;
  },

  /**
   * Check if token is expired
   */
  isExpired: (token) => {
    const expiration = tokenUtils.getExpiration(token);
    return expiration ? expiration < new Date() : true;
  }
};

/**
 * Two-Factor Authentication utilities
 */
export const twoFactorUtils = {
  /**
   * Generate 2FA secret
   */
  generateSecret: (userEmail, serviceName = 'Pharmacy System') => {
    return speakeasy.generateSecret({
      name: userEmail,
      issuer: serviceName,
      length: 32
    });
  },

  /**
   * Generate QR code for 2FA setup
   */
  generateQRCode: async (secret) => {
    try {
      return await qrcode.toDataURL(secret.otpauth_url);
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  },

  /**
   * Verify 2FA token
   */
  verifyToken: (token, secret) => {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow for time drift
    });
  },

  /**
   * Generate backup codes
   */
  generateBackupCodes: (count = 10) => {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  },

  /**
   * Generate emergency access code
   */
  generateEmergencyCode: () => {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }
};

/**
 * Session management utilities
 */
export const sessionUtils = {
  /**
   * Generate session ID
   */
  generateSessionId: () => {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Generate secure random token
   */
  generateSecureToken: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Generate verification token with expiry
   */
  generateVerificationToken: (expiryHours = 24) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    
    return { token, expires };
  },

  /**
   * Generate password reset token
   */
  generatePasswordResetToken: () => {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    return { token, expires };
  },

  /**
   * Hash sensitive data
   */
  hashSensitiveData: (data) => {
    return crypto.createHash('sha256').update(data).digest('hex');
  },

  /**
   * Generate CSRF token
   */
  generateCSRFToken: () => {
    return crypto.randomBytes(32).toString('hex');
  }
};

/**
 * Input validation utilities
 */
export const validationUtils = {
  /**
   * Validate email format
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number
   */
  isValidPhone: (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  },

  /**
   * Sanitize input to prevent injection attacks
   */
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  },

  /**
   * Validate date of birth
   */
  isValidDateOfBirth: (dateOfBirth) => {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    
    return age >= 13 && age <= 120; // Reasonable age range
  },

  /**
   * Validate role
   */
  isValidRole: (role) => {
    const validRoles = ['patient', 'pharmacy', 'admin'];
    return validRoles.includes(role);
  }
};

/**
 * Security utilities
 */
export const securityUtils = {
  /**
   * Generate secure headers
   */
  getSecurityHeaders: () => {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  },

  /**
   * Rate limiting key generator
   */
  generateRateLimitKey: (ip, action) => {
    return `rate_limit_${action}_${securityUtils.hashIP(ip)}`;
  },

  /**
   * Hash IP address for privacy
   */
  hashIP: (ip) => {
    return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'default_salt').digest('hex');
  },

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint: (userAgent, ip) => {
    const data = `${userAgent}_${ip}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  },

  /**
   * Encrypt sensitive data
   */
  encrypt: (text, key = process.env.ENCRYPTION_KEY) => {
    if (!key) throw new Error('Encryption key not provided');
    
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    };
  },

  /**
   * Decrypt sensitive data
   */
  decrypt: (encryptedData, key = process.env.ENCRYPTION_KEY) => {
    if (!key) throw new Error('Encryption key not provided');
    
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
};

export default {
  passwordUtils,
  tokenUtils,
  twoFactorUtils,
  sessionUtils,
  validationUtils,
  securityUtils
};
