import jwt from 'jsonwebtoken';
import ChatRoomManager from './ChatRoomManager.js';
import MessageService from './MessageService.js';
import EncryptionService from './EncryptionService.js';
import NotificationService from '../RealTimeNotificationService.js';

/**
 * Socket.io Chat Infrastructure
 * Handles real-time communication between patients, pharmacies, and practitioners
 */
class ChatSocketService {
  constructor(io) {
    this.io = io;

    // Initialize services
    this.chatRoomManager = new ChatRoomManager();
    this.messageService = new MessageService();
    this.encryptionService = new EncryptionService();
    this.notificationService = new NotificationService(io);

    // Track connected users
    this.connectedUsers = new Map(); // socketId -> userInfo
    this.userSockets = new Map(); // userId -> Set of socketIds
    this.typingUsers = new Map(); // roomId -> Set of userIds
    this.activeRooms = new Map(); // roomId -> room metadata

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('✅ Chat Socket Service initialized');
  }

  /**
   * Setup Socket.io middleware for authentication
   */
  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await this.getUserById(decoded.id);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || null,
          status: 'online'
        };

        console.log(`🔐 User authenticated: ${user.name} (${user.role})`);
        next();
      } catch (error) {
        console.error('❌ Socket authentication failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      socket.messageCount = 0;
      socket.lastMessageTime = Date.now();
      next();
    });
  }

  /**
   * Setup Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new socket connection
   * @param {Socket} socket - Socket.io socket instance
   */
  async handleConnection(socket) {
    try {
      const user = socket.user;
      console.log(`🔌 User connected: ${user.name} (${socket.id})`);

      // Track connected user
      this.connectedUsers.set(socket.id, user);
      
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id).add(socket.id);

      // Join user to their personal room for direct notifications
      socket.join(`user_${user.id}`);

      // Load user's active chat rooms
      await this.loadUserChatRooms(socket);

      // Emit user online status
      this.broadcastUserStatus(user.id, 'online');

      // Setup event handlers for this socket
      this.setupSocketEventHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

    } catch (error) {
      console.error('❌ Connection handling failed:', error.message);
      socket.emit('error', { message: 'Connection failed' });
    }
  }

  /**
   * Setup event handlers for individual socket
   * @param {Socket} socket - Socket.io socket instance
   */
  setupSocketEventHandlers(socket) {
    const user = socket.user;

    // Chat room events
    socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
    socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
    socket.on('create_room', (data) => this.handleCreateRoom(socket, data));

    // Message events
    socket.on('send_message', (data) => this.handleSendMessage(socket, data));
    socket.on('edit_message', (data) => this.handleEditMessage(socket, data));
    socket.on('delete_message', (data) => this.handleDeleteMessage(socket, data));
    socket.on('mark_read', (data) => this.handleMarkRead(socket, data));

    // Typing events
    socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
    socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));

    // File sharing events
    socket.on('send_file', (data) => this.handleSendFile(socket, data));
    socket.on('request_file', (data) => this.handleRequestFile(socket, data));

    // Call events
    socket.on('initiate_call', (data) => this.handleInitiateCall(socket, data));
    socket.on('accept_call', (data) => this.handleAcceptCall(socket, data));
    socket.on('decline_call', (data) => this.handleDeclineCall(socket, data));
    socket.on('end_call', (data) => this.handleEndCall(socket, data));

    // Status events
    socket.on('update_status', (data) => this.handleUpdateStatus(socket, data));
    socket.on('get_online_users', () => this.handleGetOnlineUsers(socket));

    // Error handling
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${user.name}:`, error);
    });
  }

  /**
   * Load user's active chat rooms
   * @param {Socket} socket - Socket.io socket instance
   */
  async loadUserChatRooms(socket) {
    try {
      const user = socket.user;
      const rooms = await this.chatRoomManager.getUserRooms(user.id);

      for (const room of rooms) {
        socket.join(room.id);
        
        // Track active room
        if (!this.activeRooms.has(room.id)) {
          this.activeRooms.set(room.id, {
            id: room.id,
            name: room.name,
            type: room.type,
            participants: new Set(),
            createdAt: room.createdAt
          });
        }
        
        this.activeRooms.get(room.id).participants.add(user.id);

        // Notify room of user joining
        socket.to(room.id).emit('user_joined_room', {
          roomId: room.id,
          user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            status: 'online'
          },
          timestamp: new Date()
        });
      }

      // Send rooms to client
      socket.emit('rooms_loaded', {
        rooms: rooms.map(room => ({
          ...room,
          participants: Array.from(this.activeRooms.get(room.id)?.participants || [])
        }))
      });

      console.log(`📂 Loaded ${rooms.length} chat rooms for ${user.name}`);
    } catch (error) {
      console.error('❌ Failed to load chat rooms:', error.message);
      socket.emit('error', { message: 'Failed to load chat rooms' });
    }
  }

  /**
   * Handle join room event
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Room data
   */
  async handleJoinRoom(socket, data) {
    try {
      const { roomId } = data;
      const user = socket.user;

      // Validate room access
      const hasAccess = await this.chatRoomManager.validateRoomAccess(roomId, user.id);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to room' });
        return;
      }

      socket.join(roomId);

      // Track active room
      if (!this.activeRooms.has(roomId)) {
        const room = await this.chatRoomManager.getRoomById(roomId);
        this.activeRooms.set(roomId, {
          id: room.id,
          name: room.name,
          type: room.type,
          participants: new Set(),
          createdAt: room.createdAt
        });
      }
      
      this.activeRooms.get(roomId).participants.add(user.id);

      // Load recent messages
      const messages = await this.messageService.getRoomMessages(roomId, { limit: 50 });

      socket.emit('room_joined', {
        roomId,
        messages: messages.map(msg => this.decryptMessage(msg)),
        participants: Array.from(this.activeRooms.get(roomId).participants)
      });

      // Notify others in room
      socket.to(roomId).emit('user_joined_room', {
        roomId,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          status: 'online'
        },
        timestamp: new Date()
      });

      console.log(`👥 ${user.name} joined room: ${roomId}`);
    } catch (error) {
      console.error('❌ Join room failed:', error.message);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle leave room event
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Room data
   */
  async handleLeaveRoom(socket, data) {
    try {
      const { roomId } = data;
      const user = socket.user;

      socket.leave(roomId);

      // Update active room tracking
      if (this.activeRooms.has(roomId)) {
        this.activeRooms.get(roomId).participants.delete(user.id);
        
        // Clean up empty rooms
        if (this.activeRooms.get(roomId).participants.size === 0) {
          this.activeRooms.delete(roomId);
        }
      }

      // Notify others in room
      socket.to(roomId).emit('user_left_room', {
        roomId,
        userId: user.id,
        timestamp: new Date()
      });

      socket.emit('room_left', { roomId });
      console.log(`👋 ${user.name} left room: ${roomId}`);
    } catch (error) {
      console.error('❌ Leave room failed:', error.message);
      socket.emit('error', { message: 'Failed to leave room' });
    }
  }

  /**
   * Handle create room event
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Room creation data
   */
  async handleCreateRoom(socket, data) {
    try {
      const { name, type, participants, metadata } = data;
      const user = socket.user;

      // Validate room creation
      if (!name || !type) {
        socket.emit('error', { message: 'Room name and type are required' });
        return;
      }

      // Create room
      const room = await this.chatRoomManager.createRoom({
        name,
        type,
        createdBy: user.id,
        participants: [user.id, ...(participants || [])],
        metadata: metadata || {}
      });

      // Join creator to room
      socket.join(room.id);

      // Track active room
      this.activeRooms.set(room.id, {
        id: room.id,
        name: room.name,
        type: room.type,
        participants: new Set([user.id]),
        createdAt: room.createdAt
      });

      socket.emit('room_created', { room });

      // Invite other participants
      if (participants && participants.length > 0) {
        for (const participantId of participants) {
          this.inviteUserToRoom(participantId, room);
        }
      }

      console.log(`🏠 ${user.name} created room: ${room.name}`);
    } catch (error) {
      console.error('❌ Create room failed:', error.message);
      socket.emit('error', { message: 'Failed to create room' });
    }
  }

  /**
   * Handle send message event
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Message data
   */
  async handleSendMessage(socket, data) {
    try {
      const { roomId, content, type = 'text', metadata = {} } = data;
      const user = socket.user;

      // Rate limiting
      if (!this.checkRateLimit(socket)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      // Validate room access
      const hasAccess = await this.chatRoomManager.validateRoomAccess(roomId, user.id);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to room' });
        return;
      }

      // Encrypt sensitive content
      const encryptedContent = this.encryptMessage(content, type);

      // Save message
      const message = await this.messageService.createMessage({
        roomId,
        senderId: user.id,
        content: encryptedContent,
        type,
        metadata,
        timestamp: new Date()
      });

      // Prepare message for broadcast
      const messageData = {
        id: message._id,
        roomId: message.roomId,
        sender: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          role: user.role
        },
        content: content, // Send decrypted content to clients
        type: message.type,
        metadata: message.metadata,
        timestamp: message.timestamp,
        readBy: [],
        edited: false
      };

      // Broadcast to room
      this.io.to(roomId).emit('new_message', messageData);

      // Send notifications to offline users
      await this.sendMessageNotifications(roomId, messageData, user.id);

      // Update room's last activity
      await this.chatRoomManager.updateRoomActivity(roomId);

      console.log(`💬 Message sent by ${user.name} in room ${roomId}`);
    } catch (error) {
      console.error('❌ Send message failed:', error.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle edit message event
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Edit data
   */
  async handleEditMessage(socket, data) {
    try {
      const { messageId, content } = data;
      const user = socket.user;

      // Update message
      const message = await this.messageService.editMessage(messageId, user.id, content);
      
      if (!message) {
        socket.emit('error', { message: 'Message not found or not authorized' });
        return;
      }

      // Broadcast edit to room
      this.io.to(message.roomId).emit('message_edited', {
        messageId,
        content,
        editedAt: new Date(),
        editedBy: user.id
      });

      console.log(`✏️ Message ${messageId} edited by ${user.name}`);
    } catch (error) {
      console.error('❌ Edit message failed:', error.message);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  }

  /**
   * Handle delete message event
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Delete data
   */
  async handleDeleteMessage(socket, data) {
    try {
      const { messageId } = data;
      const user = socket.user;

      // Delete message
      const message = await this.messageService.deleteMessage(messageId, user.id);
      
      if (!message) {
        socket.emit('error', { message: 'Message not found or not authorized' });
        return;
      }

      // Broadcast deletion to room
      this.io.to(message.roomId).emit('message_deleted', {
        messageId,
        deletedBy: user.id,
        deletedAt: new Date()
      });

      console.log(`🗑️ Message ${messageId} deleted by ${user.name}`);
    } catch (error) {
      console.error('❌ Delete message failed:', error.message);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  }

  /**
   * Handle mark read event
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Read data
   */
  async handleMarkRead(socket, data) {
    try {
      const { roomId, messageId } = data;
      const user = socket.user;

      await this.messageService.markMessageAsRead(messageId, user.id);

      // Broadcast read receipt to room
      socket.to(roomId).emit('message_read', {
        messageId,
        userId: user.id,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Mark read failed:', error.message);
    }
  }

  /**
   * Handle typing start event
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Typing data
   */
  handleTypingStart(socket, data) {
    try {
      const { roomId } = data;
      const user = socket.user;

      if (!this.typingUsers.has(roomId)) {
        this.typingUsers.set(roomId, new Set());
      }
      
      this.typingUsers.get(roomId).add(user.id);

      socket.to(roomId).emit('user_typing', {
        roomId,
        userId: user.id,
        userName: user.name,
        isTyping: true
      });

      // Auto-stop typing after 3 seconds
      setTimeout(() => {
        this.handleTypingStop(socket, { roomId });
      }, 3000);

    } catch (error) {
      console.error('❌ Typing start failed:', error.message);
    }
  }

  /**
   * Handle typing stop event
   * @param {Socket} socket - Socket.io socket instance
   * @param {Object} data - Typing data
   */
  handleTypingStop(socket, data) {
    try {
      const { roomId } = data;
      const user = socket.user;

      if (this.typingUsers.has(roomId)) {
        this.typingUsers.get(roomId).delete(user.id);
        
        if (this.typingUsers.get(roomId).size === 0) {
          this.typingUsers.delete(roomId);
        }
      }

      socket.to(roomId).emit('user_typing', {
        roomId,
        userId: user.id,
        userName: user.name,
        isTyping: false
      });

    } catch (error) {
      console.error('❌ Typing stop failed:', error.message);
    }
  }

  /**
   * Handle disconnection
   * @param {Socket} socket - Socket.io socket instance
   */
  handleDisconnection(socket) {
    try {
      const user = socket.user;
      console.log(`🔌 User disconnected: ${user.name} (${socket.id})`);

      // Remove from connected users
      this.connectedUsers.delete(socket.id);
      
      if (this.userSockets.has(user.id)) {
        this.userSockets.get(user.id).delete(socket.id);
        
        // If no more sockets for this user, mark as offline
        if (this.userSockets.get(user.id).size === 0) {
          this.userSockets.delete(user.id);
          this.broadcastUserStatus(user.id, 'offline');
        }
      }

      // Remove from typing users
      for (const [roomId, typingSet] of this.typingUsers.entries()) {
        if (typingSet.has(user.id)) {
          typingSet.delete(user.id);
          if (typingSet.size === 0) {
            this.typingUsers.delete(roomId);
          }
          
          // Notify room that user stopped typing
          socket.to(roomId).emit('user_typing', {
            roomId,
            userId: user.id,
            userName: user.name,
            isTyping: false
          });
        }
      }

      // Remove from active rooms
      for (const [roomId, roomData] of this.activeRooms.entries()) {
        if (roomData.participants.has(user.id)) {
          roomData.participants.delete(user.id);
          
          // Notify room of user leaving
          socket.to(roomId).emit('user_left_room', {
            roomId,
            userId: user.id,
            timestamp: new Date()
          });
          
          // Clean up empty rooms
          if (roomData.participants.size === 0) {
            this.activeRooms.delete(roomId);
          }
        }
      }

    } catch (error) {
      console.error('❌ Disconnection handling failed:', error.message);
    }
  }

  /**
   * Broadcast user status to relevant rooms
   * @param {string} userId - User ID
   * @param {string} status - User status
   */
  broadcastUserStatus(userId, status) {
    try {
      for (const [roomId, roomData] of this.activeRooms.entries()) {
        if (roomData.participants.has(userId)) {
          this.io.to(roomId).emit('user_status_changed', {
            userId,
            status,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error('❌ Broadcast user status failed:', error.message);
    }
  }

  /**
   * Check rate limit for socket
   * @param {Socket} socket - Socket.io socket instance
   * @returns {boolean} - Whether request is within rate limit
   */
  checkRateLimit(socket) {
    const now = Date.now();
    const timeDiff = now - socket.lastMessageTime;
    
    // Reset counter every minute
    if (timeDiff > 60000) {
      socket.messageCount = 0;
      socket.lastMessageTime = now;
    }
    
    socket.messageCount++;
    
    // Limit: 30 messages per minute
    return socket.messageCount <= 30;
  }

  /**
   * Encrypt message for storage
   * @param {string} content - Message content
   * @param {string} type - Message type
   * @returns {string} - Encrypted content
   */
  encryptMessage(content, type) {
    if (type === 'prescription' || type === 'medical') {
      return this.encryptionService.encrypt(content);
    }
    return content;
  }

  /**
   * Decrypt message for display
   * @param {Object} message - Message object
   * @returns {Object} - Message with decrypted content
   */
  decryptMessage(message) {
    if (message.type === 'prescription' || message.type === 'medical') {
      return {
        ...message,
        content: this.encryptionService.decrypt(message.content)
      };
    }
    return message;
  }

  /**
   * Send message notifications to offline users
   * @param {string} roomId - Room ID
   * @param {Object} message - Message data
   * @param {string} senderId - Sender ID
   */
  async sendMessageNotifications(roomId, message, senderId) {
    try {
      const room = await this.chatRoomManager.getRoomById(roomId);
      const offlineUsers = room.participants.filter(participantId => 
        participantId !== senderId && !this.userSockets.has(participantId)
      );

      for (const userId of offlineUsers) {
        await this.notificationService.sendNotification({
          userId,
          type: 'new_message',
          title: `New message from ${message.sender.name}`,
          body: message.content.substring(0, 100),
          data: {
            roomId,
            messageId: message.id,
            senderId: message.sender.id
          }
        });
      }
    } catch (error) {
      console.error('❌ Send message notifications failed:', error.message);
    }
  }

  /**
   * Invite user to room
   * @param {string} userId - User ID to invite
   * @param {Object} room - Room object
   */
  async inviteUserToRoom(userId, room) {
    try {
      // Send invitation notification
      await this.notificationService.sendNotification({
        userId,
        type: 'room_invitation',
        title: `Invited to ${room.name}`,
        body: `You've been invited to join a chat room`,
        data: {
          roomId: room.id,
          roomName: room.name,
          invitedBy: room.createdBy
        }
      });

      // Send real-time invitation if user is online
      if (this.userSockets.has(userId)) {
        this.io.to(`user_${userId}`).emit('room_invitation', {
          room,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Invite user to room failed:', error.message);
    }
  }

  /**
   * Get user by ID (placeholder - would integrate with user service)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User object
   */
  async getUserById(userId) {
    // This would integrate with your user service/model
    // For now, returning a placeholder
    return {
      _id: userId,
      name: 'User Name',
      email: 'user@example.com',
      role: 'patient',
      avatar: null
    };
  }

  /**
   * Get Socket.io server instance
   * @returns {SocketIOServer} - Socket.io server
   */
  getIO() {
    return this.io;
  }

  /**
   * Get connected users count
   * @returns {number} - Number of connected users
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get active rooms count
   * @returns {number} - Number of active rooms
   */
  getActiveRoomsCount() {
    return this.activeRooms.size;
  }
}

export default ChatSocketService;
