import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminNotificationController from './src/controllers/AdminNotificationController.js';
import Notification from './src/models/Notification.js';
import User from './src/models/User.js';

// Load environment variables
dotenv.config();

async function testAdminNotificationController() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create test admin user
    console.log('🔄 Creating test admin user...');
    const testAdmin = new User({
      name: 'Test Admin',
      email: 'admin@example.com',
      password: 'hashedpassword',
      role: 'admin',
      isVerified: true
    });
    await testAdmin.save();
    console.log('✅ Test admin created:', testAdmin._id);

    // Create test patient user
    console.log('🔄 Creating test patient user...');
    const testPatient = new User({
      name: 'Test Patient',
      email: 'patient@example.com',
      password: 'hashedpassword',
      role: 'patient',
      isVerified: true
    });
    await testPatient.save();
    console.log('✅ Test patient created:', testPatient._id);

    // Create test notification
    console.log('🔄 Creating test notification...');
    const testNotification = new Notification({
      type: 'system_maintenance',
      category: 'system',
      priority: 'high',
      recipients: [{
        userId: testPatient._id,
        userRole: 'patient',
        deliveryChannels: ['websocket', 'email'],
        deliveryStatus: {
          websocket: { status: 'delivered', deliveredAt: new Date() },
          email: { status: 'sent', deliveredAt: new Date() },
          sms: { status: 'pending' }
        }
      }],
      content: {
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight',
        actionUrl: '/maintenance',
        actionText: 'Learn More'
      },
      analytics: {
        totalRecipients: 1,
        deliveredCount: 1,
        readCount: 0,
        actionCount: 0
      },
      createdBy: testAdmin._id
    });
    await testNotification.save();
    console.log('✅ Test notification created:', testNotification._id);

    // Test the admin controller
    console.log('🔄 Testing AdminNotificationController...');
    const controller = new AdminNotificationController();

    // Mock request and response for system overview
    const req = {
      user: { id: testAdmin._id.toString(), role: 'admin' },
      query: { period: '7d' },
      params: {},
      body: {}
    };

    const res = {
      json: (data) => {
        console.log('✅ Admin controller response:', {
          success: data.success,
          hasData: !!data.data,
          hasSummary: !!data.data?.summary,
          totalNotifications: data.data?.summary?.total || 0,
          deliveryRate: data.data?.summary?.deliveryRate || 0
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

    // Test getSystemOverview
    console.log('🧪 Testing getSystemOverview...');
    await controller.getSystemOverview(req, res);

    // Test getAllNotifications
    console.log('🧪 Testing getAllNotifications...');
    req.query = { page: 1, limit: 10 };
    await controller.getAllNotifications(req, res);

    // Test sendBulkNotification with mock service
    console.log('🧪 Testing sendBulkNotification...');
    const mockNotificationService = {
      createNotification: async (notificationData) => {
        console.log('📬 Mock notification service called');
        return {
          _id: new mongoose.Types.ObjectId(),
          type: notificationData.type,
          recipients: notificationData.recipients,
          createdAt: new Date()
        };
      }
    };
    
    controller.setNotificationService(mockNotificationService);
    
    req.body = {
      recipients: [{
        userId: testPatient._id.toString(),
        userRole: 'patient',
        channels: ['websocket']
      }],
      type: 'admin_test',
      content: {
        title: 'Test Bulk Notification',
        message: 'This is a test bulk notification'
      },
      priority: 'medium',
      category: 'administrative'
    };
    
    await controller.sendBulkNotification(req, res);

    // Cleanup
    console.log('🔄 Cleaning up...');
    await Notification.deleteOne({ _id: testNotification._id });
    await User.deleteOne({ _id: testAdmin._id });
    await User.deleteOne({ _id: testPatient._id });
    console.log('✅ Cleanup completed');

    console.log('🎉 All admin tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testAdminNotificationController();