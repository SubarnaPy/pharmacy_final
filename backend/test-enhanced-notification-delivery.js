/**
 * Test Enhanced Notification Delivery System
 * Tests the ChannelManager and Enhanced WebSocket Service integration
 */

import ChannelManager from './src/services/notifications/ChannelManager.js';
import EnhancedWebSocketNotificationService from './src/services/realtime/EnhancedWebSocketNotificationService.js';

// Mock WebSocket service for testing
class MockWebSocketService {
  constructor() {
    this.connectedUsers = new Map();
    this.deliveredNotifications = [];
  }

  sendNotificationToUser(userId, notification) {
    console.log(`📱 Mock WebSocket: Sending notification to user ${userId}`);
    this.deliveredNotifications.push({ userId, notification, timestamp: new Date() });
    return Promise.resolve(true);
  }

  broadcastToRole(role, notification) {
    console.log(`📢 Mock WebSocket: Broadcasting to role ${role}`);
    return Promise.resolve({
      role,
      totalUsers: 5,
      onlineUsers: 3,
      offlineUsers: 2,
      timestamp: new Date()
    });
  }

  getConnectedUsersByRole(role) {
    return [
      { userId: 'user1', userRole: role },
      { userId: 'user2', userRole: role },
      { userId: 'user3', userRole: role }
    ];
  }
}

// Mock Email service for testing
class MockEmailService {
  constructor() {
    this.sentEmails = [];
  }

  sendEmail(emailData) {
    console.log(`📧 Mock Email: Sending email to ${emailData.to}`);
    this.sentEmails.push({ ...emailData, timestamp: new Date() });
    return Promise.resolve({ messageId: `email_${Date.now()}` });
  }
}

// Mock SMS service for testing
class MockSMSService {
  constructor() {
    this.sentSMS = [];
  }

  sendSMS(smsData) {
    console.log(`📱 Mock SMS: Sending SMS to ${smsData.to}`);
    this.sentSMS.push({ ...smsData, timestamp: new Date() });
    return Promise.resolve({ messageId: `sms_${Date.now()}` });
  }
}

async function testChannelManager() {
  console.log('\n🧪 Testing Channel Manager...\n');

  // Create mock services
  const mockWebSocketService = new MockWebSocketService();
  const mockEmailService = new MockEmailService();
  const mockSMSService = new MockSMSService();

  // Create channel manager
  const channelManager = new ChannelManager({
    webSocketService: mockWebSocketService,
    emailService: mockEmailService,
    smsService: mockSMSService,
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 5000
  });

  // Test notification
  const testNotification = {
    _id: 'test_notification_001',
    type: 'prescription_ready',
    priority: 'high',
    category: 'medical',
    recipients: [
      { userId: 'patient_001', userRole: 'patient', email: 'patient@example.com', phone: '+1234567890' },
      { userId: 'doctor_001', userRole: 'doctor', email: 'doctor@example.com', phone: '+1234567891' }
    ],
    content: {
      title: 'Prescription Ready for Pickup',
      message: 'Your prescription is ready for pickup at Main Pharmacy',
      actionUrl: '/prescriptions/test_prescription_001',
      actionText: 'View Prescription',
      metadata: { prescriptionId: 'test_prescription_001' }
    },
    createdAt: new Date()
  };

  try {
    // Test 1: Multi-channel delivery
    console.log('📋 Test 1: Multi-channel delivery');
    const deliveryResult = await channelManager.deliverNotification(
      testNotification,
      ['websocket', 'email'],
      {} // Empty preferences (will use defaults)
    );

    console.log('✅ Delivery Result:', JSON.stringify(deliveryResult, null, 2));

    // Test 2: Delivery with fallback
    console.log('\n📋 Test 2: Delivery with fallback');
    const fallbackResult = await channelManager.deliverWithFallback(
      testNotification,
      'websocket',
      ['email', 'sms']
    );

    console.log('✅ Fallback Result:', JSON.stringify(fallbackResult, null, 2));

    // Test 3: Individual channel delivery
    console.log('\n📋 Test 3: Individual channel delivery');
    
    const websocketResult = await channelManager.deliverThroughChannel(
      testNotification,
      'websocket',
      'test_delivery_001'
    );
    console.log('📱 WebSocket Result:', JSON.stringify(websocketResult, null, 2));

    const emailResult = await channelManager.deliverThroughChannel(
      testNotification,
      'email',
      'test_delivery_002'
    );
    console.log('📧 Email Result:', JSON.stringify(emailResult, null, 2));

    const smsResult = await channelManager.deliverThroughChannel(
      testNotification,
      'sms',
      'test_delivery_003'
    );
    console.log('📱 SMS Result:', JSON.stringify(smsResult, null, 2));

    // Test 4: Channel statistics
    console.log('\n📋 Test 4: Channel Manager Statistics');
    const stats = channelManager.getStats();
    console.log('📊 Channel Manager Stats:', JSON.stringify(stats, null, 2));

    console.log('\n✅ Channel Manager tests completed successfully!');

  } catch (error) {
    console.error('❌ Channel Manager test failed:', error);
  }
}

async function testEnhancedWebSocketService() {
  console.log('\n🧪 Testing Enhanced WebSocket Service...\n');

  // Create mock WebSocket service
  const mockWebSocketService = new MockWebSocketService();
  mockWebSocketService.io = {
    to: (room) => ({
      emit: (event, data) => {
        console.log(`📡 Mock IO: Emitting ${event} to room ${room}`);
      }
    }),
    emit: (event, data) => {
      console.log(`📡 Mock IO: Global emit ${event}`);
    },
    on: (event, handler) => {
      console.log(`👂 Mock IO: Listening for ${event}`);
    },
    sockets: {
      sockets: new Map()
    }
  };

  // Create enhanced WebSocket service
  const enhancedService = new EnhancedWebSocketNotificationService(mockWebSocketService);

  // Test notification
  const testNotification = {
    id: 'ws_test_001',
    type: 'order_confirmed',
    title: 'Order Confirmed',
    message: 'Your order #12345 has been confirmed',
    priority: 'medium',
    createdAt: new Date(),
    actionUrl: '/orders/12345',
    actionText: 'View Order'
  };

  try {
    // Test 1: Send notification to user (will be queued since user is offline)
    console.log('📋 Test 1: Send notification to offline user');
    const userResult = await enhancedService.sendNotificationToUser('patient_001', testNotification);
    console.log('📱 User notification result:', userResult);

    // Test 2: Simulate user authentication
    console.log('\n📋 Test 2: Simulate user authentication');
    const mockSocket = {
      id: 'socket_001',
      emit: (event, data) => console.log(`📡 Socket emit: ${event}`, data),
      join: (room) => console.log(`🏠 Socket joined room: ${room}`)
    };

    enhancedService.handleUserAuthentication(mockSocket, {
      userId: 'patient_001',
      userRole: 'patient',
      token: 'mock_token'
    });

    // Test 3: Send notification to authenticated user
    console.log('\n📋 Test 3: Send notification to authenticated user');
    const authenticatedResult = await enhancedService.sendNotificationToUser('patient_001', testNotification);
    console.log('📱 Authenticated user notification result:', authenticatedResult);

    // Test 4: Role-based broadcasting
    console.log('\n📋 Test 4: Role-based broadcasting');
    const broadcastResult = await enhancedService.broadcastToRole('patient', testNotification);
    console.log('📢 Broadcast result:', JSON.stringify(broadcastResult, null, 2));

    // Test 5: Global broadcasting
    console.log('\n📋 Test 5: Global broadcasting');
    const globalResult = await enhancedService.broadcastToAll(testNotification);
    console.log('🌍 Global broadcast result:', JSON.stringify(globalResult, null, 2));

    // Test 6: Service statistics
    console.log('\n📋 Test 6: Enhanced WebSocket Service Statistics');
    const stats = enhancedService.getStats();
    console.log('📊 Enhanced WebSocket Stats:', JSON.stringify(stats, null, 2));

    console.log('\n✅ Enhanced WebSocket Service tests completed successfully!');

  } catch (error) {
    console.error('❌ Enhanced WebSocket Service test failed:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting Enhanced Notification Delivery System Tests\n');
  console.log('=' .repeat(60));

  try {
    await testChannelManager();
    console.log('\n' + '=' .repeat(60));
    await testEnhancedWebSocketService();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();