import ChatRoomManager from '../services/chat/ChatRoomManager.js';
try {
  console.log('✅ ChatRoomManager imported successfully');
} catch (error) {
  console.error('❌ Failed to import ChatRoomManager:', error);
}
import MessageService from '../services/chat/MessageService.js';
import ChatNotificationService from '../services/chat/ChatNotificationService.js';
import PrescriptionRequest from '../models/PrescriptionRequest.js';
import { Order } from '../models/Order.js';
import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import notificationService from '../services/NotificationService.js';

/**
 * Patient-Pharmacy Conversation Controller
 * Handles chat conversations between patients and pharmacies
 */
class ConversationController {
  constructor() {
    this.chatRoomManager = new ChatRoomManager();
    this.messageService = new MessageService();
    this.notificationService = notificationService;
    this.chatNotificationService = new ChatNotificationService();
  }

  /**
   * Get conversations for current user (patient or pharmacy)
   * @route GET /api/v1/chat/conversations
   */
  getConversations = async (req, res) => {
    console.log('🔍 GET /conversations called for user:', req.user?.id, 'role:', req.user?.role);
    try {
      const { role, id: userId } = req.user;
      const { status, limit = 50, page = 1 } = req.query;

      let conversations = [];

      if (role === 'patient') {
        // Get patient conversations
        conversations = await this.getPatientConversations(userId, { status, limit, page });
      } else if (role === 'pharmacy') {
        // Get pharmacy conversations
        conversations = await this.getPharmacyConversations(userId, { status, limit, page });
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only patients and pharmacies can access conversations.'
        });
      }

      console.log('✅ Found conversations:', conversations.length);
      res.json({
        success: true,
        data: conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: conversations.length
        }
      });

    } catch (error) {
      console.error('❌ Get conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversations',
        error: error.message
      });
    }
  };

  /**
   * Get messages for a specific conversation
   * @route GET /api/v1/chat/conversations/:conversationId/messages
   */
  getConversationMessages = async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { limit = 50, page = 1, fromDate, toDate } = req.query;
      const userId = req.user.id;

      // Validate conversation access
      const hasAccess = await this.chatRoomManager.validateRoomAccess(conversationId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      // Get messages
      const messages = await this.messageService.getRoomMessages(conversationId, {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        fromDate,
        toDate
      });

      // Mark messages as read
      await this.messageService.markRoomAsRead(conversationId, userId);

      res.json({
        success: true,
        data: messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('❌ Get conversation messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch messages',
        error: error.message
      });
    }
  };

  /**
   * Send a message in a conversation
   * @route POST /api/v1/chat/messages
   */
  sendMessage = async (req, res) => {
    try {
      const { conversationId, content, type = 'text', metadata = {} } = req.body;
      const userId = req.user.id;

      if (!conversationId || !content) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID and content are required'
        });
      }

      // Validate conversation access
      const hasAccess = await this.chatRoomManager.validateRoomAccess(conversationId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      // Create message
      const message = await this.messageService.createMessage({
        roomId: conversationId,
        senderId: userId,
        content,
        type,
        metadata
      });

      // Get populated message
      const populatedMessage = await this.messageService.getMessageById(message._id);

      // Send real-time notification via WebSocket
      const chatSocketService = req.app.get('chatSocketService');
      if (chatSocketService) {
        // Initialize chat notification service with websocket
        this.chatNotificationService = new ChatNotificationService(chatSocketService);
        
        const messageData = {
          id: populatedMessage._id,
          roomId: conversationId,
          sender: {
            id: populatedMessage.senderId._id,
            name: populatedMessage.senderId.name || 'User',
            avatar: populatedMessage.senderId.avatar,
            role: populatedMessage.senderId.role
          },
          content: populatedMessage.content,
          type: populatedMessage.type,
          metadata: populatedMessage.metadata,
          timestamp: populatedMessage.createdAt,
          readBy: populatedMessage.readBy,
          edited: populatedMessage.isEdited
        };

        // Broadcast to the conversation room
        chatSocketService.getIO().to(conversationId).emit('new_message', messageData);

        // Additionally, emit to each participant's personal channel to avoid missed echoes
        try {
          const room = await this.chatRoomManager.getRoomById(conversationId);
          if (room && Array.isArray(room.participants)) {
            for (const participant of room.participants) {
              const participantId = participant?.userId?._id?.toString?.() || participant?.id || participant?._id?.toString?.();
              if (!participantId) continue;
              chatSocketService.getIO().to(`user_${participantId}`).emit('new_message', messageData);
            }
          }
        } catch (e) {
          console.error('⚠️ Failed emitting to participant channels:', e?.message || e);
        }
      }

      // Send enhanced notification to conversation participants
      await this.sendEnhancedMessageNotification(conversationId, populatedMessage, userId);

      res.status(201).json({
        success: true,
        data: populatedMessage
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
   * Mark conversation as read
   * @route POST /api/v1/chat/conversations/:conversationId/read
   */
  markAsRead = async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      // Validate conversation access
      const hasAccess = await this.chatRoomManager.validateRoomAccess(conversationId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      // Mark conversation messages as read using enhanced notification service
      if (this.chatNotificationService) {
        await this.chatNotificationService.markConversationAsRead(conversationId, userId);
      }

      // Mark all messages as read
      const result = await this.messageService.markRoomAsRead(conversationId, userId);

      res.json({
        success: true,
        markedCount: result.modifiedCount
      });

    } catch (error) {
      console.error('❌ Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark conversation as read',
        error: error.message
      });
    }
  };

  /**
   * Create conversation when order is confirmed
   * @route POST /api/v1/chat/conversations/order
   */
  createOrderConversation = async (req, res) => {
    try {
      const { orderId } = req.body;
      const userId = req.user.id;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      // Get order details
      const order = await Order.findById(orderId)
        .populate('patientId', 'name email profile')
        .populate('pharmacyId', 'name contact owner');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if conversation already exists (by orderId or orderNumber)
      let existingRoom = await this.chatRoomManager.ChatRoom.findOne({
        type: 'order',
        isActive: true,
        $or: [
          { 'metadata.orderId': orderId },
          { 'metadata.orderId': order._id },
          { 'metadata.orderNumber': order.orderNumber }
        ]
      });

      if (existingRoom) {
        return res.json({
          success: true,
          data: existingRoom,
          message: 'Order conversation already exists'
        });
      }

      // Create order chat room
      const room = await this.chatRoomManager.createRoom({
        name: `Order ${order.orderNumber}`,
        type: 'order',
        createdBy: userId,
        participants: [order.patientId._id, order.pharmacyId.owner],
        description: `Chat for order ${order.orderNumber}`,
        settings: {
          isPrivate: true,
          allowCalls: false,
          messageRetentionDays: 90
        },
        metadata: {
          orderId: orderId,
          orderNumber: order.orderNumber,
          pharmacyId: order.pharmacyId._id
        }
      });

      // Send welcome message
      await this.messageService.createMessage({
        roomId: room._id,
        senderId: userId,
        content: `Order ${order.orderNumber} confirmed! You can track your order and ask any questions here.`,
        type: 'system',
        metadata: {
          systemAction: 'order_conversation_started',
          orderData: {
            orderId: orderId,
            orderNumber: order.orderNumber
          }
        }
      });

      res.status(201).json({
        success: true,
        data: room
      });

    } catch (error) {
      console.error('❌ Create order conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order conversation',
        error: error.message
      });
    }
  };

  /**
   * Create conversation when pharmacy accepts prescription
   * @route POST /api/v1/chat/conversations/prescription
   */
  createPrescriptionConversation = async (req, res) => {
    try {
      const { prescriptionRequestId, pharmacyResponseId } = req.body;
      const pharmacyUserId = req.user.id;

      if (!prescriptionRequestId) {
        return res.status(400).json({
          success: false,
          message: 'Prescription request ID is required'
        });
      }

      // Get prescription request
      const prescriptionRequest = await PrescriptionRequest.findById(prescriptionRequestId)
        .populate('patient', 'name email profile')
        .populate('selectedPharmacy', 'name contact');

      if (!prescriptionRequest) {
        return res.status(404).json({
          success: false,
          message: 'Prescription request not found'
        });
      }

      // Get pharmacy user
      const pharmacyUser = await User.findById(pharmacyUserId).populate('pharmacy');
      if (!pharmacyUser || !pharmacyUser.pharmacy) {
        return res.status(404).json({
          success: false,
          message: 'Pharmacy not found'
        });
      }

      // Check if conversation already exists
      const existingRoom = await this.chatRoomManager.ChatRoom.findOne({
        type: 'consultation',
        'metadata.prescriptionId': prescriptionRequestId,
        'metadata.pharmacyId': pharmacyUser.pharmacy._id,
        isActive: true
      });

      if (existingRoom) {
        return res.json({
          success: true,
          data: existingRoom,
          message: 'Conversation already exists'
        });
      }

      // Create consultation room
      const room = await this.chatRoomManager.createRoom({
        name: `Prescription ${prescriptionRequest.metadata?.requestNumber || prescriptionRequest._id.toString().slice(-6)}`,
        type: 'consultation',
        createdBy: pharmacyUserId,
        participants: [prescriptionRequest.patient._id, pharmacyUserId],
        description: `Consultation for prescription request ${prescriptionRequest.metadata?.requestNumber}`,
        settings: {
          isPrivate: true,
          allowCalls: true,
          messageRetentionDays: 180
        },
        metadata: {
          prescriptionId: prescriptionRequestId,
          pharmacyId: pharmacyUser.pharmacy._id,
          consultationType: 'prescription',
          requestNumber: prescriptionRequest.metadata?.requestNumber
        }
      });

      // Send welcome message
      await this.messageService.createMessage({
        roomId: room._id,
        senderId: pharmacyUserId,
        content: `Hello! I'm from ${pharmacyUser.pharmacy.name}. I've accepted your prescription request and I'm here to help with any questions you may have about your medications.`,
        type: 'system',
        metadata: {
          systemAction: 'conversation_started',
          prescriptionData: {
            prescriptionId: prescriptionRequestId,
            requestNumber: prescriptionRequest.metadata?.requestNumber
          }
        }
      });

      // Send notification to patient using the generic sendNotification method
      await this.notificationService.sendPushNotification(
        prescriptionRequest.patient._id,
        'Prescription Accepted',
        `${pharmacyUser.pharmacy.name} has accepted your prescription and started a conversation`,
        {
          conversationId: room._id.toString(),
          prescriptionId: prescriptionRequestId,
          pharmacyName: pharmacyUser.pharmacy.name
        }
      );

      res.status(201).json({
        success: true,
        data: room
      });

    } catch (error) {
      console.error('❌ Create prescription conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create conversation',
        error: error.message
      });
    }
  };

  /**
   * Upload file to conversation
   * @route POST /api/v1/chat/upload
   */
  uploadFile = async (req, res) => {
    try {
      const { conversationId } = req.body;
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Validate conversation access
      const hasAccess = await this.chatRoomManager.validateRoomAccess(conversationId, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      // Create file message
      const message = await this.messageService.createMessage({
        roomId: conversationId,
        senderId: userId,
        content: `Shared a file: ${file.originalname}`,
        type: 'file',
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype,
          fileUrl: file.path || file.location // Cloudinary URL or local path
        }
      });

      res.status(201).json({
        success: true,
        data: message
      });

    } catch (error) {
      console.error('❌ Upload file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload file',
        error: error.message
      });
    }
  };

  /**
   * Get patient conversations
   */
  async getPatientConversations(patientId, options = {}) {
    const { status, limit, page } = options;

    // Get rooms where patient is participant (both consultation and order types)
    const rooms = await this.chatRoomManager.getUserRooms(patientId, {
      type: { $in: ['consultation', 'order'] },
      limit: parseInt(limit)
    });
  const tempConversations = [];

    for (const room of rooms) {
      // Get pharmacy participant
      const pharmacyParticipant = room.participants.find(p => 
        p.role !== 'patient' && p.id !== patientId
      );

      if (!pharmacyParticipant) continue;

      // Get pharmacy details
      const pharmacyUser = await User.findById(pharmacyParticipant.id).populate('pharmacy');
      if (!pharmacyUser || !pharmacyUser.pharmacy) continue;

      // Get prescription request or order based on room type
      let prescriptionRequest = null;
      let order = null;
      
      if (room.type === 'consultation' && room.metadata?.prescriptionId) {
        prescriptionRequest = await PrescriptionRequest.findById(room.metadata.prescriptionId);
      } else if (room.type === 'order' && room.metadata?.orderId) {
        order = await Order.findById(room.metadata.orderId);
      }

      // Get last message
      const lastMessages = await this.messageService.getRoomMessages(room.id, { limit: 1 });
      const lastMessage = lastMessages[0];

      // Get unread count
      const unreadCount = await this.messageService.getUnreadCount(room.id, patientId);

      tempConversations.push({
        _id: room.id,
        type: room.type,
        pharmacy: {
          _id: pharmacyUser.pharmacy._id,
          name: pharmacyUser.pharmacy.name,
          contact: pharmacyUser.pharmacy.contact,
          address: pharmacyUser.pharmacy.address
        },
        prescriptionRequest: prescriptionRequest ? {
          _id: prescriptionRequest._id,
          requestNumber: prescriptionRequest.metadata?.requestNumber || `PR${prescriptionRequest._id.toString().slice(-6)}`
        } : null,
        order: order ? {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status
        } : null,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          timestamp: lastMessage.createdAt,
          sender: lastMessage.senderId._id.toString() === patientId ? 'patient' : 'pharmacy'
        } : null,
        unreadCount,
        status: room.isActive ? 'active' : 'inactive',
        createdAt: room.createdAt,
        updatedAt: room.lastActivity
      });
    }
    // Deduplicate by logical key (order/prescription) and keep the most recent
    const byKey = new Map();
    const getKey = (c) => {
      if (c.type === 'order' && c.order?._id) return `order:${c.order._id.toString()}`;
      if (c.type === 'consultation' && c.prescriptionRequest?._id && c.pharmacy?._id) {
        return `consultation:${c.prescriptionRequest._id.toString()}:${c.pharmacy._id.toString()}`;
      }
      return `room:${c._id.toString()}`;
    };
    const getTs = (c) => new Date(c.updatedAt || c.lastMessage?.timestamp || c.createdAt || 0).getTime();
    for (const conv of tempConversations) {
      const key = getKey(conv);
      const existing = byKey.get(key);
      if (!existing || getTs(conv) > getTs(existing)) {
        byKey.set(key, conv);
      }
    }
    return Array.from(byKey.values());
  }

  /**
   * Get pharmacy conversations
   */
  async getPharmacyConversations(pharmacyUserId, options = {}) {
    const { status, limit, page } = options;

    // Get pharmacy user
    const pharmacyUser = await User.findById(pharmacyUserId).populate('pharmacy');
    if (!pharmacyUser || !pharmacyUser.pharmacy) {
      return [];
    }

    // Get rooms where pharmacy is participant (both consultation and order types)
    const rooms = await this.chatRoomManager.getUserRooms(pharmacyUserId, {
      type: { $in: ['consultation', 'order'] },
      limit: parseInt(limit)
    });

  const tempConversations = [];

    for (const room of rooms) {
      // Get patient participant
      const patientParticipant = room.participants.find(p => 
        p.id !== pharmacyUserId
      );

      if (!patientParticipant) continue;

      // Get patient details
      const patient = await User.findById(patientParticipant.id);
      if (!patient) continue;

      // Get prescription request or order based on room type
      let prescriptionRequest = null;
      let order = null;
      
      if (room.type === 'consultation' && room.metadata?.prescriptionId) {
        prescriptionRequest = await PrescriptionRequest.findById(room.metadata.prescriptionId);
      } else if (room.type === 'order' && room.metadata?.orderId) {
        order = await Order.findById(room.metadata.orderId);
      }

      // Get last message
      const lastMessages = await this.messageService.getRoomMessages(room.id, { limit: 1 });
      const lastMessage = lastMessages[0];

      // Get unread count
      const unreadCount = await this.messageService.getUnreadCount(room.id, pharmacyUserId);

      tempConversations.push({
        _id: room.id,
        type: room.type,
        patient: {
          _id: patient._id,
          profile: {
            firstName: patient.profile?.firstName || 'Patient',
            lastName: patient.profile?.lastName || ''
          },
          contact: {
            phone: patient.profile?.phone || 'N/A'
          }
        },
        prescriptionRequest: prescriptionRequest ? {
          _id: prescriptionRequest._id,
          requestNumber: prescriptionRequest.metadata?.requestNumber || `PR${prescriptionRequest._id.toString().slice(-6)}`
        } : null,
        order: order ? {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status
        } : null,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          timestamp: lastMessage.createdAt,
          sender: lastMessage.senderId._id.toString() === pharmacyUserId ? 'pharmacy' : 'patient'
        } : null,
        unreadCount,
        status: room.isActive ? 'active' : 'inactive',
        createdAt: room.createdAt,
        updatedAt: room.lastActivity
      });
    }
    // Deduplicate by logical key (order/prescription) and keep the most recent
    const byKey = new Map();
    const getKey = (c) => {
      if (c.type === 'order' && c.order?._id) return `order:${c.order._id.toString()}`;
      if (c.type === 'consultation' && c.prescriptionRequest?._id && c.patient?._id) {
        return `consultation:${c.prescriptionRequest._id.toString()}:${c.patient._id.toString()}`;
      }
      return `room:${c._id.toString()}`;
    };
    const getTs = (c) => new Date(c.updatedAt || c.lastMessage?.timestamp || c.createdAt || 0).getTime();
    for (const conv of tempConversations) {
      const key = getKey(conv);
      const existing = byKey.get(key);
      if (!existing || getTs(conv) > getTs(existing)) {
        byKey.set(key, conv);
      }
    }
    return Array.from(byKey.values());
  }

  /**
   * Auto-create order conversation when order is confirmed
   */
  async autoCreateOrderConversation(orderId, pharmacyUserId) {
    try {
      const order = await Order.findById(orderId)
        .populate('patientId', 'name email profile')
        .populate('pharmacyId', 'name contact');

      if (!order) return null;

      // Check if conversation already exists
      const existingRoom = await this.chatRoomManager.ChatRoom.findOne({
        type: 'order',
        'metadata.orderId': orderId,
        isActive: true
      });

      if (existingRoom) return existingRoom;

      // Create order chat room
      const room = await this.chatRoomManager.createRoom({
        name: `Order ${order.orderNumber}`,
        type: 'order',
        createdBy: pharmacyUserId,
        participants: [order.patientId._id, pharmacyUserId],
        description: `Chat for order ${order.orderNumber}`,
        settings: {
          isPrivate: true,
          allowCalls: false,
          messageRetentionDays: 90
        },
        metadata: {
          orderId: orderId,
          orderNumber: order.orderNumber,
          pharmacyId: order.pharmacyId._id
        }
      });

      // Send welcome message
      await this.messageService.createMessage({
        roomId: room._id,
        senderId: pharmacyUserId,
        content: `Your order ${order.orderNumber} has been confirmed! Track your order and ask questions here until delivery.`,
        type: 'system',
        metadata: {
          systemAction: 'order_confirmed',
          orderData: {
            orderId: orderId,
            orderNumber: order.orderNumber
          }
        }
      });

      return room;
    } catch (error) {
      console.error('❌ Auto-create order conversation error:', error);
      return null;
    }
  }

  /**
   * Send enhanced message notification to conversation participants
   */
  async sendEnhancedMessageNotification(conversationId, message, senderId) {
    try {
      const room = await this.chatRoomManager.getRoomById(conversationId);
      const senderInfo = message.senderId;
      
      // Get prescription request info if available
      let prescriptionRequestNumber = null;
      if (room.metadata?.prescriptionRequestId) {
        const prescriptionRequest = await PrescriptionRequest.findById(room.metadata.prescriptionRequestId);
        prescriptionRequestNumber = prescriptionRequest?.requestNumber;
      }

      // Send notification to all participants except sender
      for (const participant of room.participants) {
        const participantId = participant.userId._id.toString();
        
        if (participantId !== senderId) {
          await this.chatNotificationService.createMessageNotification({
            messageId: message._id.toString(),
            conversationId,
            senderId: senderInfo._id.toString(),
            senderName: senderInfo.name || 'User',
            senderRole: senderInfo.role,
            recipientId: participantId,
            recipientRole: participant.userId.role,
            content: message.content,
            prescriptionRequestNumber
          });
        }
      }
    } catch (error) {
      console.error('❌ Send enhanced message notification failed:', error);
    }
  }

  /**
   * Send message notification to offline users (legacy method)
   */
  async sendMessageNotification(conversationId, message, senderId) {
    try {
      const room = await this.chatRoomManager.getRoomById(conversationId);
      const offlineUsers = room.participants.filter(p => 
        p.userId._id.toString() !== senderId
      );

      for (const participant of offlineUsers) {
        await this.notificationService.sendPushNotification(
          participant.userId._id,
          `New message from ${message.senderId.name}`,
          message.content.substring(0, 100),
          {
            conversationId,
            messageId: message._id.toString(),
            senderId: message.senderId._id.toString()
          }
        );
      }
    } catch (error) {
      console.error('❌ Send message notification failed:', error);
    }
  }

  /**
   * Get unread message counts by conversation
   * @route GET /api/v1/chat/notifications/unread-counts
   */
  getUnreadMessageCounts = async (req, res) => {
    try {
      const userId = req.user.id;
      
      const unreadCounts = await this.chatNotificationService.getUnreadMessagesByConversation(userId);
      
      res.json({
        success: true,
        data: unreadCounts
      });
    } catch (error) {
      console.error('❌ Get unread counts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread message counts',
        error: error.message
      });
    }
  };

  /**
   * Get total unread message count
   * @route GET /api/v1/chat/notifications/total-unread
   */
  getTotalUnreadCount = async (req, res) => {
    try {
      const userId = req.user.id;
      
      const totalUnread = await this.chatNotificationService.getUnreadMessageCount(userId);
      
      res.json({
        success: true,
        data: {
          totalUnread
        }
      });
    } catch (error) {
      console.error('❌ Get total unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get total unread count',
        error: error.message
      });
    }
  };
}

export default ConversationController;