import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import PrescriptionRequest from '../models/PrescriptionRequest.js';
import AppError from '../utils/AppError.js';
import PaymentService from '../services/PaymentService.js';
import AuditService from '../services/AuditService.js';
// Import notification services
import RealTimeAnalyticsService from '../services/notifications/RealTimeAnalyticsService.js';
import DeliveryMonitoringService from '../services/notifications/DeliveryMonitoringService.js';
import AnalyticsCollectionService from '../services/notifications/AnalyticsCollectionService.js';
import AutomatedAlertingService from '../services/notifications/AutomatedAlertingService.js';
import SafeNotificationServiceFactory from '../services/SafeNotificationServiceFactory.js';

/**
 * Admin Controller
 * Handles all administrative operations including user management,
 * pharmacy approval, system monitoring, and analytics
 */
class AdminController {
  constructor() {
    this.notificationService = null; // Will be initialized when needed
  }

  /**
   * Get notification service instance safely
   */
  async getNotificationService() {
    if (!this.notificationService) {
      this.notificationService = await SafeNotificationServiceFactory.getService('AdminController');
    }
    return this.notificationService;
  }

  // Dashboard Analytics
  async getDashboardStats(req, res, next) {
    try {
      const [
        userStats,
        pharmacyStats,
        prescriptionStats,
        paymentStats,
        systemStats
      ] = await Promise.all([
        this.getUserStats(),
        this.getPharmacyStats(),
        this.getPrescriptionStats(),
        this.getPaymentStats(),
        this.getSystemStats()
      ]);

      res.status(200).json({
        success: true,
        data: {
          users: userStats,
          pharmacies: pharmacyStats,
          prescriptions: prescriptionStats,
          payments: paymentStats,
          system: systemStats,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      next(new AppError('Failed to fetch dashboard statistics', 500));
    }
  }

  // User Management
  async getAllUsers(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        role = '',
        status = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};
      
      // Build search query
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      if (role) query.role = role;
      if (status) query.status = status;

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password -twoFactorSecret')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(new AppError('Failed to fetch users', 500));
    }
  }

  async getUserDetails(req, res, next) {
    try {
      const { userId } = req.params;
      
      const user = await User.findById(userId)
        .select('-password -twoFactorSecret')
        .populate('prescriptions')
        .populate('orders')
        .lean();

      if (!user) {
        return next(new AppError('User not found', 404));
      }

      // Get additional user statistics
      const userStats = await this.getUserDetailStats(userId);

      res.status(200).json({
        success: true,
        data: {
          user,
          stats: userStats
        }
      });
    } catch (error) {
      next(new AppError('Failed to fetch user details', 500));
    }
  }

  async updateUser(req, res, next) {
    try {
      const { userId } = req.params;
      const updates = req.body;

      // Get current user state for audit
      const currentUser = await User.findById(userId).lean();

      // Log admin action
      await this.logAdminAction(req.user.id, 'UPDATE_USER', {
        targetResource: 'user',
        targetId: userId,
        beforeState: currentUser,
        updates: Object.keys(updates)
      }, req);

      const user = await User.findByIdAndUpdate(
        userId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-password -twoFactorSecret');

      if (!user) {
        return next(new AppError('User not found', 404));
      }

      res.status(200).json({
        success: true,
        data: { user },
        message: 'User updated successfully'
      });
    } catch (error) {
      next(new AppError('Failed to update user', 500));
    }
  }

  async suspendUser(req, res, next) {
    try {
      const { userId } = req.params;
      const { reason, duration } = req.body;

      // Log admin action
      await this.logAdminAction(req.user.id, 'SUSPEND_USER', {
        targetUserId: userId,
        reason,
        duration
      });

      const user = await User.findByIdAndUpdate(
        userId,
        {
          status: 'suspended',
          suspensionReason: reason,
          suspensionExpiry: duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null,
          updatedAt: new Date()
        },
        { new: true }
      ).select('-password -twoFactorSecret');

      if (!user) {
        return next(new AppError('User not found', 404));
      }

      // Send notification to suspended user
      try {
        const notificationService = await this.getNotificationService();
        await notificationService.sendNotification(
          userId,
          'security_alert', // Using valid enum value
          {
            reason: reason,
            duration: duration,
            suspensionExpiry: user.suspensionExpiry,
            adminId: req.user.id
          },
          {
            priority: 'high',
            category: 'administrative' // Using valid enum value
          }
        );
      } catch (notificationError) {
        console.error('⚠️ Failed to send suspension notification:', notificationError.message);
      }

      res.status(200).json({
        success: true,
        data: { user },
        message: 'User suspended successfully'
      });
    } catch (error) {
      next(new AppError('Failed to suspend user', 500));
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      // Log admin action
      await this.logAdminAction(req.user.id, 'DELETE_USER', {
        targetUserId: userId,
        reason
      });

      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        return next(new AppError('User not found', 404));
      }

      // TODO: Handle related data cleanup (prescriptions, orders, etc.)

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(new AppError('Failed to delete user', 500));
    }
  }

  // Pharmacy Management
  async getPendingPharmacies(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const [pharmacies, total] = await Promise.all([
        Pharmacy.find({ approvalStatus: 'pending' })
          .populate('owner', 'name email phone')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Pharmacy.countDocuments({ approvalStatus: 'pending' })
      ]);

      res.status(200).json({
        success: true,
        data: {
          pharmacies,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(new AppError('Failed to fetch pending pharmacies', 500));
    }
  }

  async approvePharmacy(req, res, next) {
    try {
      const { pharmacyId } = req.params;
      const { notes } = req.body;

      // Log admin action
      await this.logAdminAction(req.user.id, 'APPROVE_PHARMACY', {
        pharmacyId,
        notes
      });

      const pharmacy = await Pharmacy.findByIdAndUpdate(
        pharmacyId,
        {
          approvalStatus: 'approved',
          approvedBy: req.user.id,
          approvedAt: new Date(),
          approvalNotes: notes,
          isActive: true
        },
        { new: true }
      ).populate('owner', 'name email');

      if (!pharmacy) {
        return next(new AppError('Pharmacy not found', 404));
      }

      // Send approval notification to pharmacy owner
      try {
        const notificationService = await this.getNotificationService();
        await notificationService.sendNotification(
          pharmacy.owner._id,
          'user_verified', // Using valid enum value
          {
            pharmacyName: pharmacy.name,
            pharmacyId: pharmacyId,
            approvedBy: req.user.name,
            approvalNotes: notes,
            approvedAt: new Date()
          },
          {
            priority: 'high',
            category: 'administrative' // Using valid enum value
          }
        );
      } catch (notificationError) {
        console.error('⚠️ Failed to send pharmacy approval notification:', notificationError.message);
      }

      res.status(200).json({
        success: true,
        data: { pharmacy },
        message: 'Pharmacy approved successfully'
      });
    } catch (error) {
      next(new AppError('Failed to approve pharmacy', 500));
    }
  }

  async rejectPharmacy(req, res, next) {
    try {
      const { pharmacyId } = req.params;
      const { reason } = req.body;

      // Log admin action
      await this.logAdminAction(req.user.id, 'REJECT_PHARMACY', {
        pharmacyId,
        reason
      });

      const pharmacy = await Pharmacy.findByIdAndUpdate(
        pharmacyId,
        {
          approvalStatus: 'rejected',
          rejectedBy: req.user.id,
          rejectedAt: new Date(),
          rejectionReason: reason
        },
        { new: true }
      ).populate('owner', 'name email');

      if (!pharmacy) {
        return next(new AppError('Pharmacy not found', 404));
      }

      // Send rejection notification to pharmacy owner
      try {
        const notificationService = await this.getNotificationService();
        await notificationService.sendNotification(
          pharmacy.owner._id,
          'verification_required', // Using valid enum value
          {
            pharmacyName: pharmacy.name,
            pharmacyId: pharmacyId,
            rejectedBy: req.user.name,
            rejectionReason: reason,
            rejectedAt: new Date()
          },
          {
            priority: 'high',
            category: 'administrative' // Using valid enum value
          }
        );
      } catch (notificationError) {
        console.error('⚠️ Failed to send pharmacy rejection notification:', notificationError.message);
      }

      res.status(200).json({
        success: true,
        data: { pharmacy },
        message: 'Pharmacy rejected'
      });
    } catch (error) {
      next(new AppError('Failed to reject pharmacy', 500));
    }
  }

  // System Monitoring
  async getSystemMetrics(req, res, next) {
    try {
      const metrics = {
        server: await this.getServerMetrics(),
        database: await this.getDatabaseMetrics(),
        performance: await this.getPerformanceMetrics(),
        errors: await this.getErrorMetrics(),
        api: await this.getAPIMetrics()
      };

      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(new AppError('Failed to fetch system metrics', 500));
    }
  }

  async getAuditLogs(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        action = '',
        adminId = '',
        dateFrom = '',
        dateTo = ''
      } = req.query;

      const filters = {
        page,
        limit,
        ...(action && { action }),
        ...(adminId && { adminId }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      };

      const result = await AuditService.getLogs(filters);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(new AppError('Failed to fetch audit logs', 500));
    }
  }

  // Analytics and Reporting
  async getAnalytics(req, res, next) {
    try {
      const { timeRange = '30d', metrics = 'all' } = req.query;
      
      const analytics = {
        users: await this.getUserAnalytics(timeRange),
        pharmacies: await this.getPharmacyAnalytics(timeRange),
        prescriptions: await this.getPrescriptionAnalytics(timeRange),
        payments: await PaymentService.generatePaymentAnalytics({ timeRange }),
        system: await this.getSystemAnalytics(timeRange)
      };

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(new AppError('Failed to fetch analytics', 500));
    }
  }

  // Notification Monitoring Methods
  async getNotificationDashboard(req, res, next) {
    try {
      const dashboardData = await RealTimeAnalyticsService.getLiveDashboardData();
      
      res.status(200).json({
        success: true,
        data: dashboardData,
        timestamp: new Date()
      });
    } catch (error) {
      next(new AppError('Failed to fetch notification dashboard data', 500));
    }
  }

  async getNotificationAnalytics(req, res, next) {
    try {
      const { 
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate = new Date().toISOString(),
        granularity = 'daily'
      } = req.query;

      const [
        deliveryMetrics,
        engagementMetrics,
        channelPerformance,
        userEngagement,
        performanceTrends
      ] = await Promise.all([
        DeliveryMonitoringService.getDeliverySuccessRate(startDate, endDate),
        AnalyticsCollectionService.getEngagementMetrics(startDate, endDate),
        AnalyticsCollectionService.getChannelPerformance(startDate, endDate),
        RealTimeAnalyticsService.getUserEngagementAnalytics(startDate, endDate),
        RealTimeAnalyticsService.getPerformanceTrends(7)
      ]);

      res.status(200).json({
        success: true,
        data: {
          delivery: deliveryMetrics,
          engagement: engagementMetrics,
          channels: channelPerformance,
          userEngagement,
          trends: performanceTrends,
          timeRange: { startDate, endDate }
        }
      });
    } catch (error) {
      next(new AppError('Failed to fetch notification analytics', 500));
    }
  }

  async getNotificationSystemHealth(req, res, next) {
    try {
      const [systemHealth, monitoringStatus] = await Promise.all([
        RealTimeAnalyticsService.getSystemHealth(),
        DeliveryMonitoringService.getCurrentStatus()
      ]);

      res.status(200).json({
        success: true,
        data: {
          systemHealth,
          monitoring: monitoringStatus,
          alertThresholds: {
            realTime: RealTimeAnalyticsService.getAlertThresholds(),
            delivery: DeliveryMonitoringService.getAlertThresholds()
          }
        }
      });
    } catch (error) {
      next(new AppError('Failed to fetch notification system health', 500));
    }
  }

  async getDeliveryReport(req, res, next) {
    try {
      const { 
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate = new Date().toISOString(),
        format = 'json'
      } = req.query;

      const deliveryReport = await DeliveryMonitoringService.getDeliveryReport(startDate, endDate);

      if (format === 'csv') {
        // Convert to CSV format for download
        const csvData = this.convertDeliveryReportToCSV(deliveryReport);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=delivery-report.csv');
        return res.send(csvData);
      }

      res.status(200).json({
        success: true,
        data: deliveryReport
      });
    } catch (error) {
      next(new AppError('Failed to generate delivery report', 500));
    }
  }

  async getPerformanceTrends(req, res, next) {
    try {
      const { 
        days = 7,
        granularity = 'daily'
      } = req.query;

      const [
        performanceTrends,
        deliveryTrends
      ] = await Promise.all([
        RealTimeAnalyticsService.getPerformanceTrends(parseInt(days)),
        DeliveryMonitoringService.getDeliveryTrends(
          new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000),
          new Date(),
          granularity
        )
      ]);

      res.status(200).json({
        success: true,
        data: {
          performance: performanceTrends,
          delivery: deliveryTrends,
          timeRange: {
            days: parseInt(days),
            granularity
          }
        }
      });
    } catch (error) {
      next(new AppError('Failed to fetch performance trends', 500));
    }
  }

  async getRealTimeNotificationMetrics(req, res, next) {
    try {
      const realTimeMetrics = AnalyticsCollectionService.getRealTimeMetrics();
      const recentEvents = AnalyticsCollectionService.getRecentEvents(20);

      res.status(200).json({
        success: true,
        data: {
          metrics: realTimeMetrics,
          recentEvents,
          timestamp: new Date()
        }
      });
    } catch (error) {
      next(new AppError('Failed to fetch real-time notification metrics', 500));
    }
  }

  async updateAlertThresholds(req, res, next) {
    try {
      const { service, thresholds } = req.body;

      if (!service || !thresholds) {
        return next(new AppError('Service and thresholds are required', 400));
      }

      // Log admin action
      await this.logAdminAction(req.user.id, 'UPDATE_NOTIFICATION_ALERT_THRESHOLDS', {
        service,
        thresholds,
        previousThresholds: service === 'realTime' 
          ? RealTimeAnalyticsService.getAlertThresholds()
          : DeliveryMonitoringService.getAlertThresholds()
      }, req);

      // Update thresholds based on service
      if (service === 'realTime') {
        RealTimeAnalyticsService.setAlertThresholds(thresholds);
      } else if (service === 'delivery') {
        DeliveryMonitoringService.setAlertThresholds(thresholds);
      } else {
        return next(new AppError('Invalid service specified', 400));
      }

      res.status(200).json({
        success: true,
        message: `Alert thresholds updated for ${service} service`,
        data: {
          service,
          updatedThresholds: service === 'realTime' 
            ? RealTimeAnalyticsService.getAlertThresholds()
            : DeliveryMonitoringService.getAlertThresholds()
        }
      });
    } catch (error) {
      next(new AppError('Failed to update alert thresholds', 500));
    }
  }

  // Alert Management Methods
  async getActiveAlerts(req, res, next) {
    try {
      const activeAlerts = AutomatedAlertingService.getActiveAlerts();
      
      res.status(200).json({
        success: true,
        data: {
          alerts: activeAlerts,
          count: activeAlerts.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      next(new AppError('Failed to fetch active alerts', 500));
    }
  }

  async getAlertHistory(req, res, next) {
    try {
      const { limit = 50 } = req.query;
      const alertHistory = AutomatedAlertingService.getAlertHistory(parseInt(limit));
      
      res.status(200).json({
        success: true,
        data: {
          alerts: alertHistory,
          count: alertHistory.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      next(new AppError('Failed to fetch alert history', 500));
    }
  }

  async getAlertStatistics(req, res, next) {
    try {
      const statistics = AutomatedAlertingService.getAlertStatistics();
      
      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(new AppError('Failed to fetch alert statistics', 500));
    }
  }

  async acknowledgeAlert(req, res, next) {
    try {
      const { alertId } = req.params;
      const { notes = '' } = req.body;
      const acknowledgedBy = req.user.id;

      // Log admin action
      await this.logAdminAction(req.user.id, 'ACKNOWLEDGE_ALERT', {
        alertId,
        notes
      }, req);

      const alert = await AutomatedAlertingService.acknowledgeAlert(alertId, acknowledgedBy, notes);

      res.status(200).json({
        success: true,
        data: { alert },
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('already acknowledged')) {
        return next(new AppError(error.message, 400));
      }
      next(new AppError('Failed to acknowledge alert', 500));
    }
  }

  async resolveAlert(req, res, next) {
    try {
      const { alertId } = req.params;
      const { resolution = '' } = req.body;
      const resolvedBy = req.user.id;

      // Log admin action
      await this.logAdminAction(req.user.id, 'RESOLVE_ALERT', {
        alertId,
        resolution
      }, req);

      const alert = await AutomatedAlertingService.resolveAlert(alertId, resolvedBy, resolution);

      res.status(200).json({
        success: true,
        data: { alert },
        message: 'Alert resolved successfully'
      });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('already resolved')) {
        return next(new AppError(error.message, 400));
      }
      next(new AppError('Failed to resolve alert', 500));
    }
  }

  async getEscalationRules(req, res, next) {
    try {
      const escalationRules = AutomatedAlertingService.getEscalationRules();
      
      res.status(200).json({
        success: true,
        data: escalationRules
      });
    } catch (error) {
      next(new AppError('Failed to fetch escalation rules', 500));
    }
  }

  async updateEscalationRule(req, res, next) {
    try {
      const { alertType } = req.params;
      const { rule } = req.body;

      if (!rule) {
        return next(new AppError('Escalation rule is required', 400));
      }

      // Log admin action
      await this.logAdminAction(req.user.id, 'UPDATE_ESCALATION_RULE', {
        alertType,
        rule,
        previousRule: AutomatedAlertingService.getEscalationRules()[alertType]
      }, req);

      AutomatedAlertingService.updateEscalationRule(alertType, rule);

      res.status(200).json({
        success: true,
        message: `Escalation rule updated for ${alertType}`,
        data: {
          alertType,
          rule
        }
      });
    } catch (error) {
      next(new AppError('Failed to update escalation rule', 500));
    }
  }

  // Helper Methods
  async getUserStats() {
    const [total, active, patients, pharmacies, admins, newToday] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'pharmacy' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    return { total, active, patients, pharmacies, admins, newToday };
  }

  async getPharmacyStats() {
    const [total, approved, pending, rejected, active] = await Promise.all([
      Pharmacy.countDocuments(),
      Pharmacy.countDocuments({ approvalStatus: 'approved' }),
      Pharmacy.countDocuments({ approvalStatus: 'pending' }),
      Pharmacy.countDocuments({ approvalStatus: 'rejected' }),
      Pharmacy.countDocuments({ isActive: true })
    ]);

    return { total, approved, pending, rejected, active };
  }

  async getPrescriptionStats() {
    const [total, pending, approved, rejected, completed] = await Promise.all([
      PrescriptionRequest.countDocuments(),
      PrescriptionRequest.countDocuments({ status: 'pending' }),
      PrescriptionRequest.countDocuments({ status: 'approved' }),
      PrescriptionRequest.countDocuments({ status: 'rejected' }),
      PrescriptionRequest.countDocuments({ status: 'completed' })
    ]);

    return { total, pending, approved, rejected, completed };
  }

  async getPaymentStats() {
    // Integration with payment service
    return await PaymentService.generatePaymentAnalytics({ timeRange: '30d' });
  }

  async getSystemStats() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date()
    };
  }

  async logAdminAction(adminId, action, details = {}, req = null) {
    return await AuditService.logAction(adminId, action, details, req);
  }

  async getUserDetailStats(userId) {
    // TODO: Implement detailed user statistics
    return {
      prescriptionsCount: 0,
      ordersCount: 0,
      totalSpent: 0,
      lastActivity: new Date()
    };
  }

  async getServerMetrics() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date()
    };
  }

  async getDatabaseMetrics() {
    // TODO: Implement database metrics collection
    return {
      connections: 0,
      operations: 0,
      storage: 0
    };
  }

  async getPerformanceMetrics() {
    // TODO: Implement performance metrics
    return {
      responseTime: 0,
      throughput: 0,
      errorRate: 0
    };
  }

  async getErrorMetrics() {
    // TODO: Implement error tracking
    return {
      totalErrors: 0,
      errorRate: 0,
      recentErrors: []
    };
  }

  async getAPIMetrics() {
    // TODO: Implement API metrics
    return {
      totalRequests: 0,
      requestsPerMinute: 0,
      popularEndpoints: []
    };
  }

  // Helper method for CSV conversion
  convertDeliveryReportToCSV(deliveryReport) {
    const headers = [
      'Metric',
      'Overall',
      'WebSocket',
      'Email',
      'SMS',
      'Patient',
      'Doctor',
      'Pharmacy',
      'Admin'
    ];

    const rows = [
      headers.join(','),
      `Success Rate,${deliveryReport.overall.successRate}%,${deliveryReport.channels.websocket.successRate}%,${deliveryReport.channels.email.successRate}%,${deliveryReport.channels.sms.successRate}%,${deliveryReport.roles.patient.successRate}%,${deliveryReport.roles.doctor.successRate}%,${deliveryReport.roles.pharmacy.successRate}%,${deliveryReport.roles.admin.successRate}%`,
      `Total Attempts,${deliveryReport.overall.totalAttempts},${deliveryReport.channels.websocket.totalAttempts},${deliveryReport.channels.email.totalAttempts},${deliveryReport.channels.sms.totalAttempts},${deliveryReport.roles.patient.totalAttempts},${deliveryReport.roles.doctor.totalAttempts},${deliveryReport.roles.pharmacy.totalAttempts},${deliveryReport.roles.admin.totalAttempts}`,
      `Successful Deliveries,${deliveryReport.overall.successfulDeliveries},${deliveryReport.channels.websocket.successfulDeliveries},${deliveryReport.channels.email.successfulDeliveries},${deliveryReport.channels.sms.successfulDeliveries},${deliveryReport.roles.patient.successfulDeliveries},${deliveryReport.roles.doctor.successfulDeliveries},${deliveryReport.roles.pharmacy.successfulDeliveries},${deliveryReport.roles.admin.successfulDeliveries}`,
      `Failed Deliveries,${deliveryReport.overall.failedDeliveries},${deliveryReport.channels.websocket.failedDeliveries},${deliveryReport.channels.email.failedDeliveries},${deliveryReport.channels.sms.failedDeliveries},${deliveryReport.roles.patient.failedDeliveries},${deliveryReport.roles.doctor.failedDeliveries},${deliveryReport.roles.pharmacy.failedDeliveries},${deliveryReport.roles.admin.failedDeliveries}`,
      `Generated At,${deliveryReport.generatedAt},,,,,,,,`
    ];

    return rows.join('\n');
  }
}

export default new AdminController();
