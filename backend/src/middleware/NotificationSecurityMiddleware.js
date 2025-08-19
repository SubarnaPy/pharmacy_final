import NotificationEncryptionService from '../services/security/NotificationEncryptionService.js';
import NotificationAccessControl from '../services/security/NotificationAccessControl.js';
import NotificationAuditService from '../services/security/NotificationAuditService.js';

/**
 * Middleware for notification security, access control, and audit logging
 */
class NotificationSecurityMiddleware {
  constructor() {
    this.encryptionService = new NotificationEncryptionService();
    this.accessControl = new NotificationAccessControl();
    this.auditService = new NotificationAuditService();
  }

  /**
   * Middleware to encrypt sensitive notification data before saving
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  encryptNotificationData() {
    return async (req, res, next) => {
      try {
        if (req.body && req.body.notification) {
          // Encrypt sensitive fields in notification
          req.body.notification = this.encryptionService.encryptNotificationContent(req.body.notification);
        }

        // Log encryption activity
        await this.auditService.logSecurityEvent('data_encryption', {
          description: 'Notification data encrypted before storage',
          severity: 'low',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          actionTaken: 'Data encrypted successfully'
        }, req.user);

        next();
      } catch (error) {
        console.error('Encryption middleware error:', error);
        
        // Log encryption failure
        await this.auditService.logSecurityEvent('encryption_failure', {
          description: 'Failed to encrypt notification data',
          severity: 'high',
          error: error.message,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          actionTaken: 'Request blocked'
        }, req.user);

        res.status(500).json({
          error: 'Security processing failed',
          code: 'ENCRYPTION_ERROR'
        });
      }
    };
  }

  /**
   * Middleware to decrypt notification data before sending response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  decryptNotificationData() {
    return async (req, res, next) => {
      try {
        // Store original json method
        const originalJson = res.json;

        // Override json method to decrypt data before sending
        res.json = (data) => {
          if (data && data.notification && data.notification._encrypted) {
            data.notification = this.encryptionService.decryptNotificationContent(data.notification);
          }

          if (data && Array.isArray(data.notifications)) {
            data.notifications = data.notifications.map(notification => {
              if (notification._encrypted) {
                return this.encryptionService.decryptNotificationContent(notification);
              }
              return notification;
            });
          }

          return originalJson.call(res, data);
        };

        next();
      } catch (error) {
        console.error('Decryption middleware error:', error);
        res.status(500).json({
          error: 'Security processing failed',
          code: 'DECRYPTION_ERROR'
        });
      }
    };
  }

  /**
   * Middleware to check notification access permissions
   * @param {string} action - Action being performed (view, manage, delete)
   */
  checkNotificationAccess(action = 'view') {
    return async (req, res, next) => {
      try {
        const user = req.user;
        const notificationId = req.params.notificationId || req.params.id;

        if (!user) {
          await this.auditService.logAccessAttempt(
            { _id: 'anonymous', role: 'anonymous' },
            action,
            { _id: notificationId, type: 'unknown' },
            false,
            'No authentication provided',
            {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              requestId: req.requestId
            }
          );

          return res.status(401).json({
            error: 'Authentication required',
            code: 'UNAUTHORIZED'
          });
        }

        // If notification ID is provided, check specific notification access
        if (notificationId) {
          // Get notification from database (this would be injected or passed)
          const notification = req.notification || await this.getNotificationById(notificationId);
          
          if (!notification) {
            return res.status(404).json({
              error: 'Notification not found',
              code: 'NOT_FOUND'
            });
          }

          // Check access permissions
          const hasAccess = this.accessControl.canPerformAction(user, action, notification);

          // Log access attempt
          await this.auditService.logAccessAttempt(
            user,
            action,
            notification,
            hasAccess,
            hasAccess ? 'Access granted' : 'Access denied',
            {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              requestId: req.requestId,
              sessionId: req.sessionID
            }
          );

          if (!hasAccess) {
            return res.status(403).json({
              error: 'Access denied',
              code: 'FORBIDDEN'
            });
          }

          // Filter notification data based on user permissions
          req.notification = this.accessControl.filterNotificationData(user, notification);
        }

        next();
      } catch (error) {
        console.error('Access control middleware error:', error);
        
        await this.auditService.logSecurityEvent('access_control_error', {
          description: 'Access control middleware failed',
          severity: 'high',
          error: error.message,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          actionTaken: 'Request blocked'
        }, req.user);

        res.status(500).json({
          error: 'Security check failed',
          code: 'ACCESS_CONTROL_ERROR'
        });
      }
    };
  }

  /**
   * Middleware to audit notification operations
   * @param {string} operation - Operation being performed
   */
  auditNotificationOperation(operation) {
    return async (req, res, next) => {
      try {
        const user = req.user;
        const startTime = Date.now();

        // Store original methods
        const originalJson = res.json;
        const originalSend = res.send;

        // Override response methods to capture audit data
        res.json = (data) => {
          this.logOperationAudit(operation, req, res, user, startTime, data);
          return originalJson.call(res, data);
        };

        res.send = (data) => {
          this.logOperationAudit(operation, req, res, user, startTime, data);
          return originalSend.call(res, data);
        };

        next();
      } catch (error) {
        console.error('Audit middleware error:', error);
        next(); // Don't block request for audit failures
      }
    };
  }

  /**
   * Middleware to validate notification security tokens
   */
  validateSecurityToken() {
    return async (req, res, next) => {
      try {
        const token = req.headers['x-notification-token'] || req.query.token;
        
        if (token) {
          const notificationId = req.params.notificationId || req.params.id;
          const payload = this.encryptionService.verifySecureToken(token);
          
          if (!payload || payload.notificationId !== notificationId) {
            await this.auditService.logSecurityEvent('invalid_token', {
              description: 'Invalid notification security token',
              severity: 'medium',
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              actionTaken: 'Token rejected'
            }, req.user);

            return res.status(401).json({
              error: 'Invalid security token',
              code: 'INVALID_TOKEN'
            });
          }

          // Add token payload to request
          req.tokenPayload = payload;
        }

        next();
      } catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({
          error: 'Token validation failed',
          code: 'TOKEN_VALIDATION_ERROR'
        });
      }
    };
  }

  /**
   * Middleware to rate limit notification access
   * @param {Object} options - Rate limiting options
   */
  rateLimit(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many notification requests',
      skipSuccessfulRequests: false
    };

    const config = { ...defaultOptions, ...options };
    const requests = new Map();

    return async (req, res, next) => {
      try {
        const key = req.ip + ':' + (req.user?._id || 'anonymous');
        const now = Date.now();
        const windowStart = now - config.windowMs;

        // Clean old entries
        for (const [k, v] of requests.entries()) {
          if (v.resetTime < now) {
            requests.delete(k);
          }
        }

        // Get or create request record
        let requestRecord = requests.get(key);
        if (!requestRecord || requestRecord.resetTime < now) {
          requestRecord = {
            count: 0,
            resetTime: now + config.windowMs
          };
          requests.set(key, requestRecord);
        }

        // Check rate limit
        if (requestRecord.count >= config.max) {
          await this.auditService.logSecurityEvent('rate_limit_exceeded', {
            description: 'Notification API rate limit exceeded',
            severity: 'medium',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            requestCount: requestRecord.count,
            actionTaken: 'Request blocked'
          }, req.user);

          return res.status(429).json({
            error: config.message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((requestRecord.resetTime - now) / 1000)
          });
        }

        // Increment counter
        requestRecord.count++;

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        next(); // Don't block request for rate limiting failures
      }
    };
  }

  /**
   * Helper method to log operation audit
   * @param {string} operation - Operation performed
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Object} user - User object
   * @param {number} startTime - Operation start time
   * @param {*} responseData - Response data
   */
  async logOperationAudit(operation, req, res, user, startTime, responseData) {
    try {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;

      await this.auditService.logNotificationCreated(
        {
          _id: req.params.notificationId || 'bulk',
          type: operation,
          priority: 'medium',
          recipients: []
        },
        user,
        {
          source: 'api',
          controllerAction: `${req.method} ${req.path}`,
          duration: duration,
          success: success,
          statusCode: res.statusCode
        }
      );
    } catch (error) {
      console.error('Failed to log operation audit:', error);
    }
  }

  /**
   * Helper method to get notification by ID
   * @param {string} notificationId - Notification ID
   * @returns {Object|null} Notification object
   */
  async getNotificationById(notificationId) {
    try {
      // This would typically use the notification service or model
      // For now, return a mock notification
      return {
        _id: notificationId,
        type: 'unknown',
        priority: 'medium',
        recipients: [],
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Failed to get notification:', error);
      return null;
    }
  }

  /**
   * Create security headers middleware
   */
  securityHeaders() {
    return (req, res, next) => {
      // Set security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Remove server information
      res.removeHeader('X-Powered-By');
      
      next();
    };
  }

  /**
   * Input sanitization middleware
   */
  sanitizeInput() {
    return (req, res, next) => {
      try {
        // Sanitize request body
        if (req.body) {
          req.body = this.sanitizeObject(req.body);
        }

        // Sanitize query parameters
        if (req.query) {
          req.query = this.sanitizeObject(req.query);
        }

        next();
      } catch (error) {
        console.error('Input sanitization error:', error);
        res.status(400).json({
          error: 'Invalid input data',
          code: 'INVALID_INPUT'
        });
      }
    };
  }

  /**
   * Sanitize object recursively
   * @param {*} obj - Object to sanitize
   * @returns {*} Sanitized object
   */
  sanitizeObject(obj) {
    if (typeof obj === 'string') {
      // Remove potentially dangerous characters
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}

export default NotificationSecurityMiddleware;