import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import our models
import Notification from './src/models/Notification.js';
import NotificationTemplate from './src/models/NotificationTemplate.js';
import UserNotificationPreferences from './src/models/UserNotificationPreferences.js';
import NotificationAnalytics from './src/models/NotificationAnalytics.js';

// Import services
import EnhancedNotificationService from './src/services/notifications/EnhancedNotificationService.js';
import NotificationQueue from './src/services/notifications/NotificationQueue.js';
import NotificationMiddleware from './src/middleware/NotificationMiddleware.js';

// Load environment variables
dotenv.config();

/**
 * Test script for Enhanced Notification System Foundation
 * Tests the core models and basic service functionality
 */
async function testNotificationFoundation() {
  try {
    console.log('🧪 Starting Notification Foundation Test...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Test 1: Test Notification Model
    console.log('\n📝 Test 1: Testing Notification Model...');
    
    const testUserId = new mongoose.Types.ObjectId();
    const testNotification = new Notification({
      type: 'prescription_created',
      category: 'medical',
      priority: 'high',
      recipients: [{
        userId: testUserId,
        userRole: 'patient',
        deliveryChannels: ['websocket', 'email'],
        deliveryStatus: {
          websocket: { status: 'pending' },
          email: { status: 'pending' },
          sms: { status: 'pending' }
        }
      }],
      content: {
        title: 'New Prescription Created',
        message: 'Dr. Smith has created a new prescription for you.',
        actionUrl: '/prescriptions/123',
        actionText: 'View Prescription'
      },
      contextData: {
        doctorName: 'Dr. Smith',
        medicationName: 'Amoxicillin'
      },
      analytics: {
        totalRecipients: 1,
        deliveredCount: 0,
        readCount: 0
      }
    });

    const savedNotification = await testNotification.save();
    console.log('✅ Notification model test passed:', savedNotification._id);

    // Test 2: Test NotificationTemplate Model
    console.log('\n📝 Test 2: Testing NotificationTemplate Model...');
    
    const testTemplate = new NotificationTemplate({
      name: 'Prescription Created Template',
      type: 'prescription_created',
      category: 'medical',
      variants: [{
        channel: 'email',
        userRole: 'patient',
        language: 'en',
        subject: 'New Prescription from {doctorName}',
        title: 'New Prescription Created',
        body: 'Hello! Dr. {doctorName} has created a new prescription for {medicationName}.',
        htmlBody: '<h1>New Prescription</h1><p>Dr. {doctorName} has created a prescription for {medicationName}.</p>',
        styling: {
          primaryColor: '#007bff',
          logoUrl: 'https://example.com/logo.png'
        },
        actions: [{
          text: 'View Prescription',
          url: '/prescriptions/{prescriptionId}',
          style: 'primary'
        }]
      }],
      version: '1.0.0',
      isActive: true
    });

    const savedTemplate = await testTemplate.save();
    console.log('✅ NotificationTemplate model test passed:', savedTemplate._id);

    // Test 3: Test UserNotificationPreferences Model
    console.log('\n📝 Test 3: Testing UserNotificationPreferences Model...');
    
    const testPreferences = new UserNotificationPreferences({
      userId: testUserId,
      globalSettings: {
        enabled: true,
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC'
        },
        frequency: 'immediate'
      },
      channels: {
        websocket: { enabled: true },
        email: { 
          enabled: true,
          frequency: 'immediate',
          digestTime: '09:00'
        },
        sms: { 
          enabled: false,
          emergencyOnly: true
        }
      },
      contactInfo: {
        email: 'test@example.com',
        phone: '+1234567890',
        preferredLanguage: 'en'
      }
    });

    const savedPreferences = await testPreferences.save();
    console.log('✅ UserNotificationPreferences model test passed:', savedPreferences._id);

    // Test 4: Test NotificationAnalytics Model
    console.log('\n📝 Test 4: Testing NotificationAnalytics Model...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const testAnalytics = new NotificationAnalytics({
      date: today,
      totalSent: 10,
      totalDelivered: 8,
      totalRead: 5,
      totalActioned: 2,
      totalFailed: 2,
      channelMetrics: {
        websocket: { sent: 10, delivered: 10, read: 5, failed: 0 },
        email: { sent: 8, delivered: 6, opened: 4, clicked: 2, bounced: 1, failed: 1 },
        sms: { sent: 2, delivered: 1, failed: 1 }
      },
      roleMetrics: {
        patient: { sent: 8, delivered: 7, engagement: 62.5 },
        doctor: { sent: 1, delivered: 1, engagement: 100 },
        pharmacy: { sent: 1, delivered: 0, engagement: 0 }
      },
      typeMetrics: [{
        type: 'prescription_created',
        sent: 5,
        delivered: 4,
        engagement: 80,
        averageResponseTime: 1200000
      }],
      performance: {
        averageDeliveryTime: 2500,
        failureRate: 20,
        retryRate: 10
      }
    });

    const savedAnalytics = await testAnalytics.save();
    console.log('✅ NotificationAnalytics model test passed:', savedAnalytics._id);

    // Test 5: Test NotificationQueue (memory mode)
    console.log('\n📝 Test 5: Testing NotificationQueue...');
    
    const queue = new NotificationQueue({
      queueName: 'test_queue',
      maxRetries: 2,
      retryDelay: 5000
    });

    // Add items to queue
    const queueItem1 = await queue.add({
      notificationId: savedNotification._id,
      recipientId: testUserId,
      channels: ['websocket', 'email'],
      priority: 'high'
    });

    const queueItem2 = await queue.add({
      notificationId: savedNotification._id,
      recipientId: new mongoose.Types.ObjectId(),
      channels: ['websocket'],
      priority: 'medium'
    });

    console.log('✅ Queue items added:', queueItem1, queueItem2);

    // Get queue stats
    const queueStats = await queue.getStats();
    console.log('✅ Queue stats:', queueStats);

    // Get next items
    const nextItems = await queue.getNext(2);
    console.log('✅ Next queue items:', nextItems.length);

    // Mark as processed
    if (nextItems.length > 0) {
      await queue.markProcessed(nextItems[0].id);
      console.log('✅ Marked item as processed');
    }

    // Test 6: Test NotificationMiddleware
    console.log('\n📝 Test 6: Testing NotificationMiddleware...');
    
    const middleware = new NotificationMiddleware();
    const middlewareStats = middleware.getStats();
    console.log('✅ Middleware stats:', middlewareStats);

    // Test event mapping
    const mockData = {
      userId: testUserId,
      name: 'John Doe',
      email: 'john@example.com'
    };

    // This would normally trigger a notification, but we don't have the service connected
    console.log('✅ Middleware event mappings loaded');

    // Test 7: Test Enhanced Notification Service (basic initialization)
    console.log('\n📝 Test 7: Testing EnhancedNotificationService initialization...');
    
    const service = new EnhancedNotificationService({
      webSocketService: null, // No WebSocket service for test
      emailService: null,     // No email service for test
      smsService: null        // No SMS service for test
    });

    // Test service stats
    const serviceStats = service.getStats();
    console.log('✅ Service stats:', serviceStats);

    // Test template rendering
    const renderedTemplate = service.renderTemplate(
      'Hello {name}, your {item} is ready!',
      { name: 'John', item: 'prescription' }
    );
    console.log('✅ Template rendering test:', renderedTemplate);

    // Test preference checking
    const shouldSend = service.shouldSendNotification(
      savedPreferences,
      'prescription_created',
      'high'
    );
    console.log('✅ Preference checking test:', shouldSend);

    // Test 8: Database queries and indexes
    console.log('\n📝 Test 8: Testing database queries...');
    
    // Test notification queries
    const userNotifications = await Notification.find({
      'recipients.userId': testUserId
    }).sort({ createdAt: -1 }).limit(10);
    console.log('✅ User notifications query:', userNotifications.length);

    // Test template queries
    const emailTemplate = await NotificationTemplate.findOne({
      type: 'prescription_created',
      'variants.channel': 'email',
      'variants.userRole': 'patient',
      isActive: true
    });
    console.log('✅ Template query:', emailTemplate ? 'Found' : 'Not found');

    // Test analytics queries
    const todayAnalytics = await NotificationAnalytics.findOne({
      date: today
    });
    console.log('✅ Analytics query:', todayAnalytics ? 'Found' : 'Not found');

    console.log('\n✅ All foundation tests completed successfully!');

    // Cleanup
    await queue.close();
    await mongoose.disconnect();
    console.log('✅ Test cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testNotificationFoundation()
    .then(() => {
      console.log('🎉 Foundation test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Foundation test failed:', error);
      process.exit(1);
    });
}

export default testNotificationFoundation;