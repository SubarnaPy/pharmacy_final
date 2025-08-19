/**
 * Notification System Configuration
 * Configuration settings for the Enhanced Notification System
 */

const notificationConfig = {
  // Queue configuration
  queue: {
    queueName: 'healthcare_notifications',
    maxRetries: 3,
    retryDelay: 60000, // 1 minute
    processingTimeout: 300000, // 5 minutes
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retryAttempts: 3,
    retryDelay: 1000
  },

  // Service configuration
  service: {
    templateCacheSize: 1000,
    preferencesCacheSize: 5000,
    analyticsBufferSize: 100,
    processingInterval: 5000, // 5 seconds
    analyticsInterval: 3600000, // 1 hour
    scheduledCheckInterval: 60000 // 1 minute
  },

  // Channel configurations
  channels: {
    websocket: {
      enabled: true,
      priority: 1
    },
    email: {
      enabled: true,
      priority: 2,
      provider: 'nodemailer', // or 'sendgrid', 'aws-ses'
      fallbackProvider: 'aws-ses'
    },
    sms: {
      enabled: true,
      priority: 3,
      provider: 'twilio', // or 'aws-sns'
      fallbackProvider: 'aws-sns'
    }
  },

  // Default notification preferences
  defaultPreferences: {
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
    }
  },

  // Template configuration
  templates: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es', 'fr'],
    cacheTimeout: 3600000, // 1 hour
    fallbackTemplate: {
      title: 'Notification',
      body: 'You have a new notification.',
      priority: 'medium'
    }
  },

  // Analytics configuration
  analytics: {
    enabled: true,
    retentionDays: 90,
    aggregationInterval: 3600000, // 1 hour
    metricsToTrack: [
      'delivery_rate',
      'open_rate',
      'click_rate',
      'bounce_rate',
      'unsubscribe_rate',
      'response_time'
    ]
  },

  // Security configuration
  security: {
    encryptSensitiveData: true,
    auditAllActions: true,
    maxNotificationsPerUser: 1000,
    maxBulkRecipients: 10000,
    rateLimiting: {
      enabled: true,
      maxPerMinute: 100,
      maxPerHour: 1000
    }
  },

  // Integration settings
  integration: {
    webhooks: {
      enabled: true,
      endpoints: {
        delivery_status: '/webhooks/notification-delivery',
        user_interaction: '/webhooks/notification-interaction'
      }
    },
    external_services: {
      sendgrid: {
        enabled: process.env.SENDGRID_API_KEY ? true : false,
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@healthcare.com'
      },
      twilio: {
        enabled: process.env.TWILIO_ACCOUNT_SID ? true : false,
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER
      },
      aws: {
        enabled: process.env.AWS_ACCESS_KEY_ID ? true : false,
        region: process.env.AWS_REGION || 'us-east-1',
        ses: {
          fromEmail: process.env.AWS_SES_FROM_EMAIL || 'noreply@healthcare.com'
        },
        sns: {
          region: process.env.AWS_SNS_REGION || 'us-east-1'
        }
      }
    }
  },

  // Development/Testing settings
  development: {
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    mockExternalServices: process.env.NODE_ENV === 'test',
    skipActualDelivery: process.env.SKIP_NOTIFICATION_DELIVERY === 'true',
    testRecipients: {
      email: process.env.TEST_EMAIL || 'test@example.com',
      sms: process.env.TEST_PHONE || '+1234567890'
    }
  }
};

export default notificationConfig;