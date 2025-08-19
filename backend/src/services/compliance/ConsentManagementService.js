import mongoose from 'mongoose';

/**
 * Service for managing user consent and notification preferences
 * Implements opt-out, unsubscribe, and consent tracking mechanisms
 */
class ConsentManagementService {
  constructor() {
    this.consentTypes = {
      'notification_general': {
        name: 'General Notifications',
        description: 'Receive general system notifications and updates',
        required: true,
        category: 'system'
      },
      'notification_medical': {
        name: 'Medical Notifications',
        description: 'Receive notifications about medical appointments, prescriptions, and health updates',
        required: true,
        category: 'medical'
      },
      'notification_marketing': {
        name: 'Marketing Communications',
        description: 'Receive promotional offers, health tips, and marketing communications',
        required: false,
        category: 'marketing'
      },
      'notification_research': {
        name: 'Research Participation',
        description: 'Receive invitations to participate in medical research and clinical studies',
        required: false,
        category: 'research'
      },
      'data_analytics': {
        name: 'Data Analytics',
        description: 'Allow use of anonymized data for analytics and service improvement',
        required: false,
        category: 'analytics'
      },
      'third_party_sharing': {
        name: 'Third Party Sharing',
        description: 'Allow sharing of data with authorized third parties for care coordination',
        required: false,
        category: 'sharing'
      }
    };

    this.optOutReasons = {
      'too_frequent': 'Notifications are too frequent',
      'not_relevant': 'Notifications are not relevant to me',
      'privacy_concerns': 'Privacy and data protection concerns',
      'technical_issues': 'Technical issues with notifications',
      'changed_preferences': 'Changed communication preferences',
      'other': 'Other reason'
    };

    this.unsubscribeTypes = {
      'all': 'Unsubscribe from all notifications',
      'category': 'Unsubscribe from specific category',
      'channel': 'Unsubscribe from specific delivery channel',
      'temporary': 'Temporary pause (can be resumed)'
    };
  }

  /**
   * Get user consent status
   * @param {string} userId - User ID
   * @param {Array} consentTypes - Specific consent types to check
   * @returns {Object} Consent status
   */
  async getUserConsentStatus(userId, consentTypes = null) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('user_consents');
      
      const query = { userId: userId };
      if (consentTypes) {
        query.consentType = { $in: consentTypes };
      }

      const consents = await collection.find(query).toArray();
      
      const consentStatus = {
        userId: userId,
        lastUpdated: null,
        consents: {},
        summary: {
          total: 0,
          granted: 0,
          denied: 0,
          pending: 0
        }
      };

      // Initialize all consent types
      for (const [type, config] of Object.entries(this.consentTypes)) {
        if (!consentTypes || consentTypes.includes(type)) {
          consentStatus.consents[type] = {
            status: 'pending',
            grantedAt: null,
            expiresAt: null,
            version: null,
            required: config.required
          };
        }
      }

      // Update with actual consent data
      consents.forEach(consent => {
        if (consentStatus.consents[consent.consentType]) {
          consentStatus.consents[consent.consentType] = {
            status: consent.status,
            grantedAt: consent.grantedAt,
            expiresAt: consent.expiresAt,
            version: consent.version,
            required: this.consentTypes[consent.consentType]?.required || false,
            metadata: consent.metadata
          };

          if (consent.updatedAt > consentStatus.lastUpdated) {
            consentStatus.lastUpdated = consent.updatedAt;
          }
        }
      });

      // Calculate summary
      Object.values(consentStatus.consents).forEach(consent => {
        consentStatus.summary.total++;
        if (consent.status === 'granted') {
          consentStatus.summary.granted++;
        } else if (consent.status === 'denied') {
          consentStatus.summary.denied++;
        } else {
          consentStatus.summary.pending++;
        }
      });

      return consentStatus;
    } catch (error) {
      console.error('Failed to get user consent status:', error);
      throw error;
    }
  }

  /**
   * Update user consent
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent
   * @param {string} status - Consent status (granted, denied, revoked)
   * @param {Object} options - Additional options
   * @returns {Object} Update result
   */
  async updateUserConsent(userId, consentType, status, options = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('user_consents');
      
      // Validate consent type
      if (!this.consentTypes[consentType]) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      // Validate status
      const validStatuses = ['granted', 'denied', 'revoked', 'expired'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid consent status: ${status}`);
      }

      // Check if required consent is being denied
      if (this.consentTypes[consentType].required && status === 'denied') {
        throw new Error(`Cannot deny required consent: ${consentType}`);
      }

      const consentRecord = {
        userId: userId,
        consentType: consentType,
        status: status,
        version: options.version || '1.0',
        grantedAt: status === 'granted' ? new Date() : null,
        revokedAt: status === 'revoked' ? new Date() : null,
        expiresAt: options.expiresAt || null,
        source: options.source || 'user_action',
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        metadata: options.metadata || {},
        updatedAt: new Date()
      };

      // Upsert consent record
      const result = await collection.replaceOne(
        { userId: userId, consentType: consentType },
        consentRecord,
        { upsert: true }
      );

      // Log consent change
      await this.logConsentChange(userId, consentType, status, options);

      // Update notification preferences based on consent
      await this.updateNotificationPreferences(userId, consentType, status);

      return {
        success: true,
        consentId: result.upsertedId || 'updated',
        status: status,
        updatedAt: consentRecord.updatedAt
      };
    } catch (error) {
      console.error('Failed to update user consent:', error);
      throw error;
    }
  }

  /**
   * Process opt-out request
   * @param {string} userId - User ID
   * @param {string} optOutType - Type of opt-out
   * @param {string} reason - Reason for opt-out
   * @param {Object} options - Additional options
   * @returns {Object} Opt-out result
   */
  async processOptOut(userId, optOutType, reason, options = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('user_opt_outs');
      
      const optOutRecord = {
        userId: userId,
        optOutType: optOutType,
        reason: reason,
        reasonDetails: options.reasonDetails,
        categories: options.categories || [],
        channels: options.channels || [],
        temporary: options.temporary || false,
        resumeDate: options.resumeDate || null,
        processedAt: new Date(),
        source: options.source || 'user_request',
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        status: 'active'
      };

      // Save opt-out record
      const result = await collection.insertOne(optOutRecord);

      // Update related consents
      await this.processOptOutConsents(userId, optOutType, options);

      // Update notification preferences
      await this.processOptOutPreferences(userId, optOutType, options);

      // Send confirmation
      await this.sendOptOutConfirmation(userId, optOutRecord);

      return {
        success: true,
        optOutId: result.insertedId,
        processedAt: optOutRecord.processedAt,
        confirmationSent: true
      };
    } catch (error) {
      console.error('Failed to process opt-out:', error);
      throw error;
    }
  }

  /**
   * Process unsubscribe request
   * @param {string} token - Unsubscribe token
   * @param {Object} options - Additional options
   * @returns {Object} Unsubscribe result
   */
  async processUnsubscribe(token, options = {}) {
    try {
      // Verify unsubscribe token
      const tokenData = await this.verifyUnsubscribeToken(token);
      if (!tokenData) {
        throw new Error('Invalid or expired unsubscribe token');
      }

      const { userId, notificationType, channel } = tokenData;

      // Process unsubscribe based on type
      let result;
      switch (options.unsubscribeType || 'category') {
        case 'all':
          result = await this.unsubscribeFromAll(userId, options);
          break;
        case 'category':
          result = await this.unsubscribeFromCategory(userId, notificationType, options);
          break;
        case 'channel':
          result = await this.unsubscribeFromChannel(userId, channel, options);
          break;
        case 'temporary':
          result = await this.temporaryUnsubscribe(userId, options);
          break;
        default:
          throw new Error('Invalid unsubscribe type');
      }

      // Log unsubscribe action
      await this.logUnsubscribeAction(userId, token, options);

      return result;
    } catch (error) {
      console.error('Failed to process unsubscribe:', error);
      throw error;
    }
  }

  /**
   * Generate unsubscribe token
   * @param {string} userId - User ID
   * @param {string} notificationType - Notification type
   * @param {string} channel - Delivery channel
   * @returns {string} Unsubscribe token
   */
  generateUnsubscribeToken(userId, notificationType, channel) {
    const tokenData = {
      userId: userId,
      notificationType: notificationType,
      channel: channel,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    // In production, this would use proper JWT or similar
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    return token;
  }

  /**
   * Verify unsubscribe token
   * @param {string} token - Unsubscribe token
   * @returns {Object|null} Token data or null if invalid
   */
  async verifyUnsubscribeToken(token) {
    try {
      const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check expiration
      if (new Date(tokenData.expiresAt) < new Date()) {
        return null;
      }

      return tokenData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get consent history for user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Consent history
   */
  async getConsentHistory(userId, options = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('consent_history');
      
      const query = { userId: userId };
      
      if (options.consentType) {
        query.consentType = options.consentType;
      }
      
      if (options.dateRange) {
        query.timestamp = {
          $gte: new Date(options.dateRange.start),
          $lte: new Date(options.dateRange.end)
        };
      }

      const history = await collection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(options.limit || 100)
        .toArray();

      return history;
    } catch (error) {
      console.error('Failed to get consent history:', error);
      throw error;
    }
  }

  /**
   * Generate consent report
   * @param {Object} criteria - Report criteria
   * @returns {Object} Consent report
   */
  async generateConsentReport(criteria = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('user_consents');
      
      const report = {
        reportId: this.generateReportId(),
        generatedAt: new Date(),
        criteria: criteria,
        
        // Overall statistics
        statistics: {
          totalUsers: 0,
          totalConsents: 0,
          consentsByType: {},
          consentsByStatus: {},
          optOutRate: 0
        },
        
        // Trends
        trends: {
          consentGrowth: [],
          optOutTrends: [],
          categoryPreferences: {}
        },
        
        // Compliance metrics
        compliance: {
          requiredConsentsCompliance: 0,
          dataRetentionCompliance: 0,
          consentRenewalRate: 0
        }
      };

      // Aggregate consent data
      const pipeline = [
        { $match: criteria.filters || {} },
        {
          $group: {
            _id: {
              consentType: '$consentType',
              status: '$status'
            },
            count: { $sum: 1 }
          }
        }
      ];

      const aggregationResult = await collection.aggregate(pipeline).toArray();
      
      // Process aggregation results
      aggregationResult.forEach(item => {
        const { consentType, status } = item._id;
        const count = item.count;
        
        if (!report.statistics.consentsByType[consentType]) {
          report.statistics.consentsByType[consentType] = {};
        }
        
        report.statistics.consentsByType[consentType][status] = count;
        report.statistics.consentsByStatus[status] = 
          (report.statistics.consentsByStatus[status] || 0) + count;
        
        report.statistics.totalConsents += count;
      });

      // Calculate compliance metrics
      await this.calculateComplianceMetrics(report);

      return report;
    } catch (error) {
      console.error('Failed to generate consent report:', error);
      throw error;
    }
  }

  /**
   * Check if user has valid consent for notification
   * @param {string} userId - User ID
   * @param {string} notificationType - Notification type
   * @param {string} channel - Delivery channel
   * @returns {boolean} Has valid consent
   */
  async hasValidConsent(userId, notificationType, channel) {
    try {
      // Map notification type to consent type
      const consentType = this.mapNotificationToConsentType(notificationType);
      
      const consentStatus = await this.getUserConsentStatus(userId, [consentType]);
      const consent = consentStatus.consents[consentType];
      
      if (!consent) {
        return false;
      }

      // Check if consent is granted and not expired
      if (consent.status !== 'granted') {
        return false;
      }

      if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
        return false;
      }

      // Check channel-specific opt-outs
      const hasChannelOptOut = await this.hasChannelOptOut(userId, channel);
      if (hasChannelOptOut) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check consent:', error);
      return false; // Fail secure
    }
  }

  // Helper methods

  /**
   * Log consent change
   * @param {string} userId - User ID
   * @param {string} consentType - Consent type
   * @param {string} status - New status
   * @param {Object} options - Additional options
   */
  async logConsentChange(userId, consentType, status, options) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('consent_history');
      
      const logEntry = {
        userId: userId,
        consentType: consentType,
        action: 'consent_updated',
        oldStatus: options.oldStatus,
        newStatus: status,
        timestamp: new Date(),
        source: options.source || 'user_action',
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        metadata: options.metadata || {}
      };

      await collection.insertOne(logEntry);
    } catch (error) {
      console.error('Failed to log consent change:', error);
    }
  }

  /**
   * Update notification preferences based on consent
   * @param {string} userId - User ID
   * @param {string} consentType - Consent type
   * @param {string} status - Consent status
   */
  async updateNotificationPreferences(userId, consentType, status) {
    try {
      // This would update the user's notification preferences
      // based on their consent status
      console.log(`Updating notification preferences for ${userId}: ${consentType} = ${status}`);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  }

  /**
   * Process opt-out related consents
   * @param {string} userId - User ID
   * @param {string} optOutType - Opt-out type
   * @param {Object} options - Options
   */
  async processOptOutConsents(userId, optOutType, options) {
    try {
      if (optOutType === 'all') {
        // Revoke all non-required consents
        for (const [consentType, config] of Object.entries(this.consentTypes)) {
          if (!config.required) {
            await this.updateUserConsent(userId, consentType, 'revoked', {
              source: 'opt_out',
              ...options
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to process opt-out consents:', error);
    }
  }

  /**
   * Process opt-out notification preferences
   * @param {string} userId - User ID
   * @param {string} optOutType - Opt-out type
   * @param {Object} options - Options
   */
  async processOptOutPreferences(userId, optOutType, options) {
    try {
      // This would update notification preferences based on opt-out
      console.log(`Processing opt-out preferences for ${userId}: ${optOutType}`);
    } catch (error) {
      console.error('Failed to process opt-out preferences:', error);
    }
  }

  /**
   * Send opt-out confirmation
   * @param {string} userId - User ID
   * @param {Object} optOutRecord - Opt-out record
   */
  async sendOptOutConfirmation(userId, optOutRecord) {
    try {
      // This would send a confirmation notification
      console.log(`Opt-out confirmation sent to ${userId}`);
    } catch (error) {
      console.error('Failed to send opt-out confirmation:', error);
    }
  }

  /**
   * Unsubscribe from all notifications
   * @param {string} userId - User ID
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async unsubscribeFromAll(userId, options) {
    return await this.processOptOut(userId, 'all', 'unsubscribe_all', options);
  }

  /**
   * Unsubscribe from category
   * @param {string} userId - User ID
   * @param {string} category - Category to unsubscribe from
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async unsubscribeFromCategory(userId, category, options) {
    return await this.processOptOut(userId, 'category', 'unsubscribe_category', {
      ...options,
      categories: [category]
    });
  }

  /**
   * Unsubscribe from channel
   * @param {string} userId - User ID
   * @param {string} channel - Channel to unsubscribe from
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async unsubscribeFromChannel(userId, channel, options) {
    return await this.processOptOut(userId, 'channel', 'unsubscribe_channel', {
      ...options,
      channels: [channel]
    });
  }

  /**
   * Temporary unsubscribe
   * @param {string} userId - User ID
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  async temporaryUnsubscribe(userId, options) {
    return await this.processOptOut(userId, 'temporary', 'temporary_unsubscribe', {
      ...options,
      temporary: true,
      resumeDate: options.resumeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  }

  /**
   * Log unsubscribe action
   * @param {string} userId - User ID
   * @param {string} token - Unsubscribe token
   * @param {Object} options - Options
   */
  async logUnsubscribeAction(userId, token, options) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('unsubscribe_log');
      
      const logEntry = {
        userId: userId,
        token: token,
        action: 'unsubscribe',
        unsubscribeType: options.unsubscribeType,
        timestamp: new Date(),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      };

      await collection.insertOne(logEntry);
    } catch (error) {
      console.error('Failed to log unsubscribe action:', error);
    }
  }

  /**
   * Map notification type to consent type
   * @param {string} notificationType - Notification type
   * @returns {string} Consent type
   */
  mapNotificationToConsentType(notificationType) {
    const mappings = {
      'prescription_created': 'notification_medical',
      'appointment_scheduled': 'notification_medical',
      'test_results': 'notification_medical',
      'promotional_offer': 'notification_marketing',
      'health_tips': 'notification_marketing',
      'system_maintenance': 'notification_general'
    };

    return mappings[notificationType] || 'notification_general';
  }

  /**
   * Check if user has channel opt-out
   * @param {string} userId - User ID
   * @param {string} channel - Channel to check
   * @returns {boolean} Has opt-out
   */
  async hasChannelOptOut(userId, channel) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('user_opt_outs');
      
      const optOut = await collection.findOne({
        userId: userId,
        $or: [
          { optOutType: 'all', status: 'active' },
          { optOutType: 'channel', channels: channel, status: 'active' }
        ]
      });

      return !!optOut;
    } catch (error) {
      console.error('Failed to check channel opt-out:', error);
      return false;
    }
  }

  /**
   * Calculate compliance metrics for report
   * @param {Object} report - Report object
   */
  async calculateComplianceMetrics(report) {
    try {
      // Calculate required consents compliance
      const requiredConsents = Object.entries(this.consentTypes)
        .filter(([_, config]) => config.required)
        .map(([type, _]) => type);

      let compliantUsers = 0;
      let totalUsers = 0;

      // This would query actual user data
      // For now, use mock calculations
      report.compliance.requiredConsentsCompliance = 95; // 95%
      report.compliance.dataRetentionCompliance = 98; // 98%
      report.compliance.consentRenewalRate = 85; // 85%
    } catch (error) {
      console.error('Failed to calculate compliance metrics:', error);
    }
  }

  /**
   * Generate unique report ID
   * @returns {string} Report ID
   */
  generateReportId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `CONSENT_REPORT_${timestamp}_${random}`.toUpperCase();
  }
}

export default ConsentManagementService;