import mongoose from 'mongoose';

/**
 * Service for comprehensive audit logging of all notification activities
 * Implements detailed logging for compliance and security monitoring
 */
class NotificationAuditService {
  constructor() {
    this.auditCollection = 'notification_audit_logs';
    this.retentionPeriods = {
      'security': 2555, // 7 years in days
      'compliance': 2555, // 7 years in days
      'operational': 365, // 1 year in days
      'debug': 30 // 30 days
    };
  }

  /**
   * Log notification creation
   * @param {Object} notification - Notification object
   * @param {Object} user - User who triggered the notification
   * @param {Object} context - Additional context
   */
  async logNotificationCreated(notification, user, context = {}) {
    const auditEntry = {
      eventType: 'notification_created',
      category: 'operational',
      timestamp: new Date(),
      notificationId: notification._id,
      notificationType: notification.type,
      priority: notification.priority,
      
      // User information
      userId: user?._id,
      userRole: user?.role,
      userEmail: user?.email,
      
      // Recipients information
      recipientCount: notification.recipients?.length || 0,
      recipientRoles: this.extractRecipientRoles(notification.recipients),
      
      // Delivery channels
      deliveryChannels: this.extractDeliveryChannels(notification.recipients),
      
      // Context and metadata
      triggerSource: context.source || 'unknown',
      controllerAction: context.controllerAction,
      relatedEntities: notification.relatedEntities,
      
      // Content metadata (without sensitive data)
      hasPersonalInfo: this.containsPersonalInfo(notification),
      hasMedicalData: this.containsMedicalData(notification),
      hasFinancialData: this.containsFinancialData(notification),
      isEncrypted: notification._encrypted || false,
      
      // System information
      serverInstance: process.env.SERVER_INSTANCE || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.APP_VERSION || 'unknown'
    };

    await this.saveAuditEntry(auditEntry);
  }

  /**
   * Log notification delivery attempt
   * @param {string} notificationId - Notification ID
   * @param {string} channel - Delivery channel
   * @param {Object} recipient - Recipient information
   * @param {Object} result - Delivery result
   */
  async logDeliveryAttempt(notificationId, channel, recipient, result) {
    const auditEntry = {
      eventType: 'notification_delivery_attempt',
      category: 'operational',
      timestamp: new Date(),
      notificationId: notificationId,
      
      // Delivery information
      deliveryChannel: channel,
      recipientId: recipient.userId,
      recipientRole: recipient.userRole,
      
      // Result information
      deliveryStatus: result.status,
      deliverySuccess: result.success,
      deliveryError: result.error,
      deliveryTime: result.deliveryTime,
      externalMessageId: result.messageId,
      
      // Provider information
      serviceProvider: result.provider,
      providerResponse: result.providerResponse,
      
      // Retry information
      attemptNumber: result.attemptNumber || 1,
      isRetry: result.isRetry || false,
      
      // System information
      serverInstance: process.env.SERVER_INSTANCE || 'unknown'
    };

    await this.saveAuditEntry(auditEntry);
  }

  /**
   * Log notification access attempt
   * @param {Object} user - User attempting access
   * @param {string} action - Action attempted
   * @param {Object} notification - Notification being accessed
   * @param {boolean} granted - Whether access was granted
   * @param {string} reason - Reason for decision
   * @param {Object} request - Request metadata
   */
  async logAccessAttempt(user, action, notification, granted, reason, request = {}) {
    const auditEntry = {
      eventType: 'notification_access_attempt',
      category: granted ? 'operational' : 'security',
      timestamp: new Date(),
      notificationId: notification._id,
      notificationType: notification.type,
      
      // User information
      userId: user._id,
      userRole: user.role,
      userEmail: user.email,
      
      // Access information
      actionAttempted: action,
      accessGranted: granted,
      accessReason: reason,
      
      // Request information
      ipAddress: request.ipAddress || 'unknown',
      userAgent: request.userAgent || 'unknown',
      sessionId: request.sessionId,
      requestId: request.requestId,
      
      // Security context
      authenticationMethod: request.authMethod || 'unknown',
      tokenType: request.tokenType,
      
      // System information
      serverInstance: process.env.SERVER_INSTANCE || 'unknown'
    };

    await this.saveAuditEntry(auditEntry);
  }

  /**
   * Log notification preference changes
   * @param {Object} user - User making changes
   * @param {Object} changes - Preference changes
   * @param {Object} context - Additional context
   */
  async logPreferenceChange(user, changes, context = {}) {
    const auditEntry = {
      eventType: 'notification_preference_change',
      category: 'operational',
      timestamp: new Date(),
      
      // User information
      userId: user._id,
      userRole: user.role,
      userEmail: user.email,
      
      // Change information
      changedFields: Object.keys(changes),
      changeDetails: this.sanitizePreferenceChanges(changes),
      
      // Context
      changeReason: context.reason,
      changedBy: context.changedBy || user._id,
      isAdminOverride: context.isAdminOverride || false,
      
      // System information
      serverInstance: process.env.SERVER_INSTANCE || 'unknown'
    };

    await this.saveAuditEntry(auditEntry);
  }

  /**
   * Log security events
   * @param {string} eventType - Type of security event
   * @param {Object} details - Event details
   * @param {Object} user - User involved (if any)
   */
  async logSecurityEvent(eventType, details, user = null) {
    const auditEntry = {
      eventType: `security_${eventType}`,
      category: 'security',
      timestamp: new Date(),
      
      // Security event details
      securityEventType: eventType,
      severity: details.severity || 'medium',
      description: details.description,
      
      // User information (if applicable)
      userId: user?._id,
      userRole: user?.role,
      userEmail: user?.email,
      
      // Technical details
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      requestDetails: details.requestDetails,
      
      // System response
      actionTaken: details.actionTaken,
      alertsSent: details.alertsSent || false,
      
      // System information
      serverInstance: process.env.SERVER_INSTANCE || 'unknown'
    };

    await this.saveAuditEntry(auditEntry);
  }

  /**
   * Log compliance events
   * @param {string} eventType - Type of compliance event
   * @param {Object} details - Event details
   * @param {Object} user - User involved
   */
  async logComplianceEvent(eventType, details, user) {
    const auditEntry = {
      eventType: `compliance_${eventType}`,
      category: 'compliance',
      timestamp: new Date(),
      
      // Compliance event details
      complianceEventType: eventType,
      regulatoryFramework: details.framework || 'HIPAA',
      complianceRule: details.rule,
      
      // User information
      userId: user._id,
      userRole: user.role,
      userEmail: user.email,
      
      // Event details
      description: details.description,
      dataTypes: details.dataTypes || [],
      consentStatus: details.consentStatus,
      
      // System information
      serverInstance: process.env.SERVER_INSTANCE || 'unknown'
    };

    await this.saveAuditEntry(auditEntry);
  }

  /**
   * Log data retention and cleanup activities
   * @param {string} action - Cleanup action performed
   * @param {Object} details - Cleanup details
   */
  async logDataRetentionEvent(action, details) {
    const auditEntry = {
      eventType: `data_retention_${action}`,
      category: 'compliance',
      timestamp: new Date(),
      
      // Retention details
      retentionAction: action,
      recordsAffected: details.recordsAffected || 0,
      retentionPeriod: details.retentionPeriod,
      retentionReason: details.reason,
      
      // Data details
      dataTypes: details.dataTypes || [],
      dateRange: details.dateRange,
      
      // System information
      serverInstance: process.env.SERVER_INSTANCE || 'unknown',
      automatedAction: details.automated || false
    };

    await this.saveAuditEntry(auditEntry);
  }

  /**
   * Save audit entry to database
   * @param {Object} auditEntry - Audit entry to save
   */
  async saveAuditEntry(auditEntry) {
    try {
      // Add retention expiry date
      auditEntry.expiresAt = this.calculateExpiryDate(auditEntry.category);
      
      // Add unique identifier
      auditEntry.auditId = this.generateAuditId();
      
      // Save to database
      const db = mongoose.connection.db;
      await db.collection(this.auditCollection).insertOne(auditEntry);
      
      // For critical security events, also log to external system
      if (auditEntry.category === 'security' && auditEntry.severity === 'high') {
        await this.sendToExternalAuditSystem(auditEntry);
      }
      
    } catch (error) {
      console.error('Failed to save audit entry:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Query audit logs with filters
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options
   * @returns {Array} Audit log entries
   */
  async queryAuditLogs(filters = {}, options = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(this.auditCollection);
      
      // Build query
      const query = this.buildAuditQuery(filters);
      
      // Apply options
      const cursor = collection.find(query);
      
      if (options.sort) {
        cursor.sort(options.sort);
      }
      
      if (options.limit) {
        cursor.limit(options.limit);
      }
      
      if (options.skip) {
        cursor.skip(options.skip);
      }
      
      return await cursor.toArray();
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      throw error;
    }
  }

  /**
   * Generate audit report
   * @param {Object} criteria - Report criteria
   * @returns {Object} Audit report
   */
  async generateAuditReport(criteria) {
    try {
      const logs = await this.queryAuditLogs(criteria.filters, criteria.options);
      
      return {
        reportId: this.generateAuditId(),
        generatedAt: new Date(),
        criteria: criteria,
        totalEntries: logs.length,
        summary: this.generateAuditSummary(logs),
        entries: logs,
        metadata: {
          reportType: criteria.reportType || 'general',
          requestedBy: criteria.requestedBy,
          purpose: criteria.purpose
        }
      };
    } catch (error) {
      console.error('Failed to generate audit report:', error);
      throw error;
    }
  }

  /**
   * Clean up expired audit logs
   * @returns {Object} Cleanup results
   */
  async cleanupExpiredLogs() {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(this.auditCollection);
      
      const result = await collection.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      await this.logDataRetentionEvent('cleanup', {
        recordsAffected: result.deletedCount,
        reason: 'Automated retention policy cleanup',
        automated: true
      });
      
      return {
        deletedCount: result.deletedCount,
        cleanupDate: new Date()
      };
    } catch (error) {
      console.error('Failed to cleanup expired logs:', error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Extract recipient roles from notification
   * @param {Array} recipients - Notification recipients
   * @returns {Array} Unique recipient roles
   */
  extractRecipientRoles(recipients = []) {
    return [...new Set(recipients.map(r => r.userRole).filter(Boolean))];
  }

  /**
   * Extract delivery channels from recipients
   * @param {Array} recipients - Notification recipients
   * @returns {Array} Unique delivery channels
   */
  extractDeliveryChannels(recipients = []) {
    const channels = new Set();
    recipients.forEach(recipient => {
      if (recipient.deliveryChannels) {
        recipient.deliveryChannels.forEach(channel => channels.add(channel));
      }
    });
    return Array.from(channels);
  }

  /**
   * Check if notification contains personal information
   * @param {Object} notification - Notification object
   * @returns {boolean} Contains personal info
   */
  containsPersonalInfo(notification) {
    const personalFields = ['personalInfo', 'patientInfo', 'contactInfo'];
    return this.containsAnyField(notification, personalFields);
  }

  /**
   * Check if notification contains medical data
   * @param {Object} notification - Notification object
   * @returns {boolean} Contains medical data
   */
  containsMedicalData(notification) {
    const medicalFields = ['medicalData', 'prescriptionDetails', 'diagnosis', 'treatment'];
    return this.containsAnyField(notification, medicalFields);
  }

  /**
   * Check if notification contains financial data
   * @param {Object} notification - Notification object
   * @returns {boolean} Contains financial data
   */
  containsFinancialData(notification) {
    const financialFields = ['paymentInfo', 'billing', 'insurance', 'cost'];
    return this.containsAnyField(notification, financialFields);
  }

  /**
   * Check if notification contains any of the specified fields
   * @param {Object} notification - Notification object
   * @param {Array} fields - Fields to check for
   * @returns {boolean} Contains any field
   */
  containsAnyField(notification, fields) {
    const checkObject = (obj, fields) => {
      if (!obj || typeof obj !== 'object') return false;
      
      for (const field of fields) {
        if (obj.hasOwnProperty(field)) return true;
      }
      
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && checkObject(value, fields)) {
          return true;
        }
      }
      
      return false;
    };
    
    return checkObject(notification, fields);
  }

  /**
   * Sanitize preference changes for logging
   * @param {Object} changes - Preference changes
   * @returns {Object} Sanitized changes
   */
  sanitizePreferenceChanges(changes) {
    const sanitized = { ...changes };
    
    // Remove sensitive information
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    
    // Truncate long values
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '... [truncated]';
      }
    });
    
    return sanitized;
  }

  /**
   * Calculate expiry date based on category
   * @param {string} category - Audit entry category
   * @returns {Date} Expiry date
   */
  calculateExpiryDate(category) {
    const retentionDays = this.retentionPeriods[category] || this.retentionPeriods.operational;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + retentionDays);
    return expiryDate;
  }

  /**
   * Generate unique audit ID
   * @returns {string} Unique audit ID
   */
  generateAuditId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Build audit query from filters
   * @param {Object} filters - Query filters
   * @returns {Object} MongoDB query
   */
  buildAuditQuery(filters) {
    const query = {};
    
    if (filters.eventType) {
      query.eventType = filters.eventType;
    }
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.userId) {
      query.userId = filters.userId;
    }
    
    if (filters.notificationId) {
      query.notificationId = filters.notificationId;
    }
    
    if (filters.dateRange) {
      query.timestamp = {
        $gte: new Date(filters.dateRange.start),
        $lte: new Date(filters.dateRange.end)
      };
    }
    
    return query;
  }

  /**
   * Generate audit summary from logs
   * @param {Array} logs - Audit log entries
   * @returns {Object} Summary statistics
   */
  generateAuditSummary(logs) {
    const summary = {
      totalEntries: logs.length,
      eventTypes: {},
      categories: {},
      users: new Set(),
      timeRange: {
        earliest: null,
        latest: null
      }
    };
    
    logs.forEach(log => {
      // Count event types
      summary.eventTypes[log.eventType] = (summary.eventTypes[log.eventType] || 0) + 1;
      
      // Count categories
      summary.categories[log.category] = (summary.categories[log.category] || 0) + 1;
      
      // Track users
      if (log.userId) {
        summary.users.add(log.userId);
      }
      
      // Track time range
      const timestamp = new Date(log.timestamp);
      if (!summary.timeRange.earliest || timestamp < summary.timeRange.earliest) {
        summary.timeRange.earliest = timestamp;
      }
      if (!summary.timeRange.latest || timestamp > summary.timeRange.latest) {
        summary.timeRange.latest = timestamp;
      }
    });
    
    summary.uniqueUsers = summary.users.size;
    delete summary.users; // Remove Set object
    
    return summary;
  }

  /**
   * Send critical audit entries to external system
   * @param {Object} auditEntry - Audit entry
   */
  async sendToExternalAuditSystem(auditEntry) {
    try {
      // This would integrate with external SIEM or audit systems
      console.log('CRITICAL AUDIT EVENT:', JSON.stringify(auditEntry, null, 2));
      
      // In production, this would send to external systems like:
      // - Splunk
      // - ELK Stack
      // - AWS CloudTrail
      // - Azure Sentinel
      // - etc.
      
    } catch (error) {
      console.error('Failed to send to external audit system:', error);
    }
  }
}

export default NotificationAuditService;