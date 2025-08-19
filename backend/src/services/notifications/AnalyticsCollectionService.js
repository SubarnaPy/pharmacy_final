import NotificationAnalytics from '../../models/NotificationAnalytics.js';
import Notification from '../../models/Notification.js';

class AnalyticsCollectionService {
  constructor() {
    this.metricsBuffer = new Map(); // Buffer for real-time metrics
    this.flushInterval = 30000; // Flush every 30 seconds
    this.startPeriodicFlush();
  }

  /**
   * Record notification sent event
   */
  async recordNotificationSent(notification, channel, userRole) {
    const today = new Date();
    
    // Update real-time buffer
    this.updateBuffer(today, 'totalSent', 1);
    this.updateBuffer(today, `channelMetrics.${channel}.sent`, 1);
    this.updateBuffer(today, `roleMetrics.${userRole}.sent`, 1);
    
    // Update type metrics
    await NotificationAnalytics.updateTypeMetric(today, notification.type, 'sent', 1);
    
    // Store detailed event for real-time tracking
    this.recordEvent({
      type: 'notification_sent',
      notificationId: notification._id,
      channel,
      userRole,
      timestamp: new Date(),
      metadata: {
        notificationType: notification.type,
        priority: notification.priority
      }
    });
  }

  /**
   * Record notification delivered event
   */
  async recordNotificationDelivered(notification, channel, userRole, deliveryTime) {
    const today = new Date();
    
    // Update real-time buffer
    this.updateBuffer(today, 'totalDelivered', 1);
    this.updateBuffer(today, `channelMetrics.${channel}.delivered`, 1);
    this.updateBuffer(today, `roleMetrics.${userRole}.delivered`, 1);
    
    // Update type metrics
    await NotificationAnalytics.updateTypeMetric(today, notification.type, 'delivered', 1);
    
    // Update performance metrics
    await this.updateAverageDeliveryTime(today, deliveryTime);
    
    this.recordEvent({
      type: 'notification_delivered',
      notificationId: notification._id,
      channel,
      userRole,
      deliveryTime,
      timestamp: new Date()
    });
  }

  /**
   * Record notification read event
   */
  async recordNotificationRead(notification, channel, userRole, readTime) {
    const today = new Date();
    
    // Update real-time buffer
    this.updateBuffer(today, 'totalRead', 1);
    this.updateBuffer(today, `channelMetrics.${channel}.read`, 1);
    this.updateBuffer(today, `roleMetrics.${userRole}.engagement`, 1);
    
    // Update type metrics
    await NotificationAnalytics.updateTypeMetric(today, notification.type, 'engagement', 1);
    
    // Calculate response time (time from sent to read)
    const responseTime = readTime - notification.createdAt;
    await this.updateAverageResponseTime(today, notification.type, responseTime);
    
    this.recordEvent({
      type: 'notification_read',
      notificationId: notification._id,
      channel,
      userRole,
      responseTime,
      timestamp: new Date()
    });
  }

  /**
   * Record notification action taken event
   */
  async recordNotificationAction(notification, channel, userRole, action) {
    const today = new Date();
    
    // Update real-time buffer
    this.updateBuffer(today, 'totalActioned', 1);
    this.updateBuffer(today, `roleMetrics.${userRole}.engagement`, 1);
    
    // Update type metrics
    await NotificationAnalytics.updateTypeMetric(today, notification.type, 'engagement', 1);
    
    this.recordEvent({
      type: 'notification_action',
      notificationId: notification._id,
      channel,
      userRole,
      action,
      timestamp: new Date()
    });
  }

  /**
   * Record notification failure event
   */
  async recordNotificationFailure(notification, channel, userRole, error) {
    const today = new Date();
    
    // Update real-time buffer
    this.updateBuffer(today, 'totalFailed', 1);
    this.updateBuffer(today, `channelMetrics.${channel}.failed`, 1);
    
    // Update failure rate
    await this.updateFailureRate(today);
    
    this.recordEvent({
      type: 'notification_failed',
      notificationId: notification._id,
      channel,
      userRole,
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * Record email-specific events
   */
  async recordEmailOpened(notification, userRole) {
    const today = new Date();
    
    this.updateBuffer(today, 'channelMetrics.email.opened', 1);
    this.updateBuffer(today, `roleMetrics.${userRole}.engagement`, 1);
    
    this.recordEvent({
      type: 'email_opened',
      notificationId: notification._id,
      channel: 'email',
      userRole,
      timestamp: new Date()
    });
  }

  async recordEmailClicked(notification, userRole, linkUrl) {
    const today = new Date();
    
    this.updateBuffer(today, 'channelMetrics.email.clicked', 1);
    this.updateBuffer(today, `roleMetrics.${userRole}.engagement`, 1);
    
    this.recordEvent({
      type: 'email_clicked',
      notificationId: notification._id,
      channel: 'email',
      userRole,
      linkUrl,
      timestamp: new Date()
    });
  }

  async recordEmailBounced(notification, userRole, bounceReason) {
    const today = new Date();
    
    this.updateBuffer(today, 'channelMetrics.email.bounced', 1);
    
    this.recordEvent({
      type: 'email_bounced',
      notificationId: notification._id,
      channel: 'email',
      userRole,
      bounceReason,
      timestamp: new Date()
    });
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(date = new Date()) {
    const dateKey = this.getDateKey(date);
    return this.metricsBuffer.get(dateKey) || {};
  }

  /**
   * Get delivery success rate
   */
  async getDeliverySuccessRate(startDate, endDate) {
    const summary = await NotificationAnalytics.getAnalyticsSummary(startDate, endDate);
    
    if (summary.totalSent === 0) return 0;
    
    return (summary.totalDelivered / summary.totalSent) * 100;
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(startDate, endDate) {
    const pipeline = [
      {
        $match: {
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalDelivered: { $sum: '$totalDelivered' },
          totalRead: { $sum: '$totalRead' },
          totalActioned: { $sum: '$totalActioned' },
          emailOpened: { $sum: '$channelMetrics.email.opened' },
          emailClicked: { $sum: '$channelMetrics.email.clicked' }
        }
      }
    ];
    
    const result = await NotificationAnalytics.aggregate(pipeline);
    const metrics = result[0] || {
      totalDelivered: 0,
      totalRead: 0,
      totalActioned: 0,
      emailOpened: 0,
      emailClicked: 0
    };
    
    return {
      readRate: metrics.totalDelivered > 0 ? (metrics.totalRead / metrics.totalDelivered) * 100 : 0,
      actionRate: metrics.totalDelivered > 0 ? (metrics.totalActioned / metrics.totalDelivered) * 100 : 0,
      emailOpenRate: metrics.totalDelivered > 0 ? (metrics.emailOpened / metrics.totalDelivered) * 100 : 0,
      emailClickRate: metrics.emailOpened > 0 ? (metrics.emailClicked / metrics.emailOpened) * 100 : 0
    };
  }

  /**
   * Get performance metrics by channel
   */
  async getChannelPerformance(startDate, endDate) {
    const pipeline = [
      {
        $match: {
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: null,
          websocket: {
            $first: {
              sent: { $sum: '$channelMetrics.websocket.sent' },
              delivered: { $sum: '$channelMetrics.websocket.delivered' },
              failed: { $sum: '$channelMetrics.websocket.failed' }
            }
          },
          email: {
            $first: {
              sent: { $sum: '$channelMetrics.email.sent' },
              delivered: { $sum: '$channelMetrics.email.delivered' },
              failed: { $sum: '$channelMetrics.email.failed' }
            }
          },
          sms: {
            $first: {
              sent: { $sum: '$channelMetrics.sms.sent' },
              delivered: { $sum: '$channelMetrics.sms.delivered' },
              failed: { $sum: '$channelMetrics.sms.failed' }
            }
          }
        }
      }
    ];
    
    const result = await NotificationAnalytics.aggregate(pipeline);
    return result[0] || {
      websocket: { sent: 0, delivered: 0, failed: 0 },
      email: { sent: 0, delivered: 0, failed: 0 },
      sms: { sent: 0, delivered: 0, failed: 0 }
    };
  }

  /**
   * Private helper methods
   */
  updateBuffer(date, metricPath, value) {
    const dateKey = this.getDateKey(date);
    
    if (!this.metricsBuffer.has(dateKey)) {
      this.metricsBuffer.set(dateKey, {});
    }
    
    const dayMetrics = this.metricsBuffer.get(dateKey);
    const pathParts = metricPath.split('.');
    
    let current = dayMetrics;
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }
    
    const finalKey = pathParts[pathParts.length - 1];
    current[finalKey] = (current[finalKey] || 0) + value;
  }

  getDateKey(date) {
    return date.toISOString().split('T')[0];
  }

  recordEvent(event) {
    // Store in memory for real-time access
    if (!this.recentEvents) {
      this.recentEvents = [];
    }
    
    this.recentEvents.push(event);
    
    // Keep only last 1000 events in memory
    if (this.recentEvents.length > 1000) {
      this.recentEvents = this.recentEvents.slice(-1000);
    }
  }

  async updateAverageDeliveryTime(date, deliveryTime) {
    const record = await NotificationAnalytics.getOrCreateDailyRecord(date);
    
    // Calculate new average
    const currentAvg = record.performance.averageDeliveryTime || 0;
    const currentCount = record.totalDelivered || 0;
    
    const newAvg = ((currentAvg * currentCount) + deliveryTime) / (currentCount + 1);
    
    await NotificationAnalytics.updateOne(
      { _id: record._id },
      { $set: { 'performance.averageDeliveryTime': newAvg } }
    );
  }

  async updateAverageResponseTime(date, notificationType, responseTime) {
    const record = await NotificationAnalytics.getOrCreateDailyRecord(date);
    
    // Find the type metric
    const typeMetric = record.typeMetrics.find(tm => tm.type === notificationType);
    if (typeMetric) {
      const currentAvg = typeMetric.averageResponseTime || 0;
      const currentCount = typeMetric.engagement || 0;
      
      const newAvg = ((currentAvg * currentCount) + responseTime) / (currentCount + 1);
      
      await NotificationAnalytics.updateOne(
        { 
          _id: record._id,
          'typeMetrics.type': notificationType
        },
        { 
          $set: { 'typeMetrics.$.averageResponseTime': newAvg }
        }
      );
    }
  }

  async updateFailureRate(date) {
    const record = await NotificationAnalytics.getOrCreateDailyRecord(date);
    
    const totalAttempts = record.totalSent + record.totalFailed;
    const failureRate = totalAttempts > 0 ? (record.totalFailed / totalAttempts) * 100 : 0;
    
    await NotificationAnalytics.updateOne(
      { _id: record._id },
      { $set: { 'performance.failureRate': failureRate } }
    );
  }

  startPeriodicFlush() {
    setInterval(async () => {
      await this.flushBufferToDatabase();
    }, this.flushInterval);
  }

  async flushBufferToDatabase() {
    for (const [dateKey, metrics] of this.metricsBuffer.entries()) {
      const date = new Date(dateKey);
      
      // Build update query
      const updateQuery = { $inc: {} };
      
      for (const [path, value] of Object.entries(this.flattenObject(metrics))) {
        updateQuery.$inc[path] = value;
      }
      
      if (Object.keys(updateQuery.$inc).length > 0) {
        await NotificationAnalytics.updateOne(
          { date },
          updateQuery,
          { upsert: true }
        );
      }
    }
    
    // Clear buffer after flushing
    this.metricsBuffer.clear();
  }

  flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  }

  getRecentEvents(limit = 100) {
    if (!this.recentEvents) return [];
    return this.recentEvents.slice(-limit);
  }
}

export default new AnalyticsCollectionService();