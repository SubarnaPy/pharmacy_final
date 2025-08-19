import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Notification from './src/models/Notification.js';
import UserNotificationPreferences from './src/models/UserNotificationPreferences.js';

// Load environment variables
dotenv.config();

/**
 * Test script for user-facing notification APIs
 */
class NotificationAPITester {
  constructor() {
    this.baseUrl = 'http://localhost:5000/api';
    this.testUserId = null;
    this.testNotificationIds = [];
    this.authToken = null;
  }

  async initialize() {
    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');

      // Create or get test user
      await this.setupTestUser();
      
      // Create test notifications
      await this.createTestNotifications();

      console.log('✅ Test setup completed');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  async setupTestUser() {
    try {
      // Find or create test user
      let testUser = await User.findOne({ email: 'test.notifications@example.com' });
      
      if (!testUser) {
        testUser = new User({
          name: 'Test Notification User',
          email: 'test.notifications@example.com',
          password: 'hashedpassword123',
          role: 'patient',
          isVerified: true
        });
        await testUser.save();
        console.log('✅ Created test user');
      }

      this.testUserId = testUser._id;
      
      // Create default notification preferences
      let preferences = await UserNotificationPreferences.findOne({ userId: this.testUserId });
      if (!preferences) {
        preferences = new UserNotificationPreferences({
          userId: this.testUserId,
          globalSettings: {
            enabled: true,
            quietHours: {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00',
              timezone: 'UTC'
            },
            frequency: 'immediate'
          },
          channels: {
            websocket: { enabled: true },
            email: { enabled: true, frequency: 'immediate' },
            sms: { enabled: true, emergencyOnly: false }
          },
          categories: {
            medical: { enabled: true, channels: ['websocket', 'email'], priority: 'all' },
            administrative: { enabled: true, channels: ['websocket', 'email'], priority: 'high' },
            system: { enabled: true, channels: ['websocket'], priority: 'critical' },
            marketing: { enabled: false, channels: [], priority: 'all' }
          },
          contactInfo: {
            email: 'test.notifications@example.com',
            phone: '+1234567890',
            preferredLanguage: 'en'
          }
        });
        await preferences.save();
        console.log('✅ Created test user preferences');
      }

      // Simulate auth token (in real implementation, this would come from login)
      this.authToken = 'test-auth-token-' + this.testUserId;

    } catch (error) {
      console.error('❌ Failed to setup test user:', error);
      throw error;
    }
  }

  async createTestNotifications() {
    try {
      const notifications = [
        {
          type: 'prescription_created',
          category: 'medical',
          priority: 'high',
          recipients: [{
            userId: this.testUserId,
            userRole: 'patient',
            deliveryChannels: ['websocket', 'email'],
            deliveryStatus: {
              websocket: { status: 'delivered', deliveredAt: new Date() },
              email: { status: 'sent', deliveredAt: new Date() },
              sms: { status: 'pending' }
            }
          }],
          content: {
            title: 'New Prescription Available',
            message: 'Your doctor has created a new prescription for you. Please review and submit to pharmacies.',
            actionUrl: '/prescriptions/123',
            actionText: 'View Prescription',
            metadata: { prescriptionId: '123', doctorName: 'Dr. Smith' }
          },
          contextData: { prescriptionId: '123', doctorId: 'doc123' },
          relatedEntities: [{
            entityType: 'prescription',
            entityId: new mongoose.Types.ObjectId()
          }],
          analytics: {
            totalRecipients: 1,
            deliveredCount: 1,
            readCount: 0,
            actionCount: 0
          }
        },
        {
          type: 'order_confirmed',
          category: 'administrative',
          priority: 'medium',
          recipients: [{
            userId: this.testUserId,
            userRole: 'patient',
            deliveryChannels: ['websocket', 'email'],
            deliveryStatus: {
              websocket: { status: 'delivered', deliveredAt: new Date() },
              email: { status: 'delivered', deliveredAt: new Date() },
              sms: { status: 'pending' }
            },
            readAt: new Date() // This one is already read
          }],
          content: {
            title: 'Order Confirmed',
            message: 'Your medication order has been confirmed by the pharmacy.',
            actionUrl: '/orders/456',
            actionText: 'Track Order',
            metadata: { orderId: '456', pharmacyName: 'City Pharmacy' }
          },
          contextData: { orderId: '456', pharmacyId: 'pharm456' },
          relatedEntities: [{
            entityType: 'order',
            entityId: new mongoose.Types.ObjectId()
          }],
          analytics: {
            totalRecipients: 1,
            deliveredCount: 1,
            readCount: 1,
            actionCount: 0
          }
        },
        {
          type: 'appointment_reminder',
          category: 'medical',
          priority: 'high',
          recipients: [{
            userId: this.testUserId,
            userRole: 'patient',
            deliveryChannels: ['websocket', 'email', 'sms'],
            deliveryStatus: {
              websocket: { status: 'delivered', deliveredAt: new Date() },
              email: { status: 'delivered', deliveredAt: new Date() },
              sms: { status: 'delivered', deliveredAt: new Date() }
            }
          }],
          content: {
            title: 'Appointment Reminder',
            message: 'You have an appointment with Dr. Johnson tomorrow at 2:00 PM.',
            actionUrl: '/appointments/789',
            actionText: 'View Details',
            metadata: { appointmentId: '789', doctorName: 'Dr. Johnson', appointmentTime: '2024-01-15T14:00:00Z' }
          },
          contextData: { appointmentId: '789', doctorId: 'doc789' },
          relatedEntities: [{
            entityType: 'appointment',
            entityId: new mongoose.Types.ObjectId()
          }],
          scheduledFor: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          analytics: {
            totalRecipients: 1,
            deliveredCount: 1,
            readCount: 0,
            actionCount: 0
          }
        },
        {
          type: 'system_maintenance',
          category: 'system',
          priority: 'low',
          recipients: [{
            userId: this.testUserId,
            userRole: 'patient',
            deliveryChannels: ['websocket'],
            deliveryStatus: {
              websocket: { status: 'delivered', deliveredAt: new Date() },
              email: { status: 'pending' },
              sms: { status: 'pending' }
            }
          }],
          content: {
            title: 'Scheduled Maintenance',
            message: 'The system will undergo maintenance tonight from 2:00 AM to 4:00 AM.',
            actionUrl: null,
            actionText: null,
            metadata: { maintenanceStart: '2024-01-16T02:00:00Z', maintenanceEnd: '2024-01-16T04:00:00Z' }
          },
          contextData: { maintenanceWindow: '2024-01-16T02:00:00Z to 2024-01-16T04:00:00Z' },
          analytics: {
            totalRecipients: 1,
            deliveredCount: 1,
            readCount: 0,
            actionCount: 0
          }
        }
      ];

      // Create notifications with different timestamps
      for (let i = 0; i < notifications.length; i++) {
        const notificationData = notifications[i];
        notificationData.createdAt = new Date(Date.now() - (i * 60 * 60 * 1000)); // Spread over hours
        
        const notification = new Notification(notificationData);
        await notification.save();
        this.testNotificationIds.push(notification._id);
      }

      console.log(`✅ Created ${notifications.length} test notifications`);
    } catch (error) {
      console.error('❌ Failed to create test notifications:', error);
      throw error;
    }
  }

  async testGetUserNotifications() {
    console.log('\n🧪 Testing GET /api/notifications');
    
    try {
      // Test basic retrieval
      const response = await this.makeRequest('GET', '/notifications');
      console.log('✅ Basic notification retrieval:', {
        total: response.data.pagination.total,
        unreadCount: response.data.summary.unreadCount,
        notifications: response.data.notifications.length
      });

      // Test with filters
      const filteredResponse = await this.makeRequest('GET', '/notifications?category=medical&priority=high&limit=2');
      console.log('✅ Filtered notifications:', {
        total: filteredResponse.data.pagination.total,
        notifications: filteredResponse.data.notifications.length
      });

      // Test unread only
      const unreadResponse = await this.makeRequest('GET', '/notifications?unreadOnly=true');
      console.log('✅ Unread notifications:', {
        unreadCount: unreadResponse.data.notifications.length
      });

      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testGetNotificationById() {
    console.log('\n🧪 Testing GET /api/notifications/:id');
    
    try {
      const notificationId = this.testNotificationIds[0];
      const response = await this.makeRequest('GET', `/notifications/${notificationId}`);
      
      console.log('✅ Single notification retrieval:', {
        id: response.data.id,
        type: response.data.type,
        hasContent: !!response.data.content,
        hasDeliveryStatus: !!response.data.deliveryStatus
      });

      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testMarkAsRead() {
    console.log('\n🧪 Testing POST /api/notifications/:id/read');
    
    try {
      const notificationId = this.testNotificationIds[0];
      const response = await this.makeRequest('POST', `/notifications/${notificationId}/read`);
      
      console.log('✅ Mark as read:', {
        success: response.success,
        readAt: response.data.readAt
      });

      // Verify it was marked as read
      const verifyResponse = await this.makeRequest('GET', `/notifications/${notificationId}`);
      console.log('✅ Verification - notification is read:', !!verifyResponse.data.readAt);

      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testMarkMultipleAsRead() {
    console.log('\n🧪 Testing POST /api/notifications/mark-read');
    
    try {
      const notificationIds = this.testNotificationIds.slice(1, 3); // Use 2 notifications
      const response = await this.makeRequest('POST', '/notifications/mark-read', {
        notificationIds
      });
      
      console.log('✅ Mark multiple as read:', {
        success: response.success,
        successful: response.data.summary.successful,
        total: response.data.summary.total
      });

      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testRecordAction() {
    console.log('\n🧪 Testing POST /api/notifications/:id/action');
    
    try {
      const notificationId = this.testNotificationIds[2];
      const response = await this.makeRequest('POST', `/notifications/${notificationId}/action`, {
        action: 'clicked_view_details',
        metadata: { clickedAt: new Date(), source: 'web_app' }
      });
      
      console.log('✅ Record action:', {
        success: response.success,
        action: response.data.action.action,
        takenAt: response.data.action.takenAt
      });

      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testGetStats() {
    console.log('\n🧪 Testing GET /api/notifications/stats');
    
    try {
      const response = await this.makeRequest('GET', '/notifications/stats?period=7d');
      
      console.log('✅ Notification stats:', {
        total: response.data.summary.total,
        unread: response.data.summary.unread,
        readRate: response.data.summary.readRate + '%',
        categories: Object.keys(response.data.categoryBreakdown).length,
        dailyActivity: response.data.dailyActivity.length
      });

      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testSearchNotifications() {
    console.log('\n🧪 Testing GET /api/notifications/search');
    
    try {
      const response = await this.makeRequest('GET', '/notifications/search?q=prescription');
      
      console.log('✅ Search notifications:', {
        query: response.data.query,
        results: response.data.notifications.length,
        total: response.data.pagination.total
      });

      // Test search with filters
      const filteredSearch = await this.makeRequest('GET', '/notifications/search?q=appointment&category=medical');
      console.log('✅ Filtered search:', {
        results: filteredSearch.data.notifications.length
      });

      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testDeleteNotification() {
    console.log('\n🧪 Testing DELETE /api/notifications/:id');
    
    try {
      const notificationId = this.testNotificationIds[3];
      const response = await this.makeRequest('DELETE', `/notifications/${notificationId}`);
      
      console.log('✅ Delete notification:', {
        success: response.success,
        message: response.message
      });

      // Verify it was marked as dismissed
      const verifyResponse = await this.makeRequest('GET', `/notifications/${notificationId}`);
      console.log('✅ Verification - notification dismissed:', 
        verifyResponse.data.actionTaken?.action === 'dismissed'
      );

      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async makeRequest(method, endpoint, data = null) {
    // Simulate API request (in real implementation, use fetch or axios)
    // For testing purposes, we'll directly test the controller methods
    
    const NotificationController = (await import('./src/controllers/NotificationController.js')).default;
    const controller = new NotificationController();
    
    // Mock request and response objects
    const req = {
      user: { id: this.testUserId.toString(), role: 'patient' },
      params: {},
      query: {},
      body: data || {}
    };
    
    const res = {
      json: (data) => data,
      status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
    };

    // Parse endpoint to extract params and query
    const [path, queryString] = endpoint.split('?');
    const pathParts = path.split('/').filter(p => p);
    
    if (queryString) {
      const params = new URLSearchParams(queryString);
      for (const [key, value] of params) {
        req.query[key] = value;
      }
    }

    // Extract path parameters
    if (pathParts.includes('notifications') && pathParts.length > 1) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart !== 'stats' && lastPart !== 'search' && lastPart !== 'mark-read' && lastPart !== 'mark-all-read') {
        req.params.notificationId = lastPart;
      }
    }

    try {
      let result;
      
      switch (method + ' ' + path) {
        case 'GET /notifications':
          result = await controller.getUserNotifications(req, res);
          break;
        case 'GET /notifications/stats':
          result = await controller.getNotificationStats(req, res);
          break;
        case 'GET /notifications/search':
          result = await controller.searchNotifications(req, res);
          break;
        case 'POST /notifications/mark-read':
          result = await controller.markMultipleAsRead(req, res);
          break;
        case 'POST /notifications/mark-all-read':
          result = await controller.markAllAsRead(req, res);
          break;
        default:
          if (req.params.notificationId) {
            switch (method) {
              case 'GET':
                result = await controller.getNotificationById(req, res);
                break;
              case 'POST':
                if (path.endsWith('/read')) {
                  result = await controller.markAsRead(req, res);
                } else if (path.endsWith('/action')) {
                  result = await controller.recordAction(req, res);
                }
                break;
              case 'DELETE':
                result = await controller.deleteNotification(req, res);
                break;
            }
          }
      }
      
      return result;
    } catch (error) {
      throw new Error(`API call failed: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting User Notification API Tests\n');
    
    const tests = [
      { name: 'Get User Notifications', fn: this.testGetUserNotifications },
      { name: 'Get Notification By ID', fn: this.testGetNotificationById },
      { name: 'Mark As Read', fn: this.testMarkAsRead },
      { name: 'Mark Multiple As Read', fn: this.testMarkMultipleAsRead },
      { name: 'Record Action', fn: this.testRecordAction },
      { name: 'Get Stats', fn: this.testGetStats },
      { name: 'Search Notifications', fn: this.testSearchNotifications },
      { name: 'Delete Notification', fn: this.testDeleteNotification }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test.fn.call(this);
        if (result) {
          passed++;
          console.log(`✅ ${test.name} - PASSED`);
        } else {
          failed++;
          console.log(`❌ ${test.name} - FAILED`);
        }
      } catch (error) {
        failed++;
        console.log(`❌ ${test.name} - ERROR:`, error.message);
      }
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    return { passed, failed, total: tests.length };
  }

  async cleanup() {
    try {
      // Clean up test data
      await Notification.deleteMany({ 'recipients.userId': this.testUserId });
      await UserNotificationPreferences.deleteOne({ userId: this.testUserId });
      await User.deleteOne({ _id: this.testUserId });
      
      console.log('✅ Test cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

// Run tests
async function runTests() {
  const tester = new NotificationAPITester();
  
  try {
    console.log('🔄 Initializing test environment...');
    await tester.initialize();
    
    console.log('🔄 Running all tests...');
    const results = await tester.runAllTests();
    
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed! User notification APIs are working correctly.');
    } else {
      console.log(`\n⚠️ ${results.failed} tests failed. Please check the implementation.`);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    console.log('🔄 Cleaning up...');
    await tester.cleanup();
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export default NotificationAPITester;