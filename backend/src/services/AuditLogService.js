// Audit Logging Service for Security Monitoring
import mongoose from 'mongoose';
import crypto from 'crypto';
import ProfileChangeLog from '../models/ProfileChangeLog.js';

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  // Event Information
  eventType: {
    type: String,
    required: true,
    enum: [
      'AUTH_LOGIN_SUCCESS',
      'AUTH_LOGIN_FAILED',
      'AUTH_LOGOUT',
      'AUTH_PASSWORD_CHANGE',
      'AUTH_2FA_ENABLED',
      'AUTH_2FA_DISABLED',
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DELETED',
      'USER_SUSPENDED',
      'PRESCRIPTION_UPLOADED',
      'PRESCRIPTION_PROCESSED',
      'PRESCRIPTION_APPROVED',
      'PRESCRIPTION_REJECTED',
      'PAYMENT_PROCESSED',
      'PAYMENT_FAILED',
      'PHARMACY_REGISTERED',
      'PHARMACY_APPROVED',
      'PHARMACY_SUSPENDED',
      'ADMIN_ACTION',
      'DATA_EXPORT',
      'DATA_IMPORT',
      'SECURITY_VIOLATION',
      'SUSPICIOUS_ACTIVITY',
      'FILE_UPLOAD',
      'FILE_DOWNLOAD',
      'API_ACCESS',
      'SYSTEM_ERROR'
    ]
  },
  
  // Actor Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userRole: {
    type: String,
    enum: ['patient', 'pharmacy', 'admin', 'system'],
    default: 'system'
  },
  userEmail: String,
  
  // Request Information
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  requestId: String,
  sessionId: String,
  
  // Resource Information
  resourceType: {
    type: String,
    enum: ['user', 'prescription', 'pharmacy', 'payment', 'file', 'system']
  },
  resourceId: String,
  
  // Action Details
  action: {
    type: String,
    required: true
  },
  description: String,
  
  // Request/Response Data (sanitized)
  requestData: {
    method: String,
    url: String,
    params: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed // Sensitive data removed
  },
  responseData: {
    statusCode: Number,
    success: Boolean,
    errorMessage: String
  },
  
  // Security Information
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Geolocation
  location: {
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  
  // Timing
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  duration: Number, // Request duration in ms
  
  // Additional Context
  metadata: mongoose.Schema.Types.Mixed,
  tags: [String],
  
  // Compliance
  dataRetentionDate: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) // 7 years
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Indexes for efficient querying
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 }); // Auto-delete after 7 years

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Audit Logging Service
class AuditLogService {
  constructor() {
    this.sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'ssn',
      'creditCard',
      'bankAccount'
    ];
  }

  // Main logging method
  async log(eventData) {
    try {
      const sanitizedData = this.sanitizeData(eventData);
      const enrichedData = await this.enrichLogData(sanitizedData);
      
      const auditLog = new AuditLog(enrichedData);
      await auditLog.save();
      
      // Check for security alerts
      await this.checkSecurityAlerts(enrichedData);
      
      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw error to avoid breaking the main application
    }
  }

  // Authentication events
  async logAuthEvent(eventType, user, req, additionalData = {}) {
    return this.log({
      eventType,
      userId: user?._id,
      userRole: user?.role,
      userEmail: user?.email,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      sessionId: req.sessionID,
      action: eventType.replace('AUTH_', '').toLowerCase(),
      description: `User ${eventType.replace('AUTH_', '').toLowerCase()}`,
      requestData: {
        method: req.method,
        url: req.originalUrl
      },
      ...additionalData
    });
  }

  // User management events
  async logUserEvent(eventType, targetUser, actor, req, changes = {}) {
    return this.log({
      eventType,
      userId: actor?._id,
      userRole: actor?.role,
      userEmail: actor?.email,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      resourceType: 'user',
      resourceId: targetUser._id.toString(),
      action: eventType.replace('USER_', '').toLowerCase(),
      description: `User ${eventType.replace('USER_', '').toLowerCase()}: ${targetUser.email}`,
      metadata: {
        targetUser: {
          id: targetUser._id,
          email: targetUser.email,
          role: targetUser.role
        },
        changes: this.sanitizeData(changes)
      }
    });
  }

  // Prescription events
  async logPrescriptionEvent(eventType, prescription, user, req, additionalData = {}) {
    return this.log({
      eventType,
      userId: user?._id,
      userRole: user?.role,
      userEmail: user?.email,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      resourceType: 'prescription',
      resourceId: prescription._id.toString(),
      action: eventType.replace('PRESCRIPTION_', '').toLowerCase(),
      description: `Prescription ${eventType.replace('PRESCRIPTION_', '').toLowerCase()}`,
      metadata: {
        prescriptionId: prescription._id,
        patientId: prescription.patientId,
        pharmacyId: prescription.pharmacyId,
        status: prescription.status,
        ...additionalData
      }
    });
  }

  // Payment events
  async logPaymentEvent(eventType, payment, user, req, additionalData = {}) {
    return this.log({
      eventType,
      userId: user?._id,
      userRole: user?.role,
      userEmail: user?.email,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      resourceType: 'payment',
      resourceId: payment._id?.toString(),
      action: eventType.replace('PAYMENT_', '').toLowerCase(),
      description: `Payment ${eventType.replace('PAYMENT_', '').toLowerCase()}`,
      metadata: {
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        ...additionalData
      }
    });
  }

  // Security violation events
  async logSecurityViolation(violationType, req, user = null, details = {}) {
    return this.log({
      eventType: 'SECURITY_VIOLATION',
      userId: user?._id,
      userRole: user?.role,
      userEmail: user?.email,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      action: violationType,
      description: `Security violation: ${violationType}`,
      severity: 'HIGH',
      riskScore: 80,
      requestData: {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query
      },
      metadata: details
    });
  }

  // File operation events
  async logFileEvent(eventType, fileInfo, user, req) {
    return this.log({
      eventType,
      userId: user?._id,
      userRole: user?.role,
      userEmail: user?.email,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      resourceType: 'file',
      resourceId: fileInfo.id || fileInfo.filename,
      action: eventType.replace('FILE_', '').toLowerCase(),
      description: `File ${eventType.replace('FILE_', '').toLowerCase()}: ${fileInfo.filename}`,
      metadata: {
        filename: fileInfo.filename,
        mimetype: fileInfo.mimetype,
        size: fileInfo.size,
        path: fileInfo.path
      }
    });
  }

  // Admin action events
  async logAdminAction(action, admin, req, targetResource = {}) {
    return this.log({
      eventType: 'ADMIN_ACTION',
      userId: admin._id,
      userRole: admin.role,
      userEmail: admin.email,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      action: action,
      description: `Admin action: ${action}`,
      severity: 'MEDIUM',
      metadata: {
        targetResource: this.sanitizeData(targetResource)
      }
    });
  }

  // Profile change events
  async logProfileChange(changeData) {
    try {
      const {
        doctorId,
        section,
        changes,
        previousValues,
        userId,
        timestamp = new Date(),
        operationId = null,
        isRollback = false,
        metadata = {}
      } = changeData;

      console.log(`📝 Logging profile change: ${section} for doctor ${doctorId}`);

      // Create profile change log entry
      const profileChangeLog = new ProfileChangeLog({
        operationId: operationId || this.generateOperationId(),
        doctorId,
        userId,
        section,
        changes,
        previousValues,
        changeType: isRollback ? 'rollback' : 'update',
        isRollback,
        timestamp,
        metadata: {
          ...metadata,
          changeSize: JSON.stringify(changes).length,
          hasFiles: this.hasFileChanges(changes)
        }
      });

      const savedLog = await profileChangeLog.save();

      console.log(`✅ Profile change logged:`, {
        id: savedLog._id,
        operationId: savedLog.operationId,
        doctorId: savedLog.doctorId,
        section: savedLog.section,
        changeType: savedLog.changeType,
        impactLevel: savedLog.impactLevel,
        timestamp: savedLog.timestamp
      });

      // Also create legacy audit log entry for backward compatibility
      try {
        await this.log({
          eventType: 'USER_UPDATED',
          userId: changeData.userId,
          resourceType: 'user',
          resourceId: changeData.doctorId,
          action: 'profile_section_update',
          description: `Doctor profile section '${changeData.section}' updated`,
          severity: 'LOW',
          ipAddress: '127.0.0.1', // Default IP for system operations
          metadata: {
            section: changeData.section,
            changes: this.sanitizeData(changeData.changes),
            previousValues: this.sanitizeData(changeData.previousValues),
            timestamp: changeData.timestamp,
            profileChangeLogId: savedLog._id,
            operationId: savedLog.operationId
          }
        });
      } catch (auditError) {
        console.warn('Failed to create legacy audit log:', auditError.message);
      }

      return savedLog;

    } catch (error) {
      console.error('❌ Failed to log profile change:', error);
      throw error;
    }
  }

  /**
   * Generate unique operation ID
   * @returns {string} - Operation ID
   */
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Check if changes include file uploads
   * @param {Object} changes - Change data
   * @returns {boolean} - Whether changes include files
   */
  hasFileChanges(changes) {
    const changeStr = JSON.stringify(changes);
    return changeStr.includes('fileUrl') || 
           changeStr.includes('fileName') || 
           changeStr.includes('document') ||
           changeStr.includes('image');
  }

  /**
   * Get recent profile changes for a doctor
   * @param {string} doctorId - Doctor's ID
   * @param {number} limit - Number of changes to retrieve
   * @returns {Promise<Array>} - Array of recent changes
   */
  async getRecentProfileChanges(doctorId, limit = 10) {
    try {
      return await ProfileChangeLog.getRecentChanges(doctorId, limit);
    } catch (error) {
      console.error('❌ Failed to get recent profile changes:', error);
      throw error;
    }
  }

  /**
   * Get profile changes by section
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Profile section
   * @param {number} limit - Number of changes to retrieve
   * @returns {Promise<Array>} - Array of section changes
   */
  async getProfileChangesBySection(doctorId, section, limit = 5) {
    try {
      return await ProfileChangeLog.getChangesBySection(doctorId, section, limit);
    } catch (error) {
      console.error('❌ Failed to get profile changes by section:', error);
      throw error;
    }
  }

  /**
   * Get pending sync operations
   * @returns {Promise<Array>} - Array of pending sync operations
   */
  async getPendingSyncOperations() {
    try {
      return await ProfileChangeLog.getPendingSyncOperations();
    } catch (error) {
      console.error('❌ Failed to get pending sync operations:', error);
      throw error;
    }
  }

  /**
   * Update sync status for a profile change
   * @param {string} operationId - Operation ID
   * @param {string} status - New sync status
   * @param {string} error - Error message if failed
   * @returns {Promise<Object>} - Updated log entry
   */
  async updateSyncStatus(operationId, status, error = null) {
    try {
      const updateData = { syncStatus: status };
      
      if (status === 'completed') {
        updateData.completedAt = new Date();
      } else if (status === 'failed' && error) {
        updateData.$inc = { syncAttempts: 1 };
        updateData.$push = {
          syncErrors: {
            error,
            timestamp: new Date(),
            retryCount: 1
          }
        };
      }

      const updatedLog = await ProfileChangeLog.findOneAndUpdate(
        { operationId },
        updateData,
        { new: true }
      );

      if (updatedLog) {
        console.log(`📊 Sync status updated for operation ${operationId}: ${status}`);
      }

      return updatedLog;

    } catch (error) {
      console.error('❌ Failed to update sync status:', error);
      throw error;
    }
  }

  /**
   * Log profile sync operation
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Profile section
   * @param {Object} syncResults - Sync operation results
   * @param {string} userId - User performing the sync
   * @returns {Promise<Object>} - Log entry
   */
  async logProfileSync(doctorId, section, syncResults, userId) {
    try {
      console.log(`📊 Logging profile sync for doctor ${doctorId}, section ${section}`);
      
      return await this.log({
        eventType: 'PROFILE_SYNC',
        userId: userId,
        resourceType: 'doctor_profile',
        resourceId: doctorId,
        action: 'sync_profile_changes',
        description: `Profile section '${section}' synced with platform features`,
        severity: syncResults.errors.length > 0 ? 'MEDIUM' : 'LOW',
        metadata: {
          section,
          syncResults: {
            searchIndex: syncResults.searchIndex,
            bookingSystem: syncResults.bookingSystem,
            notifications: syncResults.notifications,
            patientNotifications: syncResults.patientNotifications,
            errorsCount: syncResults.errors.length,
            errors: syncResults.errors
          },
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Failed to log profile sync:', error);
      throw error;
    }
  }

  /**
   * Log profile completion progress
   * @param {string} doctorId - Doctor's ID
   * @param {Object} completionData - Profile completion data
   * @returns {Promise<Object>} - Log entry
   */
  async logProfileProgress(doctorId, completionData) {
    try {
      console.log(`📈 Logging profile progress for doctor ${doctorId}: ${completionData.completionPercentage}%`);
      
      return await this.log({
        eventType: 'PROFILE_PROGRESS',
        resourceType: 'doctor_profile',
        resourceId: doctorId,
        action: 'track_completion_progress',
        description: `Profile completion tracked: ${completionData.completionPercentage}%`,
        severity: 'LOW',
        metadata: {
          completionPercentage: completionData.completionPercentage,
          isComplete: completionData.isComplete,
          missingFieldsCount: completionData.missingFields?.length || 0,
          recommendationsCount: completionData.recommendations?.length || 0,
          nextStepsCount: completionData.nextSteps?.length || 0,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Failed to log profile progress:', error);
      // Don't throw error to avoid failing main operations
      return null;
    }
  }

  // Data sanitization
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = JSON.parse(JSON.stringify(data));
    
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const lowerKey = key.toLowerCase();
          
          // Remove sensitive fields
          if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        }
      }
    };
    
    sanitizeObject(sanitized);
    return sanitized;
  }

  // Enrich log data with additional context
  async enrichLogData(data) {
    // Add request ID if not present
    if (!data.requestId) {
      data.requestId = crypto.randomUUID();
    }
    
    // Calculate risk score based on various factors
    data.riskScore = this.calculateRiskScore(data);
    
    // Set severity based on event type and risk score
    if (!data.severity) {
      data.severity = this.determineSeverity(data);
    }
    
    // Add geolocation (in production, use IP geolocation service)
    if (data.ipAddress && !data.location) {
      data.location = await this.getLocationFromIP(data.ipAddress);
    }
    
    return data;
  }

  // Calculate risk score based on various factors
  calculateRiskScore(data) {
    let score = 0;
    
    // Base score for event type
    const eventRiskScores = {
      'AUTH_LOGIN_FAILED': 20,
      'SECURITY_VIOLATION': 80,
      'SUSPICIOUS_ACTIVITY': 70,
      'USER_DELETED': 40,
      'PHARMACY_SUSPENDED': 50,
      'PAYMENT_FAILED': 30,
      'AUTH_LOGIN_SUCCESS': 5,
      'PRESCRIPTION_UPLOADED': 10
    };
    
    score += eventRiskScores[data.eventType] || 0;
    
    // Increase score for admin actions
    if (data.userRole === 'admin') {
      score += 10;
    }
    
    // Increase score for failed operations
    if (data.responseData?.success === false) {
      score += 20;
    }
    
    // Increase score for suspicious user agents
    if (data.userAgent && this.isSuspiciousUserAgent(data.userAgent)) {
      score += 30;
    }
    
    return Math.min(100, score);
  }

  // Determine severity based on event type and risk score
  determineSeverity(data) {
    if (data.riskScore >= 80) return 'CRITICAL';
    if (data.riskScore >= 60) return 'HIGH';
    if (data.riskScore >= 30) return 'MEDIUM';
    return 'LOW';
  }

  // Check for suspicious user agents
  isSuspiciousUserAgent(userAgent) {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /curl/i,
      /wget/i,
      /python/i,
      /requests/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  // Get client IP address
  getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
  }

  // Get location from IP (mock implementation)
  async getLocationFromIP(ipAddress) {
    // In production, integrate with IP geolocation service like MaxMind or IPapi
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      latitude: null,
      longitude: null
    };
  }

  // Check for security alerts and trigger notifications
  async checkSecurityAlerts(logData) {
    // Multiple failed login attempts
    if (logData.eventType === 'AUTH_LOGIN_FAILED') {
      await this.checkFailedLoginAttempts(logData);
    }
    
    // Suspicious file uploads
    if (logData.eventType === 'FILE_UPLOAD' && logData.riskScore > 50) {
      await this.alertSuspiciousFileUpload(logData);
    }
    
    // Admin actions
    if (logData.eventType === 'ADMIN_ACTION' && logData.severity === 'HIGH') {
      await this.alertHighRiskAdminAction(logData);
    }
  }

  // Check for failed login attempts from same IP
  async checkFailedLoginAttempts(logData) {
    const recentFailures = await AuditLog.countDocuments({
      eventType: 'AUTH_LOGIN_FAILED',
      ipAddress: logData.ipAddress,
      timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
    });
    
    if (recentFailures >= 5) {
      // Trigger security alert
      console.warn(`Security Alert: ${recentFailures} failed login attempts from IP ${logData.ipAddress}`);
      // In production, send to security monitoring service
    }
  }

  // Alert for suspicious file uploads
  async alertSuspiciousFileUpload(logData) {
    console.warn('Security Alert: Suspicious file upload detected', {
      userId: logData.userId,
      ipAddress: logData.ipAddress,
      filename: logData.metadata?.filename,
      riskScore: logData.riskScore
    });
  }

  // Alert for high-risk admin actions
  async alertHighRiskAdminAction(logData) {
    console.warn('Security Alert: High-risk admin action performed', {
      adminId: logData.userId,
      action: logData.action,
      ipAddress: logData.ipAddress,
      severity: logData.severity
    });
  }

  // Query methods for audit log analysis
  async getLogsByUser(userId, startDate, endDate, limit = 100) {
    return AuditLog.find({
      userId,
      timestamp: { $gte: startDate, $lte: endDate }
    })
    .sort({ timestamp: -1 })
    .limit(limit);
  }

  async getLogsByEventType(eventType, startDate, endDate, limit = 100) {
    return AuditLog.find({
      eventType,
      timestamp: { $gte: startDate, $lte: endDate }
    })
    .sort({ timestamp: -1 })
    .limit(limit);
  }

  async getHighRiskLogs(startDate, endDate, limit = 100) {
    return AuditLog.find({
      $or: [
        { severity: 'HIGH' },
        { severity: 'CRITICAL' },
        { riskScore: { $gte: 70 } }
      ],
      timestamp: { $gte: startDate, $lte: endDate }
    })
    .sort({ riskScore: -1, timestamp: -1 })
    .limit(limit);
  }

  async getLogsByIP(ipAddress, startDate, endDate, limit = 100) {
    return AuditLog.find({
      ipAddress,
      timestamp: { $gte: startDate, $lte: endDate }
    })
    .sort({ timestamp: -1 })
    .limit(limit);
  }
}

// Export the service instance
export default new AuditLogService();
