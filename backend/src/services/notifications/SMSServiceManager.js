import EventEmitter from 'events';
import notificationConfig from '../../config/notificationConfig.js';

/**
 * SMS Service Manager
 * Manages multiple SMS providers with failover, cost monitoring, and international support
 */
class SMSServiceManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = options.config || notificationConfig.integration.external_services;
    this.providers = new Map();
    this.currentProvider = null;
    this.backupProvider = null;
    
    // Provider health tracking
    this.providerHealth = new Map();
    
    // Delivery statistics
    this.deliveryStats = new Map();
    
    // Rate limiting tracking
    this.rateLimits = new Map();
    
    // Cost monitoring
    this.costTracking = new Map();
    
    // Phone number validation cache
    this.phoneValidationCache = new Map();
    
    // Initialize providers
    this.initializeProviders();
    
    console.log('✅ SMS Service Manager initialized');
  }

  /**
   * Initialize SMS providers
   */
  async initializeProviders() {
    try {
      // Initialize Twilio provider
      if (this.config.twilio?.enabled) {
        await this.initializeTwilioProvider();
      }
      
      // Initialize AWS SNS provider
      if (this.config.aws?.enabled) {
        await this.initializeAWSSNSProvider();
      }
      
      // Always initialize test provider for development/testing or as fallback
      await this.initializeTestProvider();
      
      // Set primary and backup providers
      this.selectProviders();
      
      console.log(`📱 SMS providers initialized: ${Array.from(this.providers.keys()).join(', ')}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize SMS providers:', error);
      throw error;
    }
  }

  /**
   * Initialize Twilio provider
   */
  async initializeTwilioProvider() {
    try {
      const twilio = await import('twilio');
      
      const client = twilio.default(
        this.config.twilio.accountSid,
        this.config.twilio.authToken
      );
      
      const provider = {
        name: 'twilio',
        service: client,
        type: 'twilio',
        priority: 1,
        rateLimit: {
          maxPerSecond: 1, // Twilio default
          maxPerMinute: 60,
          maxPerDay: 10000
        },
        features: ['international', 'delivery_tracking', 'media', 'unicode'],
        costPerMessage: 0.0075, // USD, approximate
        fromNumber: this.config.twilio.fromNumber
      };
      
      this.providers.set('twilio', provider);
      this.initializeProviderHealth('twilio');
      this.initializeProviderStats('twilio');
      this.initializeCostTracking('twilio');
      
      console.log('✅ Twilio SMS provider initialized');
      
    } catch (error) {
      console.warn('⚠️ Twilio SMS provider initialization failed:', error.message);
    }
  }

  /**
   * Initialize AWS SNS provider
   */
  async initializeAWSSNSProvider() {
    try {
      const { SNSClient, PublishCommand, SetSMSAttributesCommand } = await import('@aws-sdk/client-sns');
      
      const snsClient = new SNSClient({
        region: this.config.aws.sns?.region || this.config.aws.region || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      const provider = {
        name: 'aws-sns',
        service: snsClient,
        type: 'aws-sns',
        priority: 2,
        rateLimit: {
          maxPerSecond: 10, // AWS SNS default
          maxPerMinute: 300,
          maxPerDay: 50000
        },
        features: ['international', 'delivery_tracking'],
        costPerMessage: 0.006, // USD, approximate
        commands: { PublishCommand, SetSMSAttributesCommand }
      };
      
      this.providers.set('aws-sns', provider);
      this.initializeProviderHealth('aws-sns');
      this.initializeProviderStats('aws-sns');
      this.initializeCostTracking('aws-sns');
      
      console.log('✅ AWS SNS SMS provider initialized');
      
    } catch (error) {
      console.warn('⚠️ AWS SNS SMS provider initialization failed:', error.message);
    }
  }

  /**
   * Initialize test provider for development
   */
  async initializeTestProvider() {
    const provider = {
      name: 'sms-test',
      service: {
        messages: {
          create: async (options) => {
            console.log('📱 Test SMS would be sent:', {
              to: options.to,
              body: options.body,
              from: options.from
            });
            return {
              sid: 'test-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
              status: 'sent',
              to: options.to,
              from: options.from,
              body: options.body,
              dateCreated: new Date(),
              price: '0.00',
              priceUnit: 'USD'
            };
          }
        }
      },
      type: 'test',
      priority: 3,
      rateLimit: {
        maxPerSecond: 100,
        maxPerMinute: 1000,
        maxPerDay: 10000
      },
      features: ['international', 'delivery_tracking', 'media', 'unicode'],
      costPerMessage: 0.00,
      fromNumber: '+1234567890',
      testMode: true
    };
    
    this.providers.set('sms-test', provider);
    this.initializeProviderHealth('sms-test');
    this.initializeProviderStats('sms-test');
    this.initializeCostTracking('sms-test');
    
    console.log('✅ Test SMS provider initialized');
  }

  /**
   * Select primary and backup providers
   */
  selectProviders() {
    const availableProviders = Array.from(this.providers.values())
      .filter(provider => this.isProviderHealthy(provider.name))
      .sort((a, b) => a.priority - b.priority);
    
    if (availableProviders.length > 0) {
      this.currentProvider = availableProviders[0];
      console.log(`📱 Primary SMS provider: ${this.currentProvider.name}`);
    }
    
    if (availableProviders.length > 1) {
      this.backupProvider = availableProviders[1];
      console.log(`📱 Backup SMS provider: ${this.backupProvider.name}`);
    }
    
    if (!this.currentProvider) {
      throw new Error('No healthy SMS providers available');
    }
  }

  /**
   * Send SMS with automatic provider selection and failover
   * @param {Object} smsData - SMS data
   * @returns {Object} Send result
   */
  async sendSMS(smsData) {
    const {
      to,
      message,
      metadata = {},
      userId = null,
      notificationId = null,
      priority = 'normal'
    } = smsData;

    // Validate and format phone number
    const formattedPhone = await this.validateAndFormatPhoneNumber(to);
    if (!formattedPhone.isValid) {
      throw new Error(`Invalid phone number: ${to}. ${formattedPhone.error}`);
    }

    // Optimize message for SMS limits
    const optimizedMessage = this.optimizeMessageForSMS(message);

    let lastError = null;
    
    // Try primary provider
    if (this.currentProvider) {
      try {
        const result = await this.sendWithProvider(this.currentProvider, {
          to: formattedPhone.formatted,
          message: optimizedMessage,
          metadata,
          userId,
          notificationId,
          priority
        });
        
        this.updateProviderHealth(this.currentProvider.name, true);
        this.updateDeliveryStats(this.currentProvider.name, 'sent');
        this.updateCostTracking(this.currentProvider.name, result.cost || this.currentProvider.costPerMessage);
        
        return {
          success: true,
          provider: this.currentProvider.name,
          messageId: result.messageId,
          cost: result.cost,
          result
        };
        
      } catch (error) {
        console.warn(`⚠️ Primary SMS provider ${this.currentProvider.name} failed:`, error.message);
        lastError = error;
        this.updateProviderHealth(this.currentProvider.name, false, error);
        this.updateDeliveryStats(this.currentProvider.name, 'failed');
      }
    }
    
    // Try backup provider
    if (this.backupProvider) {
      try {
        const result = await this.sendWithProvider(this.backupProvider, {
          to: formattedPhone.formatted,
          message: optimizedMessage,
          metadata,
          userId,
          notificationId,
          priority
        });
        
        this.updateProviderHealth(this.backupProvider.name, true);
        this.updateDeliveryStats(this.backupProvider.name, 'sent');
        this.updateCostTracking(this.backupProvider.name, result.cost || this.backupProvider.costPerMessage);
        
        // Consider switching primary provider if backup is more reliable
        this.considerProviderSwitch();
        
        return {
          success: true,
          provider: this.backupProvider.name,
          messageId: result.messageId,
          cost: result.cost,
          result,
          fallbackUsed: true
        };
        
      } catch (error) {
        console.error(`❌ Backup SMS provider ${this.backupProvider.name} also failed:`, error.message);
        this.updateProviderHealth(this.backupProvider.name, false, error);
        this.updateDeliveryStats(this.backupProvider.name, 'failed');
      }
    }
    
    // All providers failed
    throw new Error(`All SMS providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Send SMS with specific provider
   * @param {Object} provider - SMS provider
   * @param {Object} smsData - SMS data
   * @returns {Object} Send result
   */
  async sendWithProvider(provider, smsData) {
    const { to, message, metadata, userId, notificationId, priority } = smsData;
    
    // Check rate limits
    if (!this.checkRateLimit(provider.name)) {
      throw new Error(`Rate limit exceeded for provider ${provider.name}`);
    }
    
    this.updateRateLimit(provider.name);
    
    switch (provider.type) {
      case 'twilio':
        return await this.sendWithTwilio(provider, { to, message, metadata, userId, notificationId, priority });
      
      case 'aws-sns':
        return await this.sendWithAWSSNS(provider, { to, message, metadata, userId, notificationId, priority });
      
      case 'test':
        return await this.sendWithTestProvider(provider, { to, message, metadata, userId, notificationId, priority });
      
      default:
        throw new Error(`Unknown SMS provider type: ${provider.type}`);
    }
  }

  /**
   * Send SMS with Twilio
   * @param {Object} provider - Twilio provider
   * @param {Object} smsData - SMS data
   * @returns {Object} Send result
   */
  async sendWithTwilio(provider, smsData) {
    const { to, message, metadata, userId, notificationId, priority } = smsData;
    
    const messageOptions = {
      body: message,
      from: provider.fromNumber,
      to: to,
      statusCallback: process.env.TWILIO_WEBHOOK_URL ? 
        `${process.env.TWILIO_WEBHOOK_URL}/webhooks/sms-status` : undefined
    };
    
    // Add metadata as custom parameters
    if (metadata && Object.keys(metadata).length > 0) {
      // Twilio allows custom parameters in status callbacks
      const callbackParams = new URLSearchParams();
      callbackParams.append('userId', userId || '');
      callbackParams.append('notificationId', notificationId || '');
      callbackParams.append('priority', priority);
      
      Object.entries(metadata).forEach(([key, value]) => {
        callbackParams.append(`meta_${key}`, String(value));
      });
      
      if (messageOptions.statusCallback) {
        messageOptions.statusCallback += `?${callbackParams.toString()}`;
      }
    }
    
    const result = await provider.service.messages.create(messageOptions);
    
    return {
      messageId: result.sid,
      provider: 'twilio',
      status: result.status,
      cost: parseFloat(result.price) || provider.costPerMessage,
      result
    };
  }

  /**
   * Send SMS with AWS SNS
   * @param {Object} provider - AWS SNS provider
   * @param {Object} smsData - SMS data
   * @returns {Object} Send result
   */
  async sendWithAWSSNS(provider, smsData) {
    const { to, message, metadata, userId, notificationId, priority } = smsData;
    
    const params = {
      Message: message,
      PhoneNumber: to,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: priority === 'high' || priority === 'critical' ? 'Transactional' : 'Promotional'
        }
      }
    };
    
    // Add metadata as message attributes
    if (metadata && Object.keys(metadata).length > 0) {
      Object.entries(metadata).forEach(([key, value]) => {
        params.MessageAttributes[`meta_${key}`] = {
          DataType: 'String',
          StringValue: String(value)
        };
      });
    }
    
    // Add user and notification IDs
    if (userId) {
      params.MessageAttributes.userId = {
        DataType: 'String',
        StringValue: userId
      };
    }
    
    if (notificationId) {
      params.MessageAttributes.notificationId = {
        DataType: 'String',
        StringValue: notificationId
      };
    }
    
    const command = new provider.commands.PublishCommand(params);
    const result = await provider.service.send(command);
    
    return {
      messageId: result.MessageId,
      provider: 'aws-sns',
      status: 'sent',
      cost: provider.costPerMessage,
      result
    };
  }

  /**
   * Send SMS with test provider
   * @param {Object} provider - Test provider
   * @param {Object} smsData - SMS data
   * @returns {Object} Send result
   */
  async sendWithTestProvider(provider, smsData) {
    const { to, message, metadata, userId, notificationId, priority } = smsData;
    
    const result = await provider.service.messages.create({
      body: message,
      from: provider.fromNumber,
      to: to,
      metadata: { ...metadata, userId, notificationId, priority }
    });
    
    return {
      messageId: result.sid,
      provider: 'sms-test',
      status: result.status,
      cost: 0.00,
      result
    };
  }

  /**
   * Send bulk SMS messages
   * @param {Array} recipients - Array of phone numbers
   * @param {Object} smsData - SMS data
   * @returns {Object} Bulk send result
   */
  async sendBulkSMS(recipients, smsData) {
    const { message, metadata, priority } = smsData;
    
    const results = [];
    const batchSize = 50; // Process in smaller batches for SMS
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const result = await this.sendSMS({
            to: recipient,
            message,
            metadata: { ...metadata, batchIndex: Math.floor(i / batchSize) },
            priority
          });
          
          return {
            recipient,
            success: true,
            messageId: result.messageId,
            provider: result.provider,
            cost: result.cost
          };
          
        } catch (error) {
          return {
            recipient,
            success: false,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value || { success: false, error: r.reason?.message }));
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await this.sleep(2000); // 2 second delay for SMS
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
    
    return {
      totalRecipients: recipients.length,
      successCount,
      failureCount,
      totalCost,
      results
    };
  }

  /**
   * Validate and format international phone number
   * @param {string} phoneNumber - Phone number to validate
   * @param {string} defaultCountry - Default country code
   * @returns {Object} Validation result
   */
  async validateAndFormatPhoneNumber(phoneNumber, defaultCountry = 'US') {
    // Check cache first
    const cacheKey = `${phoneNumber}_${defaultCountry}`;
    if (this.phoneValidationCache.has(cacheKey)) {
      return this.phoneValidationCache.get(cacheKey);
    }
    
    try {
      // Try to use libphonenumber-js for proper validation
      let phoneUtil;
      try {
        const libphonenumber = await import('libphonenumber-js');
        phoneUtil = libphonenumber;
      } catch (error) {
        // Fallback to basic validation if libphonenumber-js is not available
        return this.basicPhoneValidation(phoneNumber);
      }
      
      const parsedNumber = phoneUtil.parsePhoneNumber(phoneNumber, defaultCountry);
      
      if (!parsedNumber || !parsedNumber.isValid()) {
        const result = {
          isValid: false,
          error: 'Invalid phone number format',
          original: phoneNumber
        };
        this.phoneValidationCache.set(cacheKey, result);
        return result;
      }
      
      const result = {
        isValid: true,
        formatted: parsedNumber.format('E.164'),
        international: parsedNumber.formatInternational(),
        national: parsedNumber.formatNational(),
        country: parsedNumber.country,
        countryCallingCode: parsedNumber.countryCallingCode,
        nationalNumber: parsedNumber.nationalNumber,
        original: phoneNumber
      };
      
      // Cache the result
      this.phoneValidationCache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.warn('⚠️ Phone number validation failed, using basic validation:', error.message);
      return this.basicPhoneValidation(phoneNumber);
    }
  }

  /**
   * Basic phone number validation fallback
   * @param {string} phoneNumber - Phone number to validate
   * @returns {Object} Basic validation result
   */
  basicPhoneValidation(phoneNumber) {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Check if it starts with + and has at least 10 digits
    const isValid = /^\+\d{10,15}$/.test(cleaned) || /^\d{10,15}$/.test(cleaned);
    
    if (!isValid) {
      return {
        isValid: false,
        error: 'Phone number must be 10-15 digits, optionally starting with +',
        original: phoneNumber
      };
    }
    
    // Ensure it starts with +
    const formatted = cleaned.startsWith('+') ? cleaned : `+1${cleaned}`;
    
    return {
      isValid: true,
      formatted,
      international: formatted,
      national: cleaned,
      country: 'US', // Default assumption
      original: phoneNumber
    };
  }

  /**
   * Optimize message for SMS character limits
   * @param {string} message - Original message
   * @param {number} maxLength - Maximum length (default 160 for single SMS)
   * @returns {string} Optimized message
   */
  optimizeMessageForSMS(message, maxLength = 160) {
    if (!message) return '';
    
    // If message is within limit, return as-is
    if (message.length <= maxLength) {
      return message;
    }
    
    // Try to truncate at word boundary
    const truncated = message.substring(0, maxLength - 3); // Leave space for "..."
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) { // If we can truncate at a word boundary without losing too much
      return truncated.substring(0, lastSpace) + '...';
    }
    
    // Otherwise, hard truncate
    return truncated + '...';
  }

  /**
   * Track SMS delivery status (webhook handler)
   * @param {Object} webhookData - Webhook data from SMS provider
   * @returns {Object} Processing result
   */
  async trackSMSDelivery(webhookData) {
    try {
      const { provider, messageId, status, timestamp, recipient, errorCode } = webhookData;
      
      // Update delivery statistics
      this.updateDeliveryStats(provider, status);
      
      // Emit tracking event
      this.emit('deliveryTracking', {
        provider,
        messageId,
        status,
        timestamp: new Date(timestamp),
        recipient,
        errorCode
      });
      
      console.log(`📊 SMS tracking: ${status} for message ${messageId} via ${provider}`);
      
      return {
        success: true,
        processed: true,
        status,
        messageId
      };
      
    } catch (error) {
      console.error('❌ Failed to track SMS delivery:', error);
      throw error;
    }
  }

  /**
   * Initialize provider health tracking
   * @param {string} providerName - Provider name
   */
  initializeProviderHealth(providerName) {
    this.providerHealth.set(providerName, {
      healthy: true,
      lastSuccess: new Date(),
      lastFailure: null,
      consecutiveFailures: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    });
  }

  /**
   * Initialize provider statistics
   * @param {string} providerName - Provider name
   */
  initializeProviderStats(providerName) {
    this.deliveryStats.set(providerName, {
      sent: 0,
      delivered: 0,
      failed: 0,
      undelivered: 0,
      queued: 0,
      accepted: 0
    });
  }

  /**
   * Initialize cost tracking
   * @param {string} providerName - Provider name
   */
  initializeCostTracking(providerName) {
    this.costTracking.set(providerName, {
      totalCost: 0,
      messageCount: 0,
      averageCost: 0,
      dailyCost: 0,
      monthlyCost: 0,
      lastReset: new Date()
    });
  }

  /**
   * Update provider health status
   * @param {string} providerName - Provider name
   * @param {boolean} success - Was operation successful
   * @param {Error} error - Error if failed
   */
  updateProviderHealth(providerName, success, error = null) {
    const health = this.providerHealth.get(providerName);
    if (!health) return;
    
    health.totalRequests++;
    
    if (success) {
      health.successfulRequests++;
      health.lastSuccess = new Date();
      health.consecutiveFailures = 0;
      health.healthy = true;
    } else {
      health.failedRequests++;
      health.lastFailure = new Date();
      health.consecutiveFailures++;
      
      // Mark as unhealthy after 3 consecutive failures
      if (health.consecutiveFailures >= 3) {
        health.healthy = false;
        this.emit('providerUnhealthy', { provider: providerName, error: error?.message });
      }
    }
    
    // Calculate success rate
    health.successRate = health.successfulRequests / health.totalRequests;
    
    this.emit('providerHealthUpdate', { provider: providerName, health: { ...health } });
  }

  /**
   * Update delivery statistics
   * @param {string} providerName - Provider name
   * @param {string} status - Delivery status
   */
  updateDeliveryStats(providerName, status) {
    const stats = this.deliveryStats.get(providerName);
    if (!stats) return;
    
    switch (status.toLowerCase()) {
      case 'sent':
      case 'queued':
      case 'accepted':
        stats.sent++;
        break;
      case 'delivered':
        stats.delivered++;
        break;
      case 'failed':
      case 'undelivered':
        stats.failed++;
        break;
      default:
        // Handle other statuses
        if (stats[status.toLowerCase()] !== undefined) {
          stats[status.toLowerCase()]++;
        }
    }
  }

  /**
   * Update cost tracking
   * @param {string} providerName - Provider name
   * @param {number} cost - Message cost
   */
  updateCostTracking(providerName, cost) {
    const tracking = this.costTracking.get(providerName);
    if (!tracking) return;
    
    tracking.totalCost += cost;
    tracking.messageCount++;
    tracking.averageCost = tracking.totalCost / tracking.messageCount;
    
    // Reset daily/monthly costs if needed
    const now = new Date();
    const lastReset = tracking.lastReset;
    
    if (now.getDate() !== lastReset.getDate()) {
      tracking.dailyCost = cost;
    } else {
      tracking.dailyCost += cost;
    }
    
    if (now.getMonth() !== lastReset.getMonth()) {
      tracking.monthlyCost = cost;
      tracking.lastReset = now;
    } else {
      tracking.monthlyCost += cost;
    }
    
    // Emit cost alert if daily cost exceeds threshold
    const dailyThreshold = process.env.SMS_DAILY_COST_THRESHOLD || 50;
    if (tracking.dailyCost > dailyThreshold) {
      this.emit('costAlert', {
        provider: providerName,
        dailyCost: tracking.dailyCost,
        threshold: dailyThreshold
      });
    }
  }

  /**
   * Check if provider is healthy
   * @param {string} providerName - Provider name
   * @returns {boolean} Is provider healthy
   */
  isProviderHealthy(providerName) {
    const health = this.providerHealth.get(providerName);
    return health ? health.healthy : false;
  }

  /**
   * Check rate limit for provider
   * @param {string} providerName - Provider name
   * @returns {boolean} Is within rate limit
   */
  checkRateLimit(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    
    const now = Date.now();
    const rateLimit = this.rateLimits.get(providerName) || { 
      requests: [], 
      minuteRequests: [],
      dailyCount: 0, 
      lastReset: now 
    };
    
    // Reset daily count if it's a new day
    if (now - rateLimit.lastReset > 24 * 60 * 60 * 1000) {
      rateLimit.dailyCount = 0;
      rateLimit.lastReset = now;
    }
    
    // Check daily limit
    if (rateLimit.dailyCount >= provider.rateLimit.maxPerDay) {
      return false;
    }
    
    // Check per-minute limit
    const recentMinuteRequests = rateLimit.minuteRequests.filter(time => now - time < 60000);
    if (recentMinuteRequests.length >= provider.rateLimit.maxPerMinute) {
      return false;
    }
    
    // Check per-second limit
    const recentRequests = rateLimit.requests.filter(time => now - time < 1000);
    if (recentRequests.length >= provider.rateLimit.maxPerSecond) {
      return false;
    }
    
    return true;
  }

  /**
   * Update rate limit tracking
   * @param {string} providerName - Provider name
   */
  updateRateLimit(providerName) {
    const now = Date.now();
    const rateLimit = this.rateLimits.get(providerName) || { 
      requests: [], 
      minuteRequests: [],
      dailyCount: 0, 
      lastReset: now 
    };
    
    rateLimit.requests.push(now);
    rateLimit.minuteRequests.push(now);
    rateLimit.dailyCount++;
    
    // Clean old requests
    rateLimit.requests = rateLimit.requests.filter(time => now - time < 1000);
    rateLimit.minuteRequests = rateLimit.minuteRequests.filter(time => now - time < 60000);
    
    this.rateLimits.set(providerName, rateLimit);
  }

  /**
   * Consider switching primary provider based on performance
   */
  considerProviderSwitch() {
    if (!this.backupProvider) return;
    
    const primaryHealth = this.providerHealth.get(this.currentProvider.name);
    const backupHealth = this.providerHealth.get(this.backupProvider.name);
    
    if (backupHealth && primaryHealth) {
      // Switch if backup has significantly better success rate
      if (backupHealth.successRate > primaryHealth.successRate + 0.1) {
        console.log(`🔄 Switching primary SMS provider from ${this.currentProvider.name} to ${this.backupProvider.name}`);
        
        const temp = this.currentProvider;
        this.currentProvider = this.backupProvider;
        this.backupProvider = temp;
        
        this.emit('providerSwitch', {
          newPrimary: this.currentProvider.name,
          newBackup: this.backupProvider.name
        });
      }
    }
  }

  /**
   * Get provider health status
   * @returns {Object} Health status for all providers
   */
  getProviderHealth() {
    const health = {};
    
    for (const [name, status] of this.providerHealth.entries()) {
      health[name] = { ...status };
    }
    
    return health;
  }

  /**
   * Get delivery statistics
   * @returns {Object} Delivery stats for all providers
   */
  getDeliveryStats() {
    const stats = {};
    
    for (const [name, providerStats] of this.deliveryStats.entries()) {
      stats[name] = { ...providerStats };
    }
    
    return stats;
  }

  /**
   * Get cost tracking information
   * @returns {Object} Cost tracking for all providers
   */
  getCostTracking() {
    const costs = {};
    
    for (const [name, costData] of this.costTracking.entries()) {
      costs[name] = { ...costData };
    }
    
    return costs;
  }

  /**
   * Utility method to sleep
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default SMSServiceManager;