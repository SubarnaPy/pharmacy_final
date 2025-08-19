import mongoose from 'mongoose';
import dotenv from 'dotenv';
import NotificationController from './src/controllers/NotificationController.js';
import Notification from './src/models/Notification.js';
import User from './src/models/User.js';

// Load environment variables
dotenv.config();

async function testNotificationController() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create test user
    console.log('🔄 Creating test user...');
    const testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'patient',
      isVerified: true
    });
    await testUser.save();
    console.log('✅ Test user created:', testUser._id);

    // Create test notification
    console.log('🔄 Creating test notification...');
    const testNotification = new Notification({
      type: 'prescription_created',
      category: 'medical',
      priority: 'high',
      recipients: [{
        userId: testUser._id,
        userRole: 'patient',
        deliveryChannels: ['websocket', 'email'],
        deliveryStatus: {
          websocket: { status: 'delivered', deliveredAt: new Date() },
          email: { status: 'sent', deliveredAt: new Date() },
          sms: { status: 'pending' }
        }
      }],
      content: {
        title: 'Test Notification',
        message: 'This is a test notification',
        actionUrl: '/test',
        actionText: 'View Test'
      },
      analytics: {
        totalRecipients: 1,
        deliveredCount: 1,
        readCount: 0,
        actionCount: 0
      }
    });
    await testNotification.save();
    console.log('✅ Test notification created:', testNotification._id);

    // Test the controller
    console.log('🔄 Testing NotificationController...');
    const controller = new NotificationController();

    // Mock request and response
    const req = {
      user: { id: testUser._id.toString(), role: 'patient' },
      query: { page: 1, limit: 10 },
      params: {},
      body: {}
    };

    const res = {
      json: (data) => {
        console.log('✅ Controller response:', {
          success: data.success,
          notificationCount: data.data?.notifications?.length || 0,
          total: data.data?.pagination?.total || 0
        });
        return data;
      },
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Error response (${code}):`, data);
          return data;
        }
      })
    };

    // Test getUserNotifications
    console.log('🧪 Testing getUserNotifications...');
    await controller.getUserNotifications(req, res);

    // Test getNotificationById
    console.log('🧪 Testing getNotificationById...');
    req.params.notificationId = testNotification._id.toString();
    await controller.getNotificationById(req, res);

    // Test markAsRead
    console.log('🧪 Testing markAsRead...');
    await controller.markAsRead(req, res);

    // Cleanup
    console.log('🔄 Cleaning up...');
    await Notification.deleteOne({ _id: testNotification._id });
    await User.deleteOne({ _id: testUser._id });
    console.log('✅ Cleanup completed');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testNotificationController();