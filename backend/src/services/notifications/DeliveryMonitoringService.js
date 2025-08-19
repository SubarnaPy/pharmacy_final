import { EventEmitter } from 'events';
import NotificationAnalytics from '../../models/NotificationAnalytics.js';
import Notification from '../../models/Notification.js';
import AnalyticsCollectionService from './AnalyticsCollectionService.js';
import AutomatedAlertingService from './AutomatedAlertingService.js';

class DeliveryMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.monitoringInterval = 60000; // Check every minute
    this.alertThresholds = {
      criticalFailureRate: 25, // Alert if failure rate > 25%
      warningFailureRate: 15, // Warning if failure rate > 15%
      minDeliveryRate: 80, // Alert if delivery rate < 80%
      maxDeliveryTime: 60000, // Alert if delivery time > 60 seconds
      consecutiveFailures: 5 // Alert after 5 consecutive failures
    };
    
    this.consecutiveFailures = new Map(); // Track consecutive failures by channel
    this.isMonitoring = false;
  }

  /**
   * Start delivery monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringTimer = setInterval(async () => {
      await this.performDeliveryCheck();
    }, this.monitoringInterval);
    
    console.log('Delivery monitoring started');
  }

  /**
   * Stop delivery monitoring
   */
  stopMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    this.isMonitoring = false;
    console.log('Delivery monitoring stopped');
  }

  /**
   * Perform comprehensive delivery check
   */
  async performDeliveryCheck() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Get recent delivery metrics
      const deliveryMetrics = await this.getDeliveryMetrics(oneHourAgo, now);
      
      // Check overall delivery health
      await this.checkOverallDeliveryHealth(deliveryMetrics);
      
      // Check channel-specific health
      await this.checkChannelHealth(deliveryMetrics);
      
      // Check for stuck notifications
      await this.checkStuckNotifications();
      
      // Check delivery time performance
      await this.checkDeliveryTimePerformance(deliveryMetrics);
      
      // Update monitoring status
      await this.updateMonitoringStatus(deliveryMetrics);
      
    } catch (error) {
      console.error('Error in delivery monitoring:', error);
    }
  }

  /**
   * Get comprehensive delivery metrics
   */
  async getDeliveryMetrics(startDate, endDate) {
    const summary = await NotificationAnalytics.getAnalyticsSummary(startDate, endDate);
    const channelPerformance = await AnalyticsCollectionService.getChannelPerformance(startDate, endDate);
    const realTimeMetrics = AnalyticsCollectionService.getRealTimeMetrics();
    
    return {
      summary,
      channels: channelPerformance,
      realTime: realTimeMetrics,
      timeRange: { startDate, endDate }
    };
  }

  /**
   * Check overall delivery health
   */
  async checkOverallDeliveryHealth(metrics) {
    const { summary } = metrics;
    
    // Calculate delivery rate
    const deliveryRate = summary.totalSent > 0 
      ? (summary.totalDelivered / summary.totalSent) * 100 
      : 100;
    
    // Calculate failure rate
    const failureRate = summary.totalSent > 0 
      ? (summary.totalFailed / summary.totalSent) * 100 
      : 0;
    
    // Check thresholds
    if (deliveryRate < this.alertThresholds.minDeliveryRate) {
      await this.triggerAlert({
        type: 'low_delivery_rate',
        severity: 'critical',
        message: `Overall delivery rate is critically low: ${deliveryRate.toFixed(1)}%`,
        metrics: {
          deliveryRate: deliveryRate.toFixed(1),
          totalSent: summary.totalSent,
          totalDelivered: summary.totalDelivered,
          totalFailed: summary.totalFailed
        },
        threshold: this.alertThresholds.minDeliveryRate,
        timestamp: new Date()
      });
    }
    
    if (failureRate > this.alertThresholds.criticalFailureRate) {
      await this.triggerAlert({
        type: 'high_failure_rate',
        severity: 'critical',
        message: `Notification failure rate is critically high: ${failureRate.toFixed(1)}%`,
        metrics: {
          failureRate: failureRate.toFixed(1),
          totalSent: summary.totalSent,
          totalFailed: summary.totalFailed
        },
        threshold: this.alertThresholds.criticalFailureRate,
        timestamp: new Date()
      });
    } else if (failureRate > this.alertThresholds.warningFailureRate) {
      await this.triggerAlert({
        type: 'elevated_failure_rate',
        severity: 'warning',
        message: `Notification failure rate is elevated: ${failureRate.toFixed(1)}%`,
        metrics: {
          failureRate: failureRate.toFixed(1),
          totalSent: summary.totalSent,
          totalFailed: summary.totalFailed
        },
        threshold: this.alertThresholds.warningFailureRate,
        timestamp: new Date()
      });
    }
  }

  /**
   * Check channel-specific health
   */
  async checkChannelHealth(metrics) {
    const { channels } = metrics;
    
    for (const [channelName, channelMetrics] of Object.entries(channels)) {
      const channelDeliveryRate = channelMetrics.sent > 0 
        ? (channelMetrics.delivered / channelMetrics.sent) * 100 
        : 100;
      
      const channelFailureRate = channelMetrics.sent > 0 
        ? (channelMetrics.failed / channelMetrics.sent) * 100 
        : 0;
      
      // Track consecutive failures
      if (channelFailureRate > 50) { // More than 50% failure rate
        const currentFailures = this.consecutiveFailures.get(channelName) || 0;
        this.consecutiveFailures.set(channelName, currentFailures + 1);
        
        if (currentFailures + 1 >= this.alertThresholds.consecutiveFailures) {
          await this.triggerAlert({
            type: 'channel_consecutive_failures',
            severity: 'critical',
            message: `Channel ${channelName} has ${currentFailures + 1} consecutive failure periods`,
            channel: channelName,
            metrics: channelMetrics,
            consecutiveFailures: currentFailures + 1,
            timestamp: new Date()
          });
        }
      } else {
        // Reset consecutive failures if channel is healthy
        this.consecutiveFailures.set(channelName, 0);
      }
      
      // Check channel-specific thresholds
      if (channelDeliveryRate < this.alertThresholds.minDeliveryRate) {
        await this.triggerAlert({
          type: 'channel_low_delivery_rate',
          severity: 'warning',
          message: `${channelName} channel delivery rate is low: ${channelDeliveryRate.toFixed(1)}%`,
          channel: channelName,
          metrics: channelMetrics,
          deliveryRate: channelDeliveryRate.toFixed(1),
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Check for stuck notifications
   */
  async checkStuckNotifications() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Find notifications that are still pending after 15 minutes
    const stuckNotifications = await Notification.find({
      createdAt: { $lt: fifteenMinutesAgo },
      'recipients.deliveryStatus.websocket.status': 'pending',
      'recipients.deliveryStatus.email.status': 'pending',
      'recipients.deliveryStatus.sms.status': 'pending'
    }).limit(100);
    
    if (stuckNotifications.length > 0) {
      await this.triggerAlert({
        type: 'stuck_notifications',
        severity: 'warning',
        message: `Found ${stuckNotifications.length} notifications stuck in pending state`,
        count: stuckNotifications.length,
        oldestNotification: stuckNotifications[0].createdAt,
        timestamp: new Date()
      });
      
      // Attempt to retry stuck notifications
      await this.retryStuckNotifications(stuckNotifications);
    }
  }

  /**
   * Check delivery time performance
   */
  async checkDeliveryTimePerformance(metrics) {
    const { summary } = metrics;
    
    if (summary.avgDeliveryTime > this.alertThresholds.maxDeliveryTime) {
      await this.triggerAlert({
        type: 'slow_delivery_time',
        severity: 'warning',
        message: `Average delivery time is slow: ${(summary.avgDeliveryTime / 1000).toFixed(1)}s`,
        avgDeliveryTime: summary.avgDeliveryTime,
        threshold: this.alertThresholds.maxDeliveryTime,
        timestamp: new Date()
      });
    }
  }

  /**
   * Retry stuck notifications
   */
  async retryStuckNotifications(stuckNotifications) {
    const { default: EnhancedNotificationService } = await import('./EnhancedNotificationService.js');
    
    for (const notification of stuckNotifications) {
      try {
        // Mark for retry
        await Notification.updateOne(
          { _id: notification._id },
          { 
            $inc: { retryCount: 1 },
            $set: { lastRetryAt: new Date() }
          }
        );
        
        // Attempt redelivery
        await EnhancedNotificationService.retryNotificationDelivery(notification._id);
        
      } catch (error) {
        console.error(`Error retrying notification ${notification._id}:`, error);
      }
    }
  }

  /**
   * Get delivery success rate for specific time period
   */
  async getDeliverySuccessRate(startDate, endDate, filters = {}) {
    let matchQuery = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    // Apply filters
    if (filters.channel) {
      matchQuery[`recipients.deliveryStatus.${filters.channel}.status`] = { $exists: true };
    }
    
    if (filters.userRole) {
      matchQuery['recipients.userRole'] = filters.userRole;
    }
    
    if (filters.notificationType) {
      matchQuery.type = filters.notificationType;
    }
    
    const pipeline = [
      { $match: matchQuery },
      { $unwind: '$recipients' },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          successfulDeliveries: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$recipients.deliveryStatus.websocket.status', 'delivered'] },
                    { $eq: ['$recipients.deliveryStatus.email.status', 'delivered'] },
                    { $eq: ['$recipients.deliveryStatus.sms.status', 'delivered'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ];
    
    const result = await Notification.aggregate(pipeline);
    const data = result[0] || { totalAttempts: 0, successfulDeliveries: 0 };
    
    return {
      successRate: data.totalAttempts > 0 ? (data.successfulDeliveries / data.totalAttempts) * 100 : 0,
      totalAttempts: data.totalAttempts,
      successfulDeliveries: data.successfulDeliveries,
      failedDeliveries: data.totalAttempts - data.successfulDeliveries
    };
  }

  /**
   * Get detailed delivery report
   */
  async getDeliveryReport(startDate, endDate) {
    const overallMetrics = await this.getDeliverySuccessRate(startDate, endDate);
    
    // Get channel-specific metrics
    const channelMetrics = {};
    for (const channel of ['websocket', 'email', 'sms']) {
      channelMetrics[channel] = await this.getDeliverySuccessRate(startDate, endDate, { channel });
    }
    
    // Get role-specific metrics
    const roleMetrics = {};
    for (const role of ['patient', 'doctor', 'pharmacy', 'admin']) {
      roleMetrics[role] = await this.getDeliverySuccessRate(startDate, endDate, { userRole: role });
    }
    
    // Get performance trends
    const trends = await this.getDeliveryTrends(startDate, endDate);
    
    return {
      overall: overallMetrics,
      channels: channelMetrics,
      roles: roleMetrics,
      trends,
      generatedAt: new Date(),
      timeRange: { startDate, endDate }
    };
  }

  /**
   * Get delivery trends over time
   */
  async getDeliveryTrends(startDate, endDate, granularity = 'daily') {
    const groupBy = granularity === 'hourly' 
      ? { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        }
      : {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    
    const pipeline = [
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      { $unwind: '$recipients' },
      {
        $group: {
          _id: groupBy,
          totalAttempts: { $sum: 1 },
          successfulDeliveries: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$recipients.deliveryStatus.websocket.status', 'delivered'] },
                    { $eq: ['$recipients.deliveryStatus.email.status', 'delivered'] },
                    { $eq: ['$recipients.deliveryStatus.sms.status', 'delivered'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalAttempts: 1,
          successfulDeliveries: 1,
          successRate: {
            $cond: [
              { $eq: ['$totalAttempts', 0] },
              0,
              { $multiply: [{ $divide: ['$successfulDeliveries', '$totalAttempts'] }, 100] }
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ];
    
    return await Notification.aggregate(pipeline);
  }

  /**
   * Trigger monitoring alert
   */
  async triggerAlert(alertData) {
    console.warn('Delivery Monitoring Alert:', alertData);
    
    // Process alert through automated alerting service
    const enhancedAlertData = {
      ...alertData,
      source: 'DeliveryMonitoringService'
    };
    
    await AutomatedAlertingService.processAlert(enhancedAlertData);
    
    // Emit event for other services to handle (backward compatibility)
    const { default: RealTimeAnalyticsService } = await import('./RealTimeAnalyticsService.js');
    RealTimeAnalyticsService.emit('delivery_alert', alertData);
    
    // Store alert in analytics for tracking
    await AnalyticsCollectionService.recordEvent({
      type: 'delivery_alert',
      alertType: alertData.type,
      severity: alertData.severity,
      message: alertData.message,
      metrics: alertData.metrics,
      timestamp: alertData.timestamp
    });
  }

  /**
   * Update monitoring status
   */
  async updateMonitoringStatus(metrics) {
    const status = {
      isHealthy: true,
      lastCheck: new Date(),
      metrics: metrics.summary,
      issues: []
    };
    
    // Determine if system is healthy
    const deliveryRate = metrics.summary.totalSent > 0 
      ? (metrics.summary.totalDelivered / metrics.summary.totalSent) * 100 
      : 100;
    
    if (deliveryRate < this.alertThresholds.minDeliveryRate) {
      status.isHealthy = false;
      status.issues.push('Low delivery rate');
    }
    
    if (metrics.summary.avgFailureRate > this.alertThresholds.warningFailureRate) {
      status.isHealthy = false;
      status.issues.push('High failure rate');
    }
    
    // Store status for dashboard
    this.currentStatus = status;
  }

  /**
   * Get current monitoring status
   */
  getCurrentStatus() {
    return this.currentStatus || {
      isHealthy: true,
      lastCheck: null,
      metrics: {},
      issues: []
    };
  }

  /**
   * Set custom alert thresholds
   */
  setAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  /**
   * Get current alert thresholds
   */
  getAlertThresholds() {
    return { ...this.alertThresholds };
  }
}

export default new DeliveryMonitoringService();