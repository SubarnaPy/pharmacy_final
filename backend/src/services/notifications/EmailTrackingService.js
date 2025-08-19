import EventEmitter from 'events';
import crypto from 'crypto';
import Notification from '../../models/Notification.js';
import NotificationAnalytics from '../../models/NotificationAnalytics.js';

/**
 * Email Tracking Service
 * Handles email delivery tracking, webhooks, analytics, and reporting
 */
class EmailTrackingService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.trackingPixelDomain = options.trackingPixelDomain || process.env.TRACKING_PIXEL_DOMAIN || 'localhost:5000';
    this.unsubscribeBaseUrl = options.unsubscribeBaseUrl || process.env.UNSUBSCRIBE_BASE_URL || 'http://localhost:5000/api/notifications';
    
    // Tracking data storage
    this.trackingData = new Map(); // messageId -> tracking info
    this.clickTracking = new Map(); // trackingId -> click info
    this.unsubscribeTokens = new Map(); // token -> user info
    
    // Analytics aggregation
    this.dailyStats = new Map(); // date -> stats
    
    console.log('📊 Email Tracking Service initialized');
  }

  /**
   * Generate tracking pixel URL for email open tracking
   * @param {string} messageId - Email message ID
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @returns {string} Tracking pixel URL
   */
  generateTrackingPixelUrl(messageId, userId, notificationId) {
    const trackingId = this.generateTrackingId(messageId, userId);
    
    // Store tracking data
    this.trackingData.set(trackingId, {
      messageId,
      userId,
      notificationId,
      createdAt: new Date(),
      opened: false,
      openedAt: null,
      clicks: []
    });
    
    return `https://${this.trackingPixelDomain}/api/notifications/track/open/${trackingId}.png`;
  }

  /**
   * Generate trackable link for click tracking
   * @param {string} originalUrl - Original URL to track
   * @param {string} messageId - Email message ID
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @returns {string} Trackable URL
   */
  generateTrackableLink(originalUrl, messageId, userId, notificationId) {
    const trackingId = this.generateTrackingId(messageId, userId);
    const clickId = crypto.randomUUID();
    
    // Store click tracking data
    this.clickTracking.set(clickId, {
      trackingId,
      originalUrl,
      messageId,
      userId,
      notificationId,
      createdAt: new Date(),
      clicked: false,
      clickedAt: null
    });
    
    return `https://${this.trackingPixelDomain}/api/notifications/track/click/${clickId}`;
  }

  /**
   * Generate unsubscribe link
   * @param {string} userId - User ID
   * @param {string} notificationType - Notification type to unsubscribe from
   * @returns {string} Unsubscribe URL
   */
  generateUnsubscribeLink(userId, notificationType = 'all') {
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store unsubscribe token
    this.unsubscribeTokens.set(token, {
      userId,
      notificationType,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    
    return `${this.unsubscribeBaseUrl}/unsubscribe/${token}`;
  }

  /**
   * Track email open event
   * @param {string} trackingId - Tracking ID from pixel URL
   * @returns {Object} Tracking result
   */
  async trackEmailOpen(trackingId) {
    try {
      const trackingInfo = this.trackingData.get(trackingId);
      
      if (!trackingInfo) {
        console.warn(`⚠️ No tracking data found for ID: ${trackingId}`);
        return { success: false, error: 'Invalid tracking ID' };
      }
      
      // Update tracking data
      if (!trackingInfo.opened) {
        trackingInfo.opened = true;
        trackingInfo.openedAt = new Date();
        
        // Update notification in database
        await this.updateNotificationDeliveryStatus(
          trackingInfo.notificationId,
          trackingInfo.userId,
          'email',
          'opened',
          { openedAt: trackingInfo.openedAt }
        );
        
        // Update analytics
        await this.updateAnalytics('email_opened', trackingInfo);
        
        // Emit tracking event
        this.emit('emailOpened', {
          messageId: trackingInfo.messageId,
          userId: trackingInfo.userId,
          notificationId: trackingInfo.notificationId,
          openedAt: trackingInfo.openedAt
        });
        
        console.log(`📧 Email opened: ${trackingInfo.messageId} by user ${trackingInfo.userId}`);
      }
      
      return { success: true, event: 'opened', timestamp: trackingInfo.openedAt };
      
    } catch (error) {
      console.error('❌ Failed to track email open:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track email click event
   * @param {string} clickId - Click tracking ID
   * @returns {Object} Tracking result with redirect URL
   */
  async trackEmailClick(clickId) {
    try {
      const clickInfo = this.clickTracking.get(clickId);
      
      if (!clickInfo) {
        console.warn(`⚠️ No click tracking data found for ID: ${clickId}`);
        return { success: false, error: 'Invalid click ID' };
      }
      
      // Update click tracking data
      if (!clickInfo.clicked) {
        clickInfo.clicked = true;
        clickInfo.clickedAt = new Date();
        
        // Update main tracking data
        const trackingInfo = this.trackingData.get(clickInfo.trackingId);
        if (trackingInfo) {
          trackingInfo.clicks.push({
            clickId,
            url: clickInfo.originalUrl,
            clickedAt: clickInfo.clickedAt
          });
        }
        
        // Update notification in database
        await this.updateNotificationDeliveryStatus(
          clickInfo.notificationId,
          clickInfo.userId,
          'email',
          'clicked',
          { clickedAt: clickInfo.clickedAt }
        );
        
        // Update analytics
        await this.updateAnalytics('email_clicked', clickInfo);
        
        // Emit tracking event
        this.emit('emailClicked', {
          messageId: clickInfo.messageId,
          userId: clickInfo.userId,
          notificationId: clickInfo.notificationId,
          url: clickInfo.originalUrl,
          clickedAt: clickInfo.clickedAt
        });
        
        console.log(`🔗 Email link clicked: ${clickInfo.originalUrl} by user ${clickInfo.userId}`);
      }
      
      return { 
        success: true, 
        event: 'clicked', 
        redirectUrl: clickInfo.originalUrl,
        timestamp: clickInfo.clickedAt 
      };
      
    } catch (error) {
      console.error('❌ Failed to track email click:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle email delivery webhook from providers
   * @param {string} provider - Email provider (sendgrid, aws-ses, etc.)
   * @param {Object} webhookData - Webhook payload
   * @returns {Object} Processing result
   */
  async handleDeliveryWebhook(provider, webhookData) {
    try {
      let events = [];
      
      // Parse webhook data based on provider
      switch (provider.toLowerCase()) {
        case 'sendgrid':
          events = this.parseSendGridWebhook(webhookData);
          break;
        case 'aws-ses':
          events = this.parseAWSSESWebhook(webhookData);
          break;
        default:
          console.warn(`⚠️ Unknown email provider: ${provider}`);
          return { success: false, error: 'Unknown provider' };
      }
      
      // Process each event
      const results = [];
      for (const event of events) {
        const result = await this.processDeliveryEvent(event);
        results.push(result);
      }
      
      return {
        success: true,
        provider,
        eventsProcessed: events.length,
        results
      };
      
    } catch (error) {
      console.error('❌ Failed to handle delivery webhook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse SendGrid webhook data
   * @param {Array} webhookData - SendGrid webhook events
   * @returns {Array} Parsed events
   */
  parseSendGridWebhook(webhookData) {
    const events = Array.isArray(webhookData) ? webhookData : [webhookData];
    
    return events.map(event => ({
      provider: 'sendgrid',
      messageId: event.sg_message_id || event['smtp-id'],
      email: event.email,
      event: event.event,
      timestamp: new Date(event.timestamp * 1000),
      reason: event.reason,
      status: event.status,
      response: event.response,
      userAgent: event.useragent,
      ip: event.ip,
      url: event.url,
      customArgs: event.customArgs || {}
    }));
  }

  /**
   * Parse AWS SES webhook data
   * @param {Object} webhookData - AWS SES webhook event
   * @returns {Array} Parsed events
   */
  parseAWSSESWebhook(webhookData) {
    const message = JSON.parse(webhookData.Message || '{}');
    const eventType = message.eventType || message.notificationType;
    
    let event = 'unknown';
    switch (eventType) {
      case 'send':
        event = 'sent';
        break;
      case 'delivery':
        event = 'delivered';
        break;
      case 'bounce':
        event = 'bounced';
        break;
      case 'complaint':
        event = 'complained';
        break;
      case 'reject':
        event = 'rejected';
        break;
    }
    
    return [{
      provider: 'aws-ses',
      messageId: message.mail?.messageId,
      email: message.mail?.destination?.[0],
      event,
      timestamp: new Date(message.mail?.timestamp || Date.now()),
      reason: message.bounce?.bounceSubType || message.complaint?.complaintSubType,
      status: message.delivery?.processingTimeMillis ? 'delivered' : 'failed'
    }];
  }

  /**
   * Process individual delivery event
   * @param {Object} event - Delivery event data
   * @returns {Object} Processing result
   */
  async processDeliveryEvent(event) {
    try {
      const { messageId, email, event: eventType, timestamp, reason } = event;
      
      // Find notification by message ID
      const notification = await Notification.findOne({
        'recipients.deliveryStatus.email.messageId': messageId
      });
      
      if (!notification) {
        console.warn(`⚠️ No notification found for message ID: ${messageId}`);
        return { success: false, error: 'Notification not found' };
      }
      
      // Find the specific recipient
      const recipient = notification.recipients.find(r => 
        r.deliveryStatus.email.messageId === messageId
      );
      
      if (!recipient) {
        console.warn(`⚠️ No recipient found for message ID: ${messageId}`);
        return { success: false, error: 'Recipient not found' };
      }
      
      // Update delivery status
      const statusMap = {
        'sent': 'sent',
        'delivered': 'delivered',
        'opened': 'opened',
        'clicked': 'clicked',
        'bounced': 'bounced',
        'complained': 'bounced',
        'rejected': 'failed',
        'dropped': 'failed',
        'deferred': 'pending'
      };
      
      const newStatus = statusMap[eventType] || 'failed';
      recipient.deliveryStatus.email.status = newStatus;
      recipient.deliveryStatus.email.deliveredAt = timestamp;
      
      if (reason) {
        recipient.deliveryStatus.email.error = reason;
      }
      
      // Update notification analytics
      this.updateNotificationAnalytics(notification, eventType);
      
      await notification.save();
      
      // Update daily analytics
      await this.updateAnalytics(`email_${eventType}`, { 
        userId: recipient.userId,
        notificationId: notification._id,
        messageId,
        timestamp
      });
      
      // Emit event
      this.emit('deliveryEvent', {
        provider: event.provider,
        messageId,
        email,
        event: eventType,
        status: newStatus,
        timestamp,
        notificationId: notification._id,
        userId: recipient.userId
      });
      
      console.log(`📊 Email delivery event: ${eventType} for ${messageId}`);
      
      return { success: true, event: eventType, status: newStatus };
      
    } catch (error) {
      console.error('❌ Failed to process delivery event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle email bounce
   * @param {Object} bounceData - Bounce event data
   * @returns {Object} Processing result
   */
  async handleEmailBounce(bounceData) {
    try {
      const { messageId, email, bounceType, bounceSubType, timestamp } = bounceData;
      
      // Update notification status
      await this.updateNotificationDeliveryStatus(
        bounceData.notificationId,
        bounceData.userId,
        'email',
        'bounced',
        { 
          error: `${bounceType}: ${bounceSubType}`,
          deliveredAt: timestamp
        }
      );
      
      // Check if it's a permanent bounce
      const permanentBounceTypes = ['Permanent', 'Undetermined'];
      if (permanentBounceTypes.includes(bounceType)) {
        // Mark email as invalid for future notifications
        await this.markEmailAsInvalid(email, bounceSubType);
      }
      
      // Update analytics
      await this.updateAnalytics('email_bounced', bounceData);
      
      // Emit bounce event
      this.emit('emailBounced', {
        messageId,
        email,
        bounceType,
        bounceSubType,
        timestamp,
        permanent: permanentBounceTypes.includes(bounceType)
      });
      
      console.log(`📧 Email bounced: ${email} (${bounceType})`);
      
      return { success: true, event: 'bounced', permanent: permanentBounceTypes.includes(bounceType) };
      
    } catch (error) {
      console.error('❌ Failed to handle email bounce:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle unsubscribe request
   * @param {string} token - Unsubscribe token
   * @returns {Object} Processing result
   */
  async handleUnsubscribe(token) {
    try {
      const unsubscribeInfo = this.unsubscribeTokens.get(token);
      
      if (!unsubscribeInfo) {
        return { success: false, error: 'Invalid or expired unsubscribe token' };
      }
      
      // Check if token is expired
      if (new Date() > unsubscribeInfo.expiresAt) {
        this.unsubscribeTokens.delete(token);
        return { success: false, error: 'Unsubscribe token has expired' };
      }
      
      const { userId, notificationType } = unsubscribeInfo;
      
      // Update user notification preferences
      await this.updateUserNotificationPreferences(userId, notificationType, false);
      
      // Clean up token
      this.unsubscribeTokens.delete(token);
      
      // Update analytics
      await this.updateAnalytics('email_unsubscribed', { userId, notificationType });
      
      // Emit unsubscribe event
      this.emit('emailUnsubscribed', {
        userId,
        notificationType,
        timestamp: new Date()
      });
      
      console.log(`📧 User unsubscribed: ${userId} from ${notificationType}`);
      
      return { 
        success: true, 
        event: 'unsubscribed', 
        userId, 
        notificationType 
      };
      
    } catch (error) {
      console.error('❌ Failed to handle unsubscribe:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate email delivery analytics report
   * @param {Object} filters - Report filters
   * @returns {Object} Analytics report
   */
  async generateDeliveryReport(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        provider = null,
        notificationType = null,
        userRole = null
      } = filters;
      
      // Get analytics data from database
      const analyticsData = await NotificationAnalytics.find({
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: -1 });
      
      // Aggregate data
      const report = {
        period: { startDate, endDate },
        summary: {
          totalSent: 0,
          totalDelivered: 0,
          totalOpened: 0,
          totalClicked: 0,
          totalBounced: 0,
          totalFailed: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0
        },
        daily: [],
        byProvider: {},
        byNotificationType: {},
        byUserRole: {}
      };
      
      // Process analytics data
      for (const dayData of analyticsData) {
        const emailMetrics = dayData.channelMetrics.email;
        
        // Update summary
        report.summary.totalSent += emailMetrics.sent;
        report.summary.totalDelivered += emailMetrics.delivered;
        report.summary.totalOpened += emailMetrics.opened;
        report.summary.totalClicked += emailMetrics.clicked;
        report.summary.totalBounced += emailMetrics.bounced;
        report.summary.totalFailed += emailMetrics.failed;
        
        // Add daily data
        report.daily.push({
          date: dayData.date,
          sent: emailMetrics.sent,
          delivered: emailMetrics.delivered,
          opened: emailMetrics.opened,
          clicked: emailMetrics.clicked,
          bounced: emailMetrics.bounced,
          failed: emailMetrics.failed
        });
        
        // Aggregate by user role
        for (const [role, metrics] of Object.entries(dayData.roleMetrics)) {
          if (!report.byUserRole[role]) {
            report.byUserRole[role] = { sent: 0, delivered: 0, engagement: 0 };
          }
          report.byUserRole[role].sent += metrics.sent;
          report.byUserRole[role].delivered += metrics.delivered;
          report.byUserRole[role].engagement += metrics.engagement;
        }
      }
      
      // Calculate rates
      if (report.summary.totalSent > 0) {
        report.summary.deliveryRate = (report.summary.totalDelivered / report.summary.totalSent) * 100;
        report.summary.bounceRate = (report.summary.totalBounced / report.summary.totalSent) * 100;
      }
      
      if (report.summary.totalDelivered > 0) {
        report.summary.openRate = (report.summary.totalOpened / report.summary.totalDelivered) * 100;
      }
      
      if (report.summary.totalOpened > 0) {
        report.summary.clickRate = (report.summary.totalClicked / report.summary.totalOpened) * 100;
      }
      
      return report;
      
    } catch (error) {
      console.error('❌ Failed to generate delivery report:', error);
      throw error;
    }
  }

  /**
   * Get real-time delivery statistics
   * @returns {Object} Real-time stats
   */
  getRealtimeStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayStats = this.dailyStats.get(today.toISOString().split('T')[0]) || {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      failed: 0
    };
    
    return {
      today: todayStats,
      tracking: {
        activeTracking: this.trackingData.size,
        clickTracking: this.clickTracking.size,
        unsubscribeTokens: this.unsubscribeTokens.size
      },
      timestamp: now
    };
  }

  // Helper methods

  /**
   * Generate tracking ID
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {string} Tracking ID
   */
  generateTrackingId(messageId, userId) {
    return crypto
      .createHash('sha256')
      .update(`${messageId}-${userId}-${Date.now()}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Update notification delivery status
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @param {string} channel - Delivery channel
   * @param {string} status - New status
   * @param {Object} additionalData - Additional status data
   */
  async updateNotificationDeliveryStatus(notificationId, userId, channel, status, additionalData = {}) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) return;
      
      const recipient = notification.recipients.find(r => r.userId.toString() === userId);
      if (!recipient) return;
      
      recipient.deliveryStatus[channel].status = status;
      Object.assign(recipient.deliveryStatus[channel], additionalData);
      
      await notification.save();
      
    } catch (error) {
      console.error('❌ Failed to update notification delivery status:', error);
    }
  }

  /**
   * Update analytics data
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  async updateAnalytics(event, data) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let analytics = await NotificationAnalytics.findOne({ date: today });
      if (!analytics) {
        analytics = NotificationAnalytics.createDailyEntry(today);
      }
      
      // Update based on event type
      switch (event) {
        case 'email_sent':
          analytics.channelMetrics.email.sent++;
          analytics.totalSent++;
          break;
        case 'email_delivered':
          analytics.channelMetrics.email.delivered++;
          analytics.totalDelivered++;
          break;
        case 'email_opened':
          analytics.channelMetrics.email.opened++;
          analytics.totalRead++;
          break;
        case 'email_clicked':
          analytics.channelMetrics.email.clicked++;
          analytics.totalActioned++;
          break;
        case 'email_bounced':
          analytics.channelMetrics.email.bounced++;
          analytics.totalFailed++;
          break;
        case 'email_failed':
          analytics.channelMetrics.email.failed++;
          analytics.totalFailed++;
          break;
        case 'email_unsubscribed':
          // Handle unsubscribe analytics
          break;
      }
      
      await analytics.save();
      
    } catch (error) {
      console.error('❌ Failed to update analytics:', error);
    }
  }

  /**
   * Update notification analytics counters
   * @param {Object} notification - Notification document
   * @param {string} eventType - Event type
   */
  updateNotificationAnalytics(notification, eventType) {
    switch (eventType) {
      case 'delivered':
        notification.analytics.deliveredCount++;
        break;
      case 'opened':
        notification.analytics.readCount++;
        break;
      case 'clicked':
        notification.analytics.actionCount++;
        break;
      case 'bounced':
        notification.analytics.bounceCount++;
        break;
      case 'unsubscribed':
        notification.analytics.unsubscribeCount++;
        break;
    }
  }

  /**
   * Mark email as invalid
   * @param {string} email - Email address
   * @param {string} reason - Reason for marking invalid
   */
  async markEmailAsInvalid(email, reason) {
    // This would typically update a user's email status or add to a suppression list
    console.log(`📧 Marking email as invalid: ${email} (${reason})`);
    // Implementation would depend on your user management system
  }

  /**
   * Update user notification preferences
   * @param {string} userId - User ID
   * @param {string} notificationType - Notification type
   * @param {boolean} enabled - Whether to enable or disable
   */
  async updateUserNotificationPreferences(userId, notificationType, enabled) {
    // This would update the user's notification preferences
    console.log(`📧 Updating notification preferences for user ${userId}: ${notificationType} = ${enabled}`);
    // Implementation would depend on your user preferences system
  }
}

export default EmailTrackingService;