import EventEmitter from 'events';
import SMSServiceManager from './SMSServiceManager.js';
import SMSTemplateEngine from './SMSTemplateEngine.js';

/**
 * SMS Delivery Service
 * Handles SMS message optimization, delivery, tracking, and retry logic
 */
class SMSDeliveryService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.smsManager = new SMSServiceManager(options.smsManager);
    this.templateEngine = new SMSTemplateEngine(options.templateEngine);
    
    // Delivery tracking
    this.deliveryTracking = new Map();
    this.retryQueue = new Map();
    
    // Configuration
    this.config = {
      maxRetries: options.maxRetries || 3,
      retryDelays: options.retryDelays || [1000, 5000, 15000], // 1s, 5s, 15s
      deliveryTimeout: options.deliveryTimeout || 300000, // 5 minutes
      batchSize: options.batchSize || 50,
      rateLimitDelay: options.rateLimitDelay || 1000, // 1 second between messages
      ...options.config
    };
    
    // Statistics
    this.stats = {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalRetries: 0,
      averageDeliveryTime: 0,
      deliveryTimes: []
    };
    
    // Initialize retry processor
    this.initializeRetryProcessor();
    
    console.log('✅ SMS Delivery Service initialized');
  }

  /**
   * Send optimized SMS with template rendering
   * @param {Object} smsData - SMS data
   * @returns {Object} Delivery result
   */
  async sendOptimizedSMS(smsData) {
    const startTime = Date.now();
    
    try {
      const {
        templateId,
        templateData = {},
        to,
        message,
        userId,
        notificationId,
        priority = 'normal',
        metadata = {},
        options = {}
      } = smsData;

      // Validate input
      if (!to) {
        throw new Error('Recipient phone number is required');
      }

      let optimizedMessage;
      let templateResult = null;

      // Use template if provided
      if (templateId) {
        templateResult = this.templateEngine.renderTemplate(templateId, templateData, options);
        optimizedMessage = templateResult.optimizedText;
        
        console.log(`📱 Rendered SMS template '${templateId}': ${optimizedMessage.length} chars, ${templateResult.smsCount} parts`);
      } else if (message) {
        // Optimize raw message
        const optimization = this.templateEngine.optimizeForSMS(message);
        optimizedMessage = optimization.text;
        templateResult = {
          originalText: message,
          optimizedText: optimizedMessage,
          length: optimizedMessage.length,
          truncated: optimization.truncated,
          smsCount: this.templateEngine.calculateSMSCount(optimizedMessage)
        };
      } else {
        throw new Error('Either templateId or message is required');
      }

      // Validate SMS content
      const validation = this.templateEngine.validateSMSContent(optimizedMessage);
      if (!validation.isValid) {
        throw new Error(`SMS validation failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings
      if (validation.warnings.length > 0) {
        console.warn(`⚠️ SMS warnings for ${to}:`, validation.warnings);
      }

      // Create delivery tracking entry
      const deliveryId = this.generateDeliveryId();
      const trackingData = {
        deliveryId,
        to,
        message: optimizedMessage,
        templateId,
        templateResult,
        userId,
        notificationId,
        priority,
        metadata,
        status: 'pending',
        attempts: 0,
        maxRetries: this.config.maxRetries,
        createdAt: new Date(),
        startTime
      };

      this.deliveryTracking.set(deliveryId, trackingData);

      // Attempt delivery
      const result = await this.attemptDelivery(deliveryId);
      
      // Update statistics
      this.updateStats('sent');
      
      return {
        success: true,
        deliveryId,
        messageId: result.messageId,
        provider: result.provider,
        templateResult,
        validation,
        cost: result.cost,
        deliveryTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ SMS delivery failed:', error);
      this.updateStats('failed');
      
      throw {
        success: false,
        error: error.message,
        deliveryTime: Date.now() - startTime
      };
    }
  }

  /**
   * Attempt SMS delivery with retry logic
   * @param {string} deliveryId - Delivery tracking ID
   * @returns {Object} Delivery result
   */
  async attemptDelivery(deliveryId) {
    const tracking = this.deliveryTracking.get(deliveryId);
    if (!tracking) {
      throw new Error(`Delivery tracking not found: ${deliveryId}`);
    }

    tracking.attempts++;
    tracking.lastAttempt = new Date();
    tracking.status = 'attempting';

    try {
      // Send SMS via SMS Manager
      const result = await this.smsManager.sendSMS({
        to: tracking.to,
        message: tracking.message,
        userId: tracking.userId,
        notificationId: tracking.notificationId,
        priority: tracking.priority,
        metadata: {
          ...tracking.metadata,
          deliveryId,
          attempt: tracking.attempts
        }
      });

      // Update tracking with success
      tracking.status = 'sent';
      tracking.messageId = result.messageId;
      tracking.provider = result.provider;
      tracking.cost = result.cost;
      tracking.sentAt = new Date();
      tracking.deliveryTime = Date.now() - tracking.startTime;

      // Emit delivery event
      this.emit('smsDelivered', {
        deliveryId,
        messageId: result.messageId,
        provider: result.provider,
        to: tracking.to,
        attempts: tracking.attempts,
        deliveryTime: tracking.deliveryTime
      });

      console.log(`✅ SMS delivered: ${deliveryId} via ${result.provider} in ${tracking.attempts} attempts`);
      
      return result;

    } catch (error) {
      console.warn(`⚠️ SMS delivery attempt ${tracking.attempts} failed for ${deliveryId}:`, error.message);
      
      // Check if we should retry
      if (tracking.attempts < tracking.maxRetries && this.shouldRetry(error)) {
        // Schedule retry
        await this.scheduleRetry(deliveryId, error);
        throw new Error(`Delivery failed, retry scheduled (attempt ${tracking.attempts}/${tracking.maxRetries})`);
      } else {
        // Mark as failed
        tracking.status = 'failed';
        tracking.failedAt = new Date();
        tracking.lastError = error.message;

        // Emit failure event
        this.emit('smsDeliveryFailed', {
          deliveryId,
          to: tracking.to,
          attempts: tracking.attempts,
          error: error.message,
          finalFailure: true
        });

        console.error(`❌ SMS delivery failed permanently: ${deliveryId} after ${tracking.attempts} attempts`);
        
        throw error;
      }
    }
  }

  /**
   * Schedule SMS delivery retry
   * @param {string} deliveryId - Delivery tracking ID
   * @param {Error} error - Last error
   */
  async scheduleRetry(deliveryId, error) {
    const tracking = this.deliveryTracking.get(deliveryId);
    if (!tracking) return;

    const retryIndex = tracking.attempts - 1;
    const delay = this.config.retryDelays[retryIndex] || this.config.retryDelays[this.config.retryDelays.length - 1];
    
    tracking.status = 'retry_scheduled';
    tracking.nextRetryAt = new Date(Date.now() + delay);
    tracking.lastError = error.message;

    // Add to retry queue
    this.retryQueue.set(deliveryId, {
      deliveryId,
      retryAt: tracking.nextRetryAt,
      attempts: tracking.attempts,
      error: error.message
    });

    this.updateStats('retry');

    console.log(`🔄 SMS retry scheduled: ${deliveryId} in ${delay}ms (attempt ${tracking.attempts + 1}/${tracking.maxRetries})`);

    // Emit retry scheduled event
    this.emit('smsRetryScheduled', {
      deliveryId,
      retryAt: tracking.nextRetryAt,
      attempts: tracking.attempts,
      maxRetries: tracking.maxRetries,
      delay
    });
  }

  /**
   * Determine if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Should retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      'rate limit',
      'timeout',
      'network',
      'temporary',
      'service unavailable',
      'internal server error',
      'connection',
      'provider failure'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  /**
   * Send bulk SMS with optimization and batching
   * @param {Array} recipients - Array of recipient data
   * @param {Object} smsData - SMS data template
   * @returns {Object} Bulk delivery result
   */
  async sendBulkOptimizedSMS(recipients, smsData) {
    const startTime = Date.now();
    const results = [];
    const batchSize = this.config.batchSize;

    console.log(`📱 Starting bulk SMS delivery to ${recipients.length} recipients in batches of ${batchSize}`);

    try {
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize);

        console.log(`📱 Processing batch ${batchIndex + 1}/${Math.ceil(recipients.length / batchSize)} (${batch.length} recipients)`);

        // Process batch in parallel
        const batchPromises = batch.map(async (recipient, index) => {
          try {
            // Add delay to respect rate limits
            if (index > 0) {
              await this.sleep(this.config.rateLimitDelay);
            }

            const recipientData = typeof recipient === 'string' ? { to: recipient } : recipient;
            
            const result = await this.sendOptimizedSMS({
              ...smsData,
              ...recipientData,
              metadata: {
                ...smsData.metadata,
                ...recipientData.metadata,
                batchIndex,
                recipientIndex: i + index
              }
            });

            return {
              recipient: recipientData.to,
              success: true,
              deliveryId: result.deliveryId,
              messageId: result.messageId,
              provider: result.provider,
              cost: result.cost,
              deliveryTime: result.deliveryTime
            };

          } catch (error) {
            return {
              recipient: typeof recipient === 'string' ? recipient : recipient.to,
              success: false,
              error: error.message || error.error
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(r => r.value || { success: false, error: r.reason?.message }));

        // Add delay between batches
        if (i + batchSize < recipients.length) {
          await this.sleep(2000); // 2 second delay between batches
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
      const totalTime = Date.now() - startTime;

      const summary = {
        totalRecipients: recipients.length,
        successCount,
        failureCount,
        successRate: (successCount / recipients.length) * 100,
        totalCost,
        totalTime,
        averageTimePerMessage: totalTime / recipients.length,
        results
      };

      console.log(`✅ Bulk SMS delivery completed: ${successCount}/${recipients.length} successful (${summary.successRate.toFixed(1)}%)`);

      // Emit bulk delivery event
      this.emit('bulkSMSCompleted', summary);

      return summary;

    } catch (error) {
      console.error('❌ Bulk SMS delivery failed:', error);
      throw error;
    }
  }

  /**
   * Track SMS delivery status from webhook
   * @param {Object} webhookData - Webhook data from SMS provider
   * @returns {Object} Tracking result
   */
  async trackDeliveryStatus(webhookData) {
    try {
      const { messageId, status, timestamp, recipient, errorCode, provider } = webhookData;

      // Find delivery tracking by message ID
      let deliveryId = null;
      let tracking = null;

      for (const [id, data] of this.deliveryTracking.entries()) {
        if (data.messageId === messageId) {
          deliveryId = id;
          tracking = data;
          break;
        }
      }

      if (!tracking) {
        console.warn(`⚠️ SMS delivery tracking not found for message ID: ${messageId}`);
        return { success: false, error: 'Tracking not found' };
      }

      // Update tracking status
      const previousStatus = tracking.status;
      tracking.status = status.toLowerCase();
      tracking.lastStatusUpdate = new Date(timestamp);
      tracking.providerStatus = status;

      if (errorCode) {
        tracking.errorCode = errorCode;
      }

      // Handle different status updates
      switch (tracking.status) {
        case 'delivered':
          tracking.deliveredAt = new Date(timestamp);
          tracking.finalDeliveryTime = tracking.deliveredAt - tracking.createdAt;
          this.updateStats('delivered');
          this.updateDeliveryTimeStats(tracking.finalDeliveryTime);
          
          this.emit('smsStatusUpdate', {
            deliveryId,
            messageId,
            status: 'delivered',
            recipient,
            deliveryTime: tracking.finalDeliveryTime,
            provider
          });
          
          console.log(`✅ SMS delivered: ${deliveryId} to ${recipient} in ${tracking.finalDeliveryTime}ms`);
          break;

        case 'failed':
        case 'undelivered':
          tracking.finallyFailedAt = new Date(timestamp);
          this.updateStats('failed');
          
          this.emit('smsStatusUpdate', {
            deliveryId,
            messageId,
            status: 'failed',
            recipient,
            errorCode,
            provider
          });
          
          console.error(`❌ SMS delivery failed: ${deliveryId} to ${recipient}, error: ${errorCode}`);
          break;

        case 'sent':
        case 'queued':
        case 'accepted':
          this.emit('smsStatusUpdate', {
            deliveryId,
            messageId,
            status: tracking.status,
            recipient,
            provider
          });
          
          console.log(`📱 SMS status update: ${deliveryId} - ${tracking.status}`);
          break;
      }

      return {
        success: true,
        deliveryId,
        previousStatus,
        newStatus: tracking.status,
        timestamp: new Date(timestamp)
      };

    } catch (error) {
      console.error('❌ Failed to track SMS delivery status:', error);
      throw error;
    }
  }

  /**
   * Initialize retry processor
   */
  initializeRetryProcessor() {
    // Process retry queue every 30 seconds
    setInterval(async () => {
      await this.processRetryQueue();
    }, 30000);

    console.log('🔄 SMS retry processor initialized');
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    const now = new Date();
    const retryItems = [];

    // Find items ready for retry
    for (const [deliveryId, retryData] of this.retryQueue.entries()) {
      if (retryData.retryAt <= now) {
        retryItems.push(deliveryId);
      }
    }

    if (retryItems.length === 0) return;

    console.log(`🔄 Processing ${retryItems.length} SMS retries`);

    // Process retries
    for (const deliveryId of retryItems) {
      try {
        // Remove from retry queue
        this.retryQueue.delete(deliveryId);
        
        // Attempt delivery
        await this.attemptDelivery(deliveryId);
        
      } catch (error) {
        // Retry will be rescheduled if appropriate, or marked as failed
        console.warn(`⚠️ SMS retry failed for ${deliveryId}:`, error.message);
      }
    }
  }

  /**
   * Get delivery status
   * @param {string} deliveryId - Delivery ID
   * @returns {Object|null} Delivery status
   */
  getDeliveryStatus(deliveryId) {
    const tracking = this.deliveryTracking.get(deliveryId);
    if (!tracking) return null;

    return {
      deliveryId,
      status: tracking.status,
      to: tracking.to,
      message: tracking.message,
      attempts: tracking.attempts,
      maxRetries: tracking.maxRetries,
      createdAt: tracking.createdAt,
      sentAt: tracking.sentAt,
      deliveredAt: tracking.deliveredAt,
      failedAt: tracking.failedAt,
      lastError: tracking.lastError,
      messageId: tracking.messageId,
      provider: tracking.provider,
      cost: tracking.cost,
      deliveryTime: tracking.deliveryTime,
      finalDeliveryTime: tracking.finalDeliveryTime
    };
  }

  /**
   * Get delivery statistics
   * @returns {Object} Delivery statistics
   */
  getDeliveryStats() {
    return {
      ...this.stats,
      activeDeliveries: this.deliveryTracking.size,
      pendingRetries: this.retryQueue.size,
      successRate: this.stats.totalSent > 0 ? (this.stats.totalDelivered / this.stats.totalSent) * 100 : 0,
      failureRate: this.stats.totalSent > 0 ? (this.stats.totalFailed / this.stats.totalSent) * 100 : 0,
      retryRate: this.stats.totalSent > 0 ? (this.stats.totalRetries / this.stats.totalSent) * 100 : 0
    };
  }

  /**
   * Update delivery statistics
   * @param {string} type - Stat type
   */
  updateStats(type) {
    switch (type) {
      case 'sent':
        this.stats.totalSent++;
        break;
      case 'delivered':
        this.stats.totalDelivered++;
        break;
      case 'failed':
        this.stats.totalFailed++;
        break;
      case 'retry':
        this.stats.totalRetries++;
        break;
    }
  }

  /**
   * Update delivery time statistics
   * @param {number} deliveryTime - Delivery time in milliseconds
   */
  updateDeliveryTimeStats(deliveryTime) {
    this.stats.deliveryTimes.push(deliveryTime);
    
    // Keep only last 1000 delivery times for average calculation
    if (this.stats.deliveryTimes.length > 1000) {
      this.stats.deliveryTimes = this.stats.deliveryTimes.slice(-1000);
    }
    
    // Calculate average
    this.stats.averageDeliveryTime = this.stats.deliveryTimes.reduce((sum, time) => sum + time, 0) / this.stats.deliveryTimes.length;
  }

  /**
   * Generate unique delivery ID
   * @returns {string} Delivery ID
   */
  generateDeliveryId() {
    return `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clean up old delivery tracking data
   * @param {number} maxAge - Maximum age in milliseconds (default 24 hours)
   */
  cleanupOldDeliveries(maxAge = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - maxAge);
    let cleaned = 0;

    for (const [deliveryId, tracking] of this.deliveryTracking.entries()) {
      if (tracking.createdAt < cutoff && ['delivered', 'failed'].includes(tracking.status)) {
        this.deliveryTracking.delete(deliveryId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old SMS delivery records`);
    }

    return cleaned;
  }

  /**
   * Utility method to sleep
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get system health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const stats = this.getDeliveryStats();
    const smsManagerHealth = this.smsManager.getProviderHealth();
    
    return {
      status: stats.successRate > 90 ? 'healthy' : stats.successRate > 70 ? 'degraded' : 'unhealthy',
      deliveryStats: stats,
      providerHealth: smsManagerHealth,
      activeDeliveries: this.deliveryTracking.size,
      pendingRetries: this.retryQueue.size,
      templateStats: this.templateEngine.getStats()
    };
  }
}

export default SMSDeliveryService;