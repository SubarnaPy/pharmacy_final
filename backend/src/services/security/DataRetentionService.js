import mongoose from 'mongoose';
import cron from 'node-cron';

/**
 * Service for managing data retention and cleanup policies
 * Implements automated data lifecycle management for notifications
 */
class DataRetentionService {
  constructor() {
    this.retentionPolicies = {
      // Notification data retention
      notifications: {
        'low': 30, // 30 days for low priority notifications
        'medium': 90, // 90 days for medium priority
        'high': 365, // 1 year for high priority
        'critical': 2555, // 7 years for critical notifications
        'emergency': 2555 // 7 years for emergency notifications
      },
      
      // Analytics data retention
      analytics: {
        'daily': 90, // 90 days for daily analytics
        'weekly': 365, // 1 year for weekly analytics
        'monthly': 2555, // 7 years for monthly analytics
        'yearly': 3650 // 10 years for yearly analytics
      },
      
      // Audit log retention (handled by AuditService)
      auditLogs: {
        'operational': 365, // 1 year
        'security': 2555, // 7 years
        'compliance': 2555, // 7 years
        'debug': 30 // 30 days
      },
      
      // User preference history
      preferenceHistory: {
        'active': 365, // 1 year for active users
        'inactive': 90 // 90 days for inactive users
      },
      
      // Template usage data
      templateUsage: {
        'active': 365, // 1 year for active templates
        'deprecated': 90 // 90 days for deprecated templates
      }
    };

    this.cleanupSchedules = {
      daily: '0 2 * * *', // 2 AM daily
      weekly: '0 3 * * 0', // 3 AM every Sunday
      monthly: '0 4 1 * *' // 4 AM on 1st of each month
    };

    this.isInitialized = false;
  }

  /**
   * Initialize the data retention service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Schedule automated cleanup tasks
      this.scheduleCleanupTasks();
      
      // Create necessary indexes for efficient cleanup
      await this.createRetentionIndexes();
      
      this.isInitialized = true;
      console.log('Data Retention Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Data Retention Service:', error);
      throw error;
    }
  }

  /**
   * Schedule automated cleanup tasks
   */
  scheduleCleanupTasks() {
    // Daily cleanup for expired notifications
    cron.schedule(this.cleanupSchedules.daily, async () => {
      console.log('Running daily notification cleanup...');
      await this.cleanupExpiredNotifications();
    });

    // Weekly cleanup for analytics data
    cron.schedule(this.cleanupSchedules.weekly, async () => {
      console.log('Running weekly analytics cleanup...');
      await this.cleanupExpiredAnalytics();
    });

    // Monthly cleanup for preference history
    cron.schedule(this.cleanupSchedules.monthly, async () => {
      console.log('Running monthly preference history cleanup...');
      await this.cleanupPreferenceHistory();
    });

    console.log('Data retention cleanup tasks scheduled');
  }

  /**
   * Create database indexes for efficient retention queries
   */
  async createRetentionIndexes() {
    try {
      const db = mongoose.connection.db;

      // Notification indexes
      await db.collection('notifications').createIndex(
        { createdAt: 1, priority: 1 },
        { name: 'retention_notifications_idx' }
      );

      // Analytics indexes
      await db.collection('notification_analytics').createIndex(
        { date: 1, aggregationType: 1 },
        { name: 'retention_analytics_idx' }
      );

      // Audit log indexes (if not created by AuditService)
      await db.collection('notification_audit_logs').createIndex(
        { timestamp: 1, category: 1 },
        { name: 'retention_audit_idx' }
      );

      console.log('Retention indexes created successfully');
    } catch (error) {
      console.error('Failed to create retention indexes:', error);
    }
  }

  /**
   * Clean up expired notifications based on retention policy
   * @returns {Object} Cleanup results
   */
  async cleanupExpiredNotifications() {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('notifications');
      
      const results = {
        totalProcessed: 0,
        totalDeleted: 0,
        byPriority: {},
        errors: []
      };

      // Process each priority level
      for (const [priority, retentionDays] of Object.entries(this.retentionPolicies.notifications)) {
        try {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

          // Find notifications to delete
          const query = {
            priority: priority,
            createdAt: { $lt: cutoffDate },
            // Don't delete notifications that are still being processed
            'recipients.deliveryStatus.websocket.status': { $ne: 'pending' },
            'recipients.deliveryStatus.email.status': { $ne: 'pending' },
            'recipients.deliveryStatus.sms.status': { $ne: 'pending' }
          };

          const deleteResult = await collection.deleteMany(query);
          
          results.byPriority[priority] = {
            retentionDays,
            cutoffDate,
            deletedCount: deleteResult.deletedCount
          };

          results.totalDeleted += deleteResult.deletedCount;
          
        } catch (error) {
          results.errors.push({
            priority,
            error: error.message
          });
        }
      }

      // Log cleanup activity
      await this.logCleanupActivity('notifications', results);
      
      return results;
    } catch (error) {
      console.error('Failed to cleanup expired notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up expired analytics data
   * @returns {Object} Cleanup results
   */
  async cleanupExpiredAnalytics() {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('notification_analytics');
      
      const results = {
        totalProcessed: 0,
        totalDeleted: 0,
        byType: {},
        errors: []
      };

      // Process each analytics type
      for (const [type, retentionDays] of Object.entries(this.retentionPolicies.analytics)) {
        try {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

          const query = {
            aggregationType: type,
            date: { $lt: cutoffDate }
          };

          const deleteResult = await collection.deleteMany(query);
          
          results.byType[type] = {
            retentionDays,
            cutoffDate,
            deletedCount: deleteResult.deletedCount
          };

          results.totalDeleted += deleteResult.deletedCount;
          
        } catch (error) {
          results.errors.push({
            type,
            error: error.message
          });
        }
      }

      // Log cleanup activity
      await this.logCleanupActivity('analytics', results);
      
      return results;
    } catch (error) {
      console.error('Failed to cleanup expired analytics:', error);
      throw error;
    }
  }

  /**
   * Clean up old preference history
   * @returns {Object} Cleanup results
   */
  async cleanupPreferenceHistory() {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('user_notification_preferences_history');
      
      const results = {
        totalProcessed: 0,
        totalDeleted: 0,
        byUserType: {},
        errors: []
      };

      // Clean up based on user activity
      for (const [userType, retentionDays] of Object.entries(this.retentionPolicies.preferenceHistory)) {
        try {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

          let query;
          if (userType === 'active') {
            // Keep history for users who have been active recently
            query = {
              updatedAt: { $lt: cutoffDate },
              'user.lastLoginAt': { $gte: cutoffDate }
            };
          } else {
            // Clean up history for inactive users
            query = {
              updatedAt: { $lt: cutoffDate },
              'user.lastLoginAt': { $lt: cutoffDate }
            };
          }

          const deleteResult = await collection.deleteMany(query);
          
          results.byUserType[userType] = {
            retentionDays,
            cutoffDate,
            deletedCount: deleteResult.deletedCount
          };

          results.totalDeleted += deleteResult.deletedCount;
          
        } catch (error) {
          results.errors.push({
            userType,
            error: error.message
          });
        }
      }

      // Log cleanup activity
      await this.logCleanupActivity('preference_history', results);
      
      return results;
    } catch (error) {
      console.error('Failed to cleanup preference history:', error);
      throw error;
    }
  }

  /**
   * Archive old data instead of deleting
   * @param {string} dataType - Type of data to archive
   * @param {Object} criteria - Archive criteria
   * @returns {Object} Archive results
   */
  async archiveOldData(dataType, criteria) {
    try {
      const db = mongoose.connection.db;
      const sourceCollection = db.collection(criteria.sourceCollection);
      const archiveCollection = db.collection(`${criteria.sourceCollection}_archive`);
      
      // Find data to archive
      const dataToArchive = await sourceCollection.find(criteria.query).toArray();
      
      if (dataToArchive.length === 0) {
        return { archivedCount: 0, message: 'No data to archive' };
      }

      // Add archive metadata
      const archivedData = dataToArchive.map(item => ({
        ...item,
        _archived: true,
        _archivedAt: new Date(),
        _archivedBy: 'system',
        _originalCollection: criteria.sourceCollection
      }));

      // Insert into archive collection
      await archiveCollection.insertMany(archivedData);
      
      // Remove from source collection
      const deleteResult = await sourceCollection.deleteMany(criteria.query);
      
      // Log archive activity
      await this.logArchiveActivity(dataType, {
        archivedCount: archivedData.length,
        deletedCount: deleteResult.deletedCount,
        criteria: criteria
      });

      return {
        archivedCount: archivedData.length,
        deletedCount: deleteResult.deletedCount
      };
    } catch (error) {
      console.error('Failed to archive old data:', error);
      throw error;
    }
  }

  /**
   * Get retention policy for specific data type
   * @param {string} dataType - Type of data
   * @param {string} subType - Sub-type or priority
   * @returns {number} Retention period in days
   */
  getRetentionPeriod(dataType, subType = 'default') {
    const policy = this.retentionPolicies[dataType];
    if (!policy) {
      return 365; // Default 1 year
    }

    return policy[subType] || policy.default || 365;
  }

  /**
   * Update retention policy
   * @param {string} dataType - Type of data
   * @param {string} subType - Sub-type or priority
   * @param {number} retentionDays - New retention period in days
   */
  updateRetentionPolicy(dataType, subType, retentionDays) {
    if (!this.retentionPolicies[dataType]) {
      this.retentionPolicies[dataType] = {};
    }
    
    this.retentionPolicies[dataType][subType] = retentionDays;
    
    console.log(`Updated retention policy: ${dataType}.${subType} = ${retentionDays} days`);
  }

  /**
   * Get data retention status
   * @param {string} dataType - Type of data to check
   * @returns {Object} Retention status
   */
  async getRetentionStatus(dataType) {
    try {
      const db = mongoose.connection.db;
      const status = {
        dataType,
        totalRecords: 0,
        retentionBreakdown: {},
        nextCleanupDate: null,
        estimatedCleanupCount: 0
      };

      switch (dataType) {
        case 'notifications':
          status.totalRecords = await db.collection('notifications').countDocuments();
          
          for (const [priority, retentionDays] of Object.entries(this.retentionPolicies.notifications)) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            
            const expiredCount = await db.collection('notifications').countDocuments({
              priority: priority,
              createdAt: { $lt: cutoffDate }
            });
            
            status.retentionBreakdown[priority] = {
              retentionDays,
              expiredCount
            };
            
            status.estimatedCleanupCount += expiredCount;
          }
          break;

        case 'analytics':
          status.totalRecords = await db.collection('notification_analytics').countDocuments();
          
          for (const [type, retentionDays] of Object.entries(this.retentionPolicies.analytics)) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            
            const expiredCount = await db.collection('notification_analytics').countDocuments({
              aggregationType: type,
              date: { $lt: cutoffDate }
            });
            
            status.retentionBreakdown[type] = {
              retentionDays,
              expiredCount
            };
            
            status.estimatedCleanupCount += expiredCount;
          }
          break;
      }

      // Calculate next cleanup date
      status.nextCleanupDate = this.getNextCleanupDate(dataType);

      return status;
    } catch (error) {
      console.error('Failed to get retention status:', error);
      throw error;
    }
  }

  /**
   * Perform manual cleanup
   * @param {string} dataType - Type of data to clean
   * @param {Object} options - Cleanup options
   * @returns {Object} Cleanup results
   */
  async performManualCleanup(dataType, options = {}) {
    try {
      let results;

      switch (dataType) {
        case 'notifications':
          results = await this.cleanupExpiredNotifications();
          break;
        case 'analytics':
          results = await this.cleanupExpiredAnalytics();
          break;
        case 'preference_history':
          results = await this.cleanupPreferenceHistory();
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      // Log manual cleanup
      await this.logManualCleanup(dataType, results, options);

      return results;
    } catch (error) {
      console.error('Manual cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Export data before cleanup
   * @param {string} dataType - Type of data to export
   * @param {Object} criteria - Export criteria
   * @returns {Object} Export results
   */
  async exportDataBeforeCleanup(dataType, criteria) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(criteria.collection);
      
      // Find data to export
      const dataToExport = await collection.find(criteria.query).toArray();
      
      if (dataToExport.length === 0) {
        return { exportedCount: 0, message: 'No data to export' };
      }

      // Create export file (in production, this would go to cloud storage)
      const exportData = {
        exportId: this.generateExportId(),
        exportedAt: new Date(),
        dataType: dataType,
        criteria: criteria,
        recordCount: dataToExport.length,
        data: dataToExport
      };

      // In production, save to cloud storage (S3, Azure Blob, etc.)
      const exportPath = `exports/${dataType}_${exportData.exportId}.json`;
      console.log(`Data exported to: ${exportPath}`);
      
      // Log export activity
      await this.logExportActivity(dataType, exportData);

      return {
        exportedCount: dataToExport.length,
        exportId: exportData.exportId,
        exportPath: exportPath
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Get next cleanup date for data type
   * @param {string} dataType - Type of data
   * @returns {Date} Next cleanup date
   */
  getNextCleanupDate(dataType) {
    const now = new Date();
    let nextDate = new Date(now);

    switch (dataType) {
      case 'notifications':
        // Daily cleanup
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(2, 0, 0, 0);
        break;
      case 'analytics':
        // Weekly cleanup
        const daysUntilSunday = 7 - now.getDay();
        nextDate.setDate(nextDate.getDate() + daysUntilSunday);
        nextDate.setHours(3, 0, 0, 0);
        break;
      case 'preference_history':
        // Monthly cleanup
        nextDate.setMonth(nextDate.getMonth() + 1, 1);
        nextDate.setHours(4, 0, 0, 0);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  /**
   * Generate unique export ID
   * @returns {string} Export ID
   */
  generateExportId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `export_${timestamp}_${random}`;
  }

  /**
   * Log cleanup activity
   * @param {string} dataType - Type of data cleaned
   * @param {Object} results - Cleanup results
   */
  async logCleanupActivity(dataType, results) {
    const logEntry = {
      activity: 'data_cleanup',
      dataType: dataType,
      timestamp: new Date(),
      results: results,
      automated: true
    };

    console.log('Data Cleanup Activity:', JSON.stringify(logEntry, null, 2));
    
    // In production, send to audit service
    // await this.auditService.logDataRetentionEvent('cleanup', logEntry);
  }

  /**
   * Log archive activity
   * @param {string} dataType - Type of data archived
   * @param {Object} results - Archive results
   */
  async logArchiveActivity(dataType, results) {
    const logEntry = {
      activity: 'data_archive',
      dataType: dataType,
      timestamp: new Date(),
      results: results,
      automated: true
    };

    console.log('Data Archive Activity:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Log manual cleanup
   * @param {string} dataType - Type of data cleaned
   * @param {Object} results - Cleanup results
   * @param {Object} options - Cleanup options
   */
  async logManualCleanup(dataType, results, options) {
    const logEntry = {
      activity: 'manual_cleanup',
      dataType: dataType,
      timestamp: new Date(),
      results: results,
      options: options,
      automated: false
    };

    console.log('Manual Cleanup Activity:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Log export activity
   * @param {string} dataType - Type of data exported
   * @param {Object} exportData - Export data
   */
  async logExportActivity(dataType, exportData) {
    const logEntry = {
      activity: 'data_export',
      dataType: dataType,
      timestamp: new Date(),
      exportId: exportData.exportId,
      recordCount: exportData.recordCount
    };

    console.log('Data Export Activity:', JSON.stringify(logEntry, null, 2));
  }
}

export default DataRetentionService;