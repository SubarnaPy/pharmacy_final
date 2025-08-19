import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import Pharmacy from '../../models/Pharmacy.js';

/**
 * Chat Notification Service
 * Handles notifications for chat messages between patients and pharmacies
 */
class ChatNotificationService {
  constructor(webSocketService = null) {
    this.webSocketService = webSocketService;
  }

  /**
   * Create notification for new chat message
   * @param {Object} params - Notification parameters
   */
  async createMessageNotification({
    messageId,
    conversationId,
    senderId,
    senderName,
    senderRole,
    recipientId,
    recipientRole,
    content,
    prescriptionRequestNumber = null
  }) {
    try {
      // Don't create notification for self
      if (senderId === recipientId) {
        return null;
      }

      // Create notification
      const notification = new Notification({
        userId: recipientId,
        type: 'new_message',
        title: this.getNotificationTitle(senderRole, senderName),
        message: this.getNotificationMessage(content, prescriptionRequestNumber),
        data: {
          messageId,
          conversationId,
          senderId,
          senderName,
          senderRole,
          prescriptionRequestNumber,
          messagePreview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
        },
        priority: 'normal',
        channels: ['web', 'push'],
        status: 'pending'
      });

      await notification.save();

      // Send real-time notification via WebSocket
      if (this.webSocketService) {
        await this.sendRealTimeNotification(recipientId, notification);
      }

      // Update conversation unread count
      await this.updateConversationUnreadCount(conversationId, recipientId);

      console.log(`✅ Chat notification created for user ${recipientId}`);
      return notification;

    } catch (error) {
      console.error('❌ Error creating chat notification:', error);
      throw error;
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  async sendRealTimeNotification(userId, notification) {
    try {
      if (!this.webSocketService) return;

      const notificationData = {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: notification.createdAt,
        priority: notification.priority
      };

      // Send to user's personal room
      this.webSocketService.getIO().to(`user_${userId}`).emit('new_chat_notification', notificationData);

      // Also emit to conversation notifications
      this.webSocketService.getIO().to(`conversation_${notification.data.conversationId}`).emit('conversation_notification', {
        conversationId: notification.data.conversationId,
        hasNewMessage: true,
        lastMessagePreview: notification.data.messagePreview,
        senderName: notification.data.senderName
      });

    } catch (error) {
      console.error('❌ Error sending real-time notification:', error);
    }
  }

  /**
   * Update conversation unread count
   */
  async updateConversationUnreadCount(conversationId, userId) {
    try {
      // This could be stored in a separate ConversationMember model
      // For now, we'll emit an event to update the frontend
      if (this.webSocketService) {
        this.webSocketService.getIO().to(`user_${userId}`).emit('conversation_unread_update', {
          conversationId,
          increment: 1
        });
      }
    } catch (error) {
      console.error('❌ Error updating conversation unread count:', error);
    }
  }

  /**
   * Mark conversation messages as read
   */
  async markConversationAsRead(conversationId, userId) {
    try {
      // Mark all message notifications for this conversation as read
      await Notification.updateMany(
        {
          userId,
          type: 'new_message',
          'data.conversationId': conversationId,
          status: { $ne: 'read' }
        },
        {
          status: 'read',
          readAt: new Date()
        }
      );

      // Send real-time update
      if (this.webSocketService) {
        this.webSocketService.getIO().to(`user_${userId}`).emit('conversation_unread_update', {
          conversationId,
          unreadCount: 0
        });
      }

      console.log(`✅ Marked conversation ${conversationId} as read for user ${userId}`);
    } catch (error) {
      console.error('❌ Error marking conversation as read:', error);
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadMessageCount(userId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        type: 'new_message',
        status: { $ne: 'read' }
      });

      return count;
    } catch (error) {
      console.error('❌ Error getting unread message count:', error);
      return 0;
    }
  }

  /**
   * Get unread messages by conversation
   */
  async getUnreadMessagesByConversation(userId) {
    try {
      const notifications = await Notification.aggregate([
        {
          $match: {
            userId,
            type: 'new_message',
            status: { $ne: 'read' }
          }
        },
        {
          $group: {
            _id: '$data.conversationId',
            count: { $sum: 1 },
            lastMessage: { $last: '$data.messagePreview' },
            lastSender: { $last: '$data.senderName' },
            lastTimestamp: { $last: '$createdAt' }
          }
        }
      ]);

      const result = {};
      notifications.forEach(notif => {
        result[notif._id] = {
          unreadCount: notif.count,
          lastMessage: notif.lastMessage,
          lastSender: notif.lastSender,
          lastTimestamp: notif.lastTimestamp
        };
      });

      return result;
    } catch (error) {
      console.error('❌ Error getting unread messages by conversation:', error);
      return {};
    }
  }

  /**
   * Get notification title based on sender role
   */
  getNotificationTitle(senderRole, senderName) {
    switch (senderRole) {
      case 'pharmacy':
        return `New message from ${senderName}`;
      case 'patient':
        return `New message from patient ${senderName}`;
      default:
        return `New message from ${senderName}`;
    }
  }

  /**
   * Get notification message
   */
  getNotificationMessage(content, prescriptionRequestNumber) {
    let message = content.length > 50 ? content.substring(0, 50) + '...' : content;
    
    if (prescriptionRequestNumber) {
      message += ` (Prescription: ${prescriptionRequestNumber})`;
    }

    return message;
  }

  /**
   * Clean up old notifications (call this periodically)
   */
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        type: 'new_message',
        createdAt: { $lt: cutoffDate }
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old chat notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up old notifications:', error);
      return 0;
    }
  }
}

export default ChatNotificationService;
