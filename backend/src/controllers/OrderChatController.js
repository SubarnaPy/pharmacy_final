import OrderChat from '../models/OrderChat.js';
import { Order } from '../models/Order.js';
import User from '../models/User.js';
import notificationService from '../services/NotificationService.js';

/**
 * Order Chat Controller - New unified chat system for patient-pharmacy communication
 * Handles chat functionality for orders with shared rooms
 */
class OrderChatController {
  constructor() {
    this.notificationService = notificationService;
  }

  /**
   * Get or create order chat for a specific order
   * @route GET /api/v1/order-chat/:orderId
   */
  getOrderChat = async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      console.log('🔍 Getting order chat for order:', orderId, 'user:', userId);

      // Find existing order chat
      let orderChat = await OrderChat.findByOrderId(orderId);

      if (!orderChat) {
        console.log('📝 Order chat not found, creating new one...');

        // Get order details to create chat
        const order = await Order.findById(orderId)
          .populate('patientId', 'name email profile')
          .populate('pharmacyId', 'name contact owner');

        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

        // Check if user is authorized (must be patient or pharmacy owner)
        const isPatient = order.patientId._id.toString() === userId;
        const isPharmacyOwner = order.pharmacyId.owner.toString() === userId;

        if (!isPatient && !isPharmacyOwner) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this order chat'
          });
        }

        // Create new order chat
        orderChat = await OrderChat.createOrderChat({
          orderId: order._id,
          orderNumber: order.orderNumber,
          patientId: order.patientId._id,
          pharmacyId: order.pharmacyId._id,
          pharmacyUserId: order.pharmacyId.owner,
          status: order.status
        });

        console.log('✅ Created new order chat:', orderChat.roomId);
      } else {
        console.log('✅ Found existing order chat:', orderChat.roomId);

        // Check if user is authorized
        const isParticipant = orderChat.participants.some(p =>
          p.userId.toString() === userId
        );

        if (!isParticipant) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this order chat'
          });
        }
      }

      // Get recent messages
      const recentMessages = orderChat.getRecentMessages(50);

      // Calculate unread count for this user
      const unreadCount = orderChat.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          orderChat: {
            _id: orderChat._id,
            roomId: orderChat.roomId,
            orderId: orderChat.orderId,
            orderInfo: orderChat.orderInfo,
            participants: orderChat.participants,
            messages: recentMessages,
            unreadCount,
            lastActivity: orderChat.lastActivity,
            isActive: orderChat.isActive
          }
        }
      });

    } catch (error) {
      console.error('❌ Get order chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order chat',
        error: error.message
      });
    }
  };

  /**
   * Send a message in the order chat
   * @route POST /api/v1/order-chat/:orderId/messages
   */
  sendMessage = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { content, type = 'text', metadata = {} } = req.body;
      const userId = req.user.id;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }

      console.log('📨 Sending message to order chat:', orderId, 'from user:', userId);

      // Find order chat
      const orderChat = await OrderChat.findByOrderId(orderId);
      if (!orderChat) {
        return res.status(404).json({
          success: false,
          message: 'Order chat not found'
        });
      }

      // Check if user is participant
      const participant = orderChat.participants.find(p =>
        p.userId.toString() === userId
      );

      if (!participant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order chat'
        });
      }

      // Create message
      const messageData = {
        senderId: userId,
        senderRole: participant.role,
        content,
        type,
        metadata,
        timestamp: new Date(),
        readBy: [{
          userId: userId,
          readAt: new Date()
        }]
      };

      // Add message to chat
      const updatedChat = await orderChat.addMessage(messageData);

      // Get the newly added message
      const newMessage = updatedChat.messages[updatedChat.messages.length - 1];

      // Send real-time notification via WebSocket
      const chatSocketService = req.app.get('chatSocketService');
      if (chatSocketService) {
        const messageDataForSocket = {
          id: newMessage._id,
          roomId: orderChat.roomId,
          sender: {
            id: userId,
            name: req.user.name || 'User',
            avatar: req.user.avatar,
            role: participant.role
          },
          content: newMessage.content,
          type: newMessage.type,
          metadata: newMessage.metadata,
          timestamp: newMessage.timestamp,
          readBy: newMessage.readBy,
          edited: newMessage.isEdited
        };

        // Broadcast to the order chat room
        chatSocketService.getIO().to(orderChat.roomId).emit('new_message', messageDataForSocket);

        // Also emit to each participant's personal channel
        for (const participant of orderChat.participants) {
          const participantId = participant.userId.toString();
          if (participantId !== userId) {
            chatSocketService.getIO().to(`user_${participantId}`).emit('new_message', messageDataForSocket);
          }
        }
      }

      // Send push notification to other participant
      const otherParticipant = orderChat.participants.find(p =>
        p.userId.toString() !== userId
      );

      if (otherParticipant) {
        await this.notificationService.sendPushNotification(
          otherParticipant.userId,
          'New message in order chat',
          content.substring(0, 100),
          {
            orderId: orderId,
            roomId: orderChat.roomId,
            senderId: userId,
            senderRole: participant.role
          }
        );
      }

      res.status(201).json({
        success: true,
        data: {
          message: newMessage,
          orderChat: {
            _id: updatedChat._id,
            roomId: updatedChat.roomId,
            lastActivity: updatedChat.lastActivity
          }
        }
      });

    } catch (error) {
      console.error('❌ Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message
      });
    }
  };

  /**
   * Get messages for an order chat
   * @route GET /api/v1/order-chat/:orderId/messages
   */
  getMessages = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { limit = 50, page = 1 } = req.query;
      const userId = req.user.id;

      console.log('📋 Getting messages for order chat:', orderId, 'user:', userId);

      // Find order chat
      const orderChat = await OrderChat.findByOrderId(orderId);
      if (!orderChat) {
        return res.status(404).json({
          success: false,
          message: 'Order chat not found'
        });
      }

      // Check if user is participant
      const isParticipant = orderChat.participants.some(p =>
        p.userId.toString() === userId
      );

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order chat'
        });
      }

      // Get messages
      const allMessages = orderChat.getRecentMessages(parseInt(limit));
      const totalMessages = orderChat.messages.length;
      const unreadCount = orderChat.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          messages: allMessages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalMessages
          },
          unreadCount
        }
      });

    } catch (error) {
      console.error('❌ Get messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get messages',
        error: error.message
      });
    }
  };

  /**
   * Mark order chat as read
   * @route POST /api/v1/order-chat/:orderId/read
   */
  markAsRead = async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      console.log('👁️ Marking order chat as read:', orderId, 'user:', userId);

      // Find order chat
      const orderChat = await OrderChat.findByOrderId(orderId);
      if (!orderChat) {
        return res.status(404).json({
          success: false,
          message: 'Order chat not found'
        });
      }

      // Check if user is participant
      const isParticipant = orderChat.participants.some(p =>
        p.userId.toString() === userId
      );

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order chat'
        });
      }

      // Mark as read
      await orderChat.markAsRead(userId);

      const updatedUnreadCount = orderChat.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          markedCount: orderChat.messages.length,
          unreadCount: updatedUnreadCount
        }
      });

    } catch (error) {
      console.error('❌ Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark chat as read',
        error: error.message
      });
    }
  };

  /**
   * Get user's order chats
   * @route GET /api/v1/order-chat/user/conversations
   */
  getUserOrderChats = async (req, res) => {
    try {
      const userId = req.user.id;
      const { status, limit = 50, page = 1 } = req.query;

      console.log('📂 Getting user order chats for user:', userId);

      // Find all order chats where user is a participant
      const query = {
        'participants.userId': userId,
        isActive: true
      };

      const orderChats = await OrderChat.find(query)
        .populate('orderInfo.patientId', 'name profile')
        .sort({ lastActivity: -1 })
        .limit(parseInt(limit));

      // Format response
      const conversations = orderChats.map(chat => {
        const userParticipant = chat.participants.find(p =>
          p.userId.toString() === userId
        );

        const otherParticipant = chat.participants.find(p =>
          p.userId.toString() !== userId
        );

        const unreadCount = chat.getUnreadCount(userId);
        const lastMessage = chat.messages.length > 0 ?
          chat.messages[chat.messages.length - 1] : null;

        return {
          _id: chat._id,
          roomId: chat.roomId,
          orderId: chat.orderId,
          orderInfo: chat.orderInfo,
          userRole: userParticipant?.role,
          otherParticipant: otherParticipant,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            timestamp: lastMessage.timestamp,
            sender: lastMessage.senderRole
          } : null,
          unreadCount,
          lastActivity: chat.lastActivity,
          isActive: chat.isActive
        };
      });

      res.json({
        success: true,
        data: {
          conversations,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: conversations.length
          }
        }
      });

    } catch (error) {
      console.error('❌ Get user order chats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order chats',
        error: error.message
      });
    }
  };

  /**
   * Get order chat statistics
   * @route GET /api/v1/order-chat/stats
   */
  getOrderChatStats = async (req, res) => {
    try {
      const userId = req.user.id;

      console.log('📊 Getting order chat stats for user:', userId);

      // Get user's order chats
      const userChats = await OrderChat.find({
        'participants.userId': userId,
        isActive: true
      });

      // Calculate stats
      const totalChats = userChats.length;
      const totalUnread = userChats.reduce((sum, chat) =>
        sum + chat.getUnreadCount(userId), 0
      );

      const activeChats = userChats.filter(chat =>
        chat.messages.length > 1 // Has more than just the welcome message
      ).length;

      res.json({
        success: true,
        data: {
          totalChats,
          activeChats,
          totalUnread,
          recentActivity: userChats.length > 0 ?
            Math.max(...userChats.map(chat => new Date(chat.lastActivity))) : null
        }
      });

    } catch (error) {
      console.error('❌ Get order chat stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get chat stats',
        error: error.message
      });
    }
  };
}

export default OrderChatController;
