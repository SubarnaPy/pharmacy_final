import EventEmitter from 'events';

/**
 * Real-Time Notification Service
 * Handles push notifications, email alerts, and SMS notifications
 */
class NotificationService extends EventEmitter {
  constructor(webSocketService = null) {
    super();
    this.webSocketService = webSocketService;
    this.emailService = null;
    this.smsService = null;
    this.pushService = null;
    this.notificationQueue = new Map(); // userId -> notifications array
    this.subscriptions = new Map(); // userId -> preferences
    this.templates = new Map(); // notificationType -> template
    
    this.initialize();
    console.log('✅ Notification Service initialized');
  }

  /**
   * Initialize notification service
   */
  initialize() {
    this.setupNotificationTemplates();
    this.setupEventListeners();
    this.startNotificationProcessor();
  }

  /**
   * Setup notification templates
   */
  setupNotificationTemplates() {
    // Inventory notification templates
    this.templates.set('inventory_low_stock', {
      title: 'Low Stock Alert',
      message: 'Medication {medicationName} is running low. Current stock: {currentStock}',
      priority: 'high',
      channels: ['websocket', 'email'],
      icon: '⚠️'
    });

    this.templates.set('inventory_expired', {
      title: 'Expired Medication Alert',
      message: 'Medication {medicationName} (Batch: {batchNumber}) has expired',
      priority: 'critical',
      channels: ['websocket', 'email', 'sms'],
      icon: '🚨'
    });

    this.templates.set('inventory_near_expiry', {
      title: 'Near Expiry Alert',
      message: 'Medication {medicationName} (Batch: {batchNumber}) expires in {daysToExpiry} days',
      priority: 'medium',
      channels: ['websocket', 'email'],
      icon: '⏰'
    });

    // Order notification templates
    this.templates.set('order_placed', {
      title: 'Order Placed',
      message: 'Your order #{orderNumber} has been placed successfully',
      priority: 'low',
      channels: ['websocket', 'email'],
      icon: '📦'
    });

    this.templates.set('order_confirmed', {
      title: 'Order Confirmed',
      message: 'Your order #{orderNumber} has been confirmed and is being prepared',
      priority: 'medium',
      channels: ['websocket', 'email', 'sms'],
      icon: '✅'
    });

    this.templates.set('order_ready', {
      title: 'Order Ready for Pickup',
      message: 'Your order #{orderNumber} is ready for pickup at {pharmacyLocation}',
      priority: 'high',
      channels: ['websocket', 'email', 'sms'],
      icon: '🏪'
    });

    this.templates.set('order_delivered', {
      title: 'Order Delivered',
      message: 'Your order #{orderNumber} has been delivered successfully',
      priority: 'medium',
      channels: ['websocket', 'email'],
      icon: '🚚'
    });

    // Prescription notification templates
    this.templates.set('prescription_received', {
      title: 'Prescription Received',
      message: 'Your prescription from Dr. {doctorName} has been received and is being processed',
      priority: 'medium',
      channels: ['websocket', 'email'],
      icon: '💊'
    });

    this.templates.set('prescription_ready', {
      title: 'Prescription Ready',
      message: 'Your prescription is ready for pickup at {pharmacyLocation}',
      priority: 'high',
      channels: ['websocket', 'email', 'sms'],
      icon: '✅'
    });

    this.templates.set('prescription_review_required', {
      title: 'Prescription Review Required',
      message: 'Prescription from Dr. {doctorName} requires pharmacist review',
      priority: 'high',
      channels: ['websocket', 'email'],
      icon: '👩‍⚕️'
    });

    // System notification templates
    this.templates.set('system_maintenance', {
      title: 'System Maintenance',
      message: 'System maintenance scheduled for {maintenanceTime}. Expected downtime: {duration}',
      priority: 'medium',
      channels: ['websocket', 'email'],
      icon: '🔧'
    });

    this.templates.set('system_update', {
      title: 'System Update',
      message: 'New features and improvements are now available',
      priority: 'low',
      channels: ['websocket'],
      icon: '🆕'
    });

    // Payment notification templates
    this.templates.set('payment_successful', {
      title: 'Payment Successful',
      message: 'Payment of {amount} for order #{orderNumber} processed successfully',
      priority: 'medium',
      channels: ['websocket', 'email'],
      icon: '💳'
    });

    this.templates.set('payment_failed', {
      title: 'Payment Failed',
      message: 'Payment for order #{orderNumber} failed. Please try again',
      priority: 'high',
      channels: ['websocket', 'email', 'sms'],
      icon: '❌'
    });

    // Appointment notification templates
    this.templates.set('appointment_scheduled', {
      title: 'Consultation Scheduled',
      message: 'Your consultation with {pharmacistName} is scheduled for {appointmentTime}',
      priority: 'medium',
      channels: ['websocket', 'email', 'sms'],
      icon: '📅'
    });

    this.templates.set('appointment_reminder', {
      title: 'Consultation Reminder',
      message: 'Reminder: Your consultation with {pharmacistName} is in {timeUntil}',
      priority: 'high',
      channels: ['websocket', 'email', 'sms'],
      icon: '⏰'
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for inventory events
    this.on('inventoryAlert', (alertData) => {
      this.processInventoryAlert(alertData);
    });

    // Listen for order events
    this.on('orderStatusChanged', (orderData) => {
      this.processOrderStatusChange(orderData);
    });

    // Listen for prescription events
    this.on('prescriptionStatusChanged', (prescriptionData) => {
      this.processPrescriptionStatusChange(prescriptionData);
    });

    // Listen for payment events
    this.on('paymentProcessed', (paymentData) => {
      this.processPaymentEvent(paymentData);
    });

    // Listen for appointment events
    this.on('appointmentEvent', (appointmentData) => {
      this.processAppointmentEvent(appointmentData);
    });

    // Listen for system events
    this.on('systemEvent', (systemData) => {
      this.processSystemEvent(systemData);
    });
  }

  /**
   * Start notification processor (background task)
   */
  startNotificationProcessor() {
    setInterval(() => {
      this.processNotificationQueue();
    }, 5000); // Process every 5 seconds

    setInterval(() => {
      this.sendScheduledNotifications();
    }, 60000); // Check scheduled notifications every minute
  }

  /**
   * Create and store a notification
   * @param {Object} notificationData - Notification data
   * @returns {Object} Created notification
   */
  async createNotification(notificationData) {
    try {
      const {
        type,
        recipient,
        recipientType = 'user',
        title,
        message,
        data = {},
        priority = 'medium',
        channels = ['websocket']
      } = notificationData;

      console.log(`📝 Creating notification: ${type} for ${recipientType} ${recipient}`);

      // Create notification object
      const notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        recipient,
        recipientType,
        title,
        message,
        data,
        priority,
        channels,
        createdAt: new Date(),
        isRead: false,
        deliveredAt: null
      };

      // Send the notification immediately
      await this.sendNotification(recipient, type, data, {
        title,
        message,
        priority,
        channels
      });

      console.log(`✅ Notification created and sent: ${notification.id}`);
      return notification;

    } catch (error) {
      console.error('❌ Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to user
   * @param {string} userId - User ID
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {Object} options - Additional options
   */
  async sendNotification(userId, type, data, options = {}) {
    try {
      let template = this.templates.get(type);
      
      // If no template exists, create a generic one from options
      if (!template) {
        console.log(`⚠️ No template for type: ${type}, creating generic template`);
        template = {
          title: options.title || 'Notification',
          message: options.message || 'You have a new notification',
          priority: options.priority || 'medium',
          channels: options.channels || ['websocket'],
          icon: '📬'
        };
      }

      // Get user preferences
      const userPreferences = this.subscriptions.get(userId) || this.getDefaultPreferences();

      // Check if user wants this type of notification
      if (!this.shouldSendNotification(userPreferences, type, template.priority)) {
        console.log(`🔕 Notification blocked by user preferences: ${type} for user ${userId}`);
        return;
      }

      // Build notification content (use options if provided)
      const notification = this.buildNotification(template, data, options);

      // Add to queue for processing
      this.queueNotification(userId, notification, template.channels);

      console.log(`📬 Notification queued: ${type} for user ${userId}`);

    } catch (error) {
      console.error('❌ Failed to send notification:', error.message);
    }
  }

  /**
   * Send bulk notifications
   * @param {Array} recipients - Array of user IDs
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {Object} options - Additional options
   */
  async sendBulkNotification(recipients, type, data, options = {}) {
    try {
      console.log(`📢 Sending bulk notification: ${type} to ${recipients.length} users`);

      const promises = recipients.map(userId => 
        this.sendNotification(userId, type, data, options)
      );

      await Promise.all(promises);

    } catch (error) {
      console.error('❌ Failed to send bulk notification:', error.message);
    }
  }

  /**
   * Send role-based notification
   * @param {string} role - User role
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {Object} options - Additional options
   */
  async sendRoleBasedNotification(role, type, data, options = {}) {
    try {
      // Get users with specific role from WebSocket service
      const connectedUsers = this.webSocketService.getConnectedUsersByRole(role);
      const userIds = connectedUsers.map(user => user.userId);

      if (userIds.length > 0) {
        await this.sendBulkNotification(userIds, type, data, options);
      }

      // Also send via WebSocket to role room
      if (this.webSocketService) {
        this.webSocketService.io.to(`role:${role}`).emit('role-notification', {
          type,
          data,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('❌ Failed to send role-based notification:', error.message);
    }
  }

  /**
   * Schedule notification
   * @param {string} userId - User ID
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {Date} scheduledTime - When to send
   * @param {Object} options - Additional options
   */
  scheduleNotification(userId, type, data, scheduledTime, options = {}) {
    try {
      const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Store scheduled notification (in production, use persistent storage)
      const scheduledNotification = {
        id: scheduleId,
        userId,
        type,
        data,
        scheduledTime,
        options,
        status: 'scheduled',
        createdAt: new Date()
      };

      // Add to scheduled notifications (implement persistent storage)
      this.storeScheduledNotification(scheduledNotification);

      console.log(`⏰ Notification scheduled: ${type} for user ${userId} at ${scheduledTime}`);

      return scheduleId;

    } catch (error) {
      console.error('❌ Failed to schedule notification:', error.message);
    }
  }

  /**
   * Cancel scheduled notification
   * @param {string} scheduleId - Schedule ID
   */
  cancelScheduledNotification(scheduleId) {
    try {
      // Mark as cancelled (implement in persistent storage)
      console.log(`❌ Cancelled scheduled notification: ${scheduleId}`);
    } catch (error) {
      console.error('❌ Failed to cancel scheduled notification:', error.message);
    }
  }

  /**
   * Update user notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Notification preferences
   */
  updateUserPreferences(userId, preferences) {
    try {
      this.subscriptions.set(userId, preferences);
      console.log(`🔧 Updated notification preferences for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to update user preferences:', error.message);
    }
  }

  /**
   * Process specific notification types
   */

  /**
   * Process inventory alert
   * @param {Object} alertData - Alert data
   */
  async processInventoryAlert(alertData) {
    try {
      const { type, medication, batch, location, currentStock, threshold } = alertData;

      switch (type) {
        case 'low_stock':
          await this.sendRoleBasedNotification('pharmacist', 'inventory_low_stock', {
            medicationName: medication.name,
            currentStock,
            threshold,
            location: location?.name
          });
          break;

        case 'expired':
          await this.sendRoleBasedNotification('admin', 'inventory_expired', {
            medicationName: medication.name,
            batchNumber: batch.batchNumber,
            location: location?.name
          });
          break;

        case 'near_expiry':
          const daysToExpiry = Math.ceil((batch.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
          await this.sendRoleBasedNotification('pharmacist', 'inventory_near_expiry', {
            medicationName: medication.name,
            batchNumber: batch.batchNumber,
            daysToExpiry,
            location: location?.name
          });
          break;
      }

    } catch (error) {
      console.error('❌ Failed to process inventory alert:', error.message);
    }
  }

  /**
   * Process order status change
   * @param {Object} orderData - Order data
   */
  async processOrderStatusChange(orderData) {
    try {
      const { orderId, orderNumber, customerId, status, previousStatus, pharmacyLocation } = orderData;

      switch (status) {
        case 'confirmed':
          await this.sendNotification(customerId, 'order_confirmed', {
            orderNumber,
            orderId
          });
          break;

        case 'ready':
          await this.sendNotification(customerId, 'order_ready', {
            orderNumber,
            pharmacyLocation: pharmacyLocation?.name || 'Main Pharmacy'
          });
          break;

        case 'delivered':
          await this.sendNotification(customerId, 'order_delivered', {
            orderNumber,
            orderId
          });
          break;
      }

    } catch (error) {
      console.error('❌ Failed to process order status change:', error.message);
    }
  }

  /**
   * Process prescription status change
   * @param {Object} prescriptionData - Prescription data
   */
  async processPrescriptionStatusChange(prescriptionData) {
    try {
      const { prescriptionId, userId, status, doctorName, pharmacyLocation, requiresReview } = prescriptionData;

      switch (status) {
        case 'received':
          await this.sendNotification(userId, 'prescription_received', {
            doctorName,
            prescriptionId
          });
          break;

        case 'ready':
          await this.sendNotification(userId, 'prescription_ready', {
            pharmacyLocation: pharmacyLocation?.name || 'Main Pharmacy'
          });
          break;

        case 'review_required':
          await this.sendRoleBasedNotification('pharmacist', 'prescription_review_required', {
            doctorName,
            prescriptionId,
            userId
          });
          break;
      }

    } catch (error) {
      console.error('❌ Failed to process prescription status change:', error.message);
    }
  }

  /**
   * Process payment event
   * @param {Object} paymentData - Payment data
   */
  async processPaymentEvent(paymentData) {
    try {
      const { userId, orderId, orderNumber, amount, status, method } = paymentData;

      switch (status) {
        case 'successful':
          await this.sendNotification(userId, 'payment_successful', {
            amount: `$${amount.toFixed(2)}`,
            orderNumber,
            method
          });
          break;

        case 'failed':
          await this.sendNotification(userId, 'payment_failed', {
            orderNumber,
            amount: `$${amount.toFixed(2)}`
          });
          break;
      }

    } catch (error) {
      console.error('❌ Failed to process payment event:', error.message);
    }
  }

  /**
   * Process appointment event
   * @param {Object} appointmentData - Appointment data
   */
  async processAppointmentEvent(appointmentData) {
    try {
      const { userId, pharmacistName, appointmentTime, type, action } = appointmentData;

      switch (action) {
        case 'scheduled':
          await this.sendNotification(userId, 'appointment_scheduled', {
            pharmacistName,
            appointmentTime: appointmentTime.toLocaleString()
          });
          break;

        case 'reminder':
          const timeUntil = this.getTimeUntilAppointment(appointmentTime);
          await this.sendNotification(userId, 'appointment_reminder', {
            pharmacistName,
            timeUntil
          });
          break;
      }

    } catch (error) {
      console.error('❌ Failed to process appointment event:', error.message);
    }
  }

  /**
   * Process system event
   * @param {Object} systemData - System data
   */
  async processSystemEvent(systemData) {
    try {
      const { type, message, data } = systemData;

      switch (type) {
        case 'maintenance':
          await this.sendRoleBasedNotification('admin', 'system_maintenance', {
            maintenanceTime: data.scheduledTime,
            duration: data.estimatedDuration
          });
          break;

        case 'update':
          await this.sendRoleBasedNotification('user', 'system_update', {
            version: data.version,
            features: data.newFeatures
          });
          break;
      }

    } catch (error) {
      console.error('❌ Failed to process system event:', error.message);
    }
  }

  /**
   * Utility methods
   */

  /**
   * Build notification from template
   * @param {Object} template - Notification template
   * @param {Object} data - Data for template
   * @param {Object} options - Additional options
   * @returns {Object} - Built notification
   */
  buildNotification(template, data, options) {
    return {
      id: this.generateNotificationId(),
      title: this.interpolateTemplate(template.title, data),
      message: this.interpolateTemplate(template.message, data),
      priority: options.priority || template.priority,
      icon: template.icon,
      createdAt: new Date(),
      expiresAt: options.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      actions: options.actions || [],
      metadata: options.metadata || {}
    };
  }

  /**
   * Interpolate template with data
   * @param {string} template - Template string
   * @param {Object} data - Data object
   * @returns {string} - Interpolated string
   */
  interpolateTemplate(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Queue notification for processing
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   * @param {Array} channels - Delivery channels
   */
  queueNotification(userId, notification, channels) {
    if (!this.notificationQueue.has(userId)) {
      this.notificationQueue.set(userId, []);
    }

    this.notificationQueue.get(userId).push({
      notification,
      channels,
      queuedAt: new Date()
    });
  }

  /**
   * Process notification queue
   */
  async processNotificationQueue() {
    try {
      for (const [userId, notifications] of this.notificationQueue.entries()) {
        if (notifications.length > 0) {
          const notification = notifications.shift();
          await this.deliverNotification(userId, notification);
        }
      }
    } catch (error) {
      console.error('❌ Failed to process notification queue:', error.message);
    }
  }

  /**
   * Deliver notification through channels
   * @param {string} userId - User ID
   * @param {Object} notificationData - Notification data with channels
   */
  async deliverNotification(userId, notificationData) {
    try {
      const { notification, channels } = notificationData;

      for (const channel of channels) {
        switch (channel) {
          case 'websocket':
            await this.deliverWebSocketNotification(userId, notification);
            break;
          case 'email':
            await this.deliverEmailNotification(userId, notification);
            break;
          case 'sms':
            await this.deliverSMSNotification(userId, notification);
            break;
          case 'push':
            await this.deliverPushNotification(userId, notification);
            break;
        }
      }

    } catch (error) {
      console.error('❌ Failed to deliver notification:', error.message);
    }
  }

  /**
   * Deliver WebSocket notification
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   */
  async deliverWebSocketNotification(userId, notification) {
    try {
      if (this.webSocketService) {
        this.webSocketService.sendNotificationToUser(userId, notification);
      } else {
        console.log(`📬 WebSocket notification (no service): ${notification.title} for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Failed to deliver WebSocket notification:', error.message);
    }
  }

  /**
   * Deliver email notification
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   */
  async deliverEmailNotification(userId, notification) {
    try {
      // Implement email delivery
      console.log(`📧 Email notification delivered to user ${userId}: ${notification.title}`);
    } catch (error) {
      console.error('❌ Failed to deliver email notification:', error.message);
    }
  }

  /**
   * Deliver SMS notification
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   */
  async deliverSMSNotification(userId, notification) {
    try {
      // Implement SMS delivery
      console.log(`📱 SMS notification delivered to user ${userId}: ${notification.title}`);
    } catch (error) {
      console.error('❌ Failed to deliver SMS notification:', error.message);
    }
  }

  /**
   * Deliver push notification
   * @param {string} userId - User ID
   * @param {Object} notification - Notification object
   */
  async deliverPushNotification(userId, notification) {
    try {
      // Implement push notification delivery
      console.log(`🔔 Push notification delivered to user ${userId}: ${notification.title}`);
    } catch (error) {
      console.error('❌ Failed to deliver push notification:', error.message);
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   * @param {Object} preferences - User preferences
   * @param {string} type - Notification type
   * @param {string} priority - Notification priority
   * @returns {boolean} - Should send notification
   */
  shouldSendNotification(preferences, type, priority) {
    // Implement preference checking logic
    return true; // Default: send all notifications
  }

  /**
   * Get default notification preferences
   * @returns {Object} - Default preferences
   */
  getDefaultPreferences() {
    return {
      websocket: true,
      email: true,
      sms: false,
      push: true,
      priorities: ['low', 'medium', 'high', 'critical'],
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }

  /**
   * Send scheduled notifications
   */
  async sendScheduledNotifications() {
    try {
      // Implement scheduled notification processing
      // This would typically query a database for scheduled notifications
      // that are due to be sent
    } catch (error) {
      console.error('❌ Failed to send scheduled notifications:', error.message);
    }
  }

  /**
   * Store scheduled notification
   * @param {Object} scheduledNotification - Scheduled notification
   */
  storeScheduledNotification(scheduledNotification) {
    // Implement persistent storage for scheduled notifications
    // In production, this would store in database
  }

  /**
   * Generate unique notification ID
   * @returns {string} - Notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get time until appointment
   * @param {Date} appointmentTime - Appointment time
   * @returns {string} - Time until appointment
   */
  getTimeUntilAppointment(appointmentTime) {
    const timeDiff = appointmentTime - new Date();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Get notification statistics
   * @returns {Object} - Notification statistics
   */
  getNotificationStats() {
    return {
      queuedNotifications: Array.from(this.notificationQueue.values()).reduce((total, queue) => total + queue.length, 0),
      activeSubscriptions: this.subscriptions.size,
      templateCount: this.templates.size,
      timestamp: new Date()
    };
  }
}

export default NotificationService;
