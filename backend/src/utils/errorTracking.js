// Error tracking and reporting system for the pharmacy platform
// Integrates with Sentry and implements custom error handling

const Sentry = require('@sentry/node');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { recordSuspiciousActivity } = require('../middleware/performanceMonitoring');

class ErrorTracker {
  constructor() {
    this.logger = null;
    this.errorCounts = new Map();
    this.lastErrors = [];
    this.maxLastErrors = 100;
    this.initializeLogger();
    this.initializeSentry();
  }

  // Initialize Winston logger
  initializeLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          stack,
          ...meta
        });
      })
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // File transport for all logs
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info'
        }),
        
        // Separate file for errors
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error'
        }),
        
        // Separate file for security events
        new DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '90d',
          level: 'warn'
        })
      ]
    });
  }

  // Initialize Sentry for error tracking
  initializeSentry() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend(event) {
          // Filter out sensitive information
          if (event.exception) {
            event.exception.values.forEach(exception => {
              if (exception.stacktrace) {
                exception.stacktrace.frames.forEach(frame => {
                  // Remove sensitive data from stack traces
                  if (frame.vars) {
                    delete frame.vars.password;
                    delete frame.vars.token;
                    delete frame.vars.apiKey;
                  }
                });
              }
            });
          }
          return event;
        }
      });
    }
  }

  // Track application errors
  trackError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      context,
      severity: this.determineSeverity(error)
    };

    // Log the error
    this.logger.error('Application error', errorInfo);

    // Send to Sentry if configured
    if (process.env.SENTRY_DSN) {
      Sentry.withScope(scope => {
        Object.keys(context).forEach(key => {
          scope.setTag(key, context[key]);
        });
        scope.setLevel(errorInfo.severity);
        Sentry.captureException(error);
      });
    }

    // Update error counts
    const errorKey = `${error.name}:${error.message}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Store recent errors
    this.lastErrors.unshift(errorInfo);
    if (this.lastErrors.length > this.maxLastErrors) {
      this.lastErrors = this.lastErrors.slice(0, this.maxLastErrors);
    }

    // Check for suspicious patterns
    this.checkSuspiciousPatterns(error, context);

    return errorInfo;
  }

  // Track security events
  trackSecurityEvent(event, details = {}) {
    const securityEvent = {
      type: 'security',
      event,
      details,
      timestamp: new Date().toISOString(),
      severity: details.severity || 'medium'
    };

    this.logger.warn('Security event', securityEvent);

    // Record in monitoring
    recordSuspiciousActivity(event, details.severity || 'medium');

    // Send critical security events to Sentry
    if (details.severity === 'high' || details.severity === 'critical') {
      if (process.env.SENTRY_DSN) {
        Sentry.captureMessage(`Security Event: ${event}`, 'warning');
      }
    }

    return securityEvent;
  }

  // Track business logic errors
  trackBusinessError(operation, error, context = {}) {
    const businessError = {
      type: 'business',
      operation,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN'
      },
      context,
      timestamp: new Date().toISOString()
    };

    this.logger.warn('Business logic error', businessError);

    return businessError;
  }

  // Track performance issues
  trackPerformanceIssue(operation, duration, threshold, context = {}) {
    const performanceIssue = {
      type: 'performance',
      operation,
      duration,
      threshold,
      context,
      timestamp: new Date().toISOString(),
      severity: duration > threshold * 2 ? 'high' : 'medium'
    };

    this.logger.warn('Performance issue', performanceIssue);

    return performanceIssue;
  }

  // Determine error severity
  determineSeverity(error) {
    // Critical errors
    if (error.name === 'MongooseError' || 
        error.name === 'RedisError' ||
        error.message.includes('ECONNREFUSED')) {
      return 'fatal';
    }

    // High severity errors
    if (error.name === 'ValidationError' ||
        error.name === 'AuthenticationError' ||
        error.name === 'PaymentError') {
      return 'error';
    }

    // Medium severity
    if (error.name === 'NotFoundError' ||
        error.name === 'RateLimitError') {
      return 'warning';
    }

    // Default to info level
    return 'info';
  }

  // Check for suspicious error patterns
  checkSuspiciousPatterns(error, context) {
    const errorKey = `${error.name}:${error.message}`;
    const count = this.errorCounts.get(errorKey) || 0;
    const timeWindow = 5 * 60 * 1000; // 5 minutes

    // Check for error flooding
    if (count > 50) {
      this.trackSecurityEvent('error_flooding', {
        errorType: error.name,
        count,
        severity: 'high',
        context
      });
    }

    // Check for authentication failures
    if (error.name === 'AuthenticationError' && count > 10) {
      this.trackSecurityEvent('multiple_auth_failures', {
        count,
        severity: 'high',
        context
      });
    }

    // Check for payment errors
    if (error.name === 'PaymentError' && count > 5) {
      this.trackSecurityEvent('multiple_payment_failures', {
        count,
        severity: 'medium',
        context
      });
    }
  }

  // Get error statistics
  getErrorStats() {
    const recentErrors = this.lastErrors.filter(error => 
      Date.now() - new Date(error.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    const errorsByType = {};
    const errorsBySeverity = {};

    recentErrors.forEach(error => {
      errorsByType[error.name] = (errorsByType[error.name] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      total: recentErrors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.lastErrors.slice(0, 10),
      topErrors: Array.from(this.errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    };
  }

  // Health check for error tracking system
  healthCheck() {
    return {
      logger: !!this.logger,
      sentry: !!process.env.SENTRY_DSN,
      recentErrorCount: this.lastErrors.length,
      status: 'healthy'
    };
  }

  // Export error data for analysis
  exportErrorData(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filteredErrors = this.lastErrors.filter(error => {
      const errorDate = new Date(error.timestamp);
      return errorDate >= start && errorDate <= end;
    });

    return {
      period: { start: startDate, end: endDate },
      totalErrors: filteredErrors.length,
      errors: filteredErrors,
      summary: this.generateErrorSummary(filteredErrors)
    };
  }

  // Generate error summary
  generateErrorSummary(errors) {
    const summary = {
      totalCount: errors.length,
      byType: {},
      bySeverity: {},
      byHour: {},
      commonPatterns: []
    };

    errors.forEach(error => {
      // Count by type
      summary.byType[error.name] = (summary.byType[error.name] || 0) + 1;
      
      // Count by severity
      summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;
      
      // Count by hour
      const hour = new Date(error.timestamp).getHours();
      summary.byHour[hour] = (summary.byHour[hour] || 0) + 1;
    });

    // Find common error patterns
    const errorMessages = errors.map(e => e.message);
    const messageCounts = {};
    errorMessages.forEach(msg => {
      messageCounts[msg] = (messageCounts[msg] || 0) + 1;
    });

    summary.commonPatterns = Object.entries(messageCounts)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return summary;
  }
}

// Error tracking middleware
const errorTrackingMiddleware = (errorTracker) => {
  return (error, req, res, next) => {
    const context = {
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      userType: req.user?.role
    };

    errorTracker.trackError(error, context);

    // Continue with error handling
    next(error);
  };
};

// Global error handlers
const setupGlobalErrorHandlers = (errorTracker) => {
  // Unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    errorTracker.trackError(new Error(`Unhandled Rejection: ${reason}`), {
      type: 'unhandledRejection',
      promise: promise.toString()
    });
  });

  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    errorTracker.trackError(error, {
      type: 'uncaughtException'
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

// Create singleton instance
const errorTracker = new ErrorTracker();

module.exports = {
  ErrorTracker,
  errorTracker,
  errorTrackingMiddleware,
  setupGlobalErrorHandlers
};
