import EnhancedNotificationService from '../services/notifications/EnhancedNotificationService.js';

/**
 * Notification Middleware
 * Automatically triggers notifications based on controller actions
 */
class NotificationMiddleware {
  constructor(notificationService = null) {
    this.notificationService = notificationService;
    this.eventMappings = new Map();
    this.setupEventMappings();
  }

  /**
   * Setup event mappings for different controller actions
   */
  setupEventMappings() {
    // User/Authentication events
    this.eventMappings.set('user.created', {
      type: 'user_registered',
      category: 'administrative',
      priority: 'medium',
      getRecipients: (data) => [
        { userId: data.userId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
      ],
      getContent: (data) => ({
        title: 'Welcome to Healthcare Platform',
        message: `Welcome ${data.name}! Your account has been created successfully.`,
        actionUrl: '/dashboard',
        actionText: 'Go to Dashboard'
      })
    });

    this.eventMappings.set('user.verified', {
      type: 'user_verified',
      category: 'administrative',
      priority: 'medium',
      getRecipients: (data) => [
        { userId: data.userId, userRole: data.role, deliveryChannels: ['websocket', 'email'] }
      ],
      getContent: (data) => ({
        title: 'Account Verified',
        message: 'Your account has been successfully verified. You can now access all features.',
        actionUrl: '/dashboard',
        actionText: 'Go to Dashboard'
      })
    });

    // Prescription events
    this.eventMappings.set('prescription.created', {
      type: 'prescription_created',
      category: 'medical',
      priority: 'high',
      getRecipients: (data) => {
        const recipients = [
          { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
        ];
        
        // Notify relevant pharmacies
        if (data.pharmacyIds && data.pharmacyIds.length > 0) {
          data.pharmacyIds.forEach(pharmacyId => {
            recipients.push({ 
              userId: pharmacyId, 
              userRole: 'pharmacy', 
              deliveryChannels: ['websocket', 'email'] 
            });
          });
        }
        
        return recipients;
      },
      getContent: (data) => ({
        title: 'New Prescription Created',
        message: `A new prescription has been created by Dr. ${data.doctorName}.`,
        actionUrl: `/prescriptions/${data.prescriptionId}`,
        actionText: 'View Prescription'
      })
    });

    this.eventMappings.set('prescription.updated', {
      type: 'prescription_updated',
      category: 'medical',
      priority: 'medium',
      getRecipients: (data) => [
        { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
      ],
      getContent: (data) => ({
        title: 'Prescription Updated',
        message: `Your prescription has been updated by Dr. ${data.doctorName}.`,
        actionUrl: `/prescriptions/${data.prescriptionId}`,
        actionText: 'View Changes'
      })
    });

    this.eventMappings.set('prescription.ready', {
      type: 'prescription_ready',
      category: 'medical',
      priority: 'high',
      getRecipients: (data) => [
        { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Prescription Ready for Pickup',
        message: `Your prescription is ready for pickup at ${data.pharmacyName}.`,
        actionUrl: `/prescriptions/${data.prescriptionId}`,
        actionText: 'View Details'
      })
    });

    // Order events
    this.eventMappings.set('order.created', {
      type: 'order_placed',
      category: 'administrative',
      priority: 'medium',
      getRecipients: (data) => {
        const recipients = [
          { userId: data.customerId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
        ];
        
        if (data.pharmacyId) {
          recipients.push({ 
            userId: data.pharmacyId, 
            userRole: 'pharmacy', 
            deliveryChannels: ['websocket', 'email'] 
          });
        }
        
        return recipients;
      },
      getContent: (data) => ({
        title: 'Order Placed Successfully',
        message: `Your order #${data.orderNumber} has been placed and is being processed.`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'Track Order'
      })
    });

    this.eventMappings.set('order.confirmed', {
      type: 'order_confirmed',
      category: 'administrative',
      priority: 'medium',
      getRecipients: (data) => [
        { userId: data.customerId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
      ],
      getContent: (data) => ({
        title: 'Order Confirmed',
        message: `Your order #${data.orderNumber} has been confirmed and is being prepared.`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'Track Order'
      })
    });

    this.eventMappings.set('order.ready', {
      type: 'order_ready',
      category: 'administrative',
      priority: 'high',
      getRecipients: (data) => [
        { userId: data.customerId, userRole: 'patient', deliveryChannels: ['websocket', 'email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Order Ready for Pickup',
        message: `Your order #${data.orderNumber} is ready for pickup at ${data.pharmacyName}.`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'View Details'
      })
    });

    this.eventMappings.set('order.delivered', {
      type: 'order_delivered',
      category: 'administrative',
      priority: 'medium',
      getRecipients: (data) => [
        { userId: data.customerId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
      ],
      getContent: (data) => ({
        title: 'Order Delivered',
        message: `Your order #${data.orderNumber} has been delivered successfully.`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'Rate Order'
      })
    });

    // Appointment events
    this.eventMappings.set('appointment.scheduled', {
      type: 'appointment_scheduled',
      category: 'medical',
      priority: 'medium',
      getRecipients: (data) => {
        const recipients = [
          { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email', 'sms'] }
        ];
        
        if (data.doctorId) {
          recipients.push({ 
            userId: data.doctorId, 
            userRole: 'doctor', 
            deliveryChannels: ['websocket', 'email'] 
          });
        }
        
        return recipients;
      },
      getContent: (data) => ({
        title: 'Appointment Scheduled',
        message: `Your appointment with Dr. ${data.doctorName} is scheduled for ${data.appointmentTime}.`,
        actionUrl: `/appointments/${data.appointmentId}`,
        actionText: 'View Appointment'
      })
    });

    this.eventMappings.set('appointment.reminder', {
      type: 'appointment_reminder',
      category: 'medical',
      priority: 'high',
      getRecipients: (data) => [
        { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Appointment Reminder',
        message: `Reminder: Your appointment with Dr. ${data.doctorName} is in ${data.timeUntil}.`,
        actionUrl: `/appointments/${data.appointmentId}`,
        actionText: 'Join Consultation'
      })
    });

    // Payment events
    this.eventMappings.set('payment.successful', {
      type: 'payment_successful',
      category: 'administrative',
      priority: 'medium',
      getRecipients: (data) => [
        { userId: data.userId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
      ],
      getContent: (data) => ({
        title: 'Payment Successful',
        message: `Your payment of $${data.amount} has been processed successfully.`,
        actionUrl: `/payments/${data.paymentId}`,
        actionText: 'View Receipt'
      })
    });

    this.eventMappings.set('payment.failed', {
      type: 'payment_failed',
      category: 'administrative',
      priority: 'high',
      getRecipients: (data) => [
        { userId: data.userId, userRole: 'patient', deliveryChannels: ['websocket', 'email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Payment Failed',
        message: `Your payment of $${data.amount} could not be processed. Please try again.`,
        actionUrl: `/payments/retry/${data.paymentId}`,
        actionText: 'Retry Payment'
      })
    });

    // Inventory events
    this.eventMappings.set('inventory.low_stock', {
      type: 'inventory_low_stock',
      category: 'system',
      priority: 'high',
      getRecipients: (data) => [
        // Notify pharmacy staff and admins
        { userId: data.pharmacyId, userRole: 'pharmacy', deliveryChannels: ['websocket', 'email'] }
      ],
      getContent: (data) => ({
        title: 'Low Stock Alert',
        message: `${data.medicationName} is running low. Current stock: ${data.currentStock}`,
        actionUrl: `/inventory/${data.medicationId}`,
        actionText: 'Reorder Now'
      })
    });

    this.eventMappings.set('inventory.expired', {
      type: 'inventory_expired',
      category: 'system',
      priority: 'critical',
      getRecipients: (data) => [
        { userId: data.pharmacyId, userRole: 'pharmacy', deliveryChannels: ['websocket', 'email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Expired Medication Alert',
        message: `${data.medicationName} (Batch: ${data.batchNumber}) has expired and must be removed.`,
        actionUrl: `/inventory/${data.medicationId}`,
        actionText: 'Remove from Inventory'
      })
    });

    // Profile events
    this.eventMappings.set('profile.updated', {
      type: 'profile_updated',
      category: 'administrative',
      priority: 'low',
      getRecipients: (data) => [
        { userId: data.userId, userRole: data.userRole, deliveryChannels: ['websocket'] }
      ],
      getContent: (data) => ({
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.',
        actionUrl: '/profile',
        actionText: 'View Profile'
      })
    });

    // Doctor profile events
    this.eventMappings.set('doctor.profile_updated', {
      type: 'doctor_profile_updated',
      category: 'administrative',
      priority: 'medium',
      getRecipients: (data) => {
        const recipients = [
          { userId: data.doctorId, userRole: 'doctor', deliveryChannels: ['websocket', 'email'] }
        ];
        
        // Notify patients who have appointments with this doctor
        if (data.patientIds && data.patientIds.length > 0) {
          data.patientIds.forEach(patientId => {
            recipients.push({ 
              userId: patientId, 
              userRole: 'patient', 
              deliveryChannels: ['websocket', 'email'] 
            });
          });
        }
        
        // Notify admins
        if (data.notifyAdmins) {
          recipients.push({ 
            userId: 'admin', 
            userRole: 'admin', 
            deliveryChannels: ['websocket', 'email'] 
          });
        }
        
        return recipients;
      },
      getContent: (data) => ({
        title: 'Doctor Profile Updated',
        message: `Dr. ${data.doctorName} has updated their profile information.`,
        actionUrl: `/doctors/${data.doctorId}`,
        actionText: 'View Profile'
      })
    });

    // Password and security events
    this.eventMappings.set('password.reset_requested', {
      type: 'password_reset_requested',
      category: 'system',
      priority: 'high',
      getRecipients: (data) => [
        { userId: data.userId, userRole: 'patient', deliveryChannels: ['email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Password Reset Requested',
        message: `A password reset was requested for your account from IP: ${data.ipAddress}`,
        actionUrl: '/security',
        actionText: 'Review Security'
      })
    });

    this.eventMappings.set('password.reset_completed', {
      type: 'password_reset_completed',
      category: 'system',
      priority: 'high',
      getRecipients: (data) => [
        { userId: data.userId, userRole: 'patient', deliveryChannels: ['email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Password Reset Successful',
        message: 'Your password has been successfully reset.',
        actionUrl: '/security',
        actionText: 'Review Security'
      })
    });

    this.eventMappings.set('password.changed', {
      type: 'password_changed',
      category: 'system',
      priority: 'high',
      getRecipients: (data) => [
        { userId: data.userId, userRole: 'patient', deliveryChannels: ['email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Password Changed',
        message: 'Your password has been successfully changed.',
        actionUrl: '/security',
        actionText: 'Review Security'
      })
    });

    this.eventMappings.set('user.login_success', {
      type: 'login_success',
      category: 'system',
      priority: 'low',
      getRecipients: (data) => [
        { userId: data.userId, userRole: 'patient', deliveryChannels: ['websocket'] }
      ],
      getContent: (data) => ({
        title: 'Successful Login',
        message: `Welcome back! You logged in from ${data.ipAddress}`,
        actionUrl: '/dashboard',
        actionText: 'Go to Dashboard'
      })
    });

    // Consultation/Appointment events
    this.eventMappings.set('consultation.scheduled', {
      type: 'appointment_scheduled',
      category: 'medical',
      priority: 'medium',
      getRecipients: (data) => {
        const recipients = [
          { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email', 'sms'] }
        ];
        
        if (data.doctorId) {
          recipients.push({ 
            userId: data.doctorId, 
            userRole: 'doctor', 
            deliveryChannels: ['websocket', 'email'] 
          });
        }
        
        return recipients;
      },
      getContent: (data) => ({
        title: 'Consultation Scheduled',
        message: `Your ${data.consultationType} consultation with Dr. ${data.doctorName} is scheduled for ${data.scheduledDate} at ${data.scheduledTime}.`,
        actionUrl: `/consultations/${data.consultationId}`,
        actionText: 'View Details'
      })
    });

    this.eventMappings.set('consultation.cancelled', {
      type: 'appointment_cancelled',
      category: 'medical',
      priority: 'high',
      getRecipients: (data) => {
        const recipients = [
          { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
        ];
        
        if (data.doctorId) {
          recipients.push({ 
            userId: data.doctorId, 
            userRole: 'doctor', 
            deliveryChannels: ['websocket', 'email'] 
          });
        }
        
        return recipients;
      },
      getContent: (data) => ({
        title: 'Consultation Cancelled',
        message: `Your ${data.consultationType} consultation scheduled for ${data.scheduledDate} at ${data.scheduledTime} has been cancelled.`,
        actionUrl: '/consultations',
        actionText: 'View Consultations'
      })
    });

    this.eventMappings.set('consultation.reminder', {
      type: 'appointment_reminder',
      category: 'medical',
      priority: 'high',
      getRecipients: (data) => [
        { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Consultation Reminder',
        message: `Reminder: Your consultation with Dr. ${data.doctorName} is in ${data.timeUntil}.`,
        actionUrl: `/consultations/${data.consultationId}/join`,
        actionText: 'Join Consultation'
      })
    });

    this.eventMappings.set('consultation.completed', {
      type: 'consultation_completed',
      category: 'medical',
      priority: 'medium',
      getRecipients: (data) => {
        const recipients = [
          { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
        ];
        
        if (data.doctorId) {
          recipients.push({ 
            userId: data.doctorId, 
            userRole: 'doctor', 
            deliveryChannels: ['websocket', 'email'] 
          });
        }
        
        return recipients;
      },
      getContent: (data) => ({
        title: 'Consultation Completed',
        message: `Your consultation with Dr. ${data.doctorName} has been completed. Please provide feedback.`,
        actionUrl: `/consultations/${data.consultationId}/feedback`,
        actionText: 'Leave Feedback'
      })
    });

    // Prescription and pharmacy events
    this.eventMappings.set('prescription.pharmacy_response', {
      type: 'prescription_pharmacy_response',
      category: 'medical',
      priority: 'high',
      getRecipients: (data) => [
        { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email', 'sms'] }
      ],
      getContent: (data) => ({
        title: `Pharmacy ${data.action === 'accept' ? 'Accepted' : 'Declined'} Your Prescription`,
        message: data.action === 'accept' 
          ? `${data.pharmacyName} has accepted your prescription request. Estimated fulfillment: ${data.estimatedFulfillmentTime} minutes.`
          : `${data.pharmacyName} has declined your prescription request. Please try another pharmacy.`,
        actionUrl: `/prescriptions/${data.prescriptionRequestId}`,
        actionText: 'View Details'
      })
    });

    this.eventMappings.set('prescription.ready', {
      type: 'prescription_ready',
      category: 'medical',
      priority: 'high',
      getRecipients: (data) => [
        { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Prescription Ready for Pickup',
        message: `Your prescription is ready for pickup at ${data.pharmacyName}.`,
        actionUrl: `/prescriptions/${data.prescriptionId}`,
        actionText: 'View Details'
      })
    });

    this.eventMappings.set('prescription.status_updated', {
      type: 'prescription_status_updated',
      category: 'medical',
      priority: 'medium',
      getRecipients: (data) => [
        { userId: data.patientId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
      ],
      getContent: (data) => ({
        title: 'Prescription Status Updated',
        message: `Your prescription status has been updated to: ${data.status}`,
        actionUrl: `/prescriptions/${data.prescriptionId}`,
        actionText: 'View Details'
      })
    });

    // Order and delivery events
    this.eventMappings.set('order.status_updated', {
      type: 'order_status_changed',
      category: 'administrative',
      priority: 'medium',
      getRecipients: (data) => {
        const recipients = [
          { userId: data.customerId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
        ];
        
        if (data.pharmacyId) {
          recipients.push({ 
            userId: data.pharmacyId, 
            userRole: 'pharmacy', 
            deliveryChannels: ['websocket', 'email'] 
          });
        }
        
        return recipients;
      },
      getContent: (data) => ({
        title: 'Order Status Updated',
        message: `Your order #${data.orderNumber} status has been updated from ${data.previousStatus} to ${data.newStatus}.`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'Track Order'
      })
    });

    this.eventMappings.set('order.delivered', {
      type: 'order_delivered',
      category: 'administrative',
      priority: 'medium',
      getRecipients: (data) => [
        { userId: data.customerId, userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
      ],
      getContent: (data) => ({
        title: 'Order Delivered',
        message: `Your order #${data.orderNumber} has been delivered successfully.`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'Rate Order'
      })
    });

    // Inventory management events
    this.eventMappings.set('inventory.low_stock', {
      type: 'inventory_low_stock',
      category: 'system',
      priority: 'high',
      getRecipients: (data) => [
        // Notify pharmacy staff and admins
        { userId: data.pharmacyId, userRole: 'pharmacy', deliveryChannels: ['websocket', 'email'] }
      ],
      getContent: (data) => ({
        title: 'Low Stock Alert',
        message: `${data.medicationName} is running low. Current stock: ${data.currentStock}`,
        actionUrl: `/inventory/${data.medicationId}`,
        actionText: 'Reorder Now'
      })
    });

    this.eventMappings.set('inventory.expired', {
      type: 'inventory_expired',
      category: 'system',
      priority: 'critical',
      getRecipients: (data) => [
        { userId: data.pharmacyId, userRole: 'pharmacy', deliveryChannels: ['websocket', 'email', 'sms'] }
      ],
      getContent: (data) => ({
        title: 'Expired Medication Alert',
        message: `${data.medicationName} (Batch: ${data.batchNumber}) ${data.daysUntilExpiry <= 0 ? 'has expired' : `expires in ${data.daysUntilExpiry} days`} and must be removed.`,
        actionUrl: `/inventory/${data.medicationId}`,
        actionText: 'Remove from Inventory'
      })
    });

    console.log(`📋 Notification middleware initialized with ${this.eventMappings.size} event mappings`);
  }

  /**
   * Middleware function for Express.js
   * Attaches notification methods to request object
   */
  middleware() {
    return (req, res, next) => {
      // Attach notification methods to request
      req.notify = {
        trigger: this.triggerNotification.bind(this),
        send: this.sendDirectNotification.bind(this),
        schedule: this.scheduleNotification.bind(this)
      };

      // Override res.json to capture response data for notifications
      const originalJson = res.json;
      res.json = function(data) {
        // Store response data for potential notification use
        res.locals.responseData = data;
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Trigger notification based on controller action
   * @param {string} event - Event name (e.g., 'user.created')
   * @param {Object} data - Event data
   * @param {Object} options - Additional options
   */
  async triggerNotification(event, data, options = {}) {
    try {
      if (!this.notificationService) {
        console.log('⚠️ Notification service not available');
        return;
      }

      const mapping = this.eventMappings.get(event);
      if (!mapping) {
        console.log(`⚠️ No notification mapping found for event: ${event}`);
        return;
      }

      // Get recipients based on mapping
      const recipients = mapping.getRecipients(data);
      if (!recipients || recipients.length === 0) {
        console.log(`⚠️ No recipients found for event: ${event}`);
        return;
      }

      // Get content based on mapping
      const content = mapping.getContent(data);

      // Create notification data
      const notificationData = {
        type: mapping.type,
        category: mapping.category,
        priority: options.priority || mapping.priority,
        recipients,
        content,
        contextData: data,
        relatedEntities: this.extractRelatedEntities(event, data),
        createdBy: options.createdBy || data.createdBy,
        scheduledFor: options.scheduledFor,
        expiresAt: options.expiresAt
      };

      // Send notification
      const notification = await this.notificationService.createNotification(notificationData);
      
      console.log(`📬 Triggered notification for event: ${event} (ID: ${notification._id})`);
      return notification;

    } catch (error) {
      console.error(`❌ Failed to trigger notification for event ${event}:`, error);
    }
  }

  /**
   * Send direct notification (bypass event mapping)
   * @param {Object} notificationData - Direct notification data
   */
  async sendDirectNotification(notificationData) {
    try {
      if (!this.notificationService) {
        console.log('⚠️ Notification service not available');
        return;
      }

      const notification = await this.notificationService.createNotification(notificationData);
      console.log(`📬 Sent direct notification (ID: ${notification._id})`);
      return notification;

    } catch (error) {
      console.error('❌ Failed to send direct notification:', error);
    }
  }

  /**
   * Schedule notification
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {Date} scheduledFor - When to send
   * @param {Object} options - Additional options
   */
  async scheduleNotification(event, data, scheduledFor, options = {}) {
    try {
      return await this.triggerNotification(event, data, {
        ...options,
        scheduledFor
      });

    } catch (error) {
      console.error('❌ Failed to schedule notification:', error);
    }
  }

  /**
   * Extract related entities from event data
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  extractRelatedEntities(event, data) {
    const entities = [];

    // Extract common entity references
    if (data.userId) {
      entities.push({ entityType: 'user', entityId: data.userId });
    }
    if (data.patientId) {
      entities.push({ entityType: 'user', entityId: data.patientId });
    }
    if (data.doctorId) {
      entities.push({ entityType: 'doctor', entityId: data.doctorId });
    }
    if (data.pharmacyId) {
      entities.push({ entityType: 'pharmacy', entityId: data.pharmacyId });
    }
    if (data.prescriptionId) {
      entities.push({ entityType: 'prescription', entityId: data.prescriptionId });
    }
    if (data.orderId) {
      entities.push({ entityType: 'order', entityId: data.orderId });
    }
    if (data.appointmentId) {
      entities.push({ entityType: 'appointment', entityId: data.appointmentId });
    }
    if (data.paymentId) {
      entities.push({ entityType: 'payment', entityId: data.paymentId });
    }

    return entities;
  }

  /**
   * Static method for after create hook
   * @param {string} model - Model name
   * @param {Object} data - Created data
   * @param {Object} context - Request context
   */
  static async afterCreate(model, data, context) {
    try {
      const event = `${model.toLowerCase()}.created`;
      
      if (context.req && context.req.notify) {
        await context.req.notify.trigger(event, {
          ...data,
          createdBy: context.req.user?.id
        });
      }

    } catch (error) {
      console.error(`❌ After create notification failed for ${model}:`, error);
    }
  }

  /**
   * Static method for after update hook
   * @param {string} model - Model name
   * @param {Object} data - Updated data
   * @param {Object} changes - Changed fields
   * @param {Object} context - Request context
   */
  static async afterUpdate(model, data, changes, context) {
    try {
      const event = `${model.toLowerCase()}.updated`;
      
      if (context.req && context.req.notify) {
        await context.req.notify.trigger(event, {
          ...data,
          changes,
          updatedBy: context.req.user?.id
        });
      }

    } catch (error) {
      console.error(`❌ After update notification failed for ${model}:`, error);
    }
  }

  /**
   * Static method for after delete hook
   * @param {string} model - Model name
   * @param {Object} data - Deleted data
   * @param {Object} context - Request context
   */
  static async afterDelete(model, data, context) {
    try {
      const event = `${model.toLowerCase()}.deleted`;
      
      if (context.req && context.req.notify) {
        await context.req.notify.trigger(event, {
          ...data,
          deletedBy: context.req.user?.id
        });
      }

    } catch (error) {
      console.error(`❌ After delete notification failed for ${model}:`, error);
    }
  }

  /**
   * Map controller event to notification
   * @param {string} controller - Controller name
   * @param {string} action - Action name
   * @param {Object} data - Action data
   */
  static mapControllerEventToNotification(controller, action, data) {
    const event = `${controller.toLowerCase()}.${action.toLowerCase()}`;
    return event;
  }

  /**
   * Determine notification recipients based on event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  static determineNotificationRecipients(event, data) {
    // This would contain logic to determine who should receive notifications
    // based on the event type and data
    const recipients = [];

    // Add logic here based on your business rules
    
    return recipients;
  }

  /**
   * Build notification context from controller data
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {Object} user - Current user
   */
  static buildNotificationContext(event, data, user) {
    return {
      event,
      data,
      triggeredBy: user,
      timestamp: new Date(),
      source: 'controller_middleware'
    };
  }

  /**
   * Set notification service
   * @param {EnhancedNotificationService} service - Notification service instance
   */
  setNotificationService(service) {
    this.notificationService = service;
    console.log('✅ Notification service attached to middleware');
  }

  /**
   * Get middleware statistics
   */
  getStats() {
    return {
      eventMappingsCount: this.eventMappings.size,
      hasNotificationService: !!this.notificationService,
      timestamp: new Date()
    };
  }
}

export default NotificationMiddleware;