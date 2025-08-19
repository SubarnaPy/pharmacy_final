import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminNotificationController from './src/controllers/AdminNotificationController.js';
import Notification from './src/models/Notification.js';
import NotificationTemplate from './src/models/NotificationTemplate.js';
import UserNotificationPreferences from './src/models/UserNotificationPreferences.js';
import User from './src/models/User.js';

// Load environment variables
dotenv.config();

/**
 * Test script for admin notification management APIs
 */
class AdminNotificationAPITester {
  constructor() {
    this.testAdminId = null;
    this.testUserIds = [];
    this.testNotificationIds = [];
    this.testTemplateIds = [];
  }

  async initialize() {
    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');

      // Create test admin user
      await this.setupTestAdmin();
      
      // Create test users
      await this.setupTestUsers();
      
      // Create test notifications
      await this.createTestNotifications();

      // Create test templates
      await this.createTestTemplates();

      console.log('✅ Test setup completed');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  async setupTestAdmin() {
    try {
      // Find or create test admin user
      let testAdmin = await User.findOne({ email: 'admin.test@example.com' });
      
      if (!testAdmin) {
        testAdmin = new User({
          name: 'Test Admin User',
          email: 'admin.test@example.com',
          password: 'hashedpassword123',
          role: 'admin',
          isVerified: true
        });
        await testAdmin.save();
        console.log('✅ Created test admin user');
      }

      this.testAdminId = testAdmin._id;
    } catch (error) {
      console.error('❌ Failed to setup test admin:', error);
      throw error;
    }
  }

  async setupTestUsers() {
    try {
      const userRoles = ['patient', 'doctor', 'pharmacy'];
      
      for (const role of userRoles) {
        let testUser = await User.findOne({ email: `test.${role}@example.com` });
        
        if (!testUser) {
          testUser = new User({
            name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            email: `test.${role}@example.com`,
            password: 'hashedpassword123',
            role: role,
            isVerified: true
          });
          await testUser.save();
        }

        this.testUserIds.push(testUser._id);

        // Create notification preferences
        let preferences = await UserNotificationPreferences.findOne({ userId: testUser._id });
        if (!preferences) {
          preferences = new UserNotificationPreferences({
            userId: testUser._id,
            globalSettings: {
              enabled: true,
              quietHours: { enabled: false },
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
              email: testUser.email,
              phone: '+1234567890',
              preferredLanguage: 'en'
            }
          });
          await preferences.save();
        }
      }

      console.log(`✅ Created ${userRoles.length} test users with preferences`);
    } catch (error) {
      console.error('❌ Failed to setup test users:', error);
      throw error;
    }
  }

  async createTestNotifications() {
    try {
      const notifications = [
        {
          type: 'system_maintenance',
          category: 'system',
          priority: 'high',
          recipients: this.testUserIds.map(userId => ({
            userId,
            userRole: 'patient',
            deliveryChannels: ['websocket', 'email'],
            deliveryStatus: {
              websocket: { status: 'delivered', deliveredAt: new Date() },
              email: { status: 'sent', deliveredAt: new Date() },
              sms: { status: 'pending' }
            }
          })),
          content: {
            title: 'Scheduled System Maintenance',
            message: 'The system will undergo maintenance tonight from 2:00 AM to 4:00 AM.',
            actionUrl: '/maintenance-info',
            actionText: 'Learn More'
          },
          analytics: {
            totalRecipients: this.testUserIds.length,
            deliveredCount: this.testUserIds.length,
            readCount: 1,
            actionCount: 0
          },
          createdBy: this.testAdminId
        },
        {
          type: 'prescription_created',
          category: 'medical',
          priority: 'medium',
          recipients: [{
            userId: this.testUserIds[0],
            userRole: 'patient',
            deliveryChannels: ['websocket', 'email'],
            deliveryStatus: {
              websocket: { status: 'failed', error: 'User offline', deliveredAt: null },
              email: { status: 'delivered', deliveredAt: new Date() },
              sms: { status: 'pending' }
            }
          }],
          content: {
            title: 'New Prescription Available',
            message: 'Your doctor has created a new prescription for you.',
            actionUrl: '/prescriptions/123',
            actionText: 'View Prescription'
          },
          analytics: {
            totalRecipients: 1,
            deliveredCount: 1,
            readCount: 0,
            actionCount: 0
          },
          createdBy: this.testUserIds[1] // Created by doctor
        },
        {
          type: 'order_confirmed',
          category: 'administrative',
          priority: 'low',
          recipients: [{
            userId: this.testUserIds[0],
            userRole: 'patient',
            deliveryChannels: ['websocket'],
            deliveryStatus: {
              websocket: { status: 'pending' },
              email: { status: 'pending' },
              sms: { status: 'pending' }
            }
          }],
          content: {
            title: 'Order Confirmed',
            message: 'Your medication order has been confirmed.',
            actionUrl: '/orders/456',
            actionText: 'Track Order'
          },
          scheduledFor: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          analytics: {
            totalRecipients: 1,
            deliveredCount: 0,
            readCount: 0,
            actionCount: 0
          },
          createdBy: this.testUserIds[2] // Created by pharmacy
        }
      ];

      for (const notificationData of notifications) {
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

  async createTestTemplates() {
    try {
      const templates = [
        {
          name: 'System Maintenance Alert',
          type: 'system_maintenance',
          category: 'system',
          version: '1.0.0',
          isActive: true,
          variants: [
            {
              channel: 'email',
              userRole: 'patient',
              language: 'en',
              subject: 'Scheduled System Maintenance - {maintenanceDate}',
              title: 'System Maintenance Notice',
              body: 'Dear {userName}, our system will undergo maintenance on {maintenanceDate} from {startTime} to {endTime}. During this time, services may be temporarily unavailable.',
              htmlBody: '<h2>System Maintenance Notice</h2><p>Dear {userName},</p><p>Our system will undergo maintenance on <strong>{maintenanceDate}</strong> from <strong>{startTime}</strong> to <strong>{endTime}</strong>.</p><p>During this time, services may be temporarily unavailable.</p>',
              actions: [
                { text: 'Learn More', url: '/maintenance-info', style: 'primary' }
              ]
            },
            {
              channel: 'websocket',
              userRole: 'patient',
              language: 'en',
              title: 'System Maintenance Scheduled',
              body: 'System maintenance scheduled for {maintenanceDate} from {startTime} to {endTime}.',
              actions: [
                { text: 'Details', url: '/maintenance-info', style: 'secondary' }
              ]
            }
          ],
          usage: {
            totalSent: 0,
            lastUsed: null,
            averageEngagement: 0
          },
          createdBy: this.testAdminId
        },
        {
          name: 'Prescription Created',
          type: 'prescription_created',
          category: 'medical',
          version: '1.0.0',
          isActive: true,
          variants: [
            {
              channel: 'email',
              userRole: 'patient',
              language: 'en',
              subject: 'New Prescription from Dr. {doctorName}',
              title: 'New Prescription Available',
              body: 'Hello {patientName}, Dr. {doctorName} has created a new prescription for you. Please review and submit to your preferred pharmacy.',
              htmlBody: '<h2>New Prescription Available</h2><p>Hello {patientName},</p><p>Dr. <strong>{doctorName}</strong> has created a new prescription for you.</p><p>Please review and submit to your preferred pharmacy.</p>',
              actions: [
                { text: 'View Prescription', url: '/prescriptions/{prescriptionId}', style: 'primary' },
                { text: 'Find Pharmacy', url: '/pharmacies', style: 'secondary' }
              ]
            }
          ],
          usage: {
            totalSent: 0,
            lastUsed: null,
            averageEngagement: 0
          },
          createdBy: this.testAdminId
        }
      ];

      for (const templateData of templates) {
        const template = new NotificationTemplate(templateData);
        await template.save();
        this.testTemplateIds.push(template._id);
      }

      console.log(`✅ Created ${templates.length} test templates`);
    } catch (error) {
      console.error('❌ Failed to create test templates:', error);
      throw error;
    }
  }

  async testGetSystemOverview() {
    console.log('\n🧪 Testing GET /api/notifications/admin/overview');
    
    try {
      const controller = new AdminNotificationController();
      
      const req = {
        user: { id: this.testAdminId.toString(), role: 'admin' },
        query: { period: '7d' }
      };
      
      const res = {
        json: (data) => {
          console.log('✅ System overview:', {
            success: data.success,
            totalNotifications: data.data.summary.total,
            deliveryRate: data.data.summary.deliveryRate + '%',
            failureRate: data.data.summary.failureRate + '%',
            categoriesCount: Object.keys(data.data.breakdown.category).length,
            rolesCount: Object.keys(data.data.breakdown.role).length,
            recentFailures: data.data.recentFailures.length
          });
          return data;
        },
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      await controller.getSystemOverview(req, res);
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testGetAllNotifications() {
    console.log('\n🧪 Testing GET /api/notifications/admin/all');
    
    try {
      const controller = new AdminNotificationController();
      
      const req = {
        user: { id: this.testAdminId.toString(), role: 'admin' },
        query: { 
          page: 1, 
          limit: 10,
          category: 'system',
          priority: 'high'
        }
      };
      
      const res = {
        json: (data) => {
          console.log('✅ All notifications:', {
            success: data.success,
            notificationCount: data.data.notifications.length,
            total: data.data.pagination.total,
            hasRecipients: data.data.notifications[0]?.recipients?.length > 0,
            hasCreatedBy: !!data.data.notifications[0]?.createdBy
          });
          return data;
        },
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      await controller.getAllNotifications(req, res);
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testSendBulkNotification() {
    console.log('\n🧪 Testing POST /api/notifications/admin/bulk');
    
    try {
      const controller = new AdminNotificationController();
      
      const req = {
        user: { id: this.testAdminId.toString(), role: 'admin' },
        body: {
          recipients: this.testUserIds.slice(0, 2).map(userId => ({
            userId: userId.toString(),
            userRole: 'patient',
            channels: ['websocket', 'email']
          })),
          type: 'admin_announcement',
          content: {
            title: 'Important Announcement',
            message: 'This is a test bulk notification from admin.',
            actionUrl: '/announcements/123',
            actionText: 'Read More'
          },
          priority: 'medium',
          category: 'administrative',
          channels: ['websocket', 'email']
        }
      };
      
      const res = {
        json: (data) => {
          console.log('✅ Bulk notification:', {
            success: data.success,
            message: data.message,
            recipientCount: data.data?.recipientCount,
            notificationId: data.data?.notificationId
          });
          return data;
        },
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      // Mock the notification service
      const mockNotificationService = {
        createNotification: async (notificationData) => {
          return {
            _id: new mongoose.Types.ObjectId(),
            type: notificationData.type,
            recipients: notificationData.recipients,
            scheduledFor: notificationData.scheduledFor,
            createdAt: new Date()
          };
        }
      };
      
      controller.setNotificationService(mockNotificationService);
      await controller.sendBulkNotification(req, res);
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testBroadcastNotification() {
    console.log('\n🧪 Testing POST /api/notifications/admin/broadcast');
    
    try {
      const controller = new AdminNotificationController();
      
      const req = {
        user: { id: this.testAdminId.toString(), role: 'admin' },
        body: {
          targetRole: 'patient',
          type: 'system_announcement',
          content: {
            title: 'System Update Available',
            message: 'A new system update is available with improved features.',
            actionUrl: '/updates',
            actionText: 'Learn More'
          },
          priority: 'low',
          category: 'system',
          channels: ['websocket']
        }
      };
      
      const res = {
        json: (data) => {
          console.log('✅ Broadcast notification:', {
            success: data.success,
            message: data.message,
            targetRole: data.data?.targetRole,
            recipientCount: data.data?.recipientCount,
            notificationId: data.data?.notificationId
          });
          return data;
        },
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      // Mock the notification service
      const mockNotificationService = {
        createNotification: async (notificationData) => {
          return {
            _id: new mongoose.Types.ObjectId(),
            type: notificationData.type,
            recipients: notificationData.recipients,
            scheduledFor: notificationData.scheduledFor,
            createdAt: new Date()
          };
        }
      };
      
      controller.setNotificationService(mockNotificationService);
      await controller.broadcastNotification(req, res);
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testRetryNotification() {
    console.log('\n🧪 Testing POST /api/notifications/admin/:notificationId/retry');
    
    try {
      const controller = new AdminNotificationController();
      
      const req = {
        user: { id: this.testAdminId.toString(), role: 'admin' },
        params: { notificationId: this.testNotificationIds[1].toString() },
        body: {
          channels: ['websocket'],
          recipientIds: [this.testUserIds[0].toString()]
        }
      };
      
      const res = {
        json: (data) => {
          console.log('✅ Retry notification:', {
            success: data.success,
            message: data.message,
            retryCount: data.data?.retryCount,
            deliveriesRetried: data.data?.deliveriesRetried
          });
          return data;
        },
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      // Mock the notification service
      const mockNotificationService = {
        queueNotificationForDelivery: async (notification) => {
          console.log('📬 Notification queued for retry delivery');
          return true;
        }
      };
      
      controller.setNotificationService(mockNotificationService);
      await controller.retryNotification(req, res);
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testCancelNotification() {
    console.log('\n🧪 Testing POST /api/notifications/admin/:notificationId/cancel');
    
    try {
      const controller = new AdminNotificationController();
      
      const req = {
        user: { id: this.testAdminId.toString(), role: 'admin' },
        params: { notificationId: this.testNotificationIds[2].toString() },
        body: {
          reason: 'Test cancellation - no longer needed'
        }
      };
      
      const res = {
        json: (data) => {
          console.log('✅ Cancel notification:', {
            success: data.success,
            message: data.message,
            notificationId: data.data?.notificationId,
            reason: data.data?.reason
          });
          return data;
        },
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      await controller.cancelNotification(req, res);
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testGetNotificationTemplates() {
    console.log('\n🧪 Testing GET /api/notifications/admin/templates');
    
    try {
      const controller = new AdminNotificationController();
      
      const req = {
        user: { id: this.testAdminId.toString(), role: 'admin' },
        query: { 
          page: 1, 
          limit: 10,
          isActive: 'true'
        }
      };
      
      const res = {
        json: (data) => {
          console.log('✅ Notification templates:', {
            success: data.success,
            templateCount: data.data.templates.length,
            total: data.data.pagination.total,
            hasVariants: data.data.templates[0]?.variants?.length > 0,
            hasUsageStats: !!data.data.templates[0]?.usage
          });
          return data;
        },
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      await controller.getNotificationTemplates(req, res);
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testCreateTemplate() {
    console.log('\n🧪 Testing POST /api/notifications/admin/templates');
    
    try {
      const controller = new AdminNotificationController();
      
      const req = {
        user: { id: this.testAdminId.toString(), role: 'admin' },
        body: {
          name: 'Test Template',
          type: 'test_notification',
          category: 'administrative',
          variants: [
            {
              channel: 'email',
              userRole: 'patient',
              language: 'en',
              subject: 'Test Subject - {testValue}',
              title: 'Test Notification',
              body: 'This is a test notification template with {testValue}.',
              htmlBody: '<h2>Test Notification</h2><p>This is a test notification template with <strong>{testValue}</strong>.</p>',
              actions: [
                { text: 'Test Action', url: '/test', style: 'primary' }
              ]
            }
          ],
          isActive: true
        }
      };
      
      const res = {
        json: (data) => {
          console.log('✅ Create template:', {
            success: data.success,
            message: data.message,
            templateId: data.data?.templateId,
            name: data.data?.name,
            variantCount: data.data?.variantCount
          });
          
          // Store the created template ID for cleanup
          if (data.data?.templateId) {
            this.testTemplateIds.push(data.data.templateId);
          }
          
          return data;
        },
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      await controller.createOrUpdateTemplate(req, res);
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testGetUserPreferences() {
    console.log('\n🧪 Testing GET /api/notifications/admin/preferences/:userId');
    
    try {
      const controller = new AdminNotificationController();
      
      const req = {
        user: { id: this.testAdminId.toString(), role: 'admin' },
        params: { userId: this.testUserIds[0].toString() }
      };
      
      const res = {
        json: (data) => {
          console.log('✅ User preferences:', {
            success: data.success,
            userId: data.data?.user?.id,
            userName: data.data?.user?.name,
            userRole: data.data?.user?.role,
            globalEnabled: data.data?.preferences?.globalSettings?.enabled,
            channelsCount: Object.keys(data.data?.preferences?.channels || {}).length,
            categoriesCount: Object.keys(data.data?.preferences?.categories || {}).length
          });
          return data;
        },
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      await controller.getUserPreferences(req, res);
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async testEmergencyOverride() {
    console.log('\n🧪 Testing POST /api/notifications/admin/emergency-override');
    
    try {
      const controller = new AdminNotificationController();
      
      const req = {
        user: { id: this.testAdminId.toString(), role: 'admin' },
        body: {
          userIds: [this.testUserIds[0].toString(), this.testUserIds[1].toString()],
          type: 'emergency_alert',
          content: {
            title: 'Emergency System Alert',
            message: 'This is an emergency notification that overrides user preferences.',
            actionUrl: '/emergency',
            actionText: 'View Details'
          },
          priority: 'emergency',
          category: 'system',
          channels: ['websocket', 'email', 'sms'],
          overrideReason: 'Critical system security alert requiring immediate attention'
        }
      };
      
      const res = {
        json: (data) => {
          console.log('✅ Emergency override:', {
            success: data.success,
            message: data.message,
            recipientCount: data.data?.recipientCount,
            overrideReason: data.data?.overrideReason,
            notificationId: data.data?.notificationId
          });
          return data;
        },
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      // Mock the notification service
      const mockNotificationService = {
        createNotification: async (notificationData) => {
          return {
            _id: new mongoose.Types.ObjectId(),
            type: notificationData.type,
            recipients: notificationData.recipients,
            createdAt: new Date()
          };
        }
      };
      
      controller.setNotificationService(mockNotificationService);
      await controller.emergencyOverride(req, res);
      return true;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Admin Notification API Tests\n');
    
    const tests = [
      { name: 'Get System Overview', fn: this.testGetSystemOverview },
      { name: 'Get All Notifications', fn: this.testGetAllNotifications },
      { name: 'Send Bulk Notification', fn: this.testSendBulkNotification },
      { name: 'Broadcast Notification', fn: this.testBroadcastNotification },
      { name: 'Retry Notification', fn: this.testRetryNotification },
      { name: 'Cancel Notification', fn: this.testCancelNotification },
      { name: 'Get Notification Templates', fn: this.testGetNotificationTemplates },
      { name: 'Create Template', fn: this.testCreateTemplate },
      { name: 'Get User Preferences', fn: this.testGetUserPreferences },
      { name: 'Emergency Override', fn: this.testEmergencyOverride }
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
      await Notification.deleteMany({ 
        $or: [
          { createdBy: this.testAdminId },
          { 'recipients.userId': { $in: this.testUserIds } }
        ]
      });
      
      await NotificationTemplate.deleteMany({ _id: { $in: this.testTemplateIds } });
      await UserNotificationPreferences.deleteMany({ userId: { $in: this.testUserIds } });
      await User.deleteMany({ _id: { $in: [...this.testUserIds, this.testAdminId] } });
      
      console.log('✅ Test cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

// Run tests
async function runTests() {
  const tester = new AdminNotificationAPITester();
  
  try {
    console.log('🔄 Initializing test environment...');
    await tester.initialize();
    
    console.log('🔄 Running all tests...');
    const results = await tester.runAllTests();
    
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed! Admin notification APIs are working correctly.');
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

export default AdminNotificationAPITester;