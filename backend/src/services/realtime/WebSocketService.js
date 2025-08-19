import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import EventEmitter from 'events';

/**
 * Real-Time WebSocket Service
 * Handles real-time communication, notifications, and live updates
 */
class WebSocketService extends EventEmitter {
  constructor(httpServer) {
    super();
    this.httpServer = httpServer;
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket info
    this.activeRooms = new Map(); // roomId -> room info

    
    this.initialize();
    console.log('✅ WebSocket Service initialized');
  }

  /**
   * Initialize WebSocket server
   */
  async initialize() {
    try {
      // Create Socket.IO server
      this.io = new SocketIOServer(this.httpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      });

      // Redis adapter disabled

      // Set up authentication middleware
      this.setupAuthentication();

      // Set up connection handling
      this.setupConnectionHandling();

      // Set up event listeners
      this.setupEventListeners();

      console.log('🚀 WebSocket server started');

    } catch (error) {
      console.error('❌ Failed to initialize WebSocket service:', error.message);
    }
  }



  /**
   * Set up authentication middleware
   */
  setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.userData = decoded;

        console.log(`🔐 User authenticated: ${decoded.id} (${decoded.role})`);
        next();

      } catch (error) {
        console.error('❌ WebSocket authentication failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Set up connection event handling
   */
  setupConnectionHandling() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.userId}`);

      // Store connected user
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        socket: socket,
        connectedAt: new Date(),
        lastActivity: new Date(),
        rooms: new Set()
      });

      // Join user to their personal room
      socket.join(`user:${socket.userId}`);

      // Join role-based rooms
      socket.join(`role:${socket.userRole}`);

      // Set up socket event handlers
      this.setupSocketEventHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 User disconnected: ${socket.userId}, reason: ${reason}`);
        this.handleDisconnection(socket);
      });

      // Send connection confirmation
      socket.emit('connected', {
        userId: socket.userId,
        serverTime: new Date(),
        connectedUsers: this.getConnectedUsersCount()
      });

      // Emit user online status
      this.broadcastUserStatus(socket.userId, 'online');
    });
  }

  /**
   * Set up socket event handlers
   * @param {Object} socket - Socket instance
   */
  setupSocketEventHandlers(socket) {
    // Join specific rooms
    socket.on('join-room', (data) => {
      this.handleJoinRoom(socket, data);
    });

    // Leave specific rooms
    socket.on('leave-room', (data) => {
      this.handleLeaveRoom(socket, data);
    });

    // Send message to room
    socket.on('send-message', (data) => {
      this.handleSendMessage(socket, data);
    });

    // Update user activity
    socket.on('activity', () => {
      this.updateUserActivity(socket.userId);
    });

    // Request live data
    socket.on('request-live-data', (data) => {
      this.handleLiveDataRequest(socket, data);
    });

    // Subscribe to notifications
    socket.on('subscribe-notifications', (data) => {
      this.handleNotificationSubscription(socket, data);
    });

    // Typing indicators
    socket.on('typing-start', (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing-stop', (data) => {
      this.handleTypingStop(socket, data);
    });

    // Video call events
    socket.on('video-call-offer', (data) => {
      this.handleVideoCallOffer(socket, data);
    });

    socket.on('video-call-answer', (data) => {
      this.handleVideoCallAnswer(socket, data);
    });

    socket.on('video-call-ice-candidate', (data) => {
      this.handleVideoCallIceCandidate(socket, data);
    });

    socket.on('video-call-end', (data) => {
      this.handleVideoCallEnd(socket, data);
    });
  }

  /**
   * Handle user joining a room
   * @param {Object} socket - Socket instance
   * @param {Object} data - Room data
   */
  handleJoinRoom(socket, data) {
    try {
      const { roomId, roomType } = data;
      
      // Validate room access based on user role
      if (!this.canAccessRoom(socket, roomId, roomType)) {
        socket.emit('error', { message: 'Access denied to room' });
        return;
      }

      socket.join(roomId);
      
      // Update user's room list
      const userInfo = this.connectedUsers.get(socket.userId);
      if (userInfo) {
        userInfo.rooms.add(roomId);
      }

      // Update room info
      if (!this.activeRooms.has(roomId)) {
        this.activeRooms.set(roomId, {
          id: roomId,
          type: roomType,
          users: new Set(),
          createdAt: new Date()
        });
      }
      
      const room = this.activeRooms.get(roomId);
      room.users.add(socket.userId);

      // Notify room about new user
      socket.to(roomId).emit('user-joined-room', {
        userId: socket.userId,
        userRole: socket.userRole,
        roomId,
        timestamp: new Date()
      });

      // Send room info to user
      socket.emit('room-joined', {
        roomId,
        roomType,
        connectedUsers: Array.from(room.users),
        timestamp: new Date()
      });

      console.log(`👥 User ${socket.userId} joined room: ${roomId}`);

    } catch (error) {
      console.error('❌ Failed to join room:', error.message);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle user leaving a room
   * @param {Object} socket - Socket instance
   * @param {Object} data - Room data
   */
  handleLeaveRoom(socket, data) {
    try {
      const { roomId } = data;
      
      socket.leave(roomId);
      
      // Update user's room list
      const userInfo = this.connectedUsers.get(socket.userId);
      if (userInfo) {
        userInfo.rooms.delete(roomId);
      }

      // Update room info
      const room = this.activeRooms.get(roomId);
      if (room) {
        room.users.delete(socket.userId);
        
        // Remove room if empty
        if (room.users.size === 0) {
          this.activeRooms.delete(roomId);
        }
      }

      // Notify room about user leaving
      socket.to(roomId).emit('user-left-room', {
        userId: socket.userId,
        roomId,
        timestamp: new Date()
      });

      console.log(`👥 User ${socket.userId} left room: ${roomId}`);

    } catch (error) {
      console.error('❌ Failed to leave room:', error.message);
    }
  }

  /**
   * Handle sending message to room
   * @param {Object} socket - Socket instance
   * @param {Object} data - Message data
   */
  handleSendMessage(socket, data) {
    try {
      const { roomId, message, messageType = 'text' } = data;
      
      const messageData = {
        id: this.generateMessageId(),
        userId: socket.userId,
        userRole: socket.userRole,
        roomId,
        message,
        messageType,
        timestamp: new Date()
      };

      // Send to room
      this.io.to(roomId).emit('room-message', messageData);

      // Store message (implement message persistence if needed)
      this.emit('messageReceived', messageData);

      console.log(`💬 Message sent in room ${roomId} by user ${socket.userId}`);

    } catch (error) {
      console.error('❌ Failed to send message:', error.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle live data requests
   * @param {Object} socket - Socket instance
   * @param {Object} data - Request data
   */
  handleLiveDataRequest(socket, data) {
    try {
      const { dataType, filters } = data;
      
      // Validate access to requested data
      if (!this.canAccessData(socket, dataType)) {
        socket.emit('error', { message: 'Access denied to requested data' });
        return;
      }

      // Subscribe user to live data updates
      const subscriptionId = `live:${dataType}:${socket.userId}`;
      socket.join(subscriptionId);

      socket.emit('live-data-subscribed', {
        dataType,
        subscriptionId,
        timestamp: new Date()
      });

      // Emit current data
      this.emit('liveDataRequested', { socket, dataType, filters });

      console.log(`📊 Live data subscription: ${dataType} for user ${socket.userId}`);

    } catch (error) {
      console.error('❌ Failed to handle live data request:', error.message);
      socket.emit('error', { message: 'Failed to subscribe to live data' });
    }
  }

  /**
   * Handle notification subscriptions
   * @param {Object} socket - Socket instance
   * @param {Object} data - Subscription data
   */
  handleNotificationSubscription(socket, data) {
    try {
      const { types = [] } = data;
      
      // Subscribe to notification types
      types.forEach(type => {
        socket.join(`notifications:${type}`);
      });

      socket.emit('notifications-subscribed', {
        types,
        timestamp: new Date()
      });

      console.log(`🔔 Notification subscription for user ${socket.userId}: ${types.join(', ')}`);

    } catch (error) {
      console.error('❌ Failed to handle notification subscription:', error.message);
    }
  }

  /**
   * Handle typing start
   * @param {Object} socket - Socket instance
   * @param {Object} data - Typing data
   */
  handleTypingStart(socket, data) {
    const { roomId } = data;
    socket.to(roomId).emit('user-typing-start', {
      userId: socket.userId,
      roomId,
      timestamp: new Date()
    });
  }

  /**
   * Handle typing stop
   * @param {Object} socket - Socket instance
   * @param {Object} data - Typing data
   */
  handleTypingStop(socket, data) {
    const { roomId } = data;
    socket.to(roomId).emit('user-typing-stop', {
      userId: socket.userId,
      roomId,
      timestamp: new Date()
    });
  }

  /**
   * Handle video call offer
   * @param {Object} socket - Socket instance
   * @param {Object} data - Call data
   */
  handleVideoCallOffer(socket, data) {
    const { targetUserId, offer, roomId } = data;
    
    this.io.to(`user:${targetUserId}`).emit('video-call-offer', {
      fromUserId: socket.userId,
      offer,
      roomId,
      timestamp: new Date()
    });

    console.log(`📹 Video call offer from ${socket.userId} to ${targetUserId}`);
  }

  /**
   * Handle video call answer
   * @param {Object} socket - Socket instance
   * @param {Object} data - Answer data
   */
  handleVideoCallAnswer(socket, data) {
    const { targetUserId, answer, roomId } = data;
    
    this.io.to(`user:${targetUserId}`).emit('video-call-answer', {
      fromUserId: socket.userId,
      answer,
      roomId,
      timestamp: new Date()
    });

    console.log(`📹 Video call answer from ${socket.userId} to ${targetUserId}`);
  }

  /**
   * Handle video call ICE candidate
   * @param {Object} socket - Socket instance
   * @param {Object} data - ICE candidate data
   */
  handleVideoCallIceCandidate(socket, data) {
    const { targetUserId, candidate, roomId } = data;
    
    this.io.to(`user:${targetUserId}`).emit('video-call-ice-candidate', {
      fromUserId: socket.userId,
      candidate,
      roomId,
      timestamp: new Date()
    });
  }

  /**
   * Handle video call end
   * @param {Object} socket - Socket instance
   * @param {Object} data - Call end data
   */
  handleVideoCallEnd(socket, data) {
    const { targetUserId, roomId } = data;
    
    this.io.to(`user:${targetUserId}`).emit('video-call-end', {
      fromUserId: socket.userId,
      roomId,
      timestamp: new Date()
    });

    console.log(`📹 Video call ended between ${socket.userId} and ${targetUserId}`);
  }

  /**
   * Handle user disconnection
   * @param {Object} socket - Socket instance
   */
  handleDisconnection(socket) {
    // Remove from connected users
    this.connectedUsers.delete(socket.userId);

    // Remove from active rooms
    this.activeRooms.forEach((room, roomId) => {
      if (room.users.has(socket.userId)) {
        room.users.delete(socket.userId);
        
        // Notify room about user leaving
        socket.to(roomId).emit('user-left-room', {
          userId: socket.userId,
          roomId,
          timestamp: new Date()
        });
        
        // Remove room if empty
        if (room.users.size === 0) {
          this.activeRooms.delete(roomId);
        }
      }
    });

    // Broadcast user offline status
    this.broadcastUserStatus(socket.userId, 'offline');
  }

  /**
   * Set up service event listeners
   */
  setupEventListeners() {
    // Listen for inventory events
    this.on('inventoryAlert', (alert) => {
      this.broadcastInventoryAlert(alert);
    });

    this.on('orderUpdate', (orderData) => {
      this.broadcastOrderUpdate(orderData);
    });

    this.on('prescriptionProcessed', (prescriptionData) => {
      this.broadcastPrescriptionUpdate(prescriptionData);
    });

    this.on('systemNotification', (notification) => {
      this.broadcastSystemNotification(notification);
    });
  }

  /**
   * Broadcast inventory alert to relevant users
   * @param {Object} alert - Alert data
   */
  broadcastInventoryAlert(alert) {
    try {
      const alertData = {
        type: 'inventory_alert',
        alert,
        timestamp: new Date()
      };

      // Send to pharmacists and admins
      this.io.to('role:pharmacist').to('role:admin').emit('inventory-alert', alertData);

      // Send to specific location if applicable
      if (alert.location) {
        this.io.to(`location:${alert.location}`).emit('inventory-alert', alertData);
      }

      console.log(`🚨 Inventory alert broadcasted: ${alert.type}`);

    } catch (error) {
      console.error('❌ Failed to broadcast inventory alert:', error.message);
    }
  }

  /**
   * Broadcast order update to relevant users
   * @param {Object} orderData - Order data
   */
  broadcastOrderUpdate(orderData) {
    try {
      const updateData = {
        type: 'order_update',
        order: orderData,
        timestamp: new Date()
      };

      // Send to customer
      this.io.to(`user:${orderData.customerId}`).emit('order-update', updateData);

      // Send to pharmacists and admins
      this.io.to('role:pharmacist').to('role:admin').emit('order-update', updateData);

      console.log(`📦 Order update broadcasted: ${orderData.orderId}`);

    } catch (error) {
      console.error('❌ Failed to broadcast order update:', error.message);
    }
  }

  /**
   * Broadcast prescription processing update
   * @param {Object} prescriptionData - Prescription data
   */
  broadcastPrescriptionUpdate(prescriptionData) {
    try {
      const updateData = {
        type: 'prescription_update',
        prescription: prescriptionData,
        timestamp: new Date()
      };

      // Send to prescription owner
      this.io.to(`user:${prescriptionData.userId}`).emit('prescription-update', updateData);

      // Send to pharmacists if requires review
      if (prescriptionData.requiresReview) {
        this.io.to('role:pharmacist').emit('prescription-review-required', updateData);
      }

      console.log(`💊 Prescription update broadcasted: ${prescriptionData.processingId}`);

    } catch (error) {
      console.error('❌ Failed to broadcast prescription update:', error.message);
    }
  }

  /**
   * Broadcast system notification
   * @param {Object} notification - Notification data
   */
  broadcastSystemNotification(notification) {
    try {
      const notificationData = {
        type: 'system_notification',
        notification,
        timestamp: new Date()
      };

      // Determine recipients based on notification type
      const targetRooms = this.getNotificationTargets(notification);
      
      targetRooms.forEach(room => {
        this.io.to(room).emit('system-notification', notificationData);
      });

      console.log(`📢 System notification broadcasted: ${notification.type}`);

    } catch (error) {
      console.error('❌ Failed to broadcast system notification:', error.message);
    }
  }

  /**
   * Broadcast user status change
   * @param {string} userId - User ID
   * @param {string} status - User status (online/offline)
   */
  broadcastUserStatus(userId, status) {
    try {
      const statusData = {
        userId,
        status,
        timestamp: new Date()
      };

      // Broadcast to all connected users
      this.io.emit('user-status-change', statusData);

    } catch (error) {
      console.error('❌ Failed to broadcast user status:', error.message);
    }
  }

  /**
   * Send real-time data update
   * @param {string} dataType - Type of data
   * @param {Object} data - Data to send
   * @param {Array} targetUsers - Specific users to send to (optional)
   */
  sendLiveDataUpdate(dataType, data, targetUsers = null) {
    try {
      const updateData = {
        type: dataType,
        data,
        timestamp: new Date()
      };

      if (targetUsers) {
        targetUsers.forEach(userId => {
          this.io.to(`user:${userId}`).emit('live-data-update', updateData);
        });
      } else {
        this.io.to(`live:${dataType}`).emit('live-data-update', updateData);
      }

      console.log(`📊 Live data update sent: ${dataType}`);

    } catch (error) {
      console.error('❌ Failed to send live data update:', error.message);
    }
  }

  /**
   * Send push notification to specific user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data
   */
  sendNotificationToUser(userId, notification) {
    try {
      const notificationData = {
        ...notification,
        timestamp: new Date()
      };

      this.io.to(`user:${userId}`).emit('notification', notificationData);

      console.log(`🔔 Notification sent to user ${userId}: ${notification.type}`);

    } catch (error) {
      console.error('❌ Failed to send notification to user:', error.message);
    }
  }

  /**
   * Utility methods
   */

  /**
   * Check if user can access room
   * @param {Object} socket - Socket instance
   * @param {string} roomId - Room ID
   * @param {string} roomType - Room type
   * @returns {boolean} - Access permission
   */
  canAccessRoom(socket, roomId, roomType) {
    // Implement room access logic based on user role and room type
    const publicRoomTypes = ['general', 'support'];
    const adminOnlyRoomTypes = ['admin', 'management'];
    const pharmacistRoomTypes = ['pharmacy', 'prescription-review'];

    if (publicRoomTypes.includes(roomType)) {
      return true;
    }

    if (adminOnlyRoomTypes.includes(roomType)) {
      return socket.userRole === 'admin';
    }

    if (pharmacistRoomTypes.includes(roomType)) {
      return ['pharmacist', 'admin'].includes(socket.userRole);
    }

    // Default: allow access to own user rooms
    return roomId.startsWith(`user:${socket.userId}`);
  }

  /**
   * Check if user can access specific data type
   * @param {Object} socket - Socket instance
   * @param {string} dataType - Data type
   * @returns {boolean} - Access permission
   */
  canAccessData(socket, dataType) {
    const publicDataTypes = ['orders', 'prescriptions'];
    const restrictedDataTypes = ['inventory', 'analytics', 'admin-data'];

    if (publicDataTypes.includes(dataType)) {
      return true;
    }

    if (restrictedDataTypes.includes(dataType)) {
      return ['pharmacist', 'admin'].includes(socket.userRole);
    }

    return false;
  }

  /**
   * Get notification target rooms
   * @param {Object} notification - Notification
   * @returns {Array} - Target rooms
   */
  getNotificationTargets(notification) {
    const targets = [];

    switch (notification.type) {
      case 'system_maintenance':
      case 'system_update':
        targets.push('role:admin', 'role:pharmacist', 'role:user');
        break;
      case 'inventory_critical':
        targets.push('role:admin', 'role:pharmacist');
        break;
      case 'order_urgent':
        targets.push('role:pharmacist');
        break;
      default:
        targets.push('role:admin');
    }

    return targets;
  }

  /**
   * Update user activity timestamp
   * @param {string} userId - User ID
   */
  updateUserActivity(userId) {
    const userInfo = this.connectedUsers.get(userId);
    if (userInfo) {
      userInfo.lastActivity = new Date();
    }
  }

  /**
   * Generate unique message ID
   * @returns {string} - Message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get connected users count
   * @returns {number} - Count of connected users
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get connected users by role
   * @param {string} role - User role
   * @returns {Array} - Connected users with specified role
   */
  getConnectedUsersByRole(role) {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.socket.userRole === role)
      .map(user => ({
        userId: user.socket.userId,
        connectedAt: user.connectedAt,
        lastActivity: user.lastActivity
      }));
  }

  /**
   * Get active rooms information
   * @returns {Array} - Active rooms
   */
  getActiveRooms() {
    return Array.from(this.activeRooms.values()).map(room => ({
      id: room.id,
      type: room.type,
      userCount: room.users.size,
      users: Array.from(room.users),
      createdAt: room.createdAt
    }));
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    try {
      console.log('🔌 Shutting down WebSocket service...');
      
      // Disconnect all sockets
      this.io.disconnectSockets(true);
      
      // Redis connections disabled
      
      console.log('✅ WebSocket service shutdown complete');

    } catch (error) {
      console.error('❌ Error during WebSocket shutdown:', error.message);
    }
  }
}

export default WebSocketService;
