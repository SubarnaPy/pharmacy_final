import { EventEmitter } from 'events';
import crypto from 'crypto';
import NotificationAnalytics from '../../models/NotificationAnalytics.js';
import User from '../../models/User.js';

/**
 * Automated Alerting and Escalation Service
 * Handles automated alerts for system failures and performance issues
 */
class AutomatedAlertingService extends EventEmitter {
  constructor() {
    super();
    this.alertHistory = new Map(); // Track alert history to prevent spam
    this.escalationRules = new Map(); // Store escalation rules
    this.activeAlerts = new Map(); // Track active alerts
    this.alertCooldowns = new Map(); // Prevent alert spam
    
    this.defaultEscalationRules = {
      'critical_failure_rate': {
        levels: [
          { delay: 0, recipients: ['admin'], channels: ['websocket', 'email'] },
          { delay: 300000, recipients: ['admin', 'senior_admin'], channels: ['websocket', 'email', 'sms'] }, // 5 minutes
          { delay: 900000, recipients: ['admin', 'senior_admin', 'system_admin'], channels: ['websocket', 'email', 'sms'] } // 15 minutes
        ],
        cooldown: 1800000 // 30 minutes
      },
      'low_delivery_rate': {
        levels: [
          { delay: 0, recipients: ['admin'], channels: ['websocket', 'email'] },
          { delay: 600000, recipients: ['admin', 'senior_admin'], channels: ['websocket', 'email', 'sms'] }, // 10 minutes
          { delay: 1800000, recipients: ['admin', 'senior_admin', 'system_admin'], channels: ['websocket', 'email', 'sms'] } // 30 minutes
        ],
        cooldown: 3600000 // 1 hour
      },
      'system_health_critical': {
        levels: [
          { delay: 0, recipients: ['admin', 'senior_admin'], channels: ['websocket', 'email', 'sms'] },
          { delay: 180000, recipients: ['admin', 'senior_admin', 'system_admin'], channels: ['websocket', 'email', 'sms'] }, // 3 minutes
          { delay: 600000, recipients: ['admin', 'senior_admin', 'system_admin', 'emergency_contact'], channels: ['websocket', 'email', 'sms'] } // 10 minutes
        ],
        cooldown: 1800000 // 30 minutes
      },
      'stuck_notifications': {
        levels: [
          { delay: 0, recipients: ['admin'], channels: ['websocket', 'email'] },
          { delay: 900000, recipients: ['admin', 'senior_admin'], channels: ['websocket', 'email'] } // 15 minutes
        ],
        cooldown: 3600000 // 1 hour
      },
      'external_service_failure': {
        levels: [
          { delay: 0, recipients: ['admin'], channels: ['websocket', 'email'] },
          { delay: 300000, recipients: ['admin', 'senior_admin'], channels: ['websocket', 'email', 'sms'] }, // 5 minutes
          { delay: 1200000, recipients: ['admin', 'senior_admin', 'system_admin'], channels: ['websocket', 'email', 'sms'] } // 20 minutes
        ],
        cooldown: 1800000 // 30 minutes
      }
    };

    this.initializeEscalationRules();
    this.startAlertProcessing();
  }

  /**
   * Initialize escalation rules
   */
  initializeEscalationRules() {
    for (const [alertType, rules] of Object.entries(this.defaultEscalationRules)) {
      this.escalationRules.set(alertType, rules);
    }
  }

  /**
   * Process incoming alert
   */
  async processAlert(alertData) {
    try {
      const alertId = this.generateAlertId(alertData);
      const alertType = alertData.type;
      
      // Check if alert is in cooldown period
      if (this.isInCooldown(alertType)) {
        console.log(`Alert ${alertType} is in cooldown period, skipping`);
        return;
      }

      // Check if this is a duplicate alert
      if (this.isDuplicateAlert(alertId, alertData)) {
        console.log(`Duplicate alert detected: ${alertId}, updating existing alert`);
        await this.updateExistingAlert(alertId, alertData);
        return;
      }

      // Create new alert
      const alert = {
        id: alertId,
        type: alertType,
        severity: alertData.severity || 'medium',
        message: alertData.message,
        data: alertData,
        createdAt: new Date(),
        escalationLevel: 0,
        acknowledged: false,
        resolved: false,
        escalationTimers: []
      };

      // Store active alert
      this.activeAlerts.set(alertId, alert);

      // Start escalation process
      await this.startEscalation(alert);

      // Emit alert event
      this.emit('alert_created', alert);

      console.log(`New alert created: ${alertId} (${alertType})`);

    } catch (error) {
      console.error('Error processing alert:', error);
    }
  }

  /**
   * Start escalation process for an alert
   */
  async startEscalation(alert) {
    const escalationRule = this.escalationRules.get(alert.type);
    
    if (!escalationRule) {
      console.warn(`No escalation rule found for alert type: ${alert.type}`);
      return;
    }

    // Process each escalation level
    for (let level = 0; level < escalationRule.levels.length; level++) {
      const escalationLevel = escalationRule.levels[level];
      
      const timer = setTimeout(async () => {
        // Check if alert is still active and not acknowledged
        const currentAlert = this.activeAlerts.get(alert.id);
        if (!currentAlert || currentAlert.acknowledged || currentAlert.resolved) {
          return;
        }

        // Send escalation notification
        await this.sendEscalationNotification(alert, level, escalationLevel);
        
        // Update alert escalation level
        currentAlert.escalationLevel = level;
        this.activeAlerts.set(alert.id, currentAlert);

        // Emit escalation event
        this.emit('alert_escalated', {
          alert: currentAlert,
          level,
          escalationLevel
        });

      }, escalationLevel.delay);

      alert.escalationTimers.push(timer);
    }
  }

  /**
   * Send escalation notification
   */
  async sendEscalationNotification(alert, level, escalationLevel) {
    try {
      // Get recipient users
      const recipients = await this.getRecipientUsers(escalationLevel.recipients);
      
      if (recipients.length === 0) {
        console.warn(`No recipients found for escalation level ${level}`);
        return;
      }

      // Create escalation notification
      const escalationNotification = {
        type: 'system_alert_escalation',
        category: 'system',
        priority: alert.severity === 'critical' ? 'emergency' : 'critical',
        recipients: recipients.map(user => ({
          userId: user._id,
          userRole: user.role,
          deliveryChannels: escalationLevel.channels
        })),
        content: {
          title: `🚨 ESCALATED ALERT - Level ${level + 1}`,
          message: `${alert.message}\n\nThis alert has been escalated to level ${level + 1} due to lack of acknowledgment.`,
          actionUrl: `${process.env.FRONTEND_URL}/admin/alerts/${alert.id}`,
          actionText: 'View Alert Details',
          metadata: {
            alertId: alert.id,
            alertType: alert.type,
            escalationLevel: level,
            originalAlert: alert.data
          }
        },
        contextData: {
          alertId: alert.id,
          escalationLevel: level,
          originalAlert: alert.data
        }
      };

      // Send notification through enhanced notification service
      const { default: EnhancedNotificationService } = await import('./EnhancedNotificationService.js');
      await EnhancedNotificationService.sendBulkNotification(
        escalationNotification.recipients,
        escalationNotification.type,
        escalationNotification.content,
        {
          priority: escalationNotification.priority,
          category: escalationNotification.category
        }
      );

      console.log(`Escalation notification sent for alert ${alert.id} at level ${level + 1}`);

    } catch (error) {
      console.error(`Error sending escalation notification for alert ${alert.id}:`, error);
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy, notes = '') {
    const alert = this.activeAlerts.get(alertId);
    
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    if (alert.acknowledged) {
      throw new Error(`Alert already acknowledged: ${alertId}`);
    }

    // Clear escalation timers
    alert.escalationTimers.forEach(timer => clearTimeout(timer));
    alert.escalationTimers = [];

    // Update alert
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();
    alert.acknowledgmentNotes = notes;

    this.activeAlerts.set(alertId, alert);

    // Emit acknowledgment event
    this.emit('alert_acknowledged', {
      alert,
      acknowledgedBy,
      notes
    });

    // Send acknowledgment notification to other admins
    await this.sendAcknowledgmentNotification(alert, acknowledgedBy);

    console.log(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`);

    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId, resolvedBy, resolution = '') {
    const alert = this.activeAlerts.get(alertId);
    
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    if (alert.resolved) {
      throw new Error(`Alert already resolved: ${alertId}`);
    }

    // Clear escalation timers
    alert.escalationTimers.forEach(timer => clearTimeout(timer));
    alert.escalationTimers = [];

    // Update alert
    alert.resolved = true;
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date();
    alert.resolution = resolution;

    // Move to alert history
    this.alertHistory.set(alertId, alert);
    this.activeAlerts.delete(alertId);

    // Set cooldown for this alert type
    this.setCooldown(alert.type);

    // Emit resolution event
    this.emit('alert_resolved', {
      alert,
      resolvedBy,
      resolution
    });

    // Send resolution notification
    await this.sendResolutionNotification(alert, resolvedBy);

    console.log(`Alert resolved: ${alertId} by ${resolvedBy}`);

    return alert;
  }

  /**
   * Get recipient users based on roles
   */
  async getRecipientUsers(recipientRoles) {
    try {
      const roleMapping = {
        'admin': 'admin',
        'senior_admin': 'admin', // Could be filtered by additional criteria
        'system_admin': 'admin', // Could be filtered by additional criteria
        'emergency_contact': 'admin' // Could be a specific user or role
      };

      const roles = recipientRoles.map(role => roleMapping[role] || role);
      const uniqueRoles = [...new Set(roles)];

      const users = await User.find({
        role: { $in: uniqueRoles },
        status: 'active'
      }).select('_id name email phone role');

      return users;

    } catch (error) {
      console.error('Error getting recipient users:', error);
      return [];
    }
  }

  /**
   * Send acknowledgment notification
   */
  async sendAcknowledgmentNotification(alert, acknowledgedBy) {
    try {
      const adminUsers = await this.getRecipientUsers(['admin']);
      
      const notification = {
        type: 'alert_acknowledged',
        category: 'system',
        priority: 'medium',
        recipients: adminUsers
          .filter(user => user._id.toString() !== acknowledgedBy)
          .map(user => ({
            userId: user._id,
            userRole: user.role,
            deliveryChannels: ['websocket', 'email']
          })),
        content: {
          title: '✅ Alert Acknowledged',
          message: `Alert "${alert.message}" has been acknowledged.`,
          metadata: {
            alertId: alert.id,
            acknowledgedBy,
            acknowledgedAt: alert.acknowledgedAt
          }
        }
      };

      if (notification.recipients.length > 0) {
        const { default: EnhancedNotificationService } = await import('./EnhancedNotificationService.js');
        await EnhancedNotificationService.sendBulkNotification(
          notification.recipients,
          notification.type,
          notification.content,
          { priority: notification.priority, category: notification.category }
        );
      }

    } catch (error) {
      console.error('Error sending acknowledgment notification:', error);
    }
  }

  /**
   * Send resolution notification
   */
  async sendResolutionNotification(alert, resolvedBy) {
    try {
      const adminUsers = await this.getRecipientUsers(['admin']);
      
      const notification = {
        type: 'alert_resolved',
        category: 'system',
        priority: 'low',
        recipients: adminUsers.map(user => ({
          userId: user._id,
          userRole: user.role,
          deliveryChannels: ['websocket', 'email']
        })),
        content: {
          title: '✅ Alert Resolved',
          message: `Alert "${alert.message}" has been resolved.`,
          metadata: {
            alertId: alert.id,
            resolvedBy,
            resolvedAt: alert.resolvedAt,
            resolution: alert.resolution
          }
        }
      };

      const { default: EnhancedNotificationService } = await import('./EnhancedNotificationService.js');
      await EnhancedNotificationService.sendBulkNotification(
        notification.recipients,
        notification.type,
        notification.content,
        { priority: notification.priority, category: notification.category }
      );

    } catch (error) {
      console.error('Error sending resolution notification:', error);
    }
  }

  /**
   * Check if alert type is in cooldown
   */
  isInCooldown(alertType) {
    const cooldownEnd = this.alertCooldowns.get(alertType);
    return cooldownEnd && new Date() < cooldownEnd;
  }

  /**
   * Set cooldown for alert type
   */
  setCooldown(alertType) {
    const escalationRule = this.escalationRules.get(alertType);
    if (escalationRule && escalationRule.cooldown) {
      const cooldownEnd = new Date(Date.now() + escalationRule.cooldown);
      this.alertCooldowns.set(alertType, cooldownEnd);
    }
  }

  /**
   * Check if alert is duplicate
   */
  isDuplicateAlert(alertId, alertData) {
    return this.activeAlerts.has(alertId);
  }

  /**
   * Update existing alert
   */
  async updateExistingAlert(alertId, alertData) {
    const existingAlert = this.activeAlerts.get(alertId);
    if (existingAlert) {
      existingAlert.data = { ...existingAlert.data, ...alertData };
      existingAlert.updatedAt = new Date();
      this.activeAlerts.set(alertId, existingAlert);
      
      this.emit('alert_updated', existingAlert);
    }
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId(alertData) {
    const baseId = `${alertData.type}_${alertData.severity}`;
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(alertData))
      .digest('hex')
      .substring(0, 8);
    
    return `${baseId}_${hash}`;
  }

  /**
   * Start alert processing loop
   */
  startAlertProcessing() {
    // Clean up resolved alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000);

    // Check for stale alerts every 5 minutes
    setInterval(() => {
      this.checkStaleAlerts();
    }, 300000);
  }

  /**
   * Clean up old alerts from history
   */
  cleanupOldAlerts() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    for (const [alertId, alert] of this.alertHistory.entries()) {
      if (alert.resolvedAt && alert.resolvedAt < oneWeekAgo) {
        this.alertHistory.delete(alertId);
      }
    }

    console.log(`Cleaned up old alerts. History size: ${this.alertHistory.size}`);
  }

  /**
   * Check for stale alerts that haven't been acknowledged
   */
  checkStaleAlerts() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (!alert.acknowledged && alert.createdAt < twoHoursAgo) {
        console.warn(`Stale alert detected: ${alertId} (created ${alert.createdAt})`);
        
        // Emit stale alert event
        this.emit('stale_alert', alert);
      }
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    const alerts = Array.from(this.alertHistory.values())
      .sort((a, b) => b.resolvedAt - a.resolvedAt)
      .slice(0, limit);
    
    return alerts;
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics() {
    const activeAlerts = this.getActiveAlerts();
    const alertHistory = this.getAlertHistory();
    
    const stats = {
      active: {
        total: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        acknowledged: activeAlerts.filter(a => a.acknowledged).length,
        unacknowledged: activeAlerts.filter(a => !a.acknowledged).length
      },
      resolved: {
        total: alertHistory.length,
        last24h: alertHistory.filter(a => 
          a.resolvedAt && a.resolvedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length
      },
      types: {}
    };

    // Count by type
    [...activeAlerts, ...alertHistory].forEach(alert => {
      stats.types[alert.type] = (stats.types[alert.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Update escalation rules
   */
  updateEscalationRule(alertType, rule) {
    this.escalationRules.set(alertType, rule);
    console.log(`Updated escalation rule for ${alertType}`);
  }

  /**
   * Get escalation rules
   */
  getEscalationRules() {
    return Object.fromEntries(this.escalationRules);
  }
}

export default new AutomatedAlertingService();