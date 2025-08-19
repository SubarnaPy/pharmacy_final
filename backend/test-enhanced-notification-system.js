import mongoose from 'mongoose';
import dotenv from 'dotenv';
import notificationSystemInitializer from './src/services/notifications/index.js';

// Load environment variables
dotenv.config();

/**
 * Test script for Enhanced Notification System
 * Tests the basic functionality of the notification system
 */
async function testEnhancedNotificationSystem() {
  try {
    console.log('🧪 Starting Enhanced Notification System Test...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Initialize notification system
    const { service, middleware, queue } = await notificationSystemInitializer.initialize({
      webSocketService: null, // Mock WebSocket service for testing
      serviceOptions: {
        // Test configuration
      }
    });

    console.log('✅ Notification system initialized');

    // Test 1: Create a simple notification
    console.log('\n📝 Test 1: Creating a simple notification...');
    
    const testUserId = new mongoose.Types.ObjectId();
    const notification1 = await service.sendNotification(
      testUserId.toString(),
      'prescription_created',
      {
        doctorName: 'Dr. Smith',
        prescriptionId: new mongoose.Types.ObjectId(),
        medicationName: 'Amoxicillin'
      },
      {
        title: 'New Prescription Created',
        message: 'Dr. Smith has created a new prescription for Amoxicillin',
        priority: 'high',
        userRole: 'patient',
        channels: ['websocket', 'email']
      }
    );

    console.log('✅ Notification created:', notification1._id);

    // Test 2: Create bulk notification
    console.log('\n📢 Test 2: Creating bulk notification...');
    
    const recipients = [
      { userId: new mongoose.Types.ObjectId(), userRole: 'patient', deliveryChannels: ['websocket'] },
      { userId: new mongoose.Types.ObjectId(), userRole: 'patient', deliveryChannels: ['websocket', 'email'] }
    ];

    const notification2 = await service.sendBulkNotification(
      recipients,
      'system_maintenance',
      {
        maintenanceTime: '2024-01-15 02:00 AM',
        duration: '2 hours'
      },
      {
        title: 'Scheduled Maintenance',
        message: 'System maintenance is scheduled for 2024-01-15 02:00 AM',
        priority: 'medium',
        category: 'system'
      }
    );

    console.log('✅ Bulk notification created:', notification2._id);

    // Test 3: Test notification preferences
    console.log('\n🔧 Test 3: Testing notification preferences...');
    
    const testPreferences = {
      globalSettings: {
        enabled: true,
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC'
        }
      },
      channels: {
        websocket: { enabled: true },
        email: { enabled: true, frequency: 'digest' },
        sms: { enabled: false }
      }
    };

    const updatedPreferences = await service.updateUserPreferences(testUserId.toString(), testPreferences);
    console.log('✅ User preferences updated:', updatedPreferences._id);

    // Test 4: Test middleware functionality
    console.log('\n🔗 Test 4: Testing middleware functionality...');
    
    const mockReq = {
      user: { id: testUserId },
      notify: null
    };
    const mockRes = { locals: {} };
    const mockNext = () => {};

    // Apply middleware
    const middlewareFunction = middleware.middleware();
    middlewareFunction(mockReq, mockRes, mockNext);

    // Test notification trigger through middleware
    if (mockReq.notify) {
      await mockReq.notify.trigger('user.created', {
        userId: testUserId,
        name: 'John Doe',
        email: 'john@example.com'
      });
      console.log('✅ Middleware notification triggered');
    }

    // Test 5: Get system statistics
    console.log('\n📊 Test 5: Getting system statistics...');
    
    const serviceStats = service.getStats();
    const queueStats = await queue.getStats();
    const healthStatus = await notificationSystemInitializer.getHealthStatus();

    console.log('Service Stats:', serviceStats);
    console.log('Queue Stats:', queueStats);
    console.log('Health Status:', healthStatus);

    // Test 6: Test template retrieval
    console.log('\n📝 Test 6: Testing template retrieval...');
    
    const template = await service.getNotificationTemplate(
      'prescription_created',
      'email',
      'patient',
      'en'
    );

    if (template) {
      console.log('✅ Template found:', template.template.name);
    } else {
      console.log('⚠️ No template found (expected for test environment)');
    }

    // Wait a bit for queue processing
    console.log('\n⏳ Waiting for queue processing...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Final queue stats
    const finalQueueStats = await queue.getStats();
    console.log('Final Queue Stats:', finalQueueStats);

    console.log('\n✅ All tests completed successfully!');

    // Cleanup
    await notificationSystemInitializer.shutdown();
    await mongoose.disconnect();
    console.log('✅ Test cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testEnhancedNotificationSystem()
    .then(() => {
      console.log('🎉 Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export default testEnhancedNotificationSystem;