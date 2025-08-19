import mongoose from 'mongoose';

// User Notification Preferences Schema for Advanced Notification System
const UserNotificationPreferencesSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },

  // Global preferences
  globalSettings: {
    enabled: { type: Boolean, default: true },
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '22:00' }, // "HH:MM" format
      endTime: { type: String, default: '08:00' }, // "HH:MM" format
      timezone: { type: String, default: 'UTC' }
    },
    frequency: { 
      type: String, 
      enum: ['immediate', 'hourly', 'daily', 'weekly'], 
      default: 'immediate' 
    }
  },

  // Channel preferences
  channels: {
    websocket: { 
      enabled: { type: Boolean, default: true } 
    },
    email: { 
      enabled: { type: Boolean, default: true },
      frequency: { 
        type: String, 
        enum: ['immediate', 'digest'], 
        default: 'immediate' 
      },
      digestTime: { type: String, default: '09:00' } // "HH:MM" format
    },
    sms: { 
      enabled: { type: Boolean, default: false },
      emergencyOnly: { type: Boolean, default: true }
    }
  },

  // Category preferences
  categories: {
    medical: {
      enabled: { type: Boolean, default: true },
      channels: [{ 
        type: String, 
        enum: ['websocket', 'email', 'sms'], 
        default: ['websocket', 'email'] 
      }],
      priority: { 
        type: String, 
        enum: ['all', 'high', 'critical'], 
        default: 'all' 
      }
    },
    administrative: {
      enabled: { type: Boolean, default: true },
      channels: [{ 
        type: String, 
        enum: ['websocket', 'email', 'sms'], 
        default: ['websocket', 'email'] 
      }],
      priority: { 
        type: String, 
        enum: ['all', 'high', 'critical'], 
        default: 'high' 
      }
    },
    system: {
      enabled: { type: Boolean, default: true },
      channels: [{ 
        type: String, 
        enum: ['websocket', 'email', 'sms'], 
        default: ['websocket'] 
      }],
      priority: { 
        type: String, 
        enum: ['all', 'high', 'critical'], 
        default: 'critical' 
      }
    },
    marketing: {
      enabled: { type: Boolean, default: false },
      channels: [{ 
        type: String, 
        enum: ['websocket', 'email', 'sms'], 
        default: ['email'] 
      }],
      priority: { 
        type: String, 
        enum: ['all', 'high', 'critical'], 
        default: 'all' 
      }
    }
  },

  // Specific notification type preferences
  notificationTypes: {
    prescription_created: { 
      enabled: { type: Boolean, default: true }, 
      channels: [{ type: String, default: ['websocket', 'email'] }] 
    },
    prescription_ready: { 
      enabled: { type: Boolean, default: true }, 
      channels: [{ type: String, default: ['websocket', 'email', 'sms'] }] 
    },
    order_status_changed: { 
      enabled: { type: Boolean, default: true }, 
      channels: [{ type: String, default: ['websocket', 'email'] }] 
    },
    appointment_reminder: { 
      enabled: { type: Boolean, default: true }, 
      channels: [{ type: String, default: ['websocket', 'email', 'sms'] }] 
    },
    payment_processed: { 
      enabled: { type: Boolean, default: true }, 
      channels: [{ type: String, default: ['websocket', 'email'] }] 
    },
    inventory_alerts: { 
      enabled: { type: Boolean, default: true }, 
      channels: [{ type: String, default: ['websocket', 'email'] }] 
    },
    system_maintenance: { 
      enabled: { type: Boolean, default: true }, 
      channels: [{ type: String, default: ['websocket', 'email'] }] 
    },
    security_alerts: { 
      enabled: { type: Boolean, default: true }, 
      channels: [{ type: String, default: ['websocket', 'email', 'sms'] }] 
    }
  },

  // Contact information
  contactInfo: {
    email: String,
    phone: String,
    preferredLanguage: { type: String, default: 'en' }
  },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
UserNotificationPreferencesSchema.index({ userId: 1 }, { unique: true });
UserNotificationPreferencesSchema.index({ 'globalSettings.enabled': 1 });
UserNotificationPreferencesSchema.index({ updatedAt: -1 });

// Update the updatedAt field on save
UserNotificationPreferencesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get default preferences for a user
UserNotificationPreferencesSchema.statics.getDefaultPreferences = function(userId) {
  return new this({
    userId: userId,
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
    }
  });
};

export default mongoose.model('UserNotificationPreferences', UserNotificationPreferencesSchema);