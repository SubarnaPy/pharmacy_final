/**
 * Comprehensive Unit Tests for Advanced Notification System
 * Tests all notification service components with mocked external services
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';

// Import notification system components
import EnhancedNotificationService from '../src/services/notifications/EnhancedNotificationService.js';
import TemplateManagementService from '../src/services/notifications/TemplateManagementService.js';
import EmailServiceManager from '../src/services/notifications/EmailServiceManager.js';
import SMSServiceManager from '../src/services/notifications/SMSServiceManager.js';
import ChannelManager from '../src/services/notifications/ChannelManager.js';
import NotificationQueue from '../src/services/notifications/NotificationQueue.js';
import EmailTrackingService from '../src/services/notifications/EmailTrackingService.js';
import SMSTemplateEngine from '../src/services/notifications/SMSTemplateEngine.js';
import { EmailTemplateEngine } from '../src/services/notifications/EmailTemplateEngine.js';

// Import models
import Notification from '../src/models/Notification.js';
import NotificationTemplate from '../src/models/NotificationTemplate.js';
import UserNotificationPreferences from '../src/models/UserNotificationPreferences.js';
import NotificationAnalytics from '../src/models/NotificationAnalytics.js';

describe('Advanced Notification System - Unit Tests', () => {
  let mockWebSocketService;
  let mockEmailService;
  let mockSMSService;
  let testUserId;
  let testNotificationId;

  beforeEach(async () => {
    // Clear all collections
    await global.testUtils.clearCollection('notifications');
    await global.testUtils.clearCollection('notificationtemplates');
    await global.testUtils.clearCollection('usernotificationpreferences');
    await global.testUtils.clearCollection('notificationanalytics');

    // Setup mock services
    mockWebSocketService = {
      sendNotificationToUser: jest.fn().mockResolvedValue(true),
      getConnectedUsersByRole: jest.fn().mockReturnValue([
        { userId: 'user1', userRole: 'patient' },
        { userId: 'user2', userRole: 'patient' }
      ]),
      broadcastToRole: jest.fn().mockResolvedValue(true),
      isUserConnected: jest.fn().mockReturnValue(true)
    };

    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-email-id',
        provider: 'test'
      })
    };

    mockSMSService = {
      sendSMS: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-sms-id',
        provider: 'test'
      })
    };

    // Generate test IDs
    testUserId = new mongoose.Types.ObjectId().toString();
    testNotificationId = new mongoose.Types.ObjectId().toString();
  });

  afterEach(async () => {
    // Clean up any test data
    await global.testUtils.clearCollection('notifications');
    await global.testUtils.clearCollection('notificationtemplates');
    await global.testUtils.clearCollection('usernotificationpreferences');
    await global.testUtils.clearCollection('notificationanalytics');
  });

  describe('EnhancedNotificationService', () => {
    let notificationService;

    beforeEach(() => {
      notificationService = new EnhancedNotificationService({
        webSocketService: mockWebSocketService,
        emailService: mockEmailService,
        smsService: mockSMSService
      });
    });

    test('should initialize with all required components', () => {
      expect(notificationService).toBeDefined();
      expect(notificationService.webSocketService).toBe(mockWebSocketService);
      expect(notificationService.emailService).toBe(mockEmailService);
      expect(notificationService.smsService).toBe(mockSMSService);
      expect(notificationService.channelManager).toBeDefined();
      expect(notificationService.notificationQueue).toBeDefined();
    });

    test('should create notification successfully', async () => {
      const notificationData = {
        type: 'prescription_created',
        recipients: [{
          userId: testUserId,
          userRole: 'patient',
          deliveryChannels: ['websocket', 'email']
        }],
        content: {
          title: 'New Prescription',
          message: 'Your prescription has been created',
          actionUrl: '/prescriptions/123',
          actionText: 'View Prescription'
        },
        priority: 'medium',
        category: 'medical'
      };

      const notification = await notificationService.createNotification(notificationData);

      expect(notification).toBeDefined();
      expect(notification.type).toBe('prescription_created');
      expect(notification.recipients).toHaveLength(1);
      expect(notification.recipients[0].userId.toString()).toBe(testUserId);
      expect(notification.content.title).toBe('New Prescription');
      expect(notification.priority).toBe('medium');
      expect(notification.category).toBe('medical');
    });

    test('should send notification to specific user', async () => {
      const result = await notificationService.sendNotification(
        testUserId,
        'appointment_reminder',
        { appointmentId: '123', doctorName: 'Dr. Smith' },
        {
          title: 'Appointment Reminder',
          message: 'You have an appointment with Dr. Smith tomorrow',
          userRole: 'patient',
          channels: ['websocket']
        }
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('appointment_reminder');
      expect(result.recipients[0].userId.toString()).toBe(testUserId);
    });

    test('should send bulk notifications', async () => {
      const recipients = [
        { userId: testUserId, userRole: 'patient', deliveryChannels: ['websocket'] },
        { userId: new mongoose.Types.ObjectId().toString(), userRole: 'patient', deliveryChannels: ['email'] }
      ];

      const result = await notificationService.sendBulkNotification(
        recipients,
        'system_maintenance',
        { maintenanceTime: '2024-01-01T02:00:00Z' },
        {
          title: 'System Maintenance',
          message: 'System will be under maintenance'
        }
      );

      expect(result).toBeDefined();
      expect(result.recipients).toHaveLength(2);
    });

    test('should send role-based notifications', async () => {
      const result = await notificationService.sendRoleBasedNotification(
        'patient',
        'system_announcement',
        { announcement: 'New features available' },
        {
          title: 'System Announcement',
          message: 'Check out our new features'
        }
      );

      expect(result).toBeDefined();
      expect(mockWebSocketService.getConnectedUsersByRole).toHaveBeenCalledWith('patient');
    });

    test('should handle template rendering', () => {
      const template = 'Hello {name}, your {type} is ready';
      const data = { name: 'John', type: 'prescription' };
      
      const rendered = notificationService.renderTemplate(template, data);
      expect(rendered).toBe('Hello John, your prescription is ready');
    });

    test('should check notification preferences correctly', () => {
      const preferences = {
        globalSettings: { enabled: true, quietHours: { enabled: false } },
        notificationTypes: { prescription_created: { enabled: true } }
      };

      const shouldSend = notificationService.shouldSendNotification(
        preferences,
        'prescription_created',
        'medium'
      );

      expect(shouldSend).toBe(true);
    });

    test('should respect quiet hours for non-critical notifications', () => {
      const preferences = {
        globalSettings: {
          enabled: true,
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '08:00'
          }
        }
      };

      // Mock current time to be in quiet hours (23:00)
      const originalDate = Date;
      global.Date = jest.fn(() => ({
        getHours: () => 23,
        getMinutes: () => 0
      }));

      const shouldSend = notificationService.shouldSendNotification(
        preferences,
        'appointment_reminder',
        'medium'
      );

      expect(shouldSend).toBe(false);

      // Restore original Date
      global.Date = originalDate;
    });

    test('should override quiet hours for critical notifications', () => {
      const preferences = {
        globalSettings: {
          enabled: true,
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '08:00'
          }
        }
      };

      const shouldSend = notificationService.shouldSendNotification(
        preferences,
        'emergency_alert',
        'critical'
      );

      expect(shouldSend).toBe(true);
    });
  });

  describe('TemplateManagementService', () => {
    let templateService;

    beforeEach(() => {
      templateService = new TemplateManagementService();
    });

    test('should create template successfully', async () => {
      const templateData = {
        name: 'Test Template',
        type: 'prescription_created',
        category: 'medical',
        variants: [{
          channel: 'email',
          userRole: 'patient',
          language: 'en',
          subject: 'Your prescription is ready',
          title: 'Prescription Ready',
          body: 'Hello {{name}}, your prescription for {{medication}} is ready for pickup.',
          htmlBody: '<h1>Prescription Ready</h1><p>Hello {{name}}, your prescription for {{medication}} is ready.</p>'
        }]
      };

      const template = await templateService.createTemplate(templateData, testUserId);

      expect(template).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.type).toBe('prescription_created');
      expect(template.variants).toHaveLength(1);
      expect(template.version).toBe('1.0.0');
    });

    test('should get template by criteria', async () => {
      // First create a template
      const templateData = {
        name: 'Test Email Template',
        type: 'order_confirmed',
        category: 'administrative',
        variants: [{
          channel: 'email',
          userRole: 'patient',
          language: 'en',
          subject: 'Order Confirmed',
          title: 'Your order is confirmed',
          body: 'Thank you for your order {{orderNumber}}.'
        }]
      };

      await templateService.createTemplate(templateData, testUserId);

      // Now retrieve it
      const result = await templateService.getTemplate('order_confirmed', 'email', 'patient', 'en');

      expect(result).toBeDefined();
      expect(result.template.type).toBe('order_confirmed');
      expect(result.variant.channel).toBe('email');
      expect(result.variant.userRole).toBe('patient');
    });

    test('should validate template data correctly', async () => {
      const validTemplateData = {
        name: 'Valid Template',
        type: 'test_notification',
        category: 'system',
        variants: [{
          channel: 'websocket',
          userRole: 'admin',
          language: 'en',
          title: 'Test',
          body: 'Test message'
        }]
      };

      const validation = await templateService.validateTemplateData(validTemplateData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid template data', async () => {
      const invalidTemplateData = {
        // Missing required fields
        variants: []
      };

      const validation = await templateService.validateTemplateData(invalidTemplateData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should update template and increment version', async () => {
      // Create initial template
      const templateData = {
        name: 'Updatable Template',
        type: 'updatable_test',
        category: 'system',
        variants: [{
          channel: 'websocket',
          userRole: 'admin',
          language: 'en',
          title: 'Original Title',
          body: 'Original body'
        }]
      };

      const originalTemplate = await templateService.createTemplate(templateData, testUserId);

      // Update template
      const updateData = {
        name: 'Updated Template',
        variants: [{
          channel: 'websocket',
          userRole: 'admin',
          language: 'en',
          title: 'Updated Title',
          body: 'Updated body'
        }]
      };

      const updatedTemplate = await templateService.updateTemplate(
        originalTemplate._id,
        updateData,
        testUserId
      );

      expect(updatedTemplate.name).toBe('Updated Template');
      expect(updatedTemplate.variants[0].title).toBe('Updated Title');
      expect(updatedTemplate.version).toBe('1.0.1');
    });

    test('should test template rendering', async () => {
      // Create template
      const templateData = {
        name: 'Testable Template',
        type: 'test_render',
        category: 'system',
        variants: [{
          channel: 'websocket',
          userRole: 'patient',
          language: 'en',
          title: 'Hello {{name}}',
          body: 'Your {{item}} is {{status}}'
        }]
      };

      const template = await templateService.createTemplate(templateData, testUserId);

      // Test rendering
      const testData = {
        name: 'John Doe',
        item: 'prescription',
        status: 'ready'
      };

      const testResult = await templateService.testTemplate(template._id, testData);

      expect(testResult.success).toBe(true);
      expect(testResult.results).toBeDefined();
      expect(testResult.results['websocket_patient_en'].rendered.title).toBe('Hello John Doe');
      expect(testResult.results['websocket_patient_en'].rendered.body).toBe('Your prescription is ready');
    });
  });

  describe('EmailServiceManager', () => {
    let emailManager;

    beforeEach(() => {
      emailManager = new EmailServiceManager({
        config: {
          sendgrid: { enabled: false },
          aws: { enabled: false }
        }
      });
    });

    test('should initialize with test provider', () => {
      expect(emailManager).toBeDefined();
      expect(emailManager.providers.size).toBeGreaterThan(0);
      expect(emailManager.currentProvider).toBeDefined();
    });

    test('should send email successfully', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test</h1>',
        text: 'Test',
        metadata: { testId: '123' }
      };

      const result = await emailManager.sendEmail(emailData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBeDefined();
    });

    test('should send bulk emails', async () => {
      const recipients = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
      const emailData = {
        subject: 'Bulk Test Email',
        html: '<h1>Bulk Test</h1>',
        text: 'Bulk Test'
      };

      const result = await emailManager.sendBulkEmail(recipients, emailData);

      expect(result.totalRecipients).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    test('should track provider health', () => {
      const providerName = 'nodemailer-test';
      
      // Simulate successful operation
      emailManager.updateProviderHealth(providerName, true);
      
      const health = emailManager.getProviderHealth();
      expect(health[providerName]).toBeDefined();
      expect(health[providerName].healthy).toBe(true);
      expect(health[providerName].successfulRequests).toBe(1);
    });

    test('should handle provider failures', () => {
      const providerName = 'nodemailer-test';
      
      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        emailManager.updateProviderHealth(providerName, false, new Error('Test error'));
      }
      
      const health = emailManager.getProviderHealth();
      expect(health[providerName].healthy).toBe(false);
      expect(health[providerName].consecutiveFailures).toBe(3);
    });

    test('should respect rate limits', () => {
      const providerName = 'nodemailer-test';
      
      // Check initial rate limit
      expect(emailManager.checkRateLimit(providerName)).toBe(true);
      
      // Update rate limit multiple times
      for (let i = 0; i < 10; i++) {
        emailManager.updateRateLimit(providerName);
      }
      
      // Should still be within limits for test provider
      expect(emailManager.checkRateLimit(providerName)).toBe(true);
    });
  });

  describe('SMSServiceManager', () => {
    let smsManager;

    beforeEach(() => {
      smsManager = new SMSServiceManager({
        config: {
          twilio: { enabled: false },
          aws: { enabled: false }
        }
      });
    });

    test('should initialize with test provider', () => {
      expect(smsManager).toBeDefined();
      expect(smsManager.providers.size).toBeGreaterThan(0);
      expect(smsManager.currentProvider).toBeDefined();
    });

    test('should validate phone numbers', async () => {
      const validPhone = '+1234567890';
      const invalidPhone = '123';

      const validResult = await smsManager.validateAndFormatPhoneNumber(validPhone);
      const invalidResult = await smsManager.validateAndFormatPhoneNumber(invalidPhone);

      expect(validResult.isValid).toBe(true);
      expect(validResult.formatted).toBe('+1234567890');
      expect(invalidResult.isValid).toBe(false);
    });

    test('should optimize messages for SMS limits', () => {
      const longMessage = 'This is a very long message that exceeds the typical SMS character limit of 160 characters and should be truncated appropriately to fit within the limit while maintaining readability.';
      
      const optimized = smsManager.optimizeMessageForSMS(longMessage, 160);
      
      expect(optimized.length).toBeLessThanOrEqual(160);
      expect(optimized).toContain('...');
    });

    test('should send SMS successfully', async () => {
      const smsData = {
        to: '+1234567890',
        message: 'Test SMS message',
        metadata: { testId: '123' }
      };

      const result = await smsManager.sendSMS(smsData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBeDefined();
    });

    test('should send bulk SMS', async () => {
      const recipients = ['+1234567890', '+1234567891', '+1234567892'];
      const smsData = {
        message: 'Bulk SMS test',
        metadata: { campaign: 'test' }
      };

      const result = await smsManager.sendBulkSMS(recipients, smsData);

      expect(result.totalRecipients).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    test('should track costs', () => {
      const providerName = 'sms-test';
      const cost = 0.05;
      
      smsManager.updateCostTracking(providerName, cost);
      
      const costTracking = smsManager.getCostTracking();
      expect(costTracking[providerName]).toBeDefined();
      expect(costTracking[providerName].totalCost).toBe(cost);
      expect(costTracking[providerName].messageCount).toBe(1);
    });
  });

  describe('ChannelManager', () => {
    let channelManager;

    beforeEach(() => {
      channelManager = new ChannelManager({
        webSocketService: mockWebSocketService,
        emailService: mockEmailService,
        smsService: mockSMSService
      });
    });

    test('should initialize with all channels', () => {
      expect(channelManager).toBeDefined();
      expect(channelManager.webSocketService).toBe(mockWebSocketService);
      expect(channelManager.emailService).toBe(mockEmailService);
      expect(channelManager.smsService).toBe(mockSMSService);
    });

    test('should deliver notification through multiple channels', async () => {
      const notification = {
        _id: testNotificationId,
        type: 'test_notification',
        content: {
          title: 'Test Notification',
          message: 'This is a test'
        },
        priority: 'medium'
      };

      const channels = ['websocket', 'email'];
      const preferences = {
        channels: {
          websocket: { enabled: true },
          email: { enabled: true }
        }
      };

      const result = await channelManager.deliverNotification(notification, channels, preferences);

      expect(result).toBeDefined();
      expect(result.overallStatus).toBeDefined();
      expect(result.channels).toBeDefined();
    });

    test('should handle delivery failures with fallback', async () => {
      // Mock email service to fail
      const failingEmailService = {
        sendEmail: jest.fn().mockRejectedValue(new Error('Email service unavailable'))
      };

      const channelManagerWithFailure = new ChannelManager({
        webSocketService: mockWebSocketService,
        emailService: failingEmailService,
        smsService: mockSMSService
      });

      const notification = {
        _id: testNotificationId,
        type: 'test_notification',
        content: {
          title: 'Test Notification',
          message: 'This is a test'
        },
        priority: 'high'
      };

      const result = await channelManagerWithFailure.deliverWithFallback(
        notification,
        'email',
        ['websocket']
      );

      expect(result).toBeDefined();
      expect(mockWebSocketService.sendNotificationToUser).toHaveBeenCalled();
    });
  });

  describe('NotificationQueue', () => {
    let notificationQueue;

    beforeEach(() => {
      notificationQueue = new NotificationQueue();
    });

    test('should add items to queue', async () => {
      const queueItem = {
        notificationId: testNotificationId,
        recipientId: testUserId,
        channels: ['websocket'],
        priority: 'medium'
      };

      await notificationQueue.add(queueItem);

      const queueSize = await notificationQueue.size();
      expect(queueSize).toBeGreaterThan(0);
    });

    test('should retrieve items from queue', async () => {
      const queueItem = {
        notificationId: testNotificationId,
        recipientId: testUserId,
        channels: ['email'],
        priority: 'high'
      };

      await notificationQueue.add(queueItem);
      const items = await notificationQueue.getNext(1);

      expect(items).toHaveLength(1);
      expect(items[0].notificationId).toBe(testNotificationId);
    });

    test('should prioritize high priority items', async () => {
      const lowPriorityItem = {
        notificationId: new mongoose.Types.ObjectId().toString(),
        recipientId: testUserId,
        channels: ['email'],
        priority: 'low'
      };

      const highPriorityItem = {
        notificationId: testNotificationId,
        recipientId: testUserId,
        channels: ['email'],
        priority: 'high'
      };

      await notificationQueue.add(lowPriorityItem);
      await notificationQueue.add(highPriorityItem);

      const items = await notificationQueue.getNext(2);

      expect(items).toHaveLength(2);
      expect(items[0].priority).toBe('high');
    });
  });

  describe('EmailTrackingService', () => {
    let trackingService;

    beforeEach(() => {
      trackingService = new EmailTrackingService();
    });

    test('should generate tracking pixel URL', () => {
      const messageId = 'test-message-123';
      const userId = testUserId;
      const notificationId = testNotificationId;

      const pixelUrl = trackingService.generateTrackingPixelUrl(messageId, userId, notificationId);

      expect(pixelUrl).toBeDefined();
      expect(pixelUrl).toContain(messageId);
      expect(pixelUrl).toContain('track');
    });

    test('should generate trackable links', () => {
      const originalUrl = 'https://example.com/prescription/123';
      const messageId = 'test-message-123';
      const userId = testUserId;
      const notificationId = testNotificationId;

      const trackableUrl = trackingService.generateTrackableLink(
        originalUrl,
        messageId,
        userId,
        notificationId
      );

      expect(trackableUrl).toBeDefined();
      expect(trackableUrl).toContain('track');
      expect(trackableUrl).not.toBe(originalUrl);
    });

    test('should generate unsubscribe links', () => {
      const userId = testUserId;
      const notificationType = 'marketing';

      const unsubscribeUrl = trackingService.generateUnsubscribeLink(userId, notificationType);

      expect(unsubscribeUrl).toBeDefined();
      expect(unsubscribeUrl).toContain('unsubscribe');
      expect(unsubscribeUrl).toContain(userId);
    });
  });

  describe('Template Engines', () => {
    describe('EmailTemplateEngine', () => {
      let emailEngine;

      beforeEach(() => {
        emailEngine = new EmailTemplateEngine();
      });

      test('should validate email templates', async () => {
        const validTemplate = {
          subject: 'Test Subject',
          htmlBody: '<h1>Hello {{name}}</h1>',
          body: 'Hello {{name}}'
        };

        const validation = await emailEngine.validateTemplate(validTemplate);

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      test('should render email templates', async () => {
        const template = {
          subject: 'Welcome {{name}}',
          htmlBody: '<h1>Welcome {{name}}</h1><p>Your {{item}} is ready.</p>',
          body: 'Welcome {{name}}. Your {{item}} is ready.'
        };

        const data = {
          name: 'John Doe',
          item: 'prescription'
        };

        const rendered = await emailEngine.renderTemplate(template, data);

        expect(rendered.subject).toBe('Welcome John Doe');
        expect(rendered.html).toContain('Welcome John Doe');
        expect(rendered.html).toContain('prescription is ready');
        expect(rendered.text).toBe('Welcome John Doe. Your prescription is ready.');
      });
    });

    describe('SMSTemplateEngine', () => {
      let smsEngine;

      beforeEach(() => {
        smsEngine = new SMSTemplateEngine();
      });

      test('should validate SMS templates', async () => {
        const validTemplate = {
          body: 'Hello {{name}}, your {{item}} is ready.'
        };

        const validation = await smsEngine.validateTemplate(validTemplate);

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      test('should render SMS templates', async () => {
        const template = {
          body: 'Hi {{name}}, your {{item}} is {{status}}. Reply STOP to opt out.'
        };

        const data = {
          name: 'John',
          item: 'prescription',
          status: 'ready'
        };

        const rendered = await smsEngine.renderTemplate(template, data);

        expect(rendered.message).toBe('Hi John, your prescription is ready. Reply STOP to opt out.');
        expect(rendered.message.length).toBeLessThanOrEqual(160);
      });

      test('should optimize long SMS messages', async () => {
        const template = {
          body: 'This is a very long SMS message that exceeds the typical 160 character limit and should be optimized for SMS delivery by truncating appropriately while maintaining the core message content.'
        };

        const rendered = await smsEngine.renderTemplate(template, {});

        expect(rendered.message.length).toBeLessThanOrEqual(160);
        expect(rendered.message).toContain('...');
      });
    });
  });

  describe('User Notification Preferences', () => {
    test('should create default preferences', async () => {
      const preferences = UserNotificationPreferences.getDefaultPreferences(testUserId);

      expect(preferences.userId.toString()).toBe(testUserId);
      expect(preferences.globalSettings.enabled).toBe(true);
      expect(preferences.channels.websocket.enabled).toBe(true);
      expect(preferences.channels.email.enabled).toBe(true);
      expect(preferences.channels.sms.enabled).toBe(true);
    });

    test('should update user preferences', async () => {
      const preferences = new UserNotificationPreferences({
        userId: testUserId,
        globalSettings: {
          enabled: true,
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '08:00'
          }
        },
        channels: {
          websocket: { enabled: true },
          email: { enabled: false },
          sms: { enabled: true, emergencyOnly: true }
        }
      });

      const saved = await preferences.save();

      expect(saved.channels.email.enabled).toBe(false);
      expect(saved.channels.sms.emergencyOnly).toBe(true);
      expect(saved.globalSettings.quietHours.enabled).toBe(true);
    });
  });

  describe('Notification Analytics', () => {
    test('should create analytics record', async () => {
      const analytics = new NotificationAnalytics({
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
        }
      });

      const saved = await analytics.save();

      expect(saved.totalSent).toBe(100);
      expect(saved.channelMetrics.websocket.sent).toBe(50);
      expect(saved.channelMetrics.email.opened).toBe(25);
    });

    test('should calculate delivery rates', async () => {
      const analytics = new NotificationAnalytics({
        date: new Date(),
        totalSent: 100,
        totalDelivered: 90,
        totalFailed: 10
      });

      const deliveryRate = analytics.totalDelivered / analytics.totalSent;
      const failureRate = analytics.totalFailed / analytics.totalSent;

      expect(deliveryRate).toBe(0.9);
      expect(failureRate).toBe(0.1);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete notification flow', async () => {
      // Create notification service
      const notificationService = new EnhancedNotificationService({
        webSocketService: mockWebSocketService,
        emailService: mockEmailService,
        smsService: mockSMSService
      });

      // Create user preferences
      const preferences = new UserNotificationPreferences({
        userId: testUserId,
        globalSettings: { enabled: true },
        channels: {
          websocket: { enabled: true },
          email: { enabled: true },
          sms: { enabled: false }
        }
      });
      await preferences.save();

      // Create notification template
      const template = new NotificationTemplate({
        name: 'Integration Test Template',
        type: 'integration_test',
        category: 'system',
        variants: [{
          channel: 'websocket',
          userRole: 'patient',
          language: 'en',
          title: 'Integration Test',
          body: 'This is an integration test notification'
        }]
      });
      await template.save();

      // Send notification
      const notification = await notificationService.sendNotification(
        testUserId,
        'integration_test',
        { testData: 'integration' },
        {
          title: 'Integration Test',
          message: 'Testing complete flow',
          userRole: 'patient',
          channels: ['websocket', 'email']
        }
      );

      expect(notification).toBeDefined();
      expect(notification.type).toBe('integration_test');
      expect(notification.recipients[0].userId.toString()).toBe(testUserId);
    });

    test('should handle error scenarios gracefully', async () => {
      const notificationService = new EnhancedNotificationService({
        webSocketService: mockWebSocketService,
        emailService: mockEmailService,
        smsService: mockSMSService
      });

      // Test with invalid user ID
      await expect(
        notificationService.sendNotification(
          'invalid-user-id',
          'test_notification',
          {},
          { title: 'Test', message: 'Test' }
        )
      ).rejects.toThrow();
    });
  });
});