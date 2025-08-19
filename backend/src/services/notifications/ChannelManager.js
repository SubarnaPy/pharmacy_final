import EventEmitter from 'events';

/**
 * Channel Manager for Multi-Channel Notification Delivery
 * Handles routing, delivery, fallback mechanisms, and retry logic
 */
class ChannelManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Service dependencies
    this.webSocketService = options.webSocketService || null;
    this.emailService = options.emailService || null;
    this.smsService = options.smsService || null;
    
    // Configuration
    this.retryConfig = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000, // 1 second
      maxDelay: options.maxDelay || 30000, // 30 seconds
      exponentialBase: options.exponentialBase || 2
    };
    
    // Channel priorities for fallback
    this.channelPriorities = {
      'emergency': ['websocket', 'sms', 'email'],
      'critical': ['websocket', 'sms', 'email'],
      'high': ['websocket', 'email', 'sms'],
      'medium': ['websocket', 'email'],
      'low': ['websocket', 'email']
    };
    
    // Channel availability tracking
    this.channelHealth = {
      websocket: { available: true, lastFailure: null, failureCount: 0 },
      email: { available: true, lastFailure: null, failureCount: 0 },
      sms: { available: true, lastFailure: null, failureCount: 0 }
    };
    
    // Delivery statistics
    this.deliveryStats = {
      websocket: { sent: 0, delivered: 0, failed: 0 },
      email: { sent: 0, delivered: 0, failed: 0 },
      sms: { sent: 0, delivered: 0, failed: 0 }
    };
    
    // Active delivery tracking
    this.activeDeliveries = new Map();
    
    console.log('✅ Channel Manager initialized');
  }

  /**
   * Deliver notification through specified channels with fallback
   * @param {Object} notification - Notification document
   * @param {Array} channels - Preferred delivery channels
   * @param {Object} preferences - User notification preferences
   * @returns {Object} Delivery results
   */
  async deliverNotification(notification, channels, preferences) {
    try {
      const deliveryId = this.generateDeliveryId();
      const deliveryResults = {
        deliveryId,
        notificationId: notification._id,
        channels: {},
        overallStatus: 'pending',
        startTime: new Date(),
        endTime: null
      };

      console.log(`📬 Starting delivery ${deliveryId} for notification ${notification._id} through channels: ${channels.join(', ')}`);

      // Track active delivery
      this.activeDeliveries.set(deliveryId, deliveryResults);

      // Get effective channels based on preferences and notification priority
      const effectiveChannels = this.getEffectiveChannels(channels, preferences, notification.priority);
      
      // Attempt delivery through each channel
      const deliveryPromises = effectiveChannels.map(channel => 
        this.deliverThroughChannel(notification, channel, deliveryId)
      );

      // Wait for all delivery attempts
      const channelResults = await Promise.allSettled(deliveryPromises);

      // Process results
      let successCount = 0;
      effectiveChannels.forEach((channel, index) => {
        const result = channelResults[index];
        
        if (result.status === 'fulfilled' && result.value.success) {
          deliveryResults.channels[channel] = result.value;
          successCount++;
        } else {
          deliveryResults.channels[channel] = {
            success: false,
            error: result.reason || result.value?.error || 'Unknown error',
            timestamp: new Date()
          };
        }
      });

      // Determine overall status
      if (successCount > 0) {
        deliveryResults.overallStatus = 'success';
      } else if (this.shouldAttemptFallback(notification, effectiveChannels)) {
        // Attempt fallback delivery
        const fallbackResult = await this.attemptFallbackDelivery(notification, effectiveChannels, deliveryId);
        if (fallbackResult.success) {
          deliveryResults.channels[fallbackResult.channel] = fallbackResult;
          deliveryResults.overallStatus = 'success_fallback';
        } else {
          deliveryResults.overallStatus = 'failed';
        }
      } else {
        deliveryResults.overallStatus = 'failed';
      }

      deliveryResults.endTime = new Date();
      
      // Clean up active delivery tracking
      this.activeDeliveries.delete(deliveryId);

      // Emit delivery completion event
      this.emit('deliveryComplete', deliveryResults);

      console.log(`📊 Delivery ${deliveryId} completed with status: ${deliveryResults.overallStatus}`);
      return deliveryResults;

    } catch (error) {
      console.error('❌ Failed to deliver notification:', error);
      throw error;
    }
  }

  /**
   * Deliver notification with explicit fallback channels
   * @param {Object} notification - Notification document
   * @param {string} primaryChannel - Primary delivery channel
   * @param {Array} fallbackChannels - Fallback channels in order of preference
   * @returns {Object} Delivery result
   */
  async deliverWithFallback(notification, primaryChannel, fallbackChannels) {
    try {
      const deliveryId = this.generateDeliveryId();
      
      console.log(`🔄 Attempting delivery with fallback: ${primaryChannel} -> [${fallbackChannels.join(', ')}]`);

      // Try primary channel first
      try {
        const primaryResult = await this.deliverThroughChannel(notification, primaryChannel, deliveryId);
        
        if (primaryResult.success) {
          console.log(`✅ Primary channel ${primaryChannel} delivery successful`);
          return {
            success: true,
            channel: primaryChannel,
            result: primaryResult,
            fallbackUsed: false
          };
        }
      } catch (error) {
        console.log(`❌ Primary channel ${primaryChannel} failed: ${error.message}`);
      }

      // Try fallback channels
      for (const fallbackChannel of fallbackChannels) {
        if (!this.isChannelAvailable(fallbackChannel)) {
          console.log(`⚠️ Fallback channel ${fallbackChannel} not available, skipping`);
          continue;
        }

        try {
          const fallbackResult = await this.deliverThroughChannel(notification, fallbackChannel, deliveryId);
          
          if (fallbackResult.success) {
            console.log(`✅ Fallback channel ${fallbackChannel} delivery successful`);
            return {
              success: true,
              channel: fallbackChannel,
              result: fallbackResult,
              fallbackUsed: true
            };
          }
        } catch (error) {
          console.log(`❌ Fallback channel ${fallbackChannel} failed: ${error.message}`);
        }
      }

      // All channels failed
      return {
        success: false,
        error: 'All delivery channels failed',
        channelsTried: [primaryChannel, ...fallbackChannels],
        fallbackUsed: true
      };

    } catch (error) {
      console.error('❌ Failed to deliver with fallback:', error);
      throw error;
    }
  }

  /**
   * Deliver through specific channel
   * @param {Object} notification - Notification document
   * @param {string} channel - Delivery channel
   * @param {string} deliveryId - Delivery tracking ID
   * @returns {Object} Delivery result
   */
  async deliverThroughChannel(notification, channel, deliveryId) {
    try {
      // Check channel availability
      if (!this.isChannelAvailable(channel)) {
        throw new Error(`Channel ${channel} is not available`);
      }

      // Update delivery stats
      this.deliveryStats[channel].sent++;

      const startTime = new Date();
      let result;

      switch (channel) {
        case 'websocket':
          result = await this.deliverViaWebSocket(notification, deliveryId);
          break;
        case 'email':
          result = await this.deliverViaEmail(notification, deliveryId);
          break;
        case 'sms':
          result = await this.deliverViaSMS(notification, deliveryId);
          break;
        default:
          throw new Error(`Unknown delivery channel: ${channel}`);
      }

      const endTime = new Date();
      const deliveryTime = endTime - startTime;

      // Update success stats
      this.deliveryStats[channel].delivered++;
      this.updateChannelHealth(channel, true);

      // Emit channel delivery event
      this.emit('channelDelivery', {
        channel,
        notificationId: notification._id,
        deliveryId,
        success: true,
        deliveryTime,
        result
      });

      return {
        success: true,
        channel,
        deliveryTime,
        timestamp: endTime,
        result
      };

    } catch (error) {
      // Update failure stats
      this.deliveryStats[channel].failed++;
      this.updateChannelHealth(channel, false, error);

      // Emit channel failure event
      this.emit('channelFailure', {
        channel,
        notificationId: notification._id,
        deliveryId,
        error: error.message,
        timestamp: new Date()
      });

      console.error(`❌ Channel ${channel} delivery failed:`, error.message);
      throw error;
    }
  }

  /**
   * Deliver via WebSocket
   * @param {Object} notification - Notification document
   * @param {string} deliveryId - Delivery tracking ID
   * @returns {Object} Delivery result
   */
  async deliverViaWebSocket(notification, deliveryId) {
    try {
      if (!this.webSocketService) {
        throw new Error('WebSocket service not available');
      }

      const deliveryResults = [];

      // Check if this is a role-based notification (all recipients have same role)
      const recipientRoles = [...new Set(notification.recipients.map(r => r.userRole))];
      
      if (recipientRoles.length === 1 && notification.recipients.length > 10) {
        // Use role-based broadcasting for efficiency
        const role = recipientRoles[0];
        
        const payload = {
          id: notification._id,
          type: notification.type,
          title: notification.content.title,
          message: notification.content.message,
          priority: notification.priority,
          category: notification.category,
          createdAt: notification.createdAt,
          actionUrl: notification.content.actionUrl,
          actionText: notification.content.actionText,
          metadata: notification.content.metadata,
          deliveryId
        };

        try {
          // Use enhanced WebSocket service for role broadcasting if available
          if (this.webSocketService.broadcastToRole) {
            const broadcastResult = await this.webSocketService.broadcastToRole(role, payload);
            
            return {
              channel: 'websocket',
              totalRecipients: broadcastResult.totalUsers,
              successCount: broadcastResult.onlineUsers,
              failureCount: broadcastResult.offlineUsers,
              deliveryResults: [{
                role,
                onlineUsers: broadcastResult.onlineUsers,
                offlineUsers: broadcastResult.offlineUsers,
                timestamp: new Date()
              }],
              overallSuccess: broadcastResult.onlineUsers > 0,
              broadcastUsed: true
            };
          }
        } catch (error) {
          console.log(`⚠️ Role broadcast failed, falling back to individual delivery: ${error.message}`);
        }
      }

      // Individual delivery to each recipient
      for (const recipient of notification.recipients) {
        const payload = {
          id: notification._id,
          type: notification.type,
          title: notification.content.title,
          message: notification.content.message,
          priority: notification.priority,
          category: notification.category,
          createdAt: notification.createdAt,
          actionUrl: notification.content.actionUrl,
          actionText: notification.content.actionText,
          metadata: notification.content.metadata,
          deliveryId
        };

        try {
          let delivered = false;
          
          // Use enhanced WebSocket service if available
          if (this.webSocketService.sendNotificationToUser) {
            delivered = await this.webSocketService.sendNotificationToUser(
              recipient.userId.toString(), 
              payload
            );
          } else {
            // Fallback to basic WebSocket service
            this.webSocketService.sendNotificationToUser(recipient.userId.toString(), payload);
            delivered = true; // Assume success for basic service
          }

          deliveryResults.push({
            userId: recipient.userId,
            success: delivered,
            timestamp: new Date()
          });

          console.log(`📱 WebSocket notification ${delivered ? 'delivered' : 'queued'} for user ${recipient.userId}`);

        } catch (error) {
          deliveryResults.push({
            userId: recipient.userId,
            success: false,
            error: error.message,
            timestamp: new Date()
          });

          console.error(`❌ WebSocket delivery failed for user ${recipient.userId}:`, error.message);
        }
      }

      const successCount = deliveryResults.filter(r => r.success).length;
      const totalRecipients = deliveryResults.length;

      return {
        channel: 'websocket',
        totalRecipients,
        successCount,
        failureCount: totalRecipients - successCount,
        deliveryResults,
        overallSuccess: successCount > 0
      };

    } catch (error) {
      console.error('❌ WebSocket delivery failed:', error);
      throw error;
    }
  }

  /**
   * Deliver via Email
   * @param {Object} notification - Notification document
   * @param {string} deliveryId - Delivery tracking ID
   * @returns {Object} Delivery result
   */
  async deliverViaEmail(notification, deliveryId) {
    try {
      if (!this.emailService) {
        throw new Error('Email service not available');
      }

      const deliveryResults = [];

      // Deliver to each recipient
      for (const recipient of notification.recipients) {
        try {
          // Get email template (this would be implemented in the template engine)
          const emailContent = {
            subject: notification.content.title,
            html: this.generateEmailHTML(notification),
            text: notification.content.message
          };

          const emailResult = await this.emailService.sendEmail({
            to: recipient.email || `user${recipient.userId}@example.com`, // Placeholder
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            metadata: { deliveryId, notificationId: notification._id }
          });

          deliveryResults.push({
            userId: recipient.userId,
            success: true,
            messageId: emailResult.messageId,
            timestamp: new Date()
          });

          console.log(`📧 Email notification sent to user ${recipient.userId}`);

        } catch (error) {
          deliveryResults.push({
            userId: recipient.userId,
            success: false,
            error: error.message,
            timestamp: new Date()
          });

          console.error(`❌ Email delivery failed for user ${recipient.userId}:`, error.message);
        }
      }

      const successCount = deliveryResults.filter(r => r.success).length;
      const totalRecipients = deliveryResults.length;

      return {
        channel: 'email',
        totalRecipients,
        successCount,
        failureCount: totalRecipients - successCount,
        deliveryResults,
        overallSuccess: successCount > 0
      };

    } catch (error) {
      console.error('❌ Email delivery failed:', error);
      throw error;
    }
  }

  /**
   * Deliver via SMS
   * @param {Object} notification - Notification document
   * @param {string} deliveryId - Delivery tracking ID
   * @returns {Object} Delivery result
   */
  async deliverViaSMS(notification, deliveryId) {
    try {
      if (!this.smsService) {
        throw new Error('SMS service not available');
      }

      const deliveryResults = [];

      // Deliver to each recipient
      for (const recipient of notification.recipients) {
        try {
          // Generate SMS message (truncated for SMS limits)
          const message = this.generateSMSMessage(notification);

          const smsResult = await this.smsService.sendSMS({
            to: recipient.phone || `+1234567890`, // Placeholder
            message,
            metadata: { deliveryId, notificationId: notification._id }
          });

          deliveryResults.push({
            userId: recipient.userId,
            success: true,
            messageId: smsResult.messageId,
            timestamp: new Date()
          });

          console.log(`📱 SMS notification sent to user ${recipient.userId}`);

        } catch (error) {
          deliveryResults.push({
            userId: recipient.userId,
            success: false,
            error: error.message,
            timestamp: new Date()
          });

          console.error(`❌ SMS delivery failed for user ${recipient.userId}:`, error.message);
        }
      }

      const successCount = deliveryResults.filter(r => r.success).length;
      const totalRecipients = deliveryResults.length;

      return {
        channel: 'sms',
        totalRecipients,
        successCount,
        failureCount: totalRecipients - successCount,
        deliveryResults,
        overallSuccess: successCount > 0
      };

    } catch (error) {
      console.error('❌ SMS delivery failed:', error);
      throw error;
    }
  }

  /**
   * Retry failed delivery with exponential backoff
   * @param {string} notificationId - Notification ID
   * @param {string} channel - Channel to retry
   * @param {number} retryCount - Current retry count
   * @returns {Object} Retry result
   */
  async retryFailedDelivery(notificationId, channel, retryCount = 0) {
    try {
      if (retryCount >= this.retryConfig.maxRetries) {
        throw new Error(`Maximum retry attempts (${this.retryConfig.maxRetries}) exceeded`);
      }

      // Calculate exponential backoff delay
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(this.retryConfig.exponentialBase, retryCount),
        this.retryConfig.maxDelay
      );

      console.log(`🔄 Retrying delivery for notification ${notificationId} via ${channel} in ${delay}ms (attempt ${retryCount + 1})`);

      // Wait for backoff delay
      await this.sleep(delay);

      // Get notification from database (this would be implemented)
      // For now, we'll simulate the retry
      const deliveryId = this.generateDeliveryId();
      
      // Attempt delivery again
      // const notification = await Notification.findById(notificationId);
      // const result = await this.deliverThroughChannel(notification, channel, deliveryId);

      // Simulate retry result
      const retryResult = {
        success: Math.random() > 0.3, // 70% success rate for simulation
        retryCount: retryCount + 1,
        channel,
        deliveryId,
        timestamp: new Date()
      };

      if (retryResult.success) {
        console.log(`✅ Retry successful for notification ${notificationId} via ${channel}`);
        this.emit('retrySuccess', { notificationId, channel, retryCount: retryCount + 1 });
      } else {
        console.log(`❌ Retry failed for notification ${notificationId} via ${channel}`);
        this.emit('retryFailure', { notificationId, channel, retryCount: retryCount + 1 });
        
        // Schedule next retry if within limits
        if (retryCount + 1 < this.retryConfig.maxRetries) {
          setTimeout(() => {
            this.retryFailedDelivery(notificationId, channel, retryCount + 1);
          }, delay * 2);
        }
      }

      return retryResult;

    } catch (error) {
      console.error('❌ Failed to retry delivery:', error);
      this.emit('retryError', { notificationId, channel, retryCount, error: error.message });
      throw error;
    }
  }

  /**
   * Handle delivery failure with appropriate response
   * @param {Object} notification - Notification document
   * @param {string} channel - Failed channel
   * @param {Error} error - Failure error
   * @returns {Object} Failure handling result
   */
  async handleDeliveryFailure(notification, channel, error) {
    try {
      console.log(`🚨 Handling delivery failure for notification ${notification._id} on channel ${channel}: ${error.message}`);

      const failureResult = {
        notificationId: notification._id,
        channel,
        error: error.message,
        timestamp: new Date(),
        actions: []
      };

      // Update channel health
      this.updateChannelHealth(channel, false, error);

      // Determine failure response based on error type and notification priority
      if (this.isTemporaryError(error)) {
        // Schedule retry for temporary errors
        failureResult.actions.push('retry_scheduled');
        setTimeout(() => {
          this.retryFailedDelivery(notification._id, channel, 0);
        }, this.retryConfig.baseDelay);
      }

      // For critical/emergency notifications, attempt immediate fallback
      if (['critical', 'emergency'].includes(notification.priority)) {
        const fallbackChannels = this.getFallbackChannels(channel, notification.priority);
        if (fallbackChannels.length > 0) {
          failureResult.actions.push('fallback_attempted');
          const fallbackResult = await this.attemptFallbackDelivery(notification, [channel]);
          failureResult.fallbackResult = fallbackResult;
        }
      }

      // Log failure for analytics
      this.emit('deliveryFailure', failureResult);

      return failureResult;

    } catch (error) {
      console.error('❌ Failed to handle delivery failure:', error);
      throw error;
    }
  }

  /**
   * Attempt fallback delivery
   * @param {Object} notification - Notification document
   * @param {Array} failedChannels - Channels that have failed
   * @param {string} deliveryId - Delivery tracking ID
   * @returns {Object} Fallback result
   */
  async attemptFallbackDelivery(notification, failedChannels, deliveryId = null) {
    try {
      if (!deliveryId) {
        deliveryId = this.generateDeliveryId();
      }

      const fallbackChannels = this.getFallbackChannels(failedChannels, notification.priority);
      
      console.log(`🔄 Attempting fallback delivery for notification ${notification._id} through: ${fallbackChannels.join(', ')}`);

      for (const channel of fallbackChannels) {
        if (!this.isChannelAvailable(channel)) {
          continue;
        }

        try {
          const result = await this.deliverThroughChannel(notification, channel, deliveryId);
          
          if (result.success) {
            console.log(`✅ Fallback delivery successful via ${channel}`);
            return {
              success: true,
              channel,
              result,
              timestamp: new Date()
            };
          }
        } catch (error) {
          console.log(`❌ Fallback channel ${channel} also failed: ${error.message}`);
        }
      }

      return {
        success: false,
        error: 'All fallback channels failed',
        channelsTried: fallbackChannels,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Failed to attempt fallback delivery:', error);
      throw error;
    }
  }

  /**
   * Get effective channels based on preferences and priority
   * @param {Array} requestedChannels - Requested delivery channels
   * @param {Object} preferences - User notification preferences
   * @param {string} priority - Notification priority
   * @returns {Array} Effective channels
   */
  getEffectiveChannels(requestedChannels, preferences, priority) {
    // For critical/emergency notifications, override preferences
    if (['critical', 'emergency'].includes(priority)) {
      return this.channelPriorities[priority] || requestedChannels;
    }

    // Filter requested channels based on preferences
    const effectiveChannels = requestedChannels.filter(channel => {
      if (!preferences || !preferences.channels) {
        return true; // Default to allowing all channels
      }

      const channelPrefs = preferences.channels[channel];
      return channelPrefs && channelPrefs.enabled;
    });

    return effectiveChannels.length > 0 ? effectiveChannels : ['websocket']; // Fallback to websocket
  }

  /**
   * Get fallback channels for failed delivery
   * @param {Array|string} failedChannels - Failed channels
   * @param {string} priority - Notification priority
   * @returns {Array} Fallback channels
   */
  getFallbackChannels(failedChannels, priority) {
    const failed = Array.isArray(failedChannels) ? failedChannels : [failedChannels];
    const priorityChannels = this.channelPriorities[priority] || ['websocket', 'email', 'sms'];
    
    return priorityChannels.filter(channel => 
      !failed.includes(channel) && this.isChannelAvailable(channel)
    );
  }

  /**
   * Check if channel is available
   * @param {string} channel - Channel name
   * @returns {boolean} Is channel available
   */
  isChannelAvailable(channel) {
    const health = this.channelHealth[channel];
    if (!health) return false;

    // Channel is unavailable if it has failed recently and frequently
    if (health.failureCount > 5 && health.lastFailure) {
      const timeSinceFailure = Date.now() - health.lastFailure.getTime();
      if (timeSinceFailure < 300000) { // 5 minutes
        return false;
      }
    }

    return health.available;
  }

  /**
   * Update channel health status
   * @param {string} channel - Channel name
   * @param {boolean} success - Was operation successful
   * @param {Error} error - Error if failed
   */
  updateChannelHealth(channel, success, error = null) {
    const health = this.channelHealth[channel];
    if (!health) return;

    if (success) {
      health.available = true;
      health.failureCount = Math.max(0, health.failureCount - 1); // Reduce failure count on success
    } else {
      health.lastFailure = new Date();
      health.failureCount++;
      
      // Mark as unavailable if too many failures
      if (health.failureCount > 10) {
        health.available = false;
      }
    }

    // Emit health change event
    this.emit('channelHealthChange', { channel, health: { ...health } });
  }

  /**
   * Check if error is temporary
   * @param {Error} error - Error to check
   * @returns {boolean} Is temporary error
   */
  isTemporaryError(error) {
    const temporaryErrorPatterns = [
      /timeout/i,
      /connection/i,
      /network/i,
      /rate limit/i,
      /service unavailable/i,
      /temporary/i
    ];

    return temporaryErrorPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if fallback should be attempted
   * @param {Object} notification - Notification document
   * @param {Array} failedChannels - Failed channels
   * @returns {boolean} Should attempt fallback
   */
  shouldAttemptFallback(notification, failedChannels) {
    // Always attempt fallback for critical/emergency notifications
    if (['critical', 'emergency'].includes(notification.priority)) {
      return true;
    }

    // Attempt fallback if primary channels failed but alternatives are available
    const availableFallbacks = this.getFallbackChannels(failedChannels, notification.priority);
    return availableFallbacks.length > 0;
  }

  /**
   * Generate email HTML content
   * @param {Object} notification - Notification document
   * @returns {string} HTML content
   */
  generateEmailHTML(notification) {
    // Simple HTML template - would be enhanced with proper template engine
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 16px;">${notification.content.title}</h2>
            <p style="color: #666; line-height: 1.6;">${notification.content.message}</p>
            ${notification.content.actionUrl ? `
              <div style="margin-top: 20px;">
                <a href="${notification.content.actionUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                  ${notification.content.actionText || 'View Details'}
                </a>
              </div>
            ` : ''}
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #999; font-size: 12px;">
                This notification was sent at ${notification.createdAt}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate SMS message content
   * @param {Object} notification - Notification document
   * @returns {string} SMS message
   */
  generateSMSMessage(notification) {
    // Truncate message for SMS limits (160 characters)
    let message = `${notification.content.title}: ${notification.content.message}`;
    
    if (notification.content.actionUrl) {
      message += ` ${notification.content.actionUrl}`;
    }

    return message.length > 160 ? message.substring(0, 157) + '...' : message;
  }

  /**
   * Generate unique delivery ID
   * @returns {string} Delivery ID
   */
  generateDeliveryId() {
    return `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Sleep promise
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get channel manager statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      channelHealth: { ...this.channelHealth },
      deliveryStats: { ...this.deliveryStats },
      activeDeliveries: this.activeDeliveries.size,
      retryConfig: { ...this.retryConfig },
      timestamp: new Date()
    };
  }

  /**
   * Reset channel health (for testing/maintenance)
   * @param {string} channel - Channel to reset (optional)
   */
  resetChannelHealth(channel = null) {
    if (channel) {
      this.channelHealth[channel] = { available: true, lastFailure: null, failureCount: 0 };
    } else {
      Object.keys(this.channelHealth).forEach(ch => {
        this.channelHealth[ch] = { available: true, lastFailure: null, failureCount: 0 };
      });
    }
    
    console.log(`🔄 Channel health reset for: ${channel || 'all channels'}`);
  }
}

export default ChannelManager;