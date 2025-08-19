import { EventEmitter } from 'events';
import NotificationAnalytics from '../../models/NotificationAnalytics.js';
import AnalyticsCollectionService from './AnalyticsCollectionService.js';
import AutomatedAlertingService from './AutomatedAlertingService.js';

class RealTimeAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.subscribers = new Map(); // WebSocket connections for real-time updates
    this.alertThresholds = {
      failureRate: 10, // Alert if failure rate > 10%
      deliveryTime: 30000, // Alert if avg delivery time > 30 seconds
      lowDeliveryRate: 85 // Alert if delivery rate < 85%
    };
    
    this.startRealTimeMonitoring();
  }

  /**
   * Subscribe to real-time analytics updates
   */
  subscribe(connectionId, websocket, filters = {}) {
    this.subscribers.set(connectionId, {
      websocket,
      filters,
      subscribedAt: new Date()
    });

    // Send initial data
    this.sendInitialData(connectionId);

    websocket.on('close', () => {
      this.unsubscribe(connectionId);
    });
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(connectionId) {
    this.subscribers.delete(connectionId);
  }

  /**
   * Broadcast real-time metrics to subscribers
   */
  broadcastMetrics(metrics, eventType = 'metrics_update') {
    const message = JSON.stringify({
      type: eventType,
      data: metrics,
      timestamp: new Date()
    });

    for (const [connectionId, subscriber] of this.subscribers.entries()) {
      try {
        if (subscriber.websocket.readyState === 1) { // WebSocket.OPEN
          // Apply filters if any
          if (this.shouldSendToSubscriber(metrics, subscriber.filters)) {
            subscriber.websocket.send(message);
          }
        } else {
          // Clean up closed connections
          this.subscribers.delete(connectionId);
        }
      } catch (error) {
        console.error(`Error broadcasting to subscriber ${connectionId}:`, error);
        this.subscribers.delete(connectionId);
      }
    }
  }

  /**
   * Get current system health metrics
   */
  async getSystemHealth() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Get recent metrics
    const recentMetrics = await NotificationAnalytics.getAnalyticsSummary(oneHourAgo, now);
    const realTimeMetrics = AnalyticsCollectionService.getRealTimeMetrics();
    
    // Calculate health indicators
    const deliveryRate = recentMetrics.totalSent > 0 
      ? (recentMetrics.totalDelivered / recentMetrics.totalSent) * 100 
      : 100;
    
    const failureRate = recentMetrics.avgFailureRate || 0;
    const avgDeliveryTime = recentMetrics.avgDeliveryTime || 0;
    
    // Determine overall health status
    let healthStatus = 'healthy';
    const issues = [];
    
    if (deliveryRate < this.alertThresholds.lowDeliveryRate) {
      healthStatus = 'warning';
      issues.push(`Low delivery rate: ${deliveryRate.toFixed(1)}%`);
    }
    
    if (failureRate > this.alertThresholds.failureRate) {
      healthStatus = 'critical';
      issues.push(`High failure rate: ${failureRate.toFixed(1)}%`);
    }
    
    if (avgDeliveryTime > this.alertThresholds.deliveryTime) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      issues.push(`Slow delivery time: ${(avgDeliveryTime / 1000).toFixed(1)}s`);
    }

    return {
      status: healthStatus,
      timestamp: now,
      metrics: {
        deliveryRate: deliveryRate.toFixed(1),
        failureRate: failureRate.toFixed(1),
        avgDeliveryTime: (avgDeliveryTime / 1000).toFixed(1),
        totalSent: recentMetrics.totalSent,
        totalDelivered: recentMetrics.totalDelivered,
        totalFailed: recentMetrics.totalFailed
      },
      realTimeMetrics,
      issues,
      uptime: this.getUptime()
    };
  }

  /**
   * Get live dashboard data
   */
  async getLiveDashboardData() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    // Get today's metrics
    const todayMetrics = await NotificationAnalytics.getAnalyticsSummary(today, now);
    const yesterdayMetrics = await NotificationAnalytics.getAnalyticsSummary(yesterday, today);
    
    // Get real-time buffer data
    const realTimeMetrics = AnalyticsCollectionService.getRealTimeMetrics();
    
    // Get channel performance
    const channelPerformance = await AnalyticsCollectionService.getChannelPerformance(today, now);
    
    // Get recent events
    const recentEvents = AnalyticsCollectionService.getRecentEvents(50);
    
    // Calculate trends
    const trends = this.calculateTrends(todayMetrics, yesterdayMetrics);
    
    return {
      summary: {
        today: todayMetrics,
        yesterday: yesterdayMetrics,
        trends
      },
      realTime: realTimeMetrics,
      channels: channelPerformance,
      recentEvents: recentEvents.slice(-10), // Last 10 events
      systemHealth: await this.getSystemHealth()
    };
  }

  /**
   * Get notification performance trends
   */
  async getPerformanceTrends(days = 7) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const pipeline = [
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $sort: { date: 1 }
      },
      {
        $project: {
          date: 1,
          totalSent: 1,
          totalDelivered: 1,
          totalFailed: 1,
          deliveryRate: {
            $cond: {
              if: { $eq: ['$totalSent', 0] },
              then: 0,
              else: { $multiply: [{ $divide: ['$totalDelivered', '$totalSent'] }, 100] }
            }
          },
          failureRate: '$performance.failureRate',
          avgDeliveryTime: '$performance.averageDeliveryTime'
        }
      }
    ];
    
    return await NotificationAnalytics.aggregate(pipeline);
  }

  /**
   * Monitor for performance alerts
   */
  async checkPerformanceAlerts() {
    const systemHealth = await this.getSystemHealth();
    
    if (systemHealth.status === 'critical' || systemHealth.status === 'warning') {
      const alert = {
        type: systemHealth.status === 'critical' ? 'system_health_critical' : 'low_delivery_rate',
        severity: systemHealth.status,
        message: `Notification system health: ${systemHealth.status}`,
        issues: systemHealth.issues,
        metrics: systemHealth.metrics,
        timestamp: new Date(),
        source: 'RealTimeAnalyticsService'
      };
      
      // Process alert through automated alerting service
      await AutomatedAlertingService.processAlert(alert);
      
      // Emit alert event for backward compatibility
      this.emit('performance_alert', alert);
      
      // Broadcast to subscribers
      this.broadcastMetrics(alert, 'performance_alert');
      
      return alert;
    }
    
    return null;
  }

  /**
   * Get user engagement analytics
   */
  async getUserEngagementAnalytics(startDate, endDate) {
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
          roleEngagement: {
            $push: {
              patient: '$roleMetrics.patient',
              doctor: '$roleMetrics.doctor',
              pharmacy: '$roleMetrics.pharmacy',
              admin: '$roleMetrics.admin'
            }
          }
        }
      }
    ];
    
    const result = await NotificationAnalytics.aggregate(pipeline);
    const data = result[0] || {
      totalDelivered: 0,
      totalRead: 0,
      totalActioned: 0,
      roleEngagement: []
    };
    
    return {
      readRate: data.totalDelivered > 0 ? (data.totalRead / data.totalDelivered) * 100 : 0,
      actionRate: data.totalDelivered > 0 ? (data.totalActioned / data.totalDelivered) * 100 : 0,
      roleEngagement: this.aggregateRoleEngagement(data.roleEngagement)
    };
  }

  /**
   * Private helper methods
   */
  startRealTimeMonitoring() {
    // Monitor every 30 seconds
    setInterval(async () => {
      try {
        const dashboardData = await this.getLiveDashboardData();
        this.broadcastMetrics(dashboardData, 'dashboard_update');
        
        // Check for alerts
        await this.checkPerformanceAlerts();
      } catch (error) {
        console.error('Error in real-time monitoring:', error);
      }
    }, 30000);
    
    // Health check every 5 minutes
    setInterval(async () => {
      try {
        const systemHealth = await this.getSystemHealth();
        this.broadcastMetrics(systemHealth, 'health_update');
      } catch (error) {
        console.error('Error in health monitoring:', error);
      }
    }, 300000);
  }

  shouldSendToSubscriber(metrics, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }
    
    // Apply filters (can be extended based on requirements)
    if (filters.severity && metrics.severity !== filters.severity) {
      return false;
    }
    
    if (filters.channel && metrics.channel !== filters.channel) {
      return false;
    }
    
    return true;
  }

  calculateTrends(todayMetrics, yesterdayMetrics) {
    const calculateChange = (today, yesterday) => {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return ((today - yesterday) / yesterday) * 100;
    };
    
    return {
      sentChange: calculateChange(todayMetrics.totalSent, yesterdayMetrics.totalSent),
      deliveredChange: calculateChange(todayMetrics.totalDelivered, yesterdayMetrics.totalDelivered),
      failureChange: calculateChange(todayMetrics.totalFailed, yesterdayMetrics.totalFailed),
      deliveryTimeChange: calculateChange(todayMetrics.avgDeliveryTime, yesterdayMetrics.avgDeliveryTime)
    };
  }

  aggregateRoleEngagement(roleEngagementArray) {
    const aggregated = {
      patient: { sent: 0, delivered: 0, engagement: 0 },
      doctor: { sent: 0, delivered: 0, engagement: 0 },
      pharmacy: { sent: 0, delivered: 0, engagement: 0 },
      admin: { sent: 0, delivered: 0, engagement: 0 }
    };
    
    roleEngagementArray.forEach(dayData => {
      Object.keys(aggregated).forEach(role => {
        if (dayData[role]) {
          aggregated[role].sent += dayData[role].sent || 0;
          aggregated[role].delivered += dayData[role].delivered || 0;
          aggregated[role].engagement += dayData[role].engagement || 0;
        }
      });
    });
    
    return aggregated;
  }

  async sendInitialData(connectionId) {
    try {
      const subscriber = this.subscribers.get(connectionId);
      if (subscriber) {
        const initialData = await this.getLiveDashboardData();
        const message = JSON.stringify({
          type: 'initial_data',
          data: initialData,
          timestamp: new Date()
        });
        
        subscriber.websocket.send(message);
      }
    } catch (error) {
      console.error(`Error sending initial data to ${connectionId}:`, error);
    }
  }

  getUptime() {
    return process.uptime();
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

export default new RealTimeAnalyticsService();