import UserNotificationPreferences from '../models/UserNotificationPreferences.js';

/**
 * Notification Preference Filter Service
 * Handles preference-based notification filtering and routing
 */
class NotificationPreferenceFilterService {
  
  /**
   * Evaluate user preferences for a notification and determine delivery channels
   * @param {String} userId - User ID
   * @param {Object} notification - Notification object
   * @returns {Object} - Evaluation result with channels and delivery decision
   */
  static async evaluateNotificationPreferences(userId, notification) {
    try {
      // Get user preferences
      const preferences = await UserNotificationPreferences.findOne({ userId });
      
      // If no preferences found, use defaults
      if (!preferences) {
        const defaultPreferences = UserNotificationPreferences.getDefaultPreferences(userId);
        return this.evaluatePreferences(defaultPreferences, notification);
      }
      
      return this.evaluatePreferences(preferences, notification);
      
    } catch (error) {
      console.error('❌ Error evaluating notification preferences:', error);
      
      // On error, return safe defaults
      return {
        shouldDeliver: true,
        channels: ['websocket'], // Safe default
        reason: 'error_fallback',
        error: error.message
      };
    }
  }
  
  /**
   * Evaluate preferences against a notification
   * @param {Object} preferences - User preferences object
   * @param {Object} notification - Notification object
   * @returns {Object} - Evaluation result
   */
  static evaluatePreferences(preferences, notification) {
    const result = {
      shouldDeliver: true,
      channels: [],
      reason: 'preferences_evaluated',
      details: {}
    };
    
    // Check if notifications are globally disabled
    if (!preferences.globalSettings?.enabled) {
      // Check for critical override
      if (this.isCriticalNotification(notification)) {
        result.shouldDeliver = true;
        result.channels = ['websocket', 'email', 'sms']; // All channels for critical
        result.reason = 'critical_override';
        return result;
      } else {
        result.shouldDeliver = false;
        result.reason = 'globally_disabled';
        return result;
      }
    }
    
    // Check quiet hours first (before channel evaluation)
    const quietHoursResult = this.checkQuietHours(preferences, notification);
    result.details.quietHours = quietHoursResult;
    
    if (quietHoursResult.inQuietHours && !this.isCriticalNotification(notification)) {
      result.shouldDeliver = false;
      result.reason = 'quiet_hours';
      result.channels = []; // Explicitly set empty channels
      return result;
    }
    
    // Determine channels based on preferences
    const channelResult = this.determineDeliveryChannels(preferences, notification);
    result.channels = channelResult.channels;
    result.details.channelEvaluation = channelResult;
    
    // If no channels are available, don't deliver (unless critical)
    if (result.channels.length === 0) {
      if (this.isCriticalNotification(notification)) {
        result.channels = ['websocket']; // Minimum delivery for critical
        result.reason = 'critical_minimum_delivery';
      } else {
        result.shouldDeliver = false;
        result.reason = 'no_channels_enabled';
      }
    }
    
    return result;
  }
  
  /**
   * Check if current time is within user's quiet hours
   * @param {Object} preferences - User preferences
   * @param {Object} notification - Notification object
   * @returns {Object} - Quiet hours check result
   */
  static checkQuietHours(preferences, notification) {
    const result = {
      inQuietHours: false,
      currentTime: null,
      quietHoursEnabled: false,
      timezone: 'UTC'
    };
    
    const quietHours = preferences.globalSettings?.quietHours;
    if (!quietHours?.enabled) {
      return result;
    }
    
    result.quietHoursEnabled = true;
    result.timezone = quietHours.timezone || 'UTC';
    
    try {
      // Get current time in user's timezone
      const now = new Date();
      const currentTime = this.getTimeInTimezone(now, result.timezone);
      result.currentTime = currentTime;
      
      // Parse quiet hours times
      const startTime = this.parseTime(quietHours.startTime);
      const endTime = this.parseTime(quietHours.endTime);
      
      // Check if current time is within quiet hours
      result.inQuietHours = this.isTimeInRange(currentTime, startTime, endTime);
      
    } catch (error) {
      console.error('❌ Error checking quiet hours:', error);
      result.error = error.message;
    }
    
    return result;
  }
  
  /**
   * Determine which channels should be used for delivery
   * @param {Object} preferences - User preferences
   * @param {Object} notification - Notification object
   * @returns {Object} - Channel determination result
   */
  static determineDeliveryChannels(preferences, notification) {
    const result = {
      channels: [],
      evaluations: {}
    };
    
    const availableChannels = ['websocket', 'email', 'sms'];
    
    for (const channel of availableChannels) {
      const evaluation = this.evaluateChannelForNotification(preferences, notification, channel);
      result.evaluations[channel] = evaluation;
      
      if (evaluation.shouldUse) {
        result.channels.push(channel);
      }
    }
    
    return result;
  }
  
  /**
   * Evaluate if a specific channel should be used for a notification
   * @param {Object} preferences - User preferences
   * @param {Object} notification - Notification object
   * @param {String} channel - Channel to evaluate
   * @returns {Object} - Channel evaluation result
   */
  static evaluateChannelForNotification(preferences, notification, channel) {
    const result = {
      shouldUse: false,
      reason: 'not_evaluated',
      checks: {}
    };
    
    // Check if channel is globally enabled
    const channelPrefs = preferences.channels?.[channel];
    if (!channelPrefs?.enabled) {
      result.reason = 'channel_disabled';
      result.checks.globallyEnabled = false;
      return result;
    }
    result.checks.globallyEnabled = true;
    
    // Check notification type specific preferences
    const notificationType = notification.type;
    const typePrefs = preferences.notificationTypes?.[notificationType];
    
    if (typePrefs) {
      // Check if notification type is enabled
      if (!typePrefs.enabled) {
        result.reason = 'notification_type_disabled';
        result.checks.typeEnabled = false;
        return result;
      }
      result.checks.typeEnabled = true;
      
      // Check if channel is enabled for this notification type
      if (typePrefs.channels && typePrefs.channels.length > 0 && !typePrefs.channels.includes(channel)) {
        result.reason = 'channel_not_enabled_for_type';
        result.checks.channelEnabledForType = false;
        return result;
      }
      result.checks.channelEnabledForType = true;
    } else {
      // If no specific type preferences, assume enabled
      result.checks.typeEnabled = true;
      result.checks.channelEnabledForType = true;
    }
    
    // Check category preferences
    const category = notification.category || this.getCategoryForNotificationType(notificationType);
    const categoryPrefs = preferences.categories?.[category];
    
    if (categoryPrefs) {
      // Check if category is enabled
      if (!categoryPrefs.enabled) {
        result.reason = 'category_disabled';
        result.checks.categoryEnabled = false;
        return result;
      }
      result.checks.categoryEnabled = true;
      
      // Check priority filtering
      const notificationPriority = notification.priority || 'medium';
      if (!this.isPriorityAllowed(categoryPrefs.priority, notificationPriority)) {
        result.reason = 'priority_filtered';
        result.checks.priorityAllowed = false;
        return result;
      }
      result.checks.priorityAllowed = true;
      
      // Check if channel is enabled for this category
      if (categoryPrefs.channels && categoryPrefs.channels.length > 0 && !categoryPrefs.channels.includes(channel)) {
        result.reason = 'channel_not_enabled_for_category';
        result.checks.channelEnabledForCategory = false;
        return result;
      }
      result.checks.channelEnabledForCategory = true;
    } else {
      // If no category preferences, assume enabled
      result.checks.categoryEnabled = true;
      result.checks.priorityAllowed = true;
      result.checks.channelEnabledForCategory = true;
    }
    
    // Check frequency controls
    const frequencyCheck = this.checkFrequencyControls(preferences, notification, channel);
    if (!frequencyCheck.allowed) {
      result.reason = 'frequency_limited';
      result.checks.frequencyAllowed = false;
      result.frequencyDetails = frequencyCheck;
      return result;
    }
    result.checks.frequencyAllowed = true;
    
    // Channel-specific checks
    const channelSpecificCheck = this.performChannelSpecificChecks(preferences, notification, channel);
    if (!channelSpecificCheck.allowed) {
      result.reason = channelSpecificCheck.reason;
      result.checks.channelSpecific = false;
      result.channelSpecificDetails = channelSpecificCheck;
      return result;
    }
    result.checks.channelSpecific = true;
    
    // All checks passed
    result.shouldUse = true;
    result.reason = 'all_checks_passed';
    
    return result;
  }
  
  /**
   * Check if notification meets priority requirements
   * @param {String} allowedPriority - Allowed priority level from preferences
   * @param {String} notificationPriority - Notification priority
   * @returns {Boolean} - True if priority is allowed
   */
  static isPriorityAllowed(allowedPriority, notificationPriority) {
    const priorityLevels = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4,
      'emergency': 5
    };
    
    const allowedLevels = {
      'all': 1,
      'high': 3,
      'critical': 4
    };
    
    const minLevel = allowedLevels[allowedPriority] || 1;
    const notificationLevel = priorityLevels[notificationPriority] || 2;
    
    return notificationLevel >= minLevel;
  }
  
  /**
   * Check frequency controls for notification delivery
   * @param {Object} preferences - User preferences
   * @param {Object} notification - Notification object
   * @param {String} channel - Delivery channel
   * @returns {Object} - Frequency check result
   */
  static checkFrequencyControls(preferences, notification, channel) {
    const result = {
      allowed: true,
      reason: 'no_frequency_limits',
      details: {}
    };
    
    // Global frequency check
    const globalFrequency = preferences.globalSettings?.frequency;
    if (globalFrequency && globalFrequency !== 'immediate') {
      // For non-immediate frequencies, we would need to check against
      // a delivery history or queue system
      // For now, we'll allow immediate delivery but log the preference
      result.details.globalFrequency = globalFrequency;
    }
    
    // Channel-specific frequency checks
    if (channel === 'email') {
      const emailFrequency = preferences.channels?.email?.frequency;
      if (emailFrequency === 'digest') {
        // For digest mode, we would typically queue the notification
        // and send it at the specified digest time
        result.details.emailDigestMode = true;
        result.details.digestTime = preferences.channels.email.digestTime;
      }
    }
    
    // SMS frequency controls (emergency only check)
    if (channel === 'sms') {
      const smsPrefs = preferences.channels?.sms;
      if (smsPrefs?.emergencyOnly && !this.isEmergencyNotification(notification)) {
        result.allowed = false;
        result.reason = 'sms_emergency_only';
        return result;
      }
    }
    
    return result;
  }
  
  /**
   * Perform channel-specific checks
   * @param {Object} preferences - User preferences
   * @param {Object} notification - Notification object
   * @param {String} channel - Channel to check
   * @returns {Object} - Channel-specific check result
   */
  static performChannelSpecificChecks(preferences, notification, channel) {
    const result = {
      allowed: true,
      reason: 'no_channel_restrictions'
    };
    
    switch (channel) {
      case 'email':
        // Check if user has valid email
        if (!preferences.contactInfo?.email) {
          result.allowed = false;
          result.reason = 'no_email_address';
        }
        break;
        
      case 'sms':
        // Check if user has valid phone number
        if (!preferences.contactInfo?.phone) {
          result.allowed = false;
          result.reason = 'no_phone_number';
        }
        break;
        
      case 'websocket':
        // WebSocket is always available if enabled
        break;
        
      default:
        result.allowed = false;
        result.reason = 'unknown_channel';
    }
    
    return result;
  }
  
  /**
   * Check if notification is critical and should override preferences
   * @param {Object} notification - Notification object
   * @returns {Boolean} - True if notification is critical
   */
  static isCriticalNotification(notification) {
    const criticalPriorities = ['critical', 'emergency'];
    const criticalTypes = ['security_alerts', 'system_maintenance'];
    const criticalCategories = ['system'];
    
    return criticalPriorities.includes(notification.priority) ||
           criticalTypes.includes(notification.type) ||
           criticalCategories.includes(notification.category);
  }
  
  /**
   * Check if notification is emergency level
   * @param {Object} notification - Notification object
   * @returns {Boolean} - True if notification is emergency
   */
  static isEmergencyNotification(notification) {
    return notification.priority === 'emergency' ||
           notification.type === 'security_alerts' ||
           (notification.category === 'medical' && notification.priority === 'critical');
  }
  
  /**
   * Get category for notification type
   * @param {String} notificationType - Notification type
   * @returns {String} - Category name
   */
  static getCategoryForNotificationType(notificationType) {
    const typeToCategory = {
      'prescription_created': 'medical',
      'prescription_ready': 'medical',
      'appointment_reminder': 'medical',
      'order_status_changed': 'administrative',
      'payment_processed': 'administrative',
      'inventory_alerts': 'administrative',
      'system_maintenance': 'system',
      'security_alerts': 'system'
    };
    
    return typeToCategory[notificationType] || 'administrative';
  }
  
  /**
   * Get time in specific timezone
   * @param {Date} date - Date object
   * @param {String} timezone - Timezone string
   * @returns {String} - Time in HH:MM format
   */
  static getTimeInTimezone(date, timezone) {
    try {
      const timeString = date.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      return timeString;
    } catch (error) {
      // Fallback to UTC if timezone is invalid
      return date.toISOString().substr(11, 5);
    }
  }
  
  /**
   * Parse time string to minutes since midnight
   * @param {String} timeString - Time in HH:MM format
   * @returns {Number} - Minutes since midnight
   */
  static parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * Check if current time is within a time range
   * @param {String} currentTime - Current time in HH:MM format
   * @param {Number} startMinutes - Start time in minutes since midnight
   * @param {Number} endMinutes - End time in minutes since midnight
   * @returns {Boolean} - True if current time is in range
   */
  static isTimeInRange(currentTime, startMinutes, endMinutes) {
    const currentMinutes = this.parseTime(currentTime);
    
    // Handle overnight ranges (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
  }
  
  /**
   * Bulk evaluate preferences for multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notification - Notification object
   * @returns {Object} - Bulk evaluation results
   */
  static async bulkEvaluatePreferences(userIds, notification) {
    const results = {
      evaluations: {},
      summary: {
        total: userIds.length,
        shouldDeliver: 0,
        shouldNotDeliver: 0,
        errors: 0
      }
    };
    
    const evaluationPromises = userIds.map(async (userId) => {
      try {
        const evaluation = await this.evaluateNotificationPreferences(userId, notification);
        results.evaluations[userId] = evaluation;
        
        if (evaluation.shouldDeliver) {
          results.summary.shouldDeliver++;
        } else {
          results.summary.shouldNotDeliver++;
        }
        
      } catch (error) {
        results.evaluations[userId] = {
          shouldDeliver: false,
          channels: [],
          reason: 'evaluation_error',
          error: error.message
        };
        results.summary.errors++;
      }
    });
    
    await Promise.all(evaluationPromises);
    
    return results;
  }
  
  /**
   * Get filtered recipients based on preferences
   * @param {Array} recipients - Array of recipient objects with userId
   * @param {Object} notification - Notification object
   * @returns {Array} - Filtered recipients with delivery channels
   */
  static async getFilteredRecipients(recipients, notification) {
    const filteredRecipients = [];
    
    for (const recipient of recipients) {
      try {
        const evaluation = await this.evaluateNotificationPreferences(recipient.userId, notification);
        
        if (evaluation.shouldDeliver && evaluation.channels.length > 0) {
          filteredRecipients.push({
            ...recipient,
            deliveryChannels: evaluation.channels,
            preferenceEvaluation: evaluation
          });
        }
        
      } catch (error) {
        console.error(`❌ Error evaluating preferences for user ${recipient.userId}:`, error);
        
        // Include with minimal delivery on error
        filteredRecipients.push({
          ...recipient,
          deliveryChannels: ['websocket'],
          preferenceEvaluation: {
            shouldDeliver: true,
            channels: ['websocket'],
            reason: 'error_fallback',
            error: error.message
          }
        });
      }
    }
    
    return filteredRecipients;
  }
  
  /**
   * Check if user should receive notification based on role and preferences
   * @param {String} userId - User ID
   * @param {String} userRole - User role
   * @param {Object} notification - Notification object
   * @returns {Object} - Role-based evaluation result
   */
  static async evaluateRoleBasedPreferences(userId, userRole, notification) {
    const baseEvaluation = await this.evaluateNotificationPreferences(userId, notification);
    
    // Role-specific overrides
    const roleOverrides = {
      admin: {
        // Admins should receive system notifications regardless of preferences
        systemNotifications: true,
        criticalOverride: true
      },
      doctor: {
        // Doctors should receive medical notifications
        medicalNotifications: true,
        patientRelated: true
      },
      pharmacy: {
        // Pharmacies should receive prescription and order notifications
        prescriptionNotifications: true,
        orderNotifications: true
      },
      patient: {
        // Patients receive notifications based on their preferences
        respectAllPreferences: true
      }
    };
    
    const roleConfig = roleOverrides[userRole] || roleOverrides.patient;
    
    // Apply role-based overrides
    if (roleConfig.systemNotifications && notification.category === 'system') {
      baseEvaluation.shouldDeliver = true;
      if (baseEvaluation.channels.length === 0) {
        baseEvaluation.channels = ['websocket', 'email'];
      }
      baseEvaluation.reason = 'role_override_system';
    }
    
    if (roleConfig.criticalOverride && this.isCriticalNotification(notification)) {
      baseEvaluation.shouldDeliver = true;
      baseEvaluation.channels = ['websocket', 'email', 'sms'];
      baseEvaluation.reason = 'role_override_critical';
    }
    
    return {
      ...baseEvaluation,
      roleConfig,
      userRole
    };
  }
}

export default NotificationPreferenceFilterService;