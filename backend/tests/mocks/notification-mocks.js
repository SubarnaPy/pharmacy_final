/**
 * Mock Services for Notification System Testing
 * Provides comprehensive mocks for external services and dependencies
 */

import { jest } from '@jest/globals';
import EventEmitter from 'events';

/**
 * Mock WebSocket Service
 */
export class MockWebSocketService extends EventEmitter {
  constructor() {
    super();
    this.connectedUsers = new Map();
    this.userRoles = new Map();
    this.messageHistory = [];
  }

  // Simulate user connection
  connectUser(userId, userRole, socketId = null) {
    this.connectedUsers.set(userId, {
      socketId: socketId || `socket_${userId}`,
      userRole,
      connectedAt: new Date()
    });
    this.userRoles.set(userId, userRole);
    this.emit('userConnected', { userId, userRole });
  }

  // Simulate user disconnection
  disconnectUser(userId) {
    this.connectedUsers.delete(userId);
    this.userRoles.delete(userId);
    this.emit('userDisconnected', { userId });
  }

  // Mock sending notification to user
  sendNotificationToUser(userId, notification) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.messageHistory.push({
        userId,
        notification,
        timestamp: new Date(),
        delivered: true
      });
      this.emit('notificationSent', { userId, notification });
      return Promise.resolve(true);
    } else {
      this.messageHistory.push({
        userId,
        notification,
        timestamp: new Date(),
        delivered: false,
        reason: 'User not connected'
      });
      return Promise.resolve(false);
    }
  }

  // Mock broadcasting to role
  broadcastToRole(role, notification) {
    const roleUsers = Array.from(this.connectedUsers.entries())
      .filter(([userId, userData]) => userData.userRole === role)
      .map(([userId]) => userId);

    const promises = roleUsers.map(userId => 
      this.sendNotificationToUser(userId, notification)
    );

    return Promise.all(promises);
  }

  // Get connected users by role
  getConnectedUsersByRole(role) {
    return Array.from(this.connectedUsers.entries())
      .filter(([userId, userData]) => userData.userRole === role)
      .map(([userId, userData]) => ({
        userId,
        userRole: userData.userRole,
        socketId: userData.socketId
      }));
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get message history for testing
  getMessageHistory() {
    return [...this.messageHistory];
  }

  // Clear history
  clearHistory() {
    this.messageHistory = [];
  }

  // Get connection stats
  getConnectionStats() {
    const roleStats = {};
    for (const [userId, userData] of this.connectedUsers.entries()) {
      roleStats[userData.userRole] = (roleStats[userData.userRole] || 0) + 1;
    }

    return {
      totalConnected: this.connectedUsers.size,
      roleStats,
      messagesSent: this.messageHistory.length
    };
  }
}

/**
 * Mock Email Service Manager
 */
export class MockEmailServiceManager extends EventEmitter {
  constructor() {
    super();
    this.sentEmails = [];
    this.failureRate = 0; // 0 = no failures, 1 = all failures
    this.deliveryDelay = 0; // Simulate delivery delay
    this.providerHealth = {
      'mock-provider': {
        healthy: true,
        successRate: 1.0,
        totalRequests: 0,
        successfulRequests: 0
      }
    };
  }

  // Set failure rate for testing
  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  // Set delivery delay for testing
  setDeliveryDelay(delay) {
    this.deliveryDelay = delay;
  }

  // Mock send email
  async sendEmail(emailData) {
    const {
      to,
      subject,
      html,
      text,
      attachments = [],
      metadata = {},
      templateId = null,
      templateData = {},
      userId = null,
      notificationId = null
    } = emailData;

    // Simulate delivery delay
    if (this.deliveryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.deliveryDelay));
    }

    // Simulate failure based on failure rate
    const shouldFail = Math.random() < this.failureRate;
    
    this.providerHealth['mock-provider'].totalRequests++;

    if (shouldFail) {
      const error = new Error('Mock email service failure');
      this.emit('emailFailed', { to, subject, error });
      throw error;
    }

    const messageId = `mock_email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const emailRecord = {
      messageId,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      attachments,
      metadata,
      templateId,
      templateData,
      userId,
      notificationId,
      sentAt: new Date(),
      provider: 'mock-provider',
      status: 'sent'
    };

    this.sentEmails.push(emailRecord);
    this.providerHealth['mock-provider'].successfulRequests++;

    this.emit('emailSent', emailRecord);

    return {
      success: true,
      messageId,
      provider: 'mock-provider',
      result: emailRecord
    };
  }

  // Mock bulk email sending
  async sendBulkEmail(recipients, emailData) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail({
          ...emailData,
          to: recipient
        });
        results.push({
          recipient,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      totalRecipients: recipients.length,
      successCount,
      failureCount,
      results
    };
  }

  // Mock email tracking
  async trackEmailDelivery(webhookData) {
    const { messageId, event, timestamp, recipient } = webhookData;
    
    const emailRecord = this.sentEmails.find(e => e.messageId === messageId);
    if (emailRecord) {
      emailRecord.trackingEvents = emailRecord.trackingEvents || [];
      emailRecord.trackingEvents.push({
        event,
        timestamp: new Date(timestamp),
        recipient
      });
    }

    this.emit('emailTracked', { messageId, event, recipient });

    return {
      success: true,
      processed: true,
      event,
      messageId
    };
  }

  // Get sent emails for testing
  getSentEmails() {
    return [...this.sentEmails];
  }

  // Clear sent emails
  clearSentEmails() {
    this.sentEmails = [];
  }

  // Get provider health
  getProviderHealth() {
    return { ...this.providerHealth };
  }

  // Simulate provider health changes
  setProviderHealth(providerName, healthy) {
    if (this.providerHealth[providerName]) {
      this.providerHealth[providerName].healthy = healthy;
    }
  }
}

/**
 * Mock SMS Service Manager
 */
export class MockSMSServiceManager extends EventEmitter {
  constructor() {
    super();
    this.sentSMS = [];
    this.failureRate = 0;
    this.deliveryDelay = 0;
    this.costPerMessage = 0.01; // Mock cost
    this.providerHealth = {
      'mock-sms-provider': {
        healthy: true,
        successRate: 1.0,
        totalRequests: 0,
        successfulRequests: 0
      }
    };
  }

  // Set failure rate for testing
  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  // Set delivery delay for testing
  setDeliveryDelay(delay) {
    this.deliveryDelay = delay;
  }

  // Mock send SMS
  async sendSMS(smsData) {
    const {
      to,
      message,
      metadata = {},
      userId = null,
      notificationId = null,
      priority = 'normal'
    } = smsData;

    // Simulate delivery delay
    if (this.deliveryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.deliveryDelay));
    }

    // Validate phone number format
    if (!this.validatePhoneNumber(to)) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    // Simulate failure based on failure rate
    const shouldFail = Math.random() < this.failureRate;
    
    this.providerHealth['mock-sms-provider'].totalRequests++;

    if (shouldFail) {
      const error = new Error('Mock SMS service failure');
      this.emit('smsFailed', { to, message, error });
      throw error;
    }

    const messageId = `mock_sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const smsRecord = {
      messageId,
      to,
      message: this.optimizeMessageForSMS(message),
      metadata,
      userId,
      notificationId,
      priority,
      sentAt: new Date(),
      provider: 'mock-sms-provider',
      status: 'sent',
      cost: this.costPerMessage
    };

    this.sentSMS.push(smsRecord);
    this.providerHealth['mock-sms-provider'].successfulRequests++;

    this.emit('smsSent', smsRecord);

    return {
      success: true,
      messageId,
      provider: 'mock-sms-provider',
      cost: this.costPerMessage,
      result: smsRecord
    };
  }

  // Mock bulk SMS sending
  async sendBulkSMS(recipients, smsData) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS({
          ...smsData,
          to: recipient
        });
        results.push({
          recipient,
          success: true,
          messageId: result.messageId,
          cost: result.cost
        });
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);

    return {
      totalRecipients: recipients.length,
      successCount,
      failureCount,
      totalCost,
      results
    };
  }

  // Mock phone number validation
  validatePhoneNumber(phoneNumber) {
    // Basic validation for testing
    return /^\+\d{10,15}$/.test(phoneNumber);
  }

  // Mock message optimization
  optimizeMessageForSMS(message, maxLength = 160) {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  // Mock SMS tracking
  async trackSMSDelivery(webhookData) {
    const { messageId, status, timestamp, recipient } = webhookData;
    
    const smsRecord = this.sentSMS.find(s => s.messageId === messageId);
    if (smsRecord) {
      smsRecord.trackingEvents = smsRecord.trackingEvents || [];
      smsRecord.trackingEvents.push({
        status,
        timestamp: new Date(timestamp),
        recipient
      });
      smsRecord.finalStatus = status;
    }

    this.emit('smsTracked', { messageId, status, recipient });

    return {
      success: true,
      processed: true,
      status,
      messageId
    };
  }

  // Get sent SMS for testing
  getSentSMS() {
    return [...this.sentSMS];
  }

  // Clear sent SMS
  clearSentSMS() {
    this.sentSMS = [];
  }

  // Get provider health
  getProviderHealth() {
    return { ...this.providerHealth };
  }

  // Get cost tracking
  getCostTracking() {
    const totalCost = this.sentSMS.reduce((sum, sms) => sum + sms.cost, 0);
    return {
      'mock-sms-provider': {
        totalCost,
        messageCount: this.sentSMS.length,
        averageCost: this.sentSMS.length > 0 ? totalCost / this.sentSMS.length : 0
      }
    };
  }
}

/**
 * Mock Redis Client
 */
export class MockRedisClient extends EventEmitter {
  constructor() {
    super();
    this.data = new Map();
    this.expirations = new Map();
    this.connected = true;
  }

  // Mock get
  async get(key) {
    this.checkExpiration(key);
    return this.data.get(key) || null;
  }

  // Mock set
  async set(key, value, options = {}) {
    this.data.set(key, value);
    
    if (options.EX) {
      const expirationTime = Date.now() + (options.EX * 1000);
      this.expirations.set(key, expirationTime);
    }
    
    return 'OK';
  }

  // Mock del
  async del(key) {
    const existed = this.data.has(key);
    this.data.delete(key);
    this.expirations.delete(key);
    return existed ? 1 : 0;
  }

  // Mock exists
  async exists(key) {
    this.checkExpiration(key);
    return this.data.has(key) ? 1 : 0;
  }

  // Mock expire
  async expire(key, seconds) {
    if (this.data.has(key)) {
      const expirationTime = Date.now() + (seconds * 1000);
      this.expirations.set(key, expirationTime);
      return 1;
    }
    return 0;
  }

  // Mock flushdb
  async flushdb() {
    this.data.clear();
    this.expirations.clear();
    return 'OK';
  }

  // Mock quit
  async quit() {
    this.connected = false;
    this.emit('end');
    return 'OK';
  }

  // Check and handle expiration
  checkExpiration(key) {
    const expirationTime = this.expirations.get(key);
    if (expirationTime && Date.now() > expirationTime) {
      this.data.delete(key);
      this.expirations.delete(key);
    }
  }

  // Get all data for testing
  getAllData() {
    // Clean expired keys first
    for (const key of this.data.keys()) {
      this.checkExpiration(key);
    }
    return Object.fromEntries(this.data);
  }

  // Simulate connection issues
  simulateDisconnection() {
    this.connected = false;
    this.emit('error', new Error('Connection lost'));
  }

  simulateReconnection() {
    this.connected = true;
    this.emit('connect');
  }
}

/**
 * Test Data Generators
 */
export class NotificationTestDataGenerator {
  static generateNotificationData(overrides = {}) {
    return {
      type: 'test_notification',
      recipients: [{
        userId: 'test-user-id',
        userRole: 'patient',
        deliveryChannels: ['websocket', 'email']
      }],
      content: {
        title: 'Test Notification',
        message: 'This is a test notification',
        actionUrl: '/test',
        actionText: 'View Test'
      },
      priority: 'medium',
      category: 'system',
      ...overrides
    };
  }

  static generateTemplateData(overrides = {}) {
    return {
      name: 'Test Template',
      type: 'test_template',
      category: 'system',
      variants: [{
        channel: 'email',
        userRole: 'patient',
        language: 'en',
        subject: 'Test Subject',
        title: 'Test Title',
        body: 'Test body with {{placeholder}}',
        htmlBody: '<h1>Test Title</h1><p>Test body with {{placeholder}}</p>'
      }],
      ...overrides
    };
  }

  static generateUserPreferences(userId, overrides = {}) {
    return {
      userId,
      globalSettings: {
        enabled: true,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00'
        }
      },
      channels: {
        websocket: { enabled: true },
        email: { enabled: true },
        sms: { enabled: true }
      },
      categories: {
        medical: { enabled: true, channels: ['websocket', 'email'] },
        administrative: { enabled: true, channels: ['email'] },
        system: { enabled: true, channels: ['websocket'] }
      },
      ...overrides
    };
  }

  static generateAnalyticsData(overrides = {}) {
    return {
      date: new Date(),
      totalSent: 100,
      totalDelivered: 95,
      totalRead: 80,
      totalActioned: 25,
      totalFailed: 5,
      channelMetrics: {
        websocket: { sent: 50, delivered: 48, read: 40 },
        email: { sent: 30, delivered: 29, opened: 25, clicked: 10 },
        sms: { sent: 20, delivered: 18, failed: 2 }
      },
      ...overrides
    };
  }
}

/**
 * Test Utilities
 */
export class NotificationTestUtils {
  static async waitForNotificationProcessing(timeout = 2000) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

  static async waitForCondition(conditionFn, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await conditionFn()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static createMockServices() {
    return {
      webSocket: new MockWebSocketService(),
      email: new MockEmailServiceManager(),
      sms: new MockSMSServiceManager(),
      redis: new MockRedisClient()
    };
  }

  static setupNotificationMocks() {
    const mocks = this.createMockServices();
    
    // Setup global mocks
    global.mockWebSocketService = mocks.webSocket;
    global.mockEmailService = mocks.email;
    global.mockSMSService = mocks.sms;
    global.mockRedisClient = mocks.redis;
    
    return mocks;
  }

  static cleanupNotificationMocks() {
    if (global.mockWebSocketService) {
      global.mockWebSocketService.clearHistory();
    }
    if (global.mockEmailService) {
      global.mockEmailService.clearSentEmails();
    }
    if (global.mockSMSService) {
      global.mockSMSService.clearSentSMS();
    }
    if (global.mockRedisClient) {
      global.mockRedisClient.flushdb();
    }
  }
}

export default {
  MockWebSocketService,
  MockEmailServiceManager,
  MockSMSServiceManager,
  MockRedisClient,
  NotificationTestDataGenerator,
  NotificationTestUtils
};