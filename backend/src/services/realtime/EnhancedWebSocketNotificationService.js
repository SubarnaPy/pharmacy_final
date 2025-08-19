import EventEmitter from 'events';

/**
 * Enhanced WebSocket Notification Service
 * Provides real-time notification broadcasting with role-based delivery,
 * offline user queuing, and advanced connection management
 */
class EnhancedWebSocketNotificationService extends EventEmitter {
  constructor(webSocketService = null) {
    super();
    
    this.webSocketService = webSocketService;
    
    // Connection tracking
    this.connectedUsers = new Map(); // userId -> { socketId, userRole, connectedAt, lastActivity }
    this.userSockets = new Map(); // socketId -> { userId, userRole }
    this.roleRooms = new Map(); // role -> Set of userIds
    
    // Offline user notification queue
    this.offlineQueue = new Map(); // userId -> Array of notifications
    this.queueRetentionTime = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    // Connection management
    this.connectionHeartbeat = new Map(); // userId -> heartbeat interval
    this.reconnectionAttempts = new Map(); // userId -> attempt count
    this.maxReconnectionAttempts = 5;
    this.heartbeatInterval = 30000; // 30 seconds
    
    // Broadcasting configuration
    this.broadcastConfig = {
      maxBatchSize: 100,
      batchDelay: 100, // ms
      retryAttempts: 3,
      retryDelay: 1000 // ms
    };
    
    // Notification delivery tracking
    this.deliveryTracking = new Map(); // notificationId -> delivery status
    this.deliveryStats = {
      sent: 0,
      delivered: 0,
      failed: 0,
      queued: 0
    };
    
    this.initialize();
    console.log('✅ Enhanced WebSocket Notification Service initialized');
  }

  /**
   * Initialize the enhanced service
   */
  initialize() {
    this.setupWebSocketEventHandlers();
    this.startHeartbeatMonitoring();
    this.startQueueCleanup();
    this.startDeliveryTracking();
    
    console.log('🔄 Enhanced WebSocket service components started');
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketEventHandlers() {
    if (!this.webSocketService || !this.webSocketService.io) {
      console.warn('⚠️ WebSocket service not available for enhanced features');
      return;
    }

    const io = this.webSocketService.io;

    // Handle new connections
    io.on('connection', (socket) => {
      console.log(`🔌 New WebSocket connection: ${socket.id}`);
      
      // Handle user authentication/identification
      socket.on('authenticate', (authData) => {
        this.handleUserAuthentication(socket, authData);
      });

      // Handle heartbeat
      socket.on('heartbeat', (data) => {
        this.handleHeartbeat(socket, data);
      });

      // Handle notification acknowledgment
      socket.on('notification_ack', (ackData) => {
        this.handleNotificationAcknowledgment(socket, ackData);
      });

      // Handle notification read status
      socket.on('notification_read', (readData) => {
        this.handleNotificationRead(socket, readData);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleUserDisconnection(socket, reason);
      });

      // Handle reconnection
      socket.on('reconnect', (attemptNumber) => {
        this.handleUserReconnection(socket, attemptNumber);
      });
    });

    console.log('👂 WebSocket event handlers setup complete');
  }

  /**
   * Handle user authentication
   * @param {Object} socket - Socket instance
   * @param {Object} authData - Authentication data
   */
  handleUserAuthentication(socket, authData) {
    try {
      const { userId, userRole, token } = authData;
      
      // Validate authentication (implement proper validation)
      if (!userId || !userRole) {
        socket.emit('auth_error', { message: 'Invalid authentication data' });
        return;
      }

      // Store connection information
      this.connectedUsers.set(userId, {
        socketId: socket.id,
        userRole,
        connectedAt: new Date(),
        lastActivity: new Date(),
        isAuthenticated: true
      });

      this.userSockets.set(socket.id, { userId, userRole });

      // Add to role room
      this.addUserToRoleRoom(userId, userRole);
      socket.join(`role:${userRole}`);
      socket.join(`user:${userId}`);

      // Start heartbeat for this user
      this.startUserHeartbeat(userId, socket);

      // Deliver queued notifications for offline user
      this.deliverQueuedNotifications(userId);

      // Emit authentication success
      socket.emit('authenticated', {
        userId,
        userRole,
        timestamp: new Date(),
        queuedNotifications: this.offlineQueue.get(userId)?.length || 0
      });

      console.log(`✅ User authenticated: ${userId} (${userRole}) on socket ${socket.id}`);

    } catch (error) {
      console.error('❌ Failed to handle user authentication:', error);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  }

  /**
   * Handle user disconnection
   * @param {Object} socket - Socket instance
   * @param {string} reason - Disconnection reason
   */
  handleUserDisconnection(socket, reason) {
    try {
      const userInfo = this.userSockets.get(socket.id);
      
      if (userInfo) {
        const { userId, userRole } = userInfo;
        
        // Clean up connection tracking
        this.connectedUsers.delete(userId);
        this.userSockets.delete(socket.id);
        
        // Remove from role room
        this.removeUserFromRoleRoom(userId, userRole);
        
        // Stop heartbeat
        this.stopUserHeartbeat(userId);
        
        console.log(`🔌 User disconnected: ${userId} (${userRole}) - Reason: ${reason}`);
        
        // Emit disconnection event
        this.emit('userDisconnected', { userId, userRole, reason, timestamp: new Date() });
      }

    } catch (error) {
      console.error('❌ Failed to handle user disconnection:', error);
    }
  }

  /**
   * Handle user reconnection
   * @param {Object} socket - Socket instance
   * @param {number} attemptNumber - Reconnection attempt number
   */
  handleUserReconnection(socket, attemptNumber) {
    try {
      const userInfo = this.userSockets.get(socket.id);
      
      if (userInfo) {
        const { userId } = userInfo;
        
        // Reset reconnection attempts
        this.reconnectionAttempts.delete(userId);
        
        // Update last activity
        const connectionInfo = this.connectedUsers.get(userId);
        if (connectionInfo) {
          connectionInfo.lastActivity = new Date();
        }
        
        console.log(`🔄 User reconnected: ${userId} (attempt ${attemptNumber})`);
        
        // Emit reconnection event
        this.emit('userReconnected', { userId, attemptNumber, timestamp: new Date() });
      }

    } catch (error) {
      console.error('❌ Failed to handle user reconnection:', error);
    }
  }

  /**
   * Handle heartbeat
   * @param {Object} socket - Socket instance
   * @param {Object} data - Heartbeat data
   */
  handleHeartbeat(socket, data) {
    try {
      const userInfo = this.userSockets.get(socket.id);
      
      if (userInfo) {
        const { userId } = userInfo;
        const connectionInfo = this.connectedUsers.get(userId);
        
        if (connectionInfo) {
          connectionInfo.lastActivity = new Date();
          
          // Respond with heartbeat acknowledgment
          socket.emit('heartbeat_ack', {
            timestamp: new Date(),
            serverTime: Date.now()
          });
        }
      }

    } catch (error) {
      console.error('❌ Failed to handle heartbeat:', error);
    }
  }

  /**
   * Handle notification acknowledgment
   * @param {Object} socket - Socket instance
   * @param {Object} ackData - Acknowledgment data
   */
  handleNotificationAcknowledgment(socket, ackData) {
    try {
      const { notificationId, deliveryId, timestamp } = ackData;
      const userInfo = this.userSockets.get(socket.id);
      
      if (userInfo && notificationId) {
        // Update delivery tracking
        const tracking = this.deliveryTracking.get(notificationId);
        if (tracking) {
          tracking.acknowledged = true;
          tracking.acknowledgedAt = new Date();
          tracking.deliveryTime = timestamp ? new Date(timestamp) - tracking.sentAt : null;
        }
        
        // Update delivery stats
        this.deliveryStats.delivered++;
        
        console.log(`✅ Notification acknowledged: ${notificationId} by user ${userInfo.userId}`);
        
        // Emit acknowledgment event
        this.emit('notificationAcknowledged', {
          notificationId,
          userId: userInfo.userId,
          deliveryId,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('❌ Failed to handle notification acknowledgment:', error);
    }
  }

  /**
   * Handle notification read status
   * @param {Object} socket - Socket instance
   * @param {Object} readData - Read status data
   */
  handleNotificationRead(socket, readData) {
    try {
      const { notificationId, readAt } = readData;
      const userInfo = this.userSockets.get(socket.id);
      
      if (userInfo && notificationId) {
        console.log(`👁️ Notification read: ${notificationId} by user ${userInfo.userId}`);
        
        // Emit read event
        this.emit('notificationRead', {
          notificationId,
          userId: userInfo.userId,
          readAt: readAt ? new Date(readAt) : new Date()
        });
      }

    } catch (error) {
      console.error('❌ Failed to handle notification read:', error);
    }
  }

  /**
   * Send notification to specific user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   * @returns {boolean} Success status
   */
  async sendNotificationToUser(userId, notification) {
    try {
      const connectionInfo = this.connectedUsers.get(userId);
      
      if (connectionInfo && connectionInfo.isAuthenticated) {
        // User is online, send immediately
        const deliveryId = this.generateDeliveryId();
        const enhancedNotification = {
          ...notification,
          deliveryId,
          timestamp: new Date(),
          requiresAck: notification.priority === 'critical' || notification.priority === 'emergency'
        };

        // Track delivery
        this.trackNotificationDelivery(notification.id, userId, deliveryId);

        // Send via WebSocket
        this.webSocketService.io.to(`user:${userId}`).emit('notification', enhancedNotification);
        
        // Update stats
        this.deliveryStats.sent++;
        
        console.log(`📬 Real-time notification sent to user ${userId}: ${notification.title}`);
        
        return true;
      } else {
        // User is offline, queue notification
        this.queueNotificationForOfflineUser(userId, notification);
        
        console.log(`📬 Notification queued for offline user ${userId}: ${notification.title}`);
        
        return false;
      }

    } catch (error) {
      console.error('❌ Failed to send notification to user:', error);
      this.deliveryStats.failed++;
      return false;
    }
  }

  /**
   * Broadcast notification to role
   * @param {string} role - User role
   * @param {Object} notification - Notification object
   * @returns {Object} Broadcast result
   */
  async broadcastToRole(role, notification) {
    try {
      const roleUsers = this.roleRooms.get(role) || new Set();
      const deliveryResults = {
        role,
        totalUsers: roleUsers.size,
        onlineUsers: 0,
        offlineUsers: 0,
        deliveryIds: [],
        timestamp: new Date()
      };

      console.log(`📢 Broadcasting to role ${role}: ${notification.title} (${roleUsers.size} users)`);

      // Process users in batches to avoid overwhelming the system
      const userArray = Array.from(roleUsers);
      const batches = this.createBatches(userArray, this.broadcastConfig.maxBatchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(async (userId) => {
          const success = await this.sendNotificationToUser(userId, notification);
          if (success) {
            deliveryResults.onlineUsers++;
          } else {
            deliveryResults.offlineUsers++;
          }
          return { userId, success };
        });

        // Wait for batch completion
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Add delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.sleep(this.broadcastConfig.batchDelay);
        }
      }

      // Also broadcast to role room for any connected clients
      const enhancedNotification = {
        ...notification,
        broadcastId: this.generateDeliveryId(),
        timestamp: new Date(),
        targetRole: role
      };

      this.webSocketService.io.to(`role:${role}`).emit('role_notification', enhancedNotification);

      console.log(`📊 Role broadcast completed: ${deliveryResults.onlineUsers} online, ${deliveryResults.offlineUsers} offline`);

      return deliveryResults;

    } catch (error) {
      console.error('❌ Failed to broadcast to role:', error);
      throw error;
    }
  }

  /**
   * Broadcast notification to all connected users
   * @param {Object} notification - Notification object
   * @returns {Object} Broadcast result
   */
  async broadcastToAll(notification) {
    try {
      const allUsers = new Set(this.connectedUsers.keys());
      const deliveryResults = {
        totalUsers: allUsers.size,
        deliveredCount: 0,
        failedCount: 0,
        timestamp: new Date()
      };

      console.log(`📢 Broadcasting to all users: ${notification.title} (${allUsers.size} users)`);

      // Create batches for efficient processing
      const userArray = Array.from(allUsers);
      const batches = this.createBatches(userArray, this.broadcastConfig.maxBatchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(async (userId) => {
          const success = await this.sendNotificationToUser(userId, notification);
          if (success) {
            deliveryResults.deliveredCount++;
          } else {
            deliveryResults.failedCount++;
          }
          return success;
        });

        await Promise.allSettled(batchPromises);
        
        // Add delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.sleep(this.broadcastConfig.batchDelay);
        }
      }

      // Also emit global broadcast
      const enhancedNotification = {
        ...notification,
        broadcastId: this.generateDeliveryId(),
        timestamp: new Date(),
        isGlobalBroadcast: true
      };

      this.webSocketService.io.emit('global_notification', enhancedNotification);

      console.log(`📊 Global broadcast completed: ${deliveryResults.deliveredCount} delivered, ${deliveryResults.failedCount} failed`);

      return deliveryResults;

    } catch (error) {
      console.error('❌ Failed to broadcast to all users:', error);
      throw error;
    }
  }

  /**
   * Queue notification for offline user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   */
  queueNotificationForOfflineUser(userId, notification) {
    try {
      if (!this.offlineQueue.has(userId)) {
        this.offlineQueue.set(userId, []);
      }

      const queue = this.offlineQueue.get(userId);
      
      // Add timestamp and expiry
      const queuedNotification = {
        ...notification,
        queuedAt: new Date(),
        expiresAt: new Date(Date.now() + this.queueRetentionTime)
      };

      queue.push(queuedNotification);
      
      // Limit queue size (keep only latest 100 notifications)
      if (queue.length > 100) {
        queue.splice(0, queue.length - 100);
      }

      this.deliveryStats.queued++;
      
      console.log(`📬 Notification queued for offline user ${userId} (queue size: ${queue.length})`);

    } catch (error) {
      console.error('❌ Failed to queue notification for offline user:', error);
    }
  }

  /**
   * Deliver queued notifications to user
   * @param {string} userId - User ID
   */
  async deliverQueuedNotifications(userId) {
    try {
      const queue = this.offlineQueue.get(userId);
      
      if (!queue || queue.length === 0) {
        return;
      }

      console.log(`📬 Delivering ${queue.length} queued notifications to user ${userId}`);

      // Filter out expired notifications
      const now = new Date();
      const validNotifications = queue.filter(notification => 
        notification.expiresAt > now
      );

      // Sort by creation time (oldest first)
      validNotifications.sort((a, b) => 
        new Date(a.createdAt || a.queuedAt) - new Date(b.createdAt || b.queuedAt)
      );

      // Deliver notifications in batches
      const batches = this.createBatches(validNotifications, 10); // 10 notifications per batch

      for (const batch of batches) {
        for (const notification of batch) {
          await this.sendNotificationToUser(userId, {
            ...notification,
            isQueued: true,
            originalQueuedAt: notification.queuedAt
          });
        }
        
        // Small delay between batches to avoid overwhelming the client
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.sleep(100);
        }
      }

      // Clear the queue
      this.offlineQueue.delete(userId);
      
      console.log(`✅ Delivered ${validNotifications.length} queued notifications to user ${userId}`);

    } catch (error) {
      console.error('❌ Failed to deliver queued notifications:', error);
    }
  }

  /**
   * Add user to role room
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   */
  addUserToRoleRoom(userId, userRole) {
    if (!this.roleRooms.has(userRole)) {
      this.roleRooms.set(userRole, new Set());
    }
    
    this.roleRooms.get(userRole).add(userId);
    
    console.log(`👥 Added user ${userId} to role room: ${userRole}`);
  }

  /**
   * Remove user from role room
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   */
  removeUserFromRoleRoom(userId, userRole) {
    const roleRoom = this.roleRooms.get(userRole);
    if (roleRoom) {
      roleRoom.delete(userId);
      
      // Clean up empty role rooms
      if (roleRoom.size === 0) {
        this.roleRooms.delete(userRole);
      }
    }
    
    console.log(`👥 Removed user ${userId} from role room: ${userRole}`);
  }

  /**
   * Start heartbeat monitoring for user
   * @param {string} userId - User ID
   * @param {Object} socket - Socket instance
   */
  startUserHeartbeat(userId, socket) {
    // Clear existing heartbeat if any
    this.stopUserHeartbeat(userId);
    
    const heartbeatInterval = setInterval(() => {
      const connectionInfo = this.connectedUsers.get(userId);
      
      if (connectionInfo) {
        const timeSinceActivity = Date.now() - connectionInfo.lastActivity.getTime();
        
        if (timeSinceActivity > this.heartbeatInterval * 2) {
          // Connection seems stale, disconnect
          console.log(`💔 Heartbeat timeout for user ${userId}, disconnecting`);
          socket.disconnect(true);
          this.stopUserHeartbeat(userId);
        } else {
          // Send heartbeat ping
          socket.emit('heartbeat_ping', { timestamp: Date.now() });
        }
      } else {
        this.stopUserHeartbeat(userId);
      }
    }, this.heartbeatInterval);
    
    this.connectionHeartbeat.set(userId, heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring for user
   * @param {string} userId - User ID
   */
  stopUserHeartbeat(userId) {
    const heartbeatInterval = this.connectionHeartbeat.get(userId);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.connectionHeartbeat.delete(userId);
    }
  }

  /**
   * Start heartbeat monitoring process
   */
  startHeartbeatMonitoring() {
    setInterval(() => {
      this.monitorConnectionHealth();
    }, this.heartbeatInterval);
    
    console.log('💓 Heartbeat monitoring started');
  }

  /**
   * Monitor connection health
   */
  monitorConnectionHealth() {
    try {
      const now = Date.now();
      const staleConnections = [];
      
      for (const [userId, connectionInfo] of this.connectedUsers.entries()) {
        const timeSinceActivity = now - connectionInfo.lastActivity.getTime();
        
        if (timeSinceActivity > this.heartbeatInterval * 3) {
          staleConnections.push(userId);
        }
      }
      
      // Clean up stale connections
      for (const userId of staleConnections) {
        console.log(`🧹 Cleaning up stale connection for user ${userId}`);
        const connectionInfo = this.connectedUsers.get(userId);
        if (connectionInfo) {
          this.handleUserDisconnection({ id: connectionInfo.socketId }, 'heartbeat_timeout');
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to monitor connection health:', error);
    }
  }

  /**
   * Start queue cleanup process
   */
  startQueueCleanup() {
    setInterval(() => {
      this.cleanupExpiredNotifications();
    }, 60 * 60 * 1000); // Run every hour
    
    console.log('🧹 Queue cleanup process started');
  }

  /**
   * Clean up expired notifications from queues
   */
  cleanupExpiredNotifications() {
    try {
      const now = new Date();
      let cleanedCount = 0;
      
      for (const [userId, queue] of this.offlineQueue.entries()) {
        const originalLength = queue.length;
        
        // Filter out expired notifications
        const validNotifications = queue.filter(notification => 
          notification.expiresAt > now
        );
        
        if (validNotifications.length !== originalLength) {
          if (validNotifications.length === 0) {
            this.offlineQueue.delete(userId);
          } else {
            this.offlineQueue.set(userId, validNotifications);
          }
          
          cleanedCount += originalLength - validNotifications.length;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired notifications from queues`);
      }
      
    } catch (error) {
      console.error('❌ Failed to cleanup expired notifications:', error);
    }
  }

  /**
   * Start delivery tracking cleanup
   */
  startDeliveryTracking() {
    setInterval(() => {
      this.cleanupDeliveryTracking();
    }, 60 * 60 * 1000); // Run every hour
    
    console.log('📊 Delivery tracking cleanup started');
  }

  /**
   * Clean up old delivery tracking data
   */
  cleanupDeliveryTracking() {
    try {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      let cleanedCount = 0;
      
      for (const [notificationId, tracking] of this.deliveryTracking.entries()) {
        if (tracking.sentAt.getTime() < cutoffTime) {
          this.deliveryTracking.delete(notificationId);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old delivery tracking records`);
      }
      
    } catch (error) {
      console.error('❌ Failed to cleanup delivery tracking:', error);
    }
  }

  /**
   * Track notification delivery
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @param {string} deliveryId - Delivery ID
   */
  trackNotificationDelivery(notificationId, userId, deliveryId) {
    this.deliveryTracking.set(notificationId, {
      userId,
      deliveryId,
      sentAt: new Date(),
      acknowledged: false,
      acknowledgedAt: null,
      deliveryTime: null
    });
  }

  /**
   * Get connected users by role
   * @param {string} role - User role
   * @returns {Array} Connected users
   */
  getConnectedUsersByRole(role) {
    const roleUsers = this.roleRooms.get(role) || new Set();
    const connectedUsers = [];
    
    for (const userId of roleUsers) {
      const connectionInfo = this.connectedUsers.get(userId);
      if (connectionInfo && connectionInfo.isAuthenticated) {
        connectedUsers.push({
          userId,
          userRole: role,
          connectedAt: connectionInfo.connectedAt,
          lastActivity: connectionInfo.lastActivity
        });
      }
    }
    
    return connectedUsers;
  }

  /**
   * Get all connected users
   * @returns {Array} All connected users
   */
  getAllConnectedUsers() {
    const connectedUsers = [];
    
    for (const [userId, connectionInfo] of this.connectedUsers.entries()) {
      if (connectionInfo.isAuthenticated) {
        connectedUsers.push({
          userId,
          userRole: connectionInfo.userRole,
          connectedAt: connectionInfo.connectedAt,
          lastActivity: connectionInfo.lastActivity
        });
      }
    }
    
    return connectedUsers;
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {boolean} Is user online
   */
  isUserOnline(userId) {
    const connectionInfo = this.connectedUsers.get(userId);
    return connectionInfo && connectionInfo.isAuthenticated;
  }

  /**
   * Get user's queued notification count
   * @param {string} userId - User ID
   * @returns {number} Queued notification count
   */
  getQueuedNotificationCount(userId) {
    const queue = this.offlineQueue.get(userId);
    return queue ? queue.length : 0;
  }

  /**
   * Utility methods
   */

  /**
   * Create batches from array
   * @param {Array} array - Array to batch
   * @param {number} batchSize - Batch size
   * @returns {Array} Array of batches
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Generate delivery ID
   * @returns {string} Delivery ID
   */
  generateDeliveryId() {
    return `ws_delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Sleep promise
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      roleRooms: Object.fromEntries(
        Array.from(this.roleRooms.entries()).map(([role, users]) => [role, users.size])
      ),
      offlineQueues: this.offlineQueue.size,
      totalQueuedNotifications: Array.from(this.offlineQueue.values())
        .reduce((total, queue) => total + queue.length, 0),
      deliveryStats: { ...this.deliveryStats },
      activeHeartbeats: this.connectionHeartbeat.size,
      deliveryTracking: this.deliveryTracking.size,
      timestamp: new Date()
    };
  }

  /**
   * Force disconnect user
   * @param {string} userId - User ID
   * @param {string} reason - Disconnect reason
   */
  forceDisconnectUser(userId, reason = 'admin_disconnect') {
    try {
      const connectionInfo = this.connectedUsers.get(userId);
      if (connectionInfo && this.webSocketService) {
        const socket = this.webSocketService.io.sockets.sockets.get(connectionInfo.socketId);
        if (socket) {
          socket.disconnect(true);
          console.log(`🔌 Force disconnected user ${userId}: ${reason}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to force disconnect user:', error);
    }
  }

  /**
   * Clear user's notification queue
   * @param {string} userId - User ID
   */
  clearUserQueue(userId) {
    try {
      const queueSize = this.getQueuedNotificationCount(userId);
      this.offlineQueue.delete(userId);
      console.log(`🧹 Cleared notification queue for user ${userId} (${queueSize} notifications)`);
      return queueSize;
    } catch (error) {
      console.error('❌ Failed to clear user queue:', error);
      return 0;
    }
  }
}

export default EnhancedWebSocketNotificationService;