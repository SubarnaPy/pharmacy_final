import NotificationService from './realtime/NotificationService.js';
import { authenticate } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';

/**
 * Real-time Notification System using Socket.io
 * Handles live notifications for pharmacy alerts and updates
 */
class RealTimeNotificationService {
  constructor(io) {
    this.io = io;
    this.notificationService = new NotificationService();
    this.connectedClients = new Map(); // userId/pharmacyId -> socket
    this.pharmacySubscriptions = new Map(); // pharmacyId -> Set of socketIds
    
    this.setupSocketAuthentication();
    this.setupSocketHandlers();
  }

  /**
   * Setup socket authentication middleware
   */
  setupSocketAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await this.app.get('db').collection('users').findOne({
          _id: new this.app.get('ObjectId')(decoded.id)
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.userRole = user.role;
        socket.userEmail = user.email;
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup socket event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected (${socket.userRole})`);
      
      // Store connected client
      this.connectedClients.set(socket.userId, socket);

      // Handle pharmacy subscription for pharmacy users
      if (socket.userRole === 'pharmacy') {
        this.handlePharmacyConnection(socket);
      }

      // Handle patient connections
      if (socket.userRole === 'patient') {
        this.handlePatientConnection(socket);
      }

      // Handle admin connections
      if (socket.userRole === 'admin') {
        this.handleAdminConnection(socket);
      }

      // Generic notification handlers
      this.setupGenericHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        this.handleDisconnection(socket);
      });
    });
  }

  /**
   * Handle pharmacy-specific socket connections
   */
  async handlePharmacyConnection(socket) {
    try {
      // Get pharmacy details
      const pharmacy = await this.app.get('db').collection('pharmacies').findOne({
        owner: new this.app.get('ObjectId')(socket.userId)
      });

      if (pharmacy) {
        socket.pharmacyId = pharmacy._id.toString();
        
        // Subscribe to pharmacy-specific room
        socket.join(`pharmacy_${pharmacy._id}`);
        
        // Add to pharmacy subscriptions
        if (!this.pharmacySubscriptions.has(socket.pharmacyId)) {
          this.pharmacySubscriptions.set(socket.pharmacyId, new Set());
        }
        this.pharmacySubscriptions.get(socket.pharmacyId).add(socket.id);

        // Send pending notifications
        await this.sendPendingNotifications(socket.userId, socket);

        // Handle prescription request notifications
        socket.on('subscribe_prescription_notifications', (data) => {
          socket.join('prescription_notifications');
          console.log(`Pharmacy ${socket.pharmacyId} subscribed to prescription notifications`);
        });

        // Handle prescription response
        socket.on('prescription_response', async (data) => {
          await this.handlePrescriptionResponse(socket, data);
        });

        // Handle availability updates
        socket.on('update_availability', async (data) => {
          await this.handleAvailabilityUpdate(socket, data);
        });

        console.log(`Pharmacy ${socket.pharmacyId} connected and subscribed`);
      }
    } catch (error) {
      console.error('Error handling pharmacy connection:', error);
    }
  }

  /**
   * Handle patient-specific socket connections
   */
  async handlePatientConnection(socket) {
    try {
      // Subscribe to patient-specific room
      socket.join(`patient_${socket.userId}`);

      // Send pending notifications
      await this.sendPendingNotifications(socket.userId, socket);

      // Handle prescription status subscriptions
      socket.on('subscribe_prescription_status', (prescriptionId) => {
        socket.join(`prescription_${prescriptionId}`);
        console.log(`Patient ${socket.userId} subscribed to prescription ${prescriptionId} updates`);
      });

      // Handle location updates for pharmacy discovery
      socket.on('update_location', async (locationData) => {
        await this.handleLocationUpdate(socket, locationData);
      });

      console.log(`Patient ${socket.userId} connected`);
    } catch (error) {
      console.error('Error handling patient connection:', error);
    }
  }

  /**
   * Handle admin-specific socket connections
   */
  async handleAdminConnection(socket) {
    try {
      // Subscribe to admin room
      socket.join('admin');

      // Send system statistics
      socket.emit('system_stats', await this.getSystemStats());

      // Handle admin-specific events
      socket.on('monitor_system', () => {
        socket.join('system_monitoring');
        console.log(`Admin ${socket.userId} subscribed to system monitoring`);
      });

      console.log(`Admin ${socket.userId} connected`);
    } catch (error) {
      console.error('Error handling admin connection:', error);
    }
  }

  /**
   * Setup generic notification handlers
   */
  setupGenericHandlers(socket) {
    // Mark notification as read
    socket.on('mark_notification_read', async (notificationId) => {
      try {
        await this.notificationService.markAsRead(notificationId, socket.userId);
        socket.emit('notification_marked_read', { notificationId });
      } catch (error) {
        console.error('Error marking notification as read:', error);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    // Get notification history
    socket.on('get_notification_history', async (data) => {
      try {
        const { page = 1, limit = 20, type } = data;
        const notifications = await this.notificationService.getNotificationHistory(
          socket.userId,
          { page, limit, type }
        );
        socket.emit('notification_history', notifications);
      } catch (error) {
        console.error('Error getting notification history:', error);
        socket.emit('error', { message: 'Failed to get notification history' });
      }
    });

    // Update notification preferences
    socket.on('update_notification_preferences', async (preferences) => {
      try {
        await this.notificationService.updateNotificationPreferences(socket.userId, preferences);
        socket.emit('notification_preferences_updated', { success: true });
      } catch (error) {
        console.error('Error updating notification preferences:', error);
        socket.emit('error', { message: 'Failed to update notification preferences' });
      }
    });
  }

  /**
   * Handle prescription response from pharmacy
   */
  async handlePrescriptionResponse(socket, data) {
    try {
      const { prescriptionRequestId, response, estimatedTime, notes } = data;

      // Update prescription request
      await this.app.get('db').collection('prescriptionrequests').updateOne(
        { _id: new this.app.get('ObjectId')(prescriptionRequestId) },
        {
          $set: {
            status: response === 'accept' ? 'accepted' : 'declined',
            assignedPharmacy: response === 'accept' ? new this.app.get('ObjectId')(socket.pharmacyId) : null,
            estimatedFulfillmentTime: estimatedTime,
            pharmacyNotes: notes,
            respondedAt: new Date()
          }
        }
      );

      // Get prescription request details
      const prescriptionRequest = await this.app.get('db').collection('prescriptionrequests').findOne({
        _id: new this.app.get('ObjectId')(prescriptionRequestId)
      });

      // Notify patient
      if (prescriptionRequest) {
        const notification = await this.notificationService.createNotification({
          type: response === 'accept' ? 'prescription_accepted' : 'prescription_declined',
          recipient: prescriptionRequest.patient,
          recipientType: 'patient',
          title: response === 'accept' ? 'Prescription Accepted' : 'Prescription Declined',
          message: response === 'accept' ? 
            `Your prescription has been accepted by the pharmacy. Estimated time: ${estimatedTime} minutes.` :
            'Your prescription request has been declined by the pharmacy.',
          data: {
            prescriptionRequestId,
            pharmacyId: socket.pharmacyId,
            estimatedTime,
            notes
          },
          priority: 'medium'
        });

        // Send to patient's socket if connected
        this.io.to(`patient_${prescriptionRequest.patient}`).emit('prescription_response', {
          type: response,
          prescriptionRequestId,
          pharmacyId: socket.pharmacyId,
          estimatedTime,
          notes,
          notification
        });

        // Send to prescription-specific room
        this.io.to(`prescription_${prescriptionRequestId}`).emit('status_update', {
          status: response === 'accept' ? 'accepted' : 'declined',
          timestamp: new Date(),
          details: { estimatedTime, notes }
        });
      }

      socket.emit('prescription_response_sent', { success: true, prescriptionRequestId });
    } catch (error) {
      console.error('Error handling prescription response:', error);
      socket.emit('error', { message: 'Failed to process prescription response' });
    }
  }

  /**
   * Handle pharmacy availability updates
   */
  async handleAvailabilityUpdate(socket, data) {
    try {
      const { availabilityStatus, currentCapacity, estimatedWaitTime } = data;

      // Update pharmacy availability
      await this.app.get('db').collection('pharmacies').updateOne(
        { _id: new this.app.get('ObjectId')(socket.pharmacyId) },
        {
          $set: {
            availabilityStatus,
            currentCapacity,
            estimatedWaitTime,
            lastAvailabilityUpdate: new Date()
          }
        }
      );

      // Broadcast to nearby patients if needed
      const pharmacy = await this.app.get('db').collection('pharmacies').findOne({
        _id: new this.app.get('ObjectId')(socket.pharmacyId)
      });

      if (pharmacy) {
        // Notify admin monitoring
        this.io.to('system_monitoring').emit('pharmacy_availability_update', {
          pharmacyId: socket.pharmacyId,
          pharmacyName: pharmacy.name,
          availabilityStatus,
          currentCapacity,
          estimatedWaitTime,
          timestamp: new Date()
        });
      }

      socket.emit('availability_update_confirmed', { success: true });
    } catch (error) {
      console.error('Error handling availability update:', error);
      socket.emit('error', { message: 'Failed to update availability' });
    }
  }

  /**
   * Handle patient location updates
   */
  async handleLocationUpdate(socket, locationData) {
    try {
      const { latitude, longitude, accuracy } = locationData;

      // Store location update (optional - for analytics)
      await this.app.get('db').collection('locationupdates').insertOne({
        userId: new this.app.get('ObjectId')(socket.userId),
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        accuracy,
        timestamp: new Date()
      });

      // Could trigger nearby pharmacy notifications if needed
      socket.emit('location_update_confirmed', { success: true });
    } catch (error) {
      console.error('Error handling location update:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  }

  /**
   * Send pending notifications to newly connected user
   */
  async sendPendingNotifications(userId, socket) {
    try {
      const pendingNotifications = await this.notificationService.getPendingNotifications(userId);
      
      if (pendingNotifications.length > 0) {
        socket.emit('pending_notifications', pendingNotifications);
      }
    } catch (error) {
      console.error('Error sending pending notifications:', error);
    }
  }

  /**
   * Get system statistics for admin dashboard
   */
  async getSystemStats() {
    try {
      const stats = await Promise.all([
        this.app.get('db').collection('users').countDocuments({ role: 'patient' }),
        this.app.get('db').collection('pharmacies').countDocuments({ status: 'approved' }),
        this.app.get('db').collection('prescriptionrequests').countDocuments({ 
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
        }),
        this.app.get('db').collection('pharmacies').countDocuments({ 
          lastAvailabilityUpdate: { $gte: new Date(Date.now() - 60 * 60 * 1000) } 
        })
      ]);

      return {
        totalPatients: stats[0],
        activePharmacies: stats[1],
        prescriptionsToday: stats[2],
        pharmaciesOnlineLastHour: stats[3],
        connectedClients: this.connectedClients.size,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {};
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(socket) {
    // Remove from connected clients
    this.connectedClients.delete(socket.userId);

    // Remove from pharmacy subscriptions
    if (socket.pharmacyId && this.pharmacySubscriptions.has(socket.pharmacyId)) {
      this.pharmacySubscriptions.get(socket.pharmacyId).delete(socket.id);
      
      if (this.pharmacySubscriptions.get(socket.pharmacyId).size === 0) {
        this.pharmacySubscriptions.delete(socket.pharmacyId);
      }
    }
  }

  /**
   * Broadcast notification to specific user
   */
  async broadcastToUser(userId, notification) {
    const socket = this.connectedClients.get(userId);
    if (socket) {
      socket.emit('new_notification', notification);
      return true;
    }
    return false;
  }

  /**
   * Broadcast notification to pharmacy
   */
  async broadcastToPharmacy(pharmacyId, notification) {
    this.io.to(`pharmacy_${pharmacyId}`).emit('new_notification', notification);
  }

  /**
   * Broadcast to all connected pharmacies
   */
  async broadcastToAllPharmacies(notification) {
    this.io.emit('pharmacy_broadcast', notification);
  }

  /**
   * Send emergency alert to nearby pharmacies
   */
  async sendEmergencyAlert(location, radius, alert) {
    try {
      // Find nearby pharmacies
      const nearbyPharmacies = await this.app.get('db').collection('pharmacies').find({
        status: 'approved',
        isActive: true,
        location: {
          $geoWithin: {
            $centerSphere: [[location.longitude, location.latitude], radius / 6371]
          }
        }
      }).toArray();

      // Send alert to each nearby pharmacy
      nearbyPharmacies.forEach(pharmacy => {
        this.io.to(`pharmacy_${pharmacy._id}`).emit('emergency_alert', {
          ...alert,
          distance: this.calculateDistance(
            location.latitude, location.longitude,
            pharmacy.location.coordinates[1], pharmacy.location.coordinates[0]
          ),
          timestamp: new Date()
        });
      });

      return nearbyPharmacies.length;
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      return 0;
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return {
      total: this.connectedClients.size,
      pharmacies: this.pharmacySubscriptions.size,
      patients: Array.from(this.connectedClients.values()).filter(socket => socket.userRole === 'patient').length,
      admins: Array.from(this.connectedClients.values()).filter(socket => socket.userRole === 'admin').length
    };
  }
}

export default RealTimeNotificationService;
