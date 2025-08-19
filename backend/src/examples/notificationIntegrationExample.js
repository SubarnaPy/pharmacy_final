/**
 * Example: How to integrate Enhanced Notification System with existing server
 * This file shows how to integrate the notification system into your Express.js application
 */

import express from 'express';
import notificationSystemInitializer from '../services/notifications/index.js';

/**
 * Example integration with Express.js server
 */
async function integrateNotificationSystem(app, webSocketService = null) {
  try {
    console.log('🔗 Integrating Enhanced Notification System...');

    // Initialize the notification system
    const { service, middleware, queue } = await notificationSystemInitializer.initialize({
      webSocketService: webSocketService, // Pass your WebSocket service instance
      serviceOptions: {
        // Custom service options if needed
      }
    });

    // Add notification middleware to Express app
    app.use(notificationSystemInitializer.getMiddleware());

    // Add health check endpoint
    app.get('/api/notifications/health', async (req, res) => {
      try {
        const healthStatus = await notificationSystemInitializer.getHealthStatus();
        res.json(healthStatus);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Add notification management endpoints
    app.get('/api/notifications/stats', async (req, res) => {
      try {
        const stats = {
          service: service.getStats(),
          queue: await queue.getStats()
        };
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Example: Manual notification sending endpoint
    app.post('/api/notifications/send', async (req, res) => {
      try {
        const { userId, type, data, options } = req.body;
        
        const notification = await service.sendNotification(userId, type, data, options);
        
        res.json({
          success: true,
          notificationId: notification._id,
          message: 'Notification sent successfully'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Example: Bulk notification endpoint
    app.post('/api/notifications/bulk', async (req, res) => {
      try {
        const { recipients, type, data, options } = req.body;
        
        const notification = await service.sendBulkNotification(recipients, type, data, options);
        
        res.json({
          success: true,
          notificationId: notification._id,
          recipientCount: recipients.length,
          message: 'Bulk notification sent successfully'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Example: User preferences endpoint
    app.get('/api/notifications/preferences/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const preferences = await service.getUserPreferences(userId);
        res.json(preferences);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/notifications/preferences/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const preferences = req.body;
        
        const updatedPreferences = await service.updateUserPreferences(userId, preferences);
        
        res.json({
          success: true,
          preferences: updatedPreferences,
          message: 'Preferences updated successfully'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    console.log('✅ Enhanced Notification System integrated successfully');
    
    return { service, middleware, queue };

  } catch (error) {
    console.error('❌ Failed to integrate notification system:', error);
    throw error;
  }
}

/**
 * Example: How to use notifications in your controllers
 */
class ExampleController {
  
  // Example: User registration with notification
  static async registerUser(req, res) {
    try {
      // Your existing user registration logic here
      const userData = {
        name: req.body.name,
        email: req.body.email,
        // ... other user data
      };
      
      // Save user to database (your existing logic)
      // const savedUser = await User.create(userData);
      
      // Trigger welcome notification using middleware
      await req.notify.trigger('user.created', {
        userId: 'savedUser._id', // Use actual saved user ID
        name: userData.name,
        email: userData.email
      });

      res.json({
        success: true,
        message: 'User registered successfully',
        // user: savedUser
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Example: Prescription creation with notification
  static async createPrescription(req, res) {
    try {
      // Your existing prescription creation logic
      const prescriptionData = {
        patientId: req.body.patientId,
        doctorId: req.user.id,
        medications: req.body.medications,
        // ... other prescription data
      };

      // Save prescription (your existing logic)
      // const savedPrescription = await Prescription.create(prescriptionData);

      // Trigger prescription notification
      await req.notify.trigger('prescription.created', {
        prescriptionId: 'savedPrescription._id',
        patientId: prescriptionData.patientId,
        doctorId: prescriptionData.doctorId,
        doctorName: req.user.name,
        medicationNames: prescriptionData.medications.map(m => m.name).join(', ')
      });

      res.json({
        success: true,
        message: 'Prescription created successfully',
        // prescription: savedPrescription
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Example: Order status update with notification
  static async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      // Update order status (your existing logic)
      // const updatedOrder = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

      // Trigger order status notification
      await req.notify.trigger('order.status_changed', {
        orderId: orderId,
        orderNumber: 'updatedOrder.orderNumber',
        customerId: 'updatedOrder.customerId',
        status: status,
        previousStatus: 'updatedOrder.previousStatus'
      });

      res.json({
        success: true,
        message: 'Order status updated successfully',
        // order: updatedOrder
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Example: Scheduled appointment reminder
  static async scheduleAppointmentReminder(req, res) {
    try {
      const { appointmentId } = req.params;
      
      // Get appointment details (your existing logic)
      // const appointment = await Appointment.findById(appointmentId);
      
      // Schedule reminder 1 hour before appointment
      const reminderTime = new Date('appointment.scheduledTime');
      reminderTime.setHours(reminderTime.getHours() - 1);

      await req.notify.schedule('appointment.reminder', {
        appointmentId: appointmentId,
        patientId: 'appointment.patientId',
        doctorName: 'appointment.doctor.name',
        appointmentTime: 'appointment.scheduledTime',
        timeUntil: '1 hour'
      }, reminderTime);

      res.json({
        success: true,
        message: 'Appointment reminder scheduled successfully'
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Example: Direct notification sending
  static async sendCustomNotification(req, res) {
    try {
      const { recipients, title, message, priority, channels } = req.body;

      // Send direct notification
      const notification = await req.notify.send({
        recipients: recipients,
        content: {
          title: title,
          message: message,
          actionUrl: req.body.actionUrl,
          actionText: req.body.actionText
        },
        priority: priority || 'medium',
        category: 'administrative',
        createdBy: req.user.id
      });

      res.json({
        success: true,
        notificationId: notification._id,
        message: 'Custom notification sent successfully'
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * Example: How to handle graceful shutdown
 */
function setupGracefulShutdown() {
  process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    await notificationSystemInitializer.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    await notificationSystemInitializer.shutdown();
    process.exit(0);
  });
}

export { 
  integrateNotificationSystem, 
  ExampleController, 
  setupGracefulShutdown 
};