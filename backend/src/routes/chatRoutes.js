import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import ChatRoomManager from '../services/chat/ChatRoomManager.js';
import MessageService from '../services/chat/MessageService.js';
import ConversationController from '../controllers/ConversationController.js';
// import  fileUpload  from '../middleware/fileUpload.js';

const router = express.Router();

// Initialize services
const chatRoomManager = new ChatRoomManager();
const messageService = new MessageService();
const conversationController = new ConversationController();

// Patient-Pharmacy Conversation Routes
/**
 * @route   GET /api/v1/chat/conversations
 * @desc    Get conversations for current user (patient or pharmacy)
 * @access  Private
 */
router.get('/conversations', authenticate, conversationController.getConversations);

/**
 * @route   GET /api/v1/chat/conversations/:conversationId/messages
 * @desc    Get messages for a specific conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/messages', authenticate, conversationController.getConversationMessages);

/**
 * @route   POST /api/v1/chat/messages
 * @desc    Send a message in a conversation
 * @access  Private
 */
router.post('/messages', authenticate, conversationController.sendMessage);

/**
 * @route   POST /api/v1/chat/conversations/:conversationId/read
 * @desc    Mark conversation as read
 * @access  Private
 */
router.post('/conversations/:conversationId/read', authenticate, conversationController.markAsRead);

/**
 * @route   POST /api/v1/chat/conversations/prescription
 * @desc    Create conversation when pharmacy accepts prescription
 * @access  Private (Pharmacy only)
 */
router.post('/conversations/prescription', authenticate, conversationController.createPrescriptionConversation);

/**
 * @route   POST /api/v1/chat/conversations/order
 * @desc    Create conversation when order is confirmed
 * @access  Private
 */
router.post('/conversations/order', authenticate, conversationController.createOrderConversation);

/**
 * @route   GET /api/v1/chat/notifications/unread-counts
 * @desc    Get unread message counts by conversation
 * @access  Private
 */
router.get('/notifications/unread-counts', authenticate, conversationController.getUnreadMessageCounts);

/**
 * @route   GET /api/v1/chat/notifications/total-unread
 * @desc    Get total unread message count
 * @access  Private
 */
router.get('/notifications/total-unread', authenticate, conversationController.getTotalUnreadCount);

/**
 * @route   POST /api/v1/chat/upload
 * @desc    Upload file to conversation
 * @access  Private
 */
// router.post('/upload', authenticate, fileUpload.single('file'), conversationController.uploadFile);

// Existing Chat Room Routes (for general chat functionality)
/**
 * @route   GET /api/v1/chat/rooms
 * @desc    Get user's chat rooms
 * @access  Private
 */
router.get('/rooms', authenticate, async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    
    const rooms = await chatRoomManager.getUserRooms(req.user.id, {
      type,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: rooms.length,
      rooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get rooms'
    });
  }
});

/**
 * @route   POST /api/v1/chat/rooms
 * @desc    Create a new chat room
 * @access  Private
 */
router.post('/rooms', authenticate, async (req, res) => {
  try {
    const {
      name,
      type,
      participants = [],
      description,
      settings = {},
      metadata = {}
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Room name and type are required'
      });
    }

    const room = await chatRoomManager.createRoom({
      name,
      type,
      createdBy: req.user.id,
      participants: [req.user.id, ...participants],
      description,
      settings,
      metadata
    });

    // Notify chat service of new room
    const chatSocketService = req.app.get('chatSocketService');
    if (chatSocketService) {
      chatSocketService.getIO().to(`user_${req.user.id}`).emit('room_created', { room });
    }

    res.status(201).json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create room'
    });
  }
});

/**
 * @route   GET /api/v1/chat/rooms/:roomId
 * @desc    Get specific room details
 * @access  Private
 */
router.get('/rooms/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;

    // Validate room access
    const hasAccess = await chatRoomManager.validateRoomAccess(roomId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this room'
      });
    }

    const room = await chatRoomManager.getRoomById(roomId);

    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get room'
    });
  }
});

/**
 * @route   PUT /api/v1/chat/rooms/:roomId
 * @desc    Update room settings
 * @access  Private
 */
router.put('/rooms/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { settings } = req.body;

    const room = await chatRoomManager.updateRoomSettings(roomId, settings, req.user.id);

    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update room'
    });
  }
});

/**
 * @route   POST /api/v1/chat/rooms/:roomId/participants
 * @desc    Add participant to room
 * @access  Private
 */
router.post('/rooms/:roomId/participants', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, role = 'member', permissions = {} } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const room = await chatRoomManager.addParticipant(roomId, userId, role, permissions);

    // Notify chat service
    const chatSocketService = req.app.get('chatSocketService');
    if (chatSocketService) {
      chatSocketService.getIO().to(roomId).emit('participant_added', {
        roomId,
        userId,
        role,
        addedBy: req.user.id
      });
    }

    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add participant'
    });
  }
});

/**
 * @route   DELETE /api/v1/chat/rooms/:roomId/participants/:userId
 * @desc    Remove participant from room
 * @access  Private
 */
router.delete('/rooms/:roomId/participants/:userId', authenticate, async (req, res) => {
  try {
    const { roomId, userId } = req.params;

    const room = await chatRoomManager.removeParticipant(roomId, userId);

    // Notify chat service
    const chatSocketService = req.app.get('chatSocketService');
    if (chatSocketService) {
      chatSocketService.getIO().to(roomId).emit('participant_removed', {
        roomId,
        userId,
        removedBy: req.user.id
      });
    }

    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove participant'
    });
  }
});

/**
 * @route   GET /api/v1/chat/rooms/:roomId/messages
 * @desc    Get messages for a room
 * @access  Private
 */
router.get('/rooms/:roomId/messages', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      limit = 50,
      skip = 0,
      fromDate,
      toDate,
      messageType,
      includeDeleted = false
    } = req.query;

    // Validate room access
    const hasAccess = await chatRoomManager.validateRoomAccess(roomId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this room'
      });
    }

    const messages = await messageService.getRoomMessages(roomId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      fromDate,
      toDate,
      messageType,
      includeDeleted: includeDeleted === 'true'
    });

    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get messages'
    });
  }
});

/**
 * @route   POST /api/v1/chat/rooms/:roomId/messages
 * @desc    Send a message to a room (HTTP fallback)
 * @access  Private
 */
router.post('/rooms/:roomId/messages', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text', metadata = {} } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Validate room access
    const hasAccess = await chatRoomManager.validateRoomAccess(roomId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this room'
      });
    }

    const message = await messageService.createMessage({
      roomId,
      senderId: req.user.id,
      content,
      type,
      metadata
    });

    // Notify chat service for real-time broadcasting
    const chatSocketService = req.app.get('chatSocketService');
    if (chatSocketService) {
      const messageData = {
        id: message._id,
        roomId: message.roomId,
        sender: {
          id: req.user.id,
          name: req.user.name,
          avatar: req.user.avatar,
          role: req.user.role
        },
        content: message.content,
        type: message.type,
        metadata: message.metadata,
        timestamp: message.timestamp,
        readBy: [],
        edited: false
      };

      chatSocketService.getIO().to(roomId).emit('new_message', messageData);
    }

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send message'
    });
  }
});

/**
 * @route   PUT /api/v1/chat/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put('/messages/:messageId/read', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await messageService.markMessageAsRead(messageId, req.user.id);

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark message as read'
    });
  }
});

/**
 * @route   PUT /api/v1/chat/rooms/:roomId/read
 * @desc    Mark all messages in room as read
 * @access  Private
 */
router.put('/rooms/:roomId/read', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;

    // Validate room access
    const hasAccess = await chatRoomManager.validateRoomAccess(roomId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this room'
      });
    }

    const result = await messageService.markRoomAsRead(roomId, req.user.id);

    res.json({
      success: true,
      markedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark room read error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark room as read'
    });
  }
});

/**
 * @route   GET /api/v1/chat/rooms/:roomId/unread-count
 * @desc    Get unread message count for room
 * @access  Private
 */
router.get('/rooms/:roomId/unread-count', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;

    // Validate room access
    const hasAccess = await chatRoomManager.validateRoomAccess(roomId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this room'
      });
    }

    const count = await messageService.getUnreadCount(roomId, req.user.id);

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get unread count'
    });
  }
});

/**
 * @route   POST /api/v1/chat/rooms/direct
 * @desc    Create or get direct message room
 * @access  Private
 */
router.post('/rooms/direct', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create direct room with yourself'
      });
    }

    const room = await chatRoomManager.createDirectRoom(req.user.id, userId);

    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Create direct room error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create direct room'
    });
  }
});

/**
 * @route   POST /api/v1/chat/rooms/consultation
 * @desc    Create consultation room for prescription
 * @access  Private
 */
router.post('/rooms/consultation', authenticate, async (req, res) => {
  try {
    const { pharmacyId, prescriptionId } = req.body;

    if (!pharmacyId || !prescriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy ID and Prescription ID are required'
      });
    }

    const room = await chatRoomManager.createConsultationRoom(
      req.user.id,
      pharmacyId,
      prescriptionId
    );

    res.status(201).json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Create consultation room error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create consultation room'
    });
  }
});

/**
 * @route   GET /api/v1/chat/search/:roomId
 * @desc    Search messages in room
 * @access  Private
 */
router.get('/search/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { q: searchQuery, type, fromDate, toDate, limit = 20 } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Validate room access
    const hasAccess = await chatRoomManager.validateRoomAccess(roomId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this room'
      });
    }

    const messages = await messageService.searchMessages(roomId, searchQuery, {
      messageType: type,
      fromDate,
      toDate,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: messages.length,
      messages,
      query: searchQuery
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search messages'
    });
  }
});

/**
 * @route   GET /api/v1/chat/stats
 * @desc    Get chat statistics for user
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const chatSocketService = req.app.get('chatSocketService');
    
    const stats = {
      connectedUsers: (chatSocketService && typeof chatSocketService.getConnectedUsersCount === 'function') ? chatSocketService.getConnectedUsersCount() : 0,
      activeRooms: chatSocketService ? chatSocketService.getActiveRoomsCount() : 0,
      userRoomsCount: 0,
      unreadMessagesCount: 0
    };

    // Get user's rooms count
    const userRooms = await chatRoomManager.getUserRooms(req.user.id, { limit: 1000 });
    stats.userRoomsCount = userRooms.length;

    // Get total unread messages count
    let totalUnread = 0;
    for (const room of userRooms) {
      const unreadCount = await messageService.getUnreadCount(room.id, req.user.id);
      totalUnread += unreadCount;
    }
    stats.unreadMessagesCount = totalUnread;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get stats'
    });
  }
});

export default router;