import AuditLog from '../models/AuditLog.js';

/**
 * Audit Service
 * Centralized service for handling audit logging and compliance
 */
class AuditService {
  /**
   * Log an admin action
   */
  async logAction(adminId, action, details = {}, req = null) {
    try {
      const logData = {
        adminId,
        action,
        targetResource: details.targetResource || 'system',
        targetId: details.targetId,
        details: this.sanitizeDetails(details),
        status: details.status || 'success',
        errorMessage: details.errorMessage,
        beforeState: details.beforeState,
        afterState: details.afterState,
        complianceFlags: details.complianceFlags || []
      };

      // Add request metadata if available
      if (req) {
        logData.ipAddress = this.getClientIP(req);
        logData.userAgent = req.get('User-Agent') || 'Unknown';
        logData.sessionId = req.sessionID;
      }

      const auditLog = await AuditLog.createLog(logData);
      return auditLog;
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw to prevent disrupting main operations
      return null;
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getLogs(filters = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        adminId,
        action,
        targetResource,
        targetId,
        dateFrom,
        dateTo,
        status
      } = filters;

      const query = {};
      
      if (adminId) query.adminId = adminId;
      if (action) query.action = action;
      if (targetResource) query.targetResource = targetResource;
      if (targetId) query.targetId = targetId;
      if (status) query.status = status;

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('adminId', 'name email role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      return {
        logs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }
  }

  /**
   * Get logs for a specific resource
   */
  async getResourceLogs(resourceType, resourceId, options = {}) {
    try {
      return await AuditLog.getLogsByResource(resourceType, resourceId, options);
    } catch (error) {
      throw new Error(`Failed to fetch resource logs: ${error.message}`);
    }
  }

  /**
   * Get logs for a specific admin
   */
  async getAdminLogs(adminId, options = {}) {
    try {
      return await AuditLog.getLogsByAdmin(adminId, options);
    } catch (error) {
      throw new Error(`Failed to fetch admin logs: ${error.message}`);
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(timeRange = '30d') {
    try {
      const days = this.parseTimeRange(timeRange);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [
        totalLogs,
        successfulActions,
        failedActions,
        uniqueAdmins,
        actionBreakdown,
        resourceBreakdown,
        timelineData
      ] = await Promise.all([
        AuditLog.countDocuments({ createdAt: { $gte: startDate } }),
        AuditLog.countDocuments({ createdAt: { $gte: startDate }, status: 'success' }),
        AuditLog.countDocuments({ createdAt: { $gte: startDate }, status: 'failure' }),
        AuditLog.distinct('adminId', { createdAt: { $gte: startDate } }),
        this.getActionBreakdown(startDate),
        this.getResourceBreakdown(startDate),
        this.getTimelineData(startDate, days)
      ]);

      return {
        totalLogs,
        successfulActions,
        failedActions,
        uniqueAdmins: uniqueAdmins.length,
        successRate: totalLogs > 0 ? (successfulActions / totalLogs * 100).toFixed(2) : 0,
        actionBreakdown,
        resourceBreakdown,
        timeline: timelineData
      };
    } catch (error) {
      throw new Error(`Failed to get audit statistics: ${error.message}`);
    }
  }

  /**
   * Export audit logs (for compliance)
   */
  async exportLogs(filters = {}, format = 'json') {
    try {
      const { logs } = await this.getLogs({ ...filters, limit: 10000 });
      
      if (format === 'csv') {
        return this.convertToCSV(logs);
      }
      
      return logs;
    } catch (error) {
      throw new Error(`Failed to export audit logs: ${error.message}`);
    }
  }

  /**
   * Clean up old logs (for compliance and storage management)
   */
  async cleanupOldLogs() {
    try {
      const result = await AuditLog.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      return {
        deletedCount: result.deletedCount,
        cleanupDate: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to cleanup old logs: ${error.message}`);
    }
  }

  // Helper methods
  sanitizeDetails(details) {
    // Remove sensitive information
    const sanitized = { ...details };
    
    // Remove password fields
    if (sanitized.password) delete sanitized.password;
    if (sanitized.newPassword) delete sanitized.newPassword;
    if (sanitized.twoFactorSecret) delete sanitized.twoFactorSecret;
    
    return sanitized;
  }

  getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           'Unknown';
  }

  parseTimeRange(timeRange) {
    const match = timeRange.match(/^(\d+)([dwmy])$/);
    if (!match) return 30; // Default to 30 days
    
    const [, value, unit] = match;
    const multipliers = { d: 1, w: 7, m: 30, y: 365 };
    
    return parseInt(value) * (multipliers[unit] || 1);
  }

  async getActionBreakdown(startDate) {
    return await AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
  }

  async getResourceBreakdown(startDate) {
    return await AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$targetResource', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
  }

  async getTimelineData(startDate, days) {
    const pipeline = [
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: days <= 7 ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];

    return await AuditLog.aggregate(pipeline);
  }

  convertToCSV(logs) {
    const headers = [
      'Timestamp',
      'Admin',
      'Action',
      'Resource',
      'Target ID',
      'Status',
      'IP Address',
      'Details'
    ];

    const rows = logs.map(log => [
      log.createdAt,
      log.adminId?.name || log.adminId,
      log.action,
      log.targetResource,
      log.targetId || '',
      log.status,
      log.ipAddress,
      JSON.stringify(log.details)
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }
}

export default new AuditService();
