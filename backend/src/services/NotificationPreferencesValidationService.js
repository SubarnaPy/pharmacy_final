/**
 * Notification Preferences Validation Service
 * Handles validation logic for user notification preferences
 */
class NotificationPreferencesValidationService {
  
  /**
   * Validate complete notification preferences object
   * @param {Object} preferences - Preferences object to validate
   * @returns {Object} - Validation result with isValid flag and errors array
   */
  static validatePreferences(preferences) {
    const errors = [];
    
    if (!preferences || typeof preferences !== 'object') {
      errors.push('Preferences must be a valid object');
      return { isValid: false, errors };
    }
    
    // Validate global settings
    if (preferences.globalSettings) {
      const globalErrors = this.validateGlobalSettings(preferences.globalSettings);
      errors.push(...globalErrors);
    }
    
    // Validate channels
    if (preferences.channels) {
      const channelErrors = this.validateChannels(preferences.channels);
      errors.push(...channelErrors);
    }
    
    // Validate categories
    if (preferences.categories) {
      const categoryErrors = this.validateCategories(preferences.categories);
      errors.push(...categoryErrors);
    }
    
    // Validate notification types
    if (preferences.notificationTypes) {
      const typeErrors = this.validateNotificationTypes(preferences.notificationTypes);
      errors.push(...typeErrors);
    }
    
    // Validate contact info
    if (preferences.contactInfo) {
      const contactErrors = this.validateContactInfo(preferences.contactInfo);
      errors.push(...contactErrors);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate global settings
   * @param {Object} globalSettings - Global settings object
   * @returns {Array} - Array of validation errors
   */
  static validateGlobalSettings(globalSettings) {
    const errors = [];
    
    if (typeof globalSettings !== 'object') {
      errors.push('Global settings must be an object');
      return errors;
    }
    
    // Validate enabled flag
    if (globalSettings.enabled !== undefined && typeof globalSettings.enabled !== 'boolean') {
      errors.push('Global enabled setting must be a boolean');
    }
    
    // Validate quiet hours
    if (globalSettings.quietHours) {
      const quietHoursErrors = this.validateQuietHours(globalSettings.quietHours);
      errors.push(...quietHoursErrors);
    }
    
    // Validate frequency
    if (globalSettings.frequency) {
      const validFrequencies = ['immediate', 'hourly', 'daily', 'weekly'];
      if (!validFrequencies.includes(globalSettings.frequency)) {
        errors.push('Invalid frequency. Must be immediate, hourly, daily, or weekly');
      }
    }
    
    return errors;
  }
  
  /**
   * Validate quiet hours settings
   * @param {Object} quietHours - Quiet hours object
   * @returns {Array} - Array of validation errors
   */
  static validateQuietHours(quietHours) {
    const errors = [];
    
    if (typeof quietHours !== 'object') {
      errors.push('Quiet hours must be an object');
      return errors;
    }
    
    // Validate enabled flag
    if (quietHours.enabled !== undefined && typeof quietHours.enabled !== 'boolean') {
      errors.push('Quiet hours enabled setting must be a boolean');
    }
    
    // If quiet hours are enabled, validate time settings
    if (quietHours.enabled) {
      if (!quietHours.startTime || !quietHours.endTime) {
        errors.push('Quiet hours start and end times are required when enabled');
      }
      
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (quietHours.startTime && !timeRegex.test(quietHours.startTime)) {
        errors.push('Invalid start time format. Use HH:MM format (e.g., 22:00)');
      }
      
      if (quietHours.endTime && !timeRegex.test(quietHours.endTime)) {
        errors.push('Invalid end time format. Use HH:MM format (e.g., 08:00)');
      }
      
      // Validate timezone
      if (quietHours.timezone && typeof quietHours.timezone !== 'string') {
        errors.push('Timezone must be a string');
      }
    }
    
    return errors;
  }
  
  /**
   * Validate channel preferences
   * @param {Object} channels - Channels object
   * @returns {Array} - Array of validation errors
   */
  static validateChannels(channels) {
    const errors = [];
    const validChannels = ['websocket', 'email', 'sms'];
    
    if (typeof channels !== 'object') {
      errors.push('Channels must be an object');
      return errors;
    }
    
    Object.keys(channels).forEach(channel => {
      if (!validChannels.includes(channel)) {
        errors.push(`Invalid channel: ${channel}. Valid channels are: ${validChannels.join(', ')}`);
        return;
      }
      
      const channelPrefs = channels[channel];
      if (typeof channelPrefs !== 'object') {
        errors.push(`Channel ${channel} preferences must be an object`);
        return;
      }
      
      // Validate enabled flag
      if (channelPrefs.enabled !== undefined && typeof channelPrefs.enabled !== 'boolean') {
        errors.push(`Channel ${channel} enabled setting must be a boolean`);
      }
      
      // Channel-specific validations
      if (channel === 'email') {
        if (channelPrefs.frequency && !['immediate', 'digest'].includes(channelPrefs.frequency)) {
          errors.push('Email frequency must be immediate or digest');
        }
        
        if (channelPrefs.digestTime) {
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(channelPrefs.digestTime)) {
            errors.push('Invalid digest time format. Use HH:MM format (e.g., 09:00)');
          }
        }
      }
      
      if (channel === 'sms') {
        if (channelPrefs.emergencyOnly !== undefined && typeof channelPrefs.emergencyOnly !== 'boolean') {
          errors.push('SMS emergencyOnly setting must be a boolean');
        }
      }
    });
    
    return errors;
  }
  
  /**
   * Validate category preferences
   * @param {Object} categories - Categories object
   * @returns {Array} - Array of validation errors
   */
  static validateCategories(categories) {
    const errors = [];
    const validCategories = ['medical', 'administrative', 'system', 'marketing'];
    const validChannels = ['websocket', 'email', 'sms'];
    const validPriorities = ['all', 'high', 'critical'];
    
    if (typeof categories !== 'object') {
      errors.push('Categories must be an object');
      return errors;
    }
    
    Object.keys(categories).forEach(category => {
      if (!validCategories.includes(category)) {
        errors.push(`Invalid category: ${category}. Valid categories are: ${validCategories.join(', ')}`);
        return;
      }
      
      const categoryPrefs = categories[category];
      if (typeof categoryPrefs !== 'object') {
        errors.push(`Category ${category} preferences must be an object`);
        return;
      }
      
      // Validate enabled flag
      if (categoryPrefs.enabled !== undefined && typeof categoryPrefs.enabled !== 'boolean') {
        errors.push(`Category ${category} enabled setting must be a boolean`);
      }
      
      // Validate channels array
      if (categoryPrefs.channels !== undefined) {
        if (!Array.isArray(categoryPrefs.channels)) {
          errors.push(`Category ${category} channels must be an array`);
        } else {
          categoryPrefs.channels.forEach(channel => {
            if (!validChannels.includes(channel)) {
              errors.push(`Invalid channel ${channel} in category ${category}. Valid channels are: ${validChannels.join(', ')}`);
            }
          });
        }
      }
      
      // Validate priority
      if (categoryPrefs.priority && !validPriorities.includes(categoryPrefs.priority)) {
        errors.push(`Invalid priority ${categoryPrefs.priority} in category ${category}. Valid priorities are: ${validPriorities.join(', ')}`);
      }
    });
    
    return errors;
  }
  
  /**
   * Validate notification type preferences
   * @param {Object} notificationTypes - Notification types object
   * @returns {Array} - Array of validation errors
   */
  static validateNotificationTypes(notificationTypes) {
    const errors = [];
    const validTypes = [
      'prescription_created', 'prescription_ready', 'order_status_changed',
      'appointment_reminder', 'payment_processed', 'inventory_alerts',
      'system_maintenance', 'security_alerts'
    ];
    const validChannels = ['websocket', 'email', 'sms'];
    
    if (typeof notificationTypes !== 'object') {
      errors.push('Notification types must be an object');
      return errors;
    }
    
    Object.keys(notificationTypes).forEach(type => {
      if (!validTypes.includes(type)) {
        errors.push(`Invalid notification type: ${type}. Valid types are: ${validTypes.join(', ')}`);
        return;
      }
      
      const typePrefs = notificationTypes[type];
      if (typeof typePrefs !== 'object') {
        errors.push(`Notification type ${type} preferences must be an object`);
        return;
      }
      
      // Validate enabled flag
      if (typePrefs.enabled !== undefined && typeof typePrefs.enabled !== 'boolean') {
        errors.push(`Notification type ${type} enabled setting must be a boolean`);
      }
      
      // Validate channels array
      if (typePrefs.channels !== undefined) {
        if (!Array.isArray(typePrefs.channels)) {
          errors.push(`Notification type ${type} channels must be an array`);
        } else {
          typePrefs.channels.forEach(channel => {
            if (!validChannels.includes(channel)) {
              errors.push(`Invalid channel ${channel} in notification type ${type}. Valid channels are: ${validChannels.join(', ')}`);
            }
          });
        }
      }
    });
    
    return errors;
  }
  
  /**
   * Validate contact information
   * @param {Object} contactInfo - Contact info object
   * @returns {Array} - Array of validation errors
   */
  static validateContactInfo(contactInfo) {
    const errors = [];
    
    if (typeof contactInfo !== 'object') {
      errors.push('Contact info must be an object');
      return errors;
    }
    
    // Validate email format
    if (contactInfo.email !== undefined) {
      if (typeof contactInfo.email !== 'string') {
        errors.push('Email must be a string');
      } else if (contactInfo.email && !this.isValidEmail(contactInfo.email)) {
        errors.push('Invalid email format');
      }
    }
    
    // Validate phone format
    if (contactInfo.phone !== undefined) {
      if (typeof contactInfo.phone !== 'string') {
        errors.push('Phone must be a string');
      } else if (contactInfo.phone && !this.isValidPhone(contactInfo.phone)) {
        errors.push('Invalid phone format. Use international format (e.g., +1234567890)');
      }
    }
    
    // Validate preferred language
    if (contactInfo.preferredLanguage !== undefined) {
      if (typeof contactInfo.preferredLanguage !== 'string') {
        errors.push('Preferred language must be a string');
      } else if (contactInfo.preferredLanguage && !this.isValidLanguageCode(contactInfo.preferredLanguage)) {
        errors.push('Invalid language code. Use ISO 639-1 format (e.g., en, es, fr)');
      }
    }
    
    return errors;
  }
  
  /**
   * Validate email format
   * @param {String} email - Email to validate
   * @returns {Boolean} - True if valid email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validate phone format (international format)
   * @param {String} phone - Phone number to validate
   * @returns {Boolean} - True if valid phone format
   */
  static isValidPhone(phone) {
    // Allow international format with + and digits, spaces, hyphens, parentheses
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    // Remove common formatting characters for validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  }
  
  /**
   * Validate language code (ISO 639-1)
   * @param {String} languageCode - Language code to validate
   * @returns {Boolean} - True if valid language code
   */
  static isValidLanguageCode(languageCode) {
    // Common ISO 639-1 language codes
    const validLanguageCodes = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
      'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi', 'he',
      'th', 'vi', 'id', 'ms', 'tl', 'sw', 'am', 'bn', 'gu', 'kn',
      'ml', 'mr', 'pa', 'ta', 'te', 'ur'
    ];
    return validLanguageCodes.includes(languageCode.toLowerCase());
  }
  
  /**
   * Validate partial preferences update
   * @param {Object} partialPreferences - Partial preferences object
   * @returns {Object} - Validation result
   */
  static validatePartialPreferences(partialPreferences) {
    // For partial updates, we only validate the fields that are present
    const tempPreferences = { ...partialPreferences };
    return this.validatePreferences(tempPreferences);
  }
  
  /**
   * Sanitize preferences object by removing invalid fields
   * @param {Object} preferences - Preferences object to sanitize
   * @returns {Object} - Sanitized preferences object
   */
  static sanitizePreferences(preferences) {
    const sanitized = {};
    
    // Only include valid top-level fields
    const validTopLevelFields = [
      'globalSettings', 'channels', 'categories', 'notificationTypes', 'contactInfo'
    ];
    
    validTopLevelFields.forEach(field => {
      if (preferences[field] !== undefined) {
        sanitized[field] = preferences[field];
      }
    });
    
    return sanitized;
  }
  
  /**
   * Get default preferences structure
   * @returns {Object} - Default preferences object
   */
  static getDefaultPreferencesStructure() {
    return {
      globalSettings: {
        enabled: true,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC'
        },
        frequency: 'immediate'
      },
      channels: {
        websocket: { enabled: true },
        email: { 
          enabled: true,
          frequency: 'immediate',
          digestTime: '09:00'
        },
        sms: { 
          enabled: false,
          emergencyOnly: true
        }
      },
      categories: {
        medical: {
          enabled: true,
          channels: ['websocket', 'email'],
          priority: 'all'
        },
        administrative: {
          enabled: true,
          channels: ['websocket', 'email'],
          priority: 'high'
        },
        system: {
          enabled: true,
          channels: ['websocket'],
          priority: 'critical'
        },
        marketing: {
          enabled: false,
          channels: ['email'],
          priority: 'all'
        }
      },
      notificationTypes: {
        prescription_created: { enabled: true, channels: ['websocket', 'email'] },
        prescription_ready: { enabled: true, channels: ['websocket', 'email', 'sms'] },
        order_status_changed: { enabled: true, channels: ['websocket', 'email'] },
        appointment_reminder: { enabled: true, channels: ['websocket', 'email', 'sms'] },
        payment_processed: { enabled: true, channels: ['websocket', 'email'] },
        inventory_alerts: { enabled: true, channels: ['websocket', 'email'] },
        system_maintenance: { enabled: true, channels: ['websocket', 'email'] },
        security_alerts: { enabled: true, channels: ['websocket', 'email', 'sms'] }
      },
      contactInfo: {
        email: '',
        phone: '',
        preferredLanguage: 'en'
      }
    };
  }
}

export default NotificationPreferencesValidationService;