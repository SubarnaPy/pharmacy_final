import Notification from '../models/Notification.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import UserNotificationPreferences from '../models/UserNotificationPreferences.js';
import NotificationAnalytics from '../models/NotificationAnalytics.js';
import User from '../models/User.js';
import EnhancedNotificationService from '../services/notifications/EnhancedNotificationService.js';

/**
 * Admin Notification Controller
 * Handles admin-facing notification management APIs
 */
class AdminNotificationController {
  constructor() {
    this.notificationService = null;
  }

  /**
   * Set notification service instance
   * @param {EnhancedNotificationService} service - Notification service instance
   */
  setNotificationService(service) {
    this.notificationService = service;
  }

  /**
   * Get system-wide notification overview
   * @route GET /api/admin/notifications/overview
   * @access Private (Admin)
   */
  async getSystemOverview(req, res) {
    try {
      const {
        period = '7d',
        startDate,
        endDate
      } = req.query;

      // Calculate date range
      let dateRange = this.calculateDateRange(period, startDate, endDate);

      // Get overall statistics
      const totalNotifications = await Notification.countDocuments({
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      });

      const pendingNotifications = await Notification.countDocuments({
        'recipients.deliveryStatus.websocket.status': 'pending',
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      });

      const failedNotifications = await Notification.countDocuments({
        $or: [
          { 'recipients.deliveryStatus.websocket.status': 'failed' },
          { 'recipients.deliveryStatus.email.status': 'failed' },
          { 'recipients.deliveryStatus.sms.status': 'failed' }
        ],
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      });

      // Get statistics by priority
      const priorityStats = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 },
            delivered: {
              $sum: {
                $cond: [
                  { $eq: ['$recipients.deliveryStatus.websocket.status', 'delivered'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      // Get statistics by category
      const categoryStats = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgReadTime: { $avg: '$analytics.readCount' }
          }
        }
      ]);

      // Get statistics by user role
      const roleStats = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $unwind: '$recipients'
        },
        {
          $group: {
            _id: '$recipients.userRole',
            count: { $sum: 1 },
            delivered: {
              $sum: {
                $cond: [
                  { $eq: ['$recipients.deliveryStatus.websocket.status', 'delivered'] },
                  1,
                  0
                ]
              }
            },
            read: {
              $sum: {
                $cond: [
                  { $ne: ['$recipients.readAt', null] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      // Get daily activity for charts
      const dailyActivity = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 },
            delivered: {
              $sum: {
                $cond: [
                  { $eq: ['$recipients.deliveryStatus.websocket.status', 'delivered'] },
                  1,
                  0
                ]
              }
            },
            failed: {
              $sum: {
                $cond: [
                  { $eq: ['$recipients.deliveryStatus.websocket.status', 'failed'] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Get recent failed notifications
      const recentFailures = await Notification.find({
        $or: [
          { 'recipients.deliveryStatus.websocket.status': 'failed' },
          { 'recipients.deliveryStatus.email.status': 'failed' },
          { 'recipients.deliveryStatus.sms.status': 'failed' }
        ],
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('createdBy', 'name email role')
        .lean();

      res.json({
        success: true,
        data: {
          period,
          dateRange,
          summary: {
            total: totalNotifications,
            pending: pendingNotifications,
            failed: failedNotifications,
            delivered: totalNotifications - pendingNotifications - failedNotifications,
            deliveryRate: totalNotifications > 0 ? 
              ((totalNotifications - failedNotifications) / totalNotifications * 100).toFixed(1) : 0,
            failureRate: totalNotifications > 0 ? 
              (failedNotifications / totalNotifications * 100).toFixed(1) : 0
          },
          breakdown: {
            priority: priorityStats.reduce((acc, stat) => {
              acc[stat._id] = {
                total: stat.count,
                delivered: stat.delivered,
                deliveryRate: stat.count > 0 ? (stat.delivered / stat.count * 100).toFixed(1) : 0
              };
              return acc;
            }, {}),
            category: categoryStats.reduce((acc, stat) => {
              acc[stat._id] = {
                total: stat.count,
                avgReadTime: stat.avgReadTime
              };
              return acc;
            }, {}),
            role: roleStats.reduce((acc, stat) => {
              acc[stat._id] = {
                total: stat.count,
                delivered: stat.delivered,
                read: stat.read,
                deliveryRate: stat.count > 0 ? (stat.delivered / stat.count * 100).toFixed(1) : 0,
                readRate: stat.delivered > 0 ? (stat.read / stat.delivered * 100).toFixed(1) : 0
              };
              return acc;
            }, {})
          },
          dailyActivity: dailyActivity.map(day => ({
            date: day._id,
            total: day.count,
            delivered: day.delivered,
            failed: day.failed
          })),
          recentFailures: recentFailures.map(notification => ({
            id: notification._id,
            type: notification.type,
            priority: notification.priority,
            createdAt: notification.createdAt,
            failureReasons: this.extractFailureReasons(notification.recipients),
            createdBy: notification.createdBy
          }))
        }
      });

    } catch (error) {
      console.error('❌ Get system overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system overview'
      });
    }
  }

  /**
   * Get all notifications with admin filters
   * @route GET /api/admin/notifications
   * @access Private (Admin)
   */
  async getAllNotifications(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        category,
        priority,
        status,
        userRole,
        userId,
        startDate,
        endDate,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = {};

      // Add filters
      if (type) {
        if (Array.isArray(type)) {
          query.type = { $in: type };
        } else {
          query.type = type;
        }
      }

      if (category) {
        if (Array.isArray(category)) {
          query.category = { $in: category };
        } else {
          query.category = category;
        }
      }

      if (priority) {
        if (Array.isArray(priority)) {
          query.priority = { $in: priority };
        } else {
          query.priority = priority;
        }
      }

      if (userRole) {
        query['recipients.userRole'] = userRole;
      }

      if (userId) {
        query['recipients.userId'] = userId;
      }

      // Date range filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Search in title and message
      if (search) {
        query.$or = [
          { 'content.title': { $regex: search, $options: 'i' } },
          { 'content.message': { $regex: search, $options: 'i' } },
          { type: { $regex: search, $options: 'i' } }
        ];
      }

      // Status filter (delivery status)
      if (status) {
        const statusQuery = {};
        statusQuery[`recipients.deliveryStatus.websocket.status`] = status;
        query.$or = query.$or || [];
        query.$or.push(statusQuery);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with population
      const notifications = await Notification.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email role')
        .populate('recipients.userId', 'name email role')
        .populate('relatedEntities.entityId')
        .lean();

      const total = await Notification.countDocuments(query);

      // Format notifications for admin view
      const adminNotifications = notifications.map(notification => ({
        id: notification._id,
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
        content: notification.content,
        createdAt: notification.createdAt,
        expiresAt: notification.expiresAt,
        scheduledFor: notification.scheduledFor,
        relatedEntities: notification.relatedEntities,
        analytics: notification.analytics,
        recipients: notification.recipients.map(recipient => ({
          userId: recipient.userId._id,
          userName: recipient.userId.name,
          userEmail: recipient.userId.email,
          userRole: recipient.userRole,
          deliveryChannels: recipient.deliveryChannels,
          deliveryStatus: recipient.deliveryStatus,
          readAt: recipient.readAt,
          actionTaken: recipient.actionTaken
        })),
        createdBy: notification.createdBy ? {
          id: notification.createdBy._id,
          name: notification.createdBy.name,
          email: notification.createdBy.email,
          role: notification.createdBy.role
        } : null,
        retryCount: notification.retryCount,
        lastRetryAt: notification.lastRetryAt
      }));

      res.json({
        success: true,
        data: {
          notifications: adminNotifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          },
          filters: {
            type,
            category,
            priority,
            status,
            userRole,
            userId,
            startDate,
            endDate,
            search
          }
        }
      });

    } catch (error) {
      console.error('❌ Get all notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notifications'
      });
    }
  }

  /**
   * Send bulk notification to multiple users
   * @route POST /api/admin/notifications/bulk
   * @access Private (Admin)
   */
  async sendBulkNotification(req, res) {
    try {
      const {
        recipients,
        type,
        content,
        priority = 'medium',
        category = 'administrative',
        channels = ['websocket'],
        scheduledFor,
        expiresAt,
        templateId
      } = req.body;

      // Validate required fields
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Recipients array is required and cannot be empty'
        });
      }

      if (!type) {
        return res.status(400).json({
          success: false,
          message: 'Notification type is required'
        });
      }

      if (!content || !content.title || !content.message) {
        return res.status(400).json({
          success: false,
          message: 'Content with title and message is required'
        });
      }

      // Validate recipients format
      const validatedRecipients = [];
      for (const recipient of recipients) {
        if (!recipient.userId || !recipient.userRole) {
          return res.status(400).json({
            success: false,
            message: 'Each recipient must have userId and userRole'
          });
        }

        // Verify user exists
        const user = await User.findById(recipient.userId);
        if (!user) {
          return res.status(400).json({
            success: false,
            message: `User not found: ${recipient.userId}`
          });
        }

        validatedRecipients.push({
          userId: recipient.userId,
          userRole: recipient.userRole,
          deliveryChannels: recipient.channels || channels
        });
      }

      // Create notification using the service
      if (!this.notificationService) {
        return res.status(500).json({
          success: false,
          message: 'Notification service not available'
        });
      }

      const notificationData = {
        type,
        recipients: validatedRecipients,
        content,
        priority,
        category,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        templateId,
        createdBy: req.user.id
      };

      const notification = await this.notificationService.createNotification(notificationData);

      console.log(`📢 Admin ${req.user.id} sent bulk notification to ${validatedRecipients.length} recipients`);

      res.json({
        success: true,
        message: `Bulk notification sent to ${validatedRecipients.length} recipients`,
        data: {
          notificationId: notification._id,
          type: notification.type,
          recipientCount: validatedRecipients.length,
          scheduledFor: notification.scheduledFor,
          createdAt: notification.createdAt
        }
      });

    } catch (error) {
      console.error('❌ Send bulk notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send bulk notification'
      });
    }
  }

  /**
   * Send notification to all users of a specific role
   * @route POST /api/admin/notifications/broadcast
   * @access Private (Admin)
   */
  async broadcastNotification(req, res) {
    try {
      const {
        targetRole,
        type,
        content,
        priority = 'medium',
        category = 'administrative',
        channels = ['websocket'],
        scheduledFor,
        expiresAt,
        templateId,
        excludeUserIds = []
      } = req.body;

      // Validate required fields
      if (!targetRole) {
        return res.status(400).json({
          success: false,
          message: 'Target role is required'
        });
      }

      if (!['patient', 'doctor', 'pharmacy', 'admin'].includes(targetRole)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid target role'
        });
      }

      if (!type || !content || !content.title || !content.message) {
        return res.status(400).json({
          success: false,
          message: 'Type and content with title and message are required'
        });
      }

      // Get all users with the target role
      const query = { role: targetRole, isVerified: true };
      if (excludeUserIds.length > 0) {
        query._id = { $nin: excludeUserIds };
      }

      const users = await User.find(query).select('_id name email role').lean();

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No verified users found with role: ${targetRole}`
        });
      }

      // Create recipients array
      const recipients = users.map(user => ({
        userId: user._id,
        userRole: user.role,
        deliveryChannels: channels
      }));

      // Create notification using the service
      if (!this.notificationService) {
        return res.status(500).json({
          success: false,
          message: 'Notification service not available'
        });
      }

      const notificationData = {
        type,
        recipients,
        content,
        priority,
        category,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        templateId,
        createdBy: req.user.id
      };

      const notification = await this.notificationService.createNotification(notificationData);

      console.log(`📡 Admin ${req.user.id} broadcast notification to ${recipients.length} ${targetRole}s`);

      res.json({
        success: true,
        message: `Notification broadcast to ${recipients.length} ${targetRole}s`,
        data: {
          notificationId: notification._id,
          type: notification.type,
          targetRole,
          recipientCount: recipients.length,
          scheduledFor: notification.scheduledFor,
          createdAt: notification.createdAt
        }
      });

    } catch (error) {
      console.error('❌ Broadcast notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to broadcast notification'
      });
    }
  }

  /**
   * Retry failed notification delivery
   * @route POST /api/admin/notifications/:notificationId/retry
   * @access Private (Admin)
   */
  async retryNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const { channels, recipientIds } = req.body;

      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      // Filter recipients to retry
      let recipientsToRetry = notification.recipients;
      if (recipientIds && Array.isArray(recipientIds)) {
        recipientsToRetry = notification.recipients.filter(r => 
          recipientIds.includes(r.userId.toString())
        );
      }

      // Filter channels to retry
      const channelsToRetry = channels || ['websocket', 'email', 'sms'];

      let retryCount = 0;
      for (const recipient of recipientsToRetry) {
        for (const channel of channelsToRetry) {
          const deliveryStatus = recipient.deliveryStatus[channel];
          if (deliveryStatus && deliveryStatus.status === 'failed') {
            // Reset status to pending for retry
            deliveryStatus.status = 'pending';
            deliveryStatus.error = null;
            retryCount++;
          }
        }
      }

      // Update retry metadata
      notification.retryCount = (notification.retryCount || 0) + 1;
      notification.lastRetryAt = new Date();

      await notification.save();

      // Queue for delivery again if notification service is available
      if (this.notificationService && retryCount > 0) {
        await this.notificationService.queueNotificationForDelivery(notification);
      }

      console.log(`🔄 Admin ${req.user.id} retried notification ${notificationId} for ${retryCount} deliveries`);

      res.json({
        success: true,
        message: `Retry initiated for ${retryCount} failed deliveries`,
        data: {
          notificationId,
          retryCount: notification.retryCount,
          lastRetryAt: notification.lastRetryAt,
          deliveriesRetried: retryCount
        }
      });

    } catch (error) {
      console.error('❌ Retry notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry notification'
      });
    }
  }

  /**
   * Cancel scheduled notification
   * @route POST /api/admin/notifications/:notificationId/cancel
   * @access Private (Admin)
   */
  async cancelNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const { reason } = req.body;

      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      // Check if notification is scheduled
      if (!notification.scheduledFor || notification.scheduledFor <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel notification that has already been sent or is not scheduled'
        });
      }

      // Mark all recipients as cancelled
      for (const recipient of notification.recipients) {
        for (const channel of Object.keys(recipient.deliveryStatus)) {
          if (recipient.deliveryStatus[channel].status === 'pending') {
            recipient.deliveryStatus[channel].status = 'cancelled';
            recipient.deliveryStatus[channel].error = reason || 'Cancelled by admin';
          }
        }
      }

      // Update notification metadata
      notification.contextData = notification.contextData || {};
      notification.contextData.cancelledBy = req.user.id;
      notification.contextData.cancelledAt = new Date();
      notification.contextData.cancellationReason = reason;

      await notification.save();

      console.log(`❌ Admin ${req.user.id} cancelled scheduled notification ${notificationId}`);

      res.json({
        success: true,
        message: 'Scheduled notification cancelled successfully',
        data: {
          notificationId,
          cancelledAt: notification.contextData.cancelledAt,
          reason: reason || 'No reason provided'
        }
      });

    } catch (error) {
      console.error('❌ Cancel notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel notification'
      });
    }
  }

  /**
   * Override user notification preferences for emergency
   * @route POST /api/admin/notifications/emergency-override
   * @access Private (Admin)
   */
  async emergencyOverride(req, res) {
    try {
      const {
        userIds,
        type,
        content,
        priority = 'emergency',
        category = 'system',
        channels = ['websocket', 'email', 'sms'],
        overrideReason
      } = req.body;

      // Validate required fields
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'User IDs array is required and cannot be empty'
        });
      }

      if (!type || !content || !content.title || !content.message) {
        return res.status(400).json({
          success: false,
          message: 'Type and content with title and message are required'
        });
      }

      if (!overrideReason) {
        return res.status(400).json({
          success: false,
          message: 'Override reason is required for emergency notifications'
        });
      }

      // Get users and their roles
      const users = await User.find({ _id: { $in: userIds } }).select('_id name email role').lean();
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No valid users found'
        });
      }

      // Create recipients array with all channels enabled (override preferences)
      const recipients = users.map(user => ({
        userId: user._id,
        userRole: user.role,
        deliveryChannels: channels
      }));

      // Create emergency notification
      if (!this.notificationService) {
        return res.status(500).json({
          success: false,
          message: 'Notification service not available'
        });
      }

      const notificationData = {
        type,
        recipients,
        content: {
          ...content,
          metadata: {
            ...content.metadata,
            emergencyOverride: true,
            overrideReason,
            overriddenBy: req.user.id,
            overriddenAt: new Date()
          }
        },
        priority,
        category,
        contextData: {
          emergencyOverride: true,
          overrideReason,
          overriddenBy: req.user.id,
          overriddenAt: new Date()
        },
        createdBy: req.user.id
      };

      const notification = await this.notificationService.createNotification(notificationData);

      // Log the emergency override
      console.log(`🚨 Admin ${req.user.id} sent emergency notification with preference override to ${recipients.length} users. Reason: ${overrideReason}`);

      res.json({
        success: true,
        message: `Emergency notification sent with preference override to ${recipients.length} users`,
        data: {
          notificationId: notification._id,
          type: notification.type,
          recipientCount: recipients.length,
          overrideReason,
          createdAt: notification.createdAt
        }
      });

    } catch (error) {
      console.error('❌ Emergency override error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send emergency notification'
      });
    }
  }

  /**
   * Get notification templates
   * @route GET /api/admin/notifications/templates
   * @access Private (Admin)
   */
  async getNotificationTemplates(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        channel,
        userRole,
        language = 'en',
        isActive,
        search
      } = req.query;

      // Build query
      const query = {};
      
      if (type) query.type = type;
      if (isActive !== undefined) query.isActive = isActive === 'true';
      
      // Search in template name and type
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { type: { $regex: search, $options: 'i' } }
        ];
      }

      // Filter by variant properties
      const variantFilter = {};
      if (channel) variantFilter['variants.channel'] = channel;
      if (userRole) variantFilter['variants.userRole'] = userRole;
      if (language) variantFilter['variants.language'] = language;

      if (Object.keys(variantFilter).length > 0) {
        Object.assign(query, variantFilter);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const templates = await NotificationTemplate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email role')
        .lean();

      const total = await NotificationTemplate.countDocuments(query);

      // Format templates for admin view
      const adminTemplates = templates.map(template => ({
        id: template._id,
        name: template.name,
        type: template.type,
        category: template.category,
        version: template.version,
        isActive: template.isActive,
        variants: template.variants.map(variant => ({
          channel: variant.channel,
          userRole: variant.userRole,
          language: variant.language,
          subject: variant.subject,
          title: variant.title,
          hasBody: !!variant.body,
          hasHtmlBody: !!variant.htmlBody,
          actionCount: variant.actions ? variant.actions.length : 0
        })),
        usage: template.usage,
        createdBy: template.createdBy,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }));

      res.json({
        success: true,
        data: {
          templates: adminTemplates,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          },
          filters: {
            type,
            channel,
            userRole,
            language,
            isActive,
            search
          }
        }
      });

    } catch (error) {
      console.error('❌ Get notification templates error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notification templates'
      });
    }
  }

  /**
   * Create or update notification template
   * @route POST /api/admin/notifications/templates
   * @access Private (Admin)
   */
  async createOrUpdateTemplate(req, res) {
    try {
      const {
        templateId,
        name,
        type,
        category,
        variants,
        isActive = true
      } = req.body;

      // Validate required fields
      if (!name || !type || !variants || !Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name, type, and variants array are required'
        });
      }

      // Validate variants
      for (const variant of variants) {
        if (!variant.channel || !variant.userRole || !variant.language) {
          return res.status(400).json({
            success: false,
            message: 'Each variant must have channel, userRole, and language'
          });
        }

        if (!variant.title && !variant.subject) {
          return res.status(400).json({
            success: false,
            message: 'Each variant must have either title or subject'
          });
        }

        if (!variant.body) {
          return res.status(400).json({
            success: false,
            message: 'Each variant must have body content'
          });
        }
      }

      let template;
      let isUpdate = false;

      if (templateId) {
        // Update existing template
        template = await NotificationTemplate.findById(templateId);
        if (!template) {
          return res.status(404).json({
            success: false,
            message: 'Template not found'
          });
        }
        isUpdate = true;
      } else {
        // Create new template
        template = new NotificationTemplate();
      }

      // Update template data
      template.name = name;
      template.type = type;
      template.category = category || 'administrative';
      template.variants = variants;
      template.isActive = isActive;

      if (!isUpdate) {
        template.version = '1.0.0';
        template.createdBy = req.user.id;
        template.usage = {
          totalSent: 0,
          lastUsed: null,
          averageEngagement: 0
        };
      } else {
        // Increment version for updates
        const versionParts = template.version.split('.').map(Number);
        versionParts[2]++; // Increment patch version
        template.version = versionParts.join('.');
      }

      await template.save();

      console.log(`📝 Admin ${req.user.id} ${isUpdate ? 'updated' : 'created'} notification template: ${template.name}`);

      res.json({
        success: true,
        message: `Template ${isUpdate ? 'updated' : 'created'} successfully`,
        data: {
          templateId: template._id,
          name: template.name,
          type: template.type,
          version: template.version,
          variantCount: template.variants.length,
          isActive: template.isActive
        }
      });

    } catch (error) {
      console.error('❌ Create/update template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save notification template'
      });
    }
  }

  /**
   * Delete notification template
   * @route DELETE /api/admin/notifications/templates/:templateId
   * @access Private (Admin)
   */
  async deleteTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { force = false } = req.query;

      const template = await NotificationTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Check if template is in use
      const notificationsUsingTemplate = await Notification.countDocuments({
        templateId: templateId
      });

      if (notificationsUsingTemplate > 0 && !force) {
        return res.status(400).json({
          success: false,
          message: `Template is used by ${notificationsUsingTemplate} notifications. Use force=true to delete anyway.`,
          data: {
            notificationsUsingTemplate
          }
        });
      }

      await NotificationTemplate.deleteOne({ _id: templateId });

      console.log(`🗑️ Admin ${req.user.id} deleted notification template: ${template.name}`);

      res.json({
        success: true,
        message: 'Template deleted successfully',
        data: {
          templateId,
          templateName: template.name,
          notificationsAffected: notificationsUsingTemplate
        }
      });

    } catch (error) {
      console.error('❌ Delete template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification template'
      });
    }
  }

  /**
   * Get user notification preferences (admin view)
   * @route GET /api/admin/notifications/preferences/:userId
   * @access Private (Admin)
   */
  async getUserPreferences(req, res) {
    try {
      const { userId } = req.params;

      // Verify user exists
      const user = await User.findById(userId).select('name email role').lean();
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get user preferences
      let preferences = await UserNotificationPreferences.findOne({ userId }).lean();
      
      if (!preferences) {
        // Return default preferences if none exist
        preferences = {
          userId,
          globalSettings: {
            enabled: true,
            quietHours: { enabled: false, startTime: '22:00', endTime: '08:00', timezone: 'UTC' },
            frequency: 'immediate'
          },
          channels: {
            websocket: { enabled: true },
            email: { enabled: true, frequency: 'immediate' },
            sms: { enabled: true, emergencyOnly: false }
          },
          categories: {
            medical: { enabled: true, channels: ['websocket', 'email'], priority: 'all' },
            administrative: { enabled: true, channels: ['websocket', 'email'], priority: 'high' },
            system: { enabled: true, channels: ['websocket'], priority: 'critical' },
            marketing: { enabled: false, channels: [], priority: 'all' }
          },
          notificationTypes: {},
          contactInfo: {
            email: user.email,
            phone: '',
            preferredLanguage: 'en'
          }
        };
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          preferences,
          lastUpdated: preferences.updatedAt
        }
      });

    } catch (error) {
      console.error('❌ Get user preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user preferences'
      });
    }
  }

  /**
   * Update user notification preferences (admin override)
   * @route PUT /api/admin/notifications/preferences/:userId
   * @access Private (Admin)
   */
  async updateUserPreferences(req, res) {
    try {
      const { userId } = req.params;
      const { preferences, reason } = req.body;

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!preferences) {
        return res.status(400).json({
          success: false,
          message: 'Preferences object is required'
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Reason for admin override is required'
        });
      }

      // Update preferences with admin override metadata
      const updatedPreferences = await UserNotificationPreferences.findOneAndUpdate(
        { userId },
        {
          ...preferences,
          adminOverride: {
            overriddenBy: req.user.id,
            overriddenAt: new Date(),
            reason,
            originalPreferences: preferences // Store what was changed
          }
        },
        { upsert: true, new: true }
      );

      console.log(`⚙️ Admin ${req.user.id} updated notification preferences for user ${userId}. Reason: ${reason}`);

      res.json({
        success: true,
        message: 'User notification preferences updated successfully',
        data: {
          userId,
          preferences: updatedPreferences,
          adminOverride: updatedPreferences.adminOverride
        }
      });

    } catch (error) {
      console.error('❌ Update user preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user preferences'
      });
    }
  }

  /**
   * Helper methods
   */

  /**
   * Calculate date range based on period
   */
  calculateDateRange(period, startDate, endDate) {
    if (startDate && endDate) {
      return {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };
    }

    const now = new Date();
    let start;

    switch (period) {
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: start,
      endDate: now
    };
  }

  /**
   * Extract failure reasons from recipients
   */
  extractFailureReasons(recipients) {
    const reasons = [];
    
    for (const recipient of recipients) {
      for (const [channel, status] of Object.entries(recipient.deliveryStatus)) {
        if (status.status === 'failed' && status.error) {
          reasons.push({
            channel,
            error: status.error,
            userId: recipient.userId
          });
        }
      }
    }

    return reasons;
  }
}

export default AdminNotificationController;