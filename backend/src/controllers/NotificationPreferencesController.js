import UserNotificationPreferences from '../models/UserNotificationPreferences.js';
import User from '../models/User.js';
import NotificationPreferencesValidationService from '../services/NotificationPreferencesValidationService.js';

/**
 * Notification Preferences Controller
 * Handles CRUD operations for user notification preferences
 */
class NotificationPreferencesController {
  
  /**
   * Get user's notification preferences
   * @route GET /api/notification-preferences
   * @access Private
   */
  static async getUserPreferences(req, res) {
    try {
      const userId = req.user.id;
      
      let preferences = await UserNotificationPreferences.findOne({ userId });
      
      // If no preferences exist, create default ones
      if (!preferences) {
        preferences = UserNotificationPreferences.getDefaultPreferences(userId);
        await preferences.save();
      }
      
      res.json({
        success: true,
        data: preferences
      });
      
    } catch (error) {
      console.error('❌ Get user preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notification preferences'
      });
    }
  }
  
  /**
   * Update user's notification preferences
   * @route PUT /api/notification-preferences
   * @access Private
   */
  static async updateUserPreferences(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      
      // Validate the update data
      const validationResult = NotificationPreferencesValidationService.validatePreferences(updateData);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid preference data',
          errors: validationResult.errors
        });
      }
      
      // Update or create preferences
      let preferences = await UserNotificationPreferences.findOneAndUpdate(
        { userId },
        { 
          ...updateData,
          userId,
          updatedAt: new Date()
        },
        { 
          new: true, 
          upsert: true,
          runValidators: true
        }
      );
      
      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: preferences
      });
      
    } catch (error) {
      console.error('❌ Update user preferences error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: Object.values(error.errors).map(err => err.message)
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences'
      });
    }
  }
  
  /**
   * Reset user's notification preferences to defaults
   * @route POST /api/notification-preferences/reset
   * @access Private
   */
  static async resetUserPreferences(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user info for contact details
      const user = await User.findById(userId).select('email phone preferredLanguage');
      
      // Create default preferences with user's contact info
      const defaultPreferences = UserNotificationPreferences.getDefaultPreferences(userId);
      if (user) {
        defaultPreferences.contactInfo = {
          email: user.email,
          phone: user.phone,
          preferredLanguage: user.preferredLanguage || 'en'
        };
      }
      
      // Replace existing preferences with defaults
      const preferences = await UserNotificationPreferences.findOneAndUpdate(
        { userId },
        defaultPreferences.toObject(),
        { 
          new: true, 
          upsert: true,
          runValidators: true
        }
      );
      
      res.json({
        success: true,
        message: 'Notification preferences reset to defaults',
        data: preferences
      });
      
    } catch (error) {
      console.error('❌ Reset user preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset notification preferences'
      });
    }
  }
  
  /**
   * Update specific notification type preferences
   * @route PATCH /api/notification-preferences/types/:notificationType
   * @access Private
   */
  static async updateNotificationTypePreference(req, res) {
    try {
      const userId = req.user.id;
      const { notificationType } = req.params;
      const { enabled, channels } = req.body;
      
      // Validate notification type
      const validTypes = [
        'prescription_created', 'prescription_ready', 'order_status_changed',
        'appointment_reminder', 'payment_processed', 'inventory_alerts',
        'system_maintenance', 'security_alerts'
      ];
      
      if (!validTypes.includes(notificationType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification type'
        });
      }
      
      // Validate channels if provided
      if (channels && !Array.isArray(channels)) {
        return res.status(400).json({
          success: false,
          message: 'Channels must be an array'
        });
      }
      
      const validChannels = ['websocket', 'email', 'sms'];
      if (channels && !channels.every(channel => validChannels.includes(channel))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid channel specified'
        });
      }
      
      // Update the specific notification type preference
      const updateQuery = {};
      if (enabled !== undefined) {
        updateQuery[`notificationTypes.${notificationType}.enabled`] = enabled;
      }
      if (channels !== undefined) {
        updateQuery[`notificationTypes.${notificationType}.channels`] = channels;
      }
      updateQuery.updatedAt = new Date();
      
      const preferences = await UserNotificationPreferences.findOneAndUpdate(
        { userId },
        { $set: updateQuery },
        { 
          new: true, 
          upsert: true,
          runValidators: true
        }
      );
      
      res.json({
        success: true,
        message: `${notificationType} preferences updated successfully`,
        data: {
          notificationType,
          preferences: preferences.notificationTypes[notificationType]
        }
      });
      
    } catch (error) {
      console.error('❌ Update notification type preference error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification type preference'
      });
    }
  }
  
  /**
   * Update channel preferences
   * @route PATCH /api/notification-preferences/channels/:channel
   * @access Private
   */
  static async updateChannelPreference(req, res) {
    try {
      const userId = req.user.id;
      const { channel } = req.params;
      const updateData = req.body;
      
      // Validate channel
      const validChannels = ['websocket', 'email', 'sms'];
      if (!validChannels.includes(channel)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid channel'
        });
      }
      
      // Build update query
      const updateQuery = { updatedAt: new Date() };
      Object.keys(updateData).forEach(key => {
        updateQuery[`channels.${channel}.${key}`] = updateData[key];
      });
      
      const preferences = await UserNotificationPreferences.findOneAndUpdate(
        { userId },
        { $set: updateQuery },
        { 
          new: true, 
          upsert: true,
          runValidators: true
        }
      );
      
      res.json({
        success: true,
        message: `${channel} channel preferences updated successfully`,
        data: {
          channel,
          preferences: preferences.channels[channel]
        }
      });
      
    } catch (error) {
      console.error('❌ Update channel preference error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update channel preference'
      });
    }
  }
  
  /**
   * Get preferences for multiple users (Admin only)
   * @route GET /api/notification-preferences/users
   * @access Private (Admin)
   */
  static async getMultipleUserPreferences(req, res) {
    try {
      const { userIds, page = 1, limit = 50 } = req.query;
      
      let query = {};
      if (userIds) {
        const userIdArray = Array.isArray(userIds) ? userIds : userIds.split(',');
        query.userId = { $in: userIdArray };
      }
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const preferences = await UserNotificationPreferences.find(query)
        .populate('userId', 'name email role')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await UserNotificationPreferences.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          preferences,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Get multiple user preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user preferences'
      });
    }
  }
  
  /**
   * Bulk update preferences for multiple users (Admin only)
   * @route PUT /api/notification-preferences/bulk
   * @access Private (Admin)
   */
  static async bulkUpdatePreferences(req, res) {
    try {
      const { updates } = req.body; // Array of { userId, preferences }
      
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Updates array is required'
        });
      }
      
      const results = [];
      const errors = [];
      
      for (const update of updates) {
        try {
          const { userId, preferences } = update;
          
          if (!userId || !preferences) {
            errors.push({ userId, error: 'Missing userId or preferences' });
            continue;
          }
          
          // Validate preferences
          const validationResult = NotificationPreferencesValidationService.validatePreferences(preferences);
          if (!validationResult.isValid) {
            errors.push({ userId, error: 'Invalid preferences', details: validationResult.errors });
            continue;
          }
          
          const updatedPreferences = await UserNotificationPreferences.findOneAndUpdate(
            { userId },
            { 
              ...preferences,
              userId,
              updatedAt: new Date()
            },
            { 
              new: true, 
              upsert: true,
              runValidators: true
            }
          );
          
          results.push({ userId, success: true, preferences: updatedPreferences });
          
        } catch (error) {
          errors.push({ userId: update.userId, error: error.message });
        }
      }
      
      res.json({
        success: true,
        message: `Bulk update completed. ${results.length} successful, ${errors.length} failed.`,
        data: {
          successful: results,
          failed: errors
        }
      });
      
    } catch (error) {
      console.error('❌ Bulk update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk update'
      });
    }
  }
  

  
  /**
   * Create default preferences for a new user
   * @param {String} userId - User ID
   * @param {Object} userInfo - User information (email, phone, etc.)
   * @returns {Object} - Created preferences
   */
  static async createDefaultPreferences(userId, userInfo = {}) {
    try {
      const defaultPreferences = UserNotificationPreferences.getDefaultPreferences(userId);
      
      // Set contact info if provided
      if (userInfo.email || userInfo.phone || userInfo.preferredLanguage) {
        defaultPreferences.contactInfo = {
          email: userInfo.email,
          phone: userInfo.phone,
          preferredLanguage: userInfo.preferredLanguage || 'en'
        };
      }
      
      const preferences = await defaultPreferences.save();
      return preferences;
      
    } catch (error) {
      console.error('❌ Create default preferences error:', error);
      throw error;
    }
  }
  
  /**
   * Migrate preferences for schema updates
   * @param {String} userId - User ID (optional, migrates all if not provided)
   * @returns {Object} - Migration result
   */
  static async migratePreferences(userId = null) {
    try {
      const query = userId ? { userId } : {};
      const preferences = await UserNotificationPreferences.find(query);
      
      let migrated = 0;
      let errors = 0;
      
      for (const pref of preferences) {
        try {
          // Add any missing notification types with defaults
          const defaultTypes = {
            prescription_created: { enabled: true, channels: ['websocket', 'email'] },
            prescription_ready: { enabled: true, channels: ['websocket', 'email', 'sms'] },
            order_status_changed: { enabled: true, channels: ['websocket', 'email'] },
            appointment_reminder: { enabled: true, channels: ['websocket', 'email', 'sms'] },
            payment_processed: { enabled: true, channels: ['websocket', 'email'] },
            inventory_alerts: { enabled: true, channels: ['websocket', 'email'] },
            system_maintenance: { enabled: true, channels: ['websocket', 'email'] },
            security_alerts: { enabled: true, channels: ['websocket', 'email', 'sms'] }
          };
          
          let updated = false;
          Object.keys(defaultTypes).forEach(type => {
            if (!pref.notificationTypes[type]) {
              pref.notificationTypes[type] = defaultTypes[type];
              updated = true;
            }
          });
          
          if (updated) {
            await pref.save();
            migrated++;
          }
          
        } catch (error) {
          console.error(`❌ Migration error for user ${pref.userId}:`, error);
          errors++;
        }
      }
      
      return {
        success: true,
        migrated,
        errors,
        message: `Migration completed. ${migrated} preferences updated, ${errors} errors.`
      };
      
    } catch (error) {
      console.error('❌ Preferences migration error:', error);
      throw error;
    }
  }
}

export default NotificationPreferencesController;