import Notification from '../models/Notification.js';
import UserNotificationPreferences from '../models/UserNotificationPreferences.js';
import User from '../models/User.js';
import EnhancedNotificationService from '../services/notifications/EnhancedNotificationService.js';
import mongoose from 'mongoose';

/**
 * Notification Controller
 * Handles user-facing notification APIs
 */
class NotificationController {
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
   * Get user notifications with pagination and filtering
   * @route GET /api/notifications
   * @access Private
   */
  async getUserNotifications(req, res) {
    try {
      // Handle both _id and id properties, and userId from token payload
      const userId = req.user._id || req.user.id || req.user.userId;
      console.log('🔍 Getting notifications for user ID:', userId);
      
      const {
        page = 1,
        limit = 20,
        type,
        category,
        priority,
        status,
        unreadOnly = false,
        startDate,
        endDate,
        search
      } = req.query;

      // Build query - handle both old structure (userId) and new structure (recipients.userId)
      const query = {
        $or: [
          { userId: userId },
          { 'recipients.userId': userId }
        ]
      };

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
          { 'content.message': { $regex: search, $options: 'i' } }
        ];
      }

      // Unread only filter
      if (unreadOnly === 'true') {
        query['recipients.readAt'] = { $exists: false };
      }

      // Status filter (for delivery status)
      if (status) {
        const statusQuery = {};
        statusQuery[`recipients.deliveryStatus.websocket.status`] = status;
        query.$or = query.$or || [];
        query.$or.push(statusQuery);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query with population
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email role')
        .populate('relatedEntities.entityId')
        .lean();

      const total = await Notification.countDocuments(query);

      // Format notifications for the user
      const userNotifications = notifications.map(notification => {
        const userRecipient = notification.recipients.find(r => 
          r.userId.toString() === userId
        );

        return {
          id: notification._id,
          type: notification.type,
          category: notification.category,
          priority: notification.priority,
          title: notification.content?.title || 'Notification',
          message: notification.content?.message || '',
          actionUrl: notification.content?.actionUrl,
          actionText: notification.content?.actionText,
          content: notification.content,
          createdAt: notification.createdAt,
          expiresAt: notification.expiresAt,
          relatedEntities: notification.relatedEntities,
          deliveryStatus: userRecipient?.deliveryStatus || {},
          readAt: userRecipient?.readAt,
          isRead: !!userRecipient?.readAt,
          actionTaken: userRecipient?.actionTaken,
          createdBy: notification.createdBy ? {
            id: notification.createdBy._id,
            name: notification.createdBy.name,
            role: notification.createdBy.role
          } : null
        };
      });

      // Calculate summary statistics
      const unreadCount = await Notification.countDocuments({
        'recipients.userId': userId,
        'recipients.readAt': { $exists: false }
      });

      const priorityStats = await Notification.aggregate([
        { $match: { 'recipients.userId': userId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);

      res.json({
        success: true,
        data: {
          notifications: userNotifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          },
          summary: {
            unreadCount,
            totalCount: total,
            priorityStats: priorityStats.reduce((acc, stat) => {
              acc[stat._id] = stat.count;
              return acc;
            }, {})
          }
        }
      });

    } catch (error) {
      console.error('❌ Get user notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notifications'
      });
    }
  }

  /**
   * Get single notification details
   * @route GET /api/notifications/:notificationId
   * @access Private
   */
  async getNotificationById(req, res) {
    try {
  const { notificationId } = req.params;
  // Defensive validation: ensure provided id is a valid Mongo ObjectId
  // This prevents Mongoose CastError when invalid strings (like 'user') are passed
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification id'
        });
      }
      const userId = req.user.id;

      const notification = await Notification.findOne({
        _id: notificationId,
        'recipients.userId': userId
      })
        .populate('createdBy', 'name email role')
        .populate('relatedEntities.entityId')
        .lean();

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      // Get user's recipient data
      const userRecipient = notification.recipients.find(r => 
        r.userId.toString() === userId
      );

      const formattedNotification = {
        id: notification._id,
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
        content: notification.content,
        contextData: notification.contextData,
        relatedEntities: notification.relatedEntities,
        createdAt: notification.createdAt,
        expiresAt: notification.expiresAt,
        deliveryStatus: userRecipient?.deliveryStatus || {},
        readAt: userRecipient?.readAt,
        actionTaken: userRecipient?.actionTaken,
        createdBy: notification.createdBy ? {
          id: notification.createdBy._id,
          name: notification.createdBy.name,
          role: notification.createdBy.role
        } : null
      };

      res.json({
        success: true,
        data: formattedNotification
      });

    } catch (error) {
      console.error('❌ Get notification by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notification'
      });
    }
  }

  /**
   * Mark notification as read
   * @route POST /api/notifications/:notificationId/read
   * @access Private
   */
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOne({
        _id: notificationId,
        'recipients.userId': userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      // Find and update the user's recipient record
      const recipient = notification.recipients.find(r => 
        r.userId.toString() === userId
      );

      if (recipient && !recipient.readAt) {
        recipient.readAt = new Date();
        
        // Update analytics
        notification.analytics.readCount++;
        
        await notification.save();

        // Emit event for analytics
        if (this.notificationService) {
          this.notificationService.emit('notificationRead', {
            notificationId,
            userId,
            timestamp: recipient.readAt
          });
        }

        console.log(`📖 Notification ${notificationId} marked as read by user ${userId}`);
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: {
          readAt: recipient?.readAt
        }
      });

    } catch (error) {
      console.error('❌ Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  }

  /**
   * Mark multiple notifications as read
   * @route POST /api/notifications/mark-read
   * @access Private
   */
  async markMultipleAsRead(req, res) {
    try {
      const { notificationIds } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification IDs provided'
        });
      }

      const readAt = new Date();
      const results = [];

      // Process each notification
      for (const notificationId of notificationIds) {
        try {
          const notification = await Notification.findOne({
            _id: notificationId,
            'recipients.userId': userId
          });

          if (notification) {
            const recipient = notification.recipients.find(r => 
              r.userId.toString() === userId
            );

            if (recipient && !recipient.readAt) {
              recipient.readAt = readAt;
              notification.analytics.readCount++;
              await notification.save();

              results.push({
                notificationId,
                success: true,
                readAt
              });

              // Emit event for analytics
              if (this.notificationService) {
                this.notificationService.emit('notificationRead', {
                  notificationId,
                  userId,
                  timestamp: readAt
                });
              }
            } else {
              results.push({
                notificationId,
                success: true,
                readAt: recipient?.readAt,
                message: 'Already read'
              });
            }
          } else {
            results.push({
              notificationId,
              success: false,
              message: 'Notification not found'
            });
          }
        } catch (error) {
          results.push({
            notificationId,
            success: false,
            message: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      res.json({
        success: true,
        message: `${successCount} notifications marked as read`,
        data: {
          results,
          summary: {
            total: notificationIds.length,
            successful: successCount,
            failed: notificationIds.length - successCount
          }
        }
      });

    } catch (error) {
      console.error('❌ Mark multiple notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notifications as read'
      });
    }
  }

  /**
   * Mark all notifications as read
   * @route POST /api/notifications/mark-all-read
   * @access Private
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const readAt = new Date();

      // Update all unread notifications for the user
      const result = await Notification.updateMany(
        {
          'recipients.userId': userId,
          'recipients.readAt': { $exists: false }
        },
        {
          $set: {
            'recipients.$.readAt': readAt
          },
          $inc: {
            'analytics.readCount': 1
          }
        }
      );

      console.log(`📖 Marked ${result.modifiedCount} notifications as read for user ${userId}`);

      res.json({
        success: true,
        message: `${result.modifiedCount} notifications marked as read`,
        data: {
          markedCount: result.modifiedCount,
          readAt
        }
      });

    } catch (error) {
      console.error('❌ Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read'
      });
    }
  }

  /**
   * Record notification action
   * @route POST /api/notifications/:notificationId/action
   * @access Private
   */
  async recordAction(req, res) {
    try {
      const { notificationId } = req.params;
      const { action, metadata } = req.body;
      const userId = req.user.id;

      if (!action) {
        return res.status(400).json({
          success: false,
          message: 'Action is required'
        });
      }

      const notification = await Notification.findOne({
        _id: notificationId,
        'recipients.userId': userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      // Find and update the user's recipient record
      const recipient = notification.recipients.find(r => 
        r.userId.toString() === userId
      );

      if (recipient) {
        recipient.actionTaken = {
          action,
          takenAt: new Date(),
          metadata
        };

        // Mark as read if not already read
        if (!recipient.readAt) {
          recipient.readAt = new Date();
          notification.analytics.readCount++;
        }

        // Update analytics
        notification.analytics.actionCount++;
        
        await notification.save();

        // Emit event for analytics
        if (this.notificationService) {
          this.notificationService.emit('notificationAction', {
            notificationId,
            userId,
            action,
            timestamp: recipient.actionTaken.takenAt,
            metadata
          });
        }

        console.log(`🎯 Action '${action}' recorded for notification ${notificationId} by user ${userId}`);
      }

      res.json({
        success: true,
        message: 'Action recorded successfully',
        data: {
          action: recipient?.actionTaken
        }
      });

    } catch (error) {
      console.error('❌ Record notification action error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record notification action'
      });
    }
  }

  /**
   * Delete notification (soft delete - mark as dismissed)
   * @route DELETE /api/notifications/:notificationId
   * @access Private
   */
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOne({
        _id: notificationId,
        'recipients.userId': userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      // Find and update the user's recipient record
      const recipient = notification.recipients.find(r => 
        r.userId.toString() === userId
      );

      if (recipient) {
        recipient.actionTaken = {
          action: 'dismissed',
          takenAt: new Date()
        };

        // Mark as read if not already read
        if (!recipient.readAt) {
          recipient.readAt = new Date();
          notification.analytics.readCount++;
        }

        await notification.save();

        console.log(`🗑️ Notification ${notificationId} dismissed by user ${userId}`);
      }

      res.json({
        success: true,
        message: 'Notification dismissed successfully'
      });

    } catch (error) {
      console.error('❌ Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to dismiss notification'
      });
    }
  }

  /**
   * Get notification statistics for user
   * @route GET /api/notifications/stats
   * @access Private
   */
  async getNotificationStats(req, res) {
    try {
      const userId = req.user.id;
      const { period = '7d' } = req.query;

      // Calculate date range based on period
      let startDate;
      const endDate = new Date();

      switch (period) {
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }

      // Get overall statistics
      const totalNotifications = await Notification.countDocuments({
        'recipients.userId': userId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const unreadNotifications = await Notification.countDocuments({
        'recipients.userId': userId,
        'recipients.readAt': { $exists: false },
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const actionedNotifications = await Notification.countDocuments({
        'recipients.userId': userId,
        'recipients.actionTaken': { $exists: true },
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Get statistics by category
      const categoryStats = await Notification.aggregate([
        {
          $match: {
            'recipients.userId': userId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            unread: {
              $sum: {
                $cond: [
                  { $not: { $ifNull: ['$recipients.readAt', false] } },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      // Get statistics by priority
      const priorityStats = await Notification.aggregate([
        {
          $match: {
            'recipients.userId': userId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get daily activity (for charts)
      const dailyActivity = await Notification.aggregate([
        {
          $match: {
            'recipients.userId': userId,
            createdAt: { $gte: startDate, $lte: endDate }
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
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      res.json({
        success: true,
        data: {
          period,
          dateRange: {
            startDate,
            endDate
          },
          summary: {
            total: totalNotifications,
            unread: unreadNotifications,
            read: totalNotifications - unreadNotifications,
            actioned: actionedNotifications,
            readRate: totalNotifications > 0 ? ((totalNotifications - unreadNotifications) / totalNotifications * 100).toFixed(1) : 0,
            actionRate: totalNotifications > 0 ? (actionedNotifications / totalNotifications * 100).toFixed(1) : 0
          },
          categoryBreakdown: categoryStats.reduce((acc, stat) => {
            acc[stat._id] = {
              total: stat.count,
              unread: stat.unread,
              read: stat.count - stat.unread
            };
            return acc;
          }, {}),
          priorityBreakdown: priorityStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          dailyActivity: dailyActivity.map(day => ({
            date: day._id,
            count: day.count
          }))
        }
      });

    } catch (error) {
      console.error('❌ Get notification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve notification statistics'
      });
    }
  }

  /**
   * Search notifications
   * @route GET /api/notifications/search
   * @access Private
   */
  async searchNotifications(req, res) {
    try {
      const userId = req.user.id;
      const {
        q: query,
        page = 1,
        limit = 20,
        type,
        category,
        priority,
        startDate,
        endDate
      } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      // Build search query
      const searchQuery = {
        'recipients.userId': userId,
        $or: [
          { 'content.title': { $regex: query, $options: 'i' } },
          { 'content.message': { $regex: query, $options: 'i' } },
          { type: { $regex: query, $options: 'i' } }
        ]
      };

      // Add additional filters
      if (type) searchQuery.type = type;
      if (category) searchQuery.category = category;
      if (priority) searchQuery.priority = priority;

      if (startDate || endDate) {
        searchQuery.createdAt = {};
        if (startDate) searchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) searchQuery.createdAt.$lte = new Date(endDate);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const notifications = await Notification.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email role')
        .lean();

      const total = await Notification.countDocuments(searchQuery);

      // Format notifications for the user
      const userNotifications = notifications.map(notification => {
        const userRecipient = notification.recipients.find(r => 
          r.userId.toString() === userId
        );

        return {
          id: notification._id,
          type: notification.type,
          category: notification.category,
          priority: notification.priority,
          content: notification.content,
          createdAt: notification.createdAt,
          deliveryStatus: userRecipient?.deliveryStatus || {},
          readAt: userRecipient?.readAt,
          actionTaken: userRecipient?.actionTaken,
          // Highlight search matches
          relevanceScore: this.calculateRelevanceScore(notification, query)
        };
      });

      res.json({
        success: true,
        data: {
          query,
          notifications: userNotifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('❌ Search notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search notifications'
      });
    }
  }

  /**
   * Calculate relevance score for search results
   * @param {Object} notification - Notification object
   * @param {string} query - Search query
   * @returns {number} - Relevance score
   */
  calculateRelevanceScore(notification, query) {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Title match (highest weight)
    if (notification.content.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Message match (medium weight)
    if (notification.content.message.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Type match (low weight)
    if (notification.type.toLowerCase().includes(queryLower)) {
      score += 2;
    }

    // Priority boost
    if (notification.priority === 'critical' || notification.priority === 'emergency') {
      score += 3;
    }

    // Recent notifications boost
    const daysSinceCreated = (Date.now() - new Date(notification.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 1) score += 2;
    else if (daysSinceCreated < 7) score += 1;

    return score;
  }
}

export default NotificationController;