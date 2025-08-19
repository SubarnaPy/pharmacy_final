/**
 * Order Notification Service
 * Handles automated notifications for order status updates, delivery tracking, and completion reminders
 */

import { EventEmitter } from 'events';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import RealTimeNotificationService from './RealTimeNotificationService.js';
import emailService from './emailService.js';
import smsService from './smsService.js';

class OrderNotificationService extends EventEmitter {
  constructor() {
    super();
    this.notificationService = new RealTimeNotificationService();
    this.setupEventListeners();
    this.startAutomatedNotifications();
  }

  /**
   * Setup event listeners for order status changes
   */
  setupEventListeners() {
    // Listen for order status updates
    this.on('orderStatusUpdated', this.handleOrderStatusUpdate.bind(this));
    this.on('deliveryStarted', this.handleDeliveryStarted.bind(this));
    this.on('orderDelayed', this.handleOrderDelayed.bind(this));
    this.on('orderCompleted', this.handleOrderCompleted.bind(this));
  }

  /**
   * Start automated notification processes
   */
  startAutomatedNotifications() {
    // Check for overdue orders every 15 minutes
    setInterval(() => {
      this.checkOverdueOrders();
    }, 15 * 60 * 1000);

    // Send pickup reminders every hour
    setInterval(() => {
      this.sendPickupReminders();
    }, 60 * 60 * 1000);

    // Update delivery tracking every 30 minutes
    setInterval(() => {
      this.updateDeliveryTracking();
    }, 30 * 60 * 1000);

    // Send completion confirmations every 2 hours
    setInterval(() => {
      this.sendCompletionConfirmations();
    }, 2 * 60 * 60 * 1000);

    console.log('✅ Order notification service started with automated processes');
  }

  /**
   * Handle order status update notifications
   */
  async handleOrderStatusUpdate(data) {
    try {
      const { orderId, oldStatus, newStatus, updatedBy, notes } = data;

      const order = await Order.findById(orderId)
        .populate('patient', 'profile contact preferences')
        .populate('pharmacy', 'name address contact');

      if (!order) return;

      // Get notification preferences
      const notificationPrefs = order.patient.preferences?.notifications || {
        sms: true,
        email: true,
        push: true
      };

      const notificationData = {
        orderId: order._id,
        orderNumber: order.orderNumber,
        pharmacy: order.pharmacy.name,
        oldStatus,
        newStatus,
        notes,
        timing: order.timing,
        estimatedCompletion: order.timing.estimatedCompletion
      };

      // Send notifications based on status
      switch (newStatus) {
        case 'prescription_verified':
          await this.sendPrescriptionVerifiedNotification(order, notificationPrefs, notificationData);
          break;
        case 'in_preparation':
          await this.sendPreparationStartedNotification(order, notificationPrefs, notificationData);
          break;
        case 'ready_for_pickup':
          await this.sendReadyForPickupNotification(order, notificationPrefs, notificationData);
          break;
        case 'ready_for_delivery':
          await this.sendReadyForDeliveryNotification(order, notificationPrefs, notificationData);
          break;
        case 'out_for_delivery':
          await this.sendOutForDeliveryNotification(order, notificationPrefs, notificationData);
          break;
        case 'delivered':
        case 'picked_up':
          await this.sendCompletedNotification(order, notificationPrefs, notificationData);
          break;
        case 'on_hold':
          await this.sendOnHoldNotification(order, notificationPrefs, notificationData);
          break;
        case 'cancelled':
          await this.sendCancelledNotification(order, notificationPrefs, notificationData);
          break;
      }

      console.log(`📱 Notifications sent for order ${order.orderNumber} status change: ${oldStatus} → ${newStatus}`);

    } catch (error) {
      console.error('❌ Failed to handle order status update notification:', error.message);
    }
  }

  /**
   * Send prescription verified notification
   */
  async sendPrescriptionVerifiedNotification(order, prefs, data) {
    const message = `Great news! Your prescription has been verified by our pharmacist. Order ${order.orderNumber} is now being prepared.`;

    if (prefs.push) {
      await this.notificationService.sendRealTimeNotification(
        `patient_${order.patient._id}`,
        'prescription_verified',
        { ...data, message }
      );
    }

    if (prefs.sms && order.patient.contact?.phone) {
      await smsService.sendSMS(order.patient.contact.phone, message);
    }

    if (prefs.email && order.patient.contact?.email) {
      await emailService.sendEmail({
        to: order.patient.contact.email,
        subject: 'Prescription Verified - Order in Progress',
        template: 'prescription-verified',
        data: { order, message }
      });
    }
  }

  /**
   * Send preparation started notification
   */
  async sendPreparationStartedNotification(order, prefs, data) {
    const estimatedTime = order.timing.estimatedCompletion ? 
      ` Expected completion: ${new Date(order.timing.estimatedCompletion).toLocaleString()}` : '';
    
    const message = `Your prescription is now being prepared by ${order.pharmacy.name}.${estimatedTime}`;

    if (prefs.push) {
      await this.notificationService.sendRealTimeNotification(
        `patient_${order.patient._id}`,
        'preparation_started',
        { ...data, message }
      );
    }

    // SMS only for urgent orders
    if (prefs.sms && order.metadata.priority > 1 && order.patient.contact?.phone) {
      await smsService.sendSMS(order.patient.contact.phone, message);
    }
  }

  /**
   * Send ready for pickup notification
   */
  async sendReadyForPickupNotification(order, prefs, data) {
    const message = `🎉 Your prescription order ${order.orderNumber} is ready for pickup at ${order.pharmacy.name}!`;
    const pickupInfo = order.fulfillment?.pickupCode ? 
      ` Your pickup code is: ${order.fulfillment.pickupCode}` : '';

    if (prefs.push) {
      await this.notificationService.sendRealTimeNotification(
        `patient_${order.patient._id}`,
        'ready_for_pickup',
        { ...data, message, pickupCode: order.fulfillment?.pickupCode }
      );
    }

    if (prefs.sms && order.patient.contact?.phone) {
      await smsService.sendSMS(
        order.patient.contact.phone, 
        `${message}${pickupInfo} Address: ${order.pharmacy.address?.street}, ${order.pharmacy.address?.city}`
      );
    }

    if (prefs.email && order.patient.contact?.email) {
      await emailService.sendEmail({
        to: order.patient.contact.email,
        subject: 'Prescription Ready for Pickup',
        template: 'ready-for-pickup',
        data: { order, message, pickupInfo }
      });
    }
  }

  /**
   * Send ready for delivery notification
   */
  async sendReadyForDeliveryNotification(order, prefs, data) {
    const trackingInfo = order.deliveryTracking?.trackingNumber ? 
      ` Tracking: ${order.deliveryTracking.trackingNumber}` : '';
    
    const message = `📦 Your prescription order ${order.orderNumber} is ready for delivery!${trackingInfo}`;

    if (prefs.push) {
      await this.notificationService.sendRealTimeNotification(
        `patient_${order.patient._id}`,
        'ready_for_delivery',
        { ...data, message, deliveryTracking: order.deliveryTracking }
      );
    }

    if (prefs.sms && order.patient.contact?.phone) {
      await smsService.sendSMS(order.patient.contact.phone, message);
    }

    if (prefs.email && order.patient.contact?.email) {
      await emailService.sendEmail({
        to: order.patient.contact.email,
        subject: 'Prescription Ready for Delivery',
        template: 'ready-for-delivery',
        data: { order, message }
      });
    }
  }

  /**
   * Send out for delivery notification
   */
  async sendOutForDeliveryNotification(order, prefs, data) {
    const driver = order.deliveryTracking?.driver;
    const driverInfo = driver ? ` Driver: ${driver.name}, ${driver.phone}` : '';
    const trackingInfo = order.deliveryTracking?.trackingNumber ? 
      ` Track: ${order.deliveryTracking.trackingNumber}` : '';
    
    const message = `🚚 Your order ${order.orderNumber} is out for delivery!${driverInfo}${trackingInfo}`;

    if (prefs.push) {
      await this.notificationService.sendRealTimeNotification(
        `patient_${order.patient._id}`,
        'out_for_delivery',
        { ...data, message, deliveryTracking: order.deliveryTracking }
      );
    }

    if (prefs.sms && order.patient.contact?.phone) {
      await smsService.sendSMS(order.patient.contact.phone, message);
    }
  }

  /**
   * Send completed notification
   */
  async sendCompletedNotification(order, prefs, data) {
    const isDelivery = order.currentStatus === 'delivered';
    const message = isDelivery ? 
      `✅ Your order ${order.orderNumber} has been delivered successfully!` :
      `✅ Your order ${order.orderNumber} has been picked up successfully!`;

    if (prefs.push) {
      await this.notificationService.sendRealTimeNotification(
        `patient_${order.patient._id}`,
        'order_completed',
        { ...data, message }
      );
    }

    if (prefs.sms && order.patient.contact?.phone) {
      await smsService.sendSMS(order.patient.contact.phone, message);
    }

    if (prefs.email && order.patient.contact?.email) {
      await emailService.sendEmail({
        to: order.patient.contact.email,
        subject: 'Order Completed - Thank You!',
        template: 'order-completed',
        data: { order, message }
      });
    }

    // Schedule feedback request (24 hours later)
    setTimeout(() => {
      this.sendFeedbackRequest(order);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Send on hold notification
   */
  async sendOnHoldNotification(order, prefs, data) {
    const message = `⚠️ Your order ${order.orderNumber} has been placed on hold. ${data.notes || 'We will contact you with more information.'}`;

    if (prefs.push) {
      await this.notificationService.sendRealTimeNotification(
        `patient_${order.patient._id}`,
        'order_on_hold',
        { ...data, message }
      );
    }

    // Always send SMS for on-hold orders
    if (order.patient.contact?.phone) {
      await smsService.sendSMS(order.patient.contact.phone, message);
    }

    if (prefs.email && order.patient.contact?.email) {
      await emailService.sendEmail({
        to: order.patient.contact.email,
        subject: 'Order On Hold - Action Required',
        template: 'order-on-hold',
        data: { order, message }
      });
    }
  }

  /**
   * Send cancelled notification
   */
  async sendCancelledNotification(order, prefs, data) {
    const message = `❌ Your order ${order.orderNumber} has been cancelled. ${data.notes || 'Please contact us if you have questions.'}`;

    if (prefs.push) {
      await this.notificationService.sendRealTimeNotification(
        `patient_${order.patient._id}`,
        'order_cancelled',
        { ...data, message }
      );
    }

    if (prefs.sms && order.patient.contact?.phone) {
      await smsService.sendSMS(order.patient.contact.phone, message);
    }

    if (prefs.email && order.patient.contact?.email) {
      await emailService.sendEmail({
        to: order.patient.contact.email,
        subject: 'Order Cancelled',
        template: 'order-cancelled',
        data: { order, message }
      });
    }
  }

  /**
   * Check for overdue orders and send notifications
   */
  async checkOverdueOrders() {
    try {
      const now = new Date();
      
      // Find orders that are overdue
      const overdueOrders = await Order.find({
        currentStatus: { $nin: ['delivered', 'picked_up', 'cancelled', 'refunded'] },
        'timing.estimatedCompletion': { $lt: now },
        'timing.slaBreached': { $ne: true }
      })
      .populate('patient', 'contact preferences')
      .populate('pharmacy', 'name contact');

      for (const order of overdueOrders) {
        // Mark as SLA breached
        order.timing.slaBreached = true;
        await order.save();

        // Notify patient
        const message = `We're working on your order ${order.orderNumber} which is taking longer than expected. We'll update you shortly.`;
        
        if (order.patient.contact?.phone) {
          await smsService.sendSMS(order.patient.contact.phone, message);
        }

        await this.notificationService.sendRealTimeNotification(
          `patient_${order.patient._id}`,
          'order_delayed',
          {
            orderId: order._id,
            orderNumber: order.orderNumber,
            message,
            newEstimate: null // Pharmacy should provide updated estimate
          }
        );

        // Notify pharmacy
        await this.notificationService.sendRealTimeNotification(
          `pharmacy_${order.pharmacy._id}`,
          'order_overdue',
          {
            orderId: order._id,
            orderNumber: order.orderNumber,
            patient: order.patient,
            overdueBy: Math.floor((now - order.timing.estimatedCompletion) / (1000 * 60)) // minutes
          }
        );

        console.log(`⚠️ Order ${order.orderNumber} marked as overdue`);
      }

    } catch (error) {
      console.error('❌ Failed to check overdue orders:', error.message);
    }
  }

  /**
   * Send pickup reminders for ready orders
   */
  async sendPickupReminders() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Find orders ready for pickup for more than 24 hours
      const ordersNeedingReminders = await Order.find({
        currentStatus: 'ready_for_pickup',
        'timing.actualReady': { $lt: yesterday }
      })
      .populate('patient', 'contact preferences')
      .populate('pharmacy', 'name address contact');

      for (const order of ordersNeedingReminders) {
        const message = `Reminder: Your prescription order ${order.orderNumber} is ready for pickup at ${order.pharmacy.name}. Please collect it at your earliest convenience.`;

        if (order.patient.contact?.phone) {
          await smsService.sendSMS(order.patient.contact.phone, message);
        }

        await this.notificationService.sendRealTimeNotification(
          `patient_${order.patient._id}`,
          'pickup_reminder',
          {
            orderId: order._id,
            orderNumber: order.orderNumber,
            pharmacy: order.pharmacy,
            message
          }
        );

        // Log communication
        order.addCommunication('sms', message, order.patient.contact?.phone, 'pickup-reminder');
        await order.save();
      }

    } catch (error) {
      console.error('❌ Failed to send pickup reminders:', error.message);
    }
  }

  /**
   * Update delivery tracking for in-transit orders
   */
  async updateDeliveryTracking() {
    try {
      // Find orders that are in transit with tracking numbers
      const ordersInTransit = await Order.find({
        currentStatus: { $in: ['out_for_delivery', 'in_transit'] },
        'deliveryTracking.trackingNumber': { $exists: true }
      })
      .populate('patient', 'contact preferences');

      for (const order of ordersInTransit) {
        // Here you would integrate with delivery service APIs
        // For now, we'll simulate tracking updates
        const trackingUpdate = await this.simulateTrackingUpdate(order);
        
        if (trackingUpdate) {
          // Add tracking event
          if (!order.deliveryTracking.trackingEvents) {
            order.deliveryTracking.trackingEvents = [];
          }
          
          order.deliveryTracking.trackingEvents.push({
            timestamp: new Date(),
            status: trackingUpdate.status,
            location: trackingUpdate.location,
            description: trackingUpdate.description,
            source: 'carrier_api'
          });

          await order.save();

          // Notify patient of significant updates
          if (trackingUpdate.notifyPatient) {
            await this.notificationService.sendRealTimeNotification(
              `patient_${order.patient._id}`,
              'delivery_update',
              {
                orderId: order._id,
                orderNumber: order.orderNumber,
                trackingUpdate
              }
            );
          }
        }
      }

    } catch (error) {
      console.error('❌ Failed to update delivery tracking:', error.message);
    }
  }

  /**
   * Send completion confirmations
   */
  async sendCompletionConfirmations() {
    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Find completed orders without confirmation
      const unconfirmedOrders = await Order.find({
        currentStatus: { $in: ['delivered'] },
        'timing.actualCompletion': { $gte: twoDaysAgo },
        'completion.confirmedBy': { $exists: false }
      })
      .populate('patient', 'contact preferences');

      for (const order of unconfirmedOrders) {
        const message = `Please confirm receipt of your order ${order.orderNumber}. Did you receive your medications in good condition?`;

        await this.notificationService.sendRealTimeNotification(
          `patient_${order.patient._id}`,
          'completion_confirmation_request',
          {
            orderId: order._id,
            orderNumber: order.orderNumber,
            message,
            confirmationLink: `[app_link]/orders/${order._id}/confirm`
          }
        );
      }

    } catch (error) {
      console.error('❌ Failed to send completion confirmations:', error.message);
    }
  }

  /**
   * Send feedback request
   */
  async sendFeedbackRequest(order) {
    try {
      const message = `How was your experience with order ${order.orderNumber}? Your feedback helps us improve our service.`;

      await this.notificationService.sendRealTimeNotification(
        `patient_${order.patient._id}`,
        'feedback_request',
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          message,
          feedbackLink: `[app_link]/orders/${order._id}/feedback`
        }
      );

    } catch (error) {
      console.error('❌ Failed to send feedback request:', error.message);
    }
  }

  /**
   * Simulate tracking update (replace with real carrier API integration)
   */
  async simulateTrackingUpdate(order) {
    // This is a simulation - in real implementation, you would call carrier APIs
    const random = Math.random();
    
    if (random < 0.3) { // 30% chance of update
      const updates = [
        {
          status: 'in_transit',
          location: 'Local Distribution Center',
          description: 'Package is on the way to destination',
          notifyPatient: false
        },
        {
          status: 'out_for_delivery',
          location: 'Delivery Vehicle',
          description: 'Package is on the delivery vehicle',
          notifyPatient: true
        },
        {
          status: 'delivered',
          location: order.deliveryTracking?.deliveryAddress?.street || 'Delivery Address',
          description: 'Package has been delivered',
          notifyPatient: true
        }
      ];
      
      return updates[Math.floor(Math.random() * updates.length)];
    }
    
    return null;
  }

  /**
   * Calculate estimated completion time
   */
  calculateEstimatedCompletion(urgency, currentTime = new Date()) {
    const estimatedMinutes = {
      'routine': 4 * 60,    // 4 hours
      'urgent': 2 * 60,     // 2 hours
      'emergency': 60       // 1 hour
    };

    const minutes = estimatedMinutes[urgency] || estimatedMinutes.routine;
    return new Date(currentTime.getTime() + minutes * 60 * 1000);
  }

  /**
   * Trigger manual notification
   */
  async triggerNotification(orderId, type, customData = {}) {
    try {
      const order = await Order.findById(orderId)
        .populate('patient', 'contact preferences')
        .populate('pharmacy', 'name');

      if (!order) {
        throw new Error('Order not found');
      }

      const eventData = {
        orderId,
        oldStatus: order.currentStatus,
        newStatus: order.currentStatus,
        updatedBy: null,
        notes: customData.notes || '',
        ...customData
      };

      this.emit(type, eventData);
      
      console.log(`📧 Manual notification triggered for order ${order.orderNumber}, type: ${type}`);
      
    } catch (error) {
      console.error('❌ Failed to trigger manual notification:', error.message);
      throw error;
    }
  }
}

export default OrderNotificationService;
