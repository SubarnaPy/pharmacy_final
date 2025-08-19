import { jest } from '@jest/globals';
import SMSDeliveryService from './SMSDeliveryService.js';
import SMSServiceManager from './SMSServiceManager.js';
import SMSTemplateEngine from './SMSTemplateEngine.js';

// Mock the dependencies
jest.mock('./SMSServiceManager.js');
jest.mock('./SMSTemplateEngine.js');

describe('SMSDeliveryService', () => {
  let smsDeliveryService;
  let mockSMSManager;
  let mockTemplateEngine;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockSMSManager = {
      sendSMS: jest.fn(),
      getProviderHealth: jest.fn().mockReturnValue({
        'twilio': { healthy: true, successRate: 0.95 },
        'aws-sns': { healthy: true, successRate: 0.92 }
      })
    };

    mockTemplateEngine = {
      renderTemplate: jest.fn(),
      optimizeForSMS: jest.fn(),
      calculateSMSCount: jest.fn(),
      validateSMSContent: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalTemplates: 15,
        cacheSize: 5
      })
    };

    // Mock constructors
    SMSServiceManager.mockImplementation(() => mockSMSManager);
    SMSTemplateEngine.mockImplementation(() => mockTemplateEngine);

    // Create service instance
    smsDeliveryService = new SMSDeliveryService({
      maxRetries: 3,
      retryDelays: [1000, 2000, 5000]
    });
  });

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('sendOptimizedSMS', () => {
    it('should send SMS with template rendering successfully', async () => {
      // Setup mocks
      const templateResult = {
        templateId: 'appointment_reminder',
        originalText: 'Reminder: Appointment with Dr. Smith tomorrow at 2:00 PM',
        optimizedText: 'Reminder: Appointment with Dr. Smith tomorrow at 2:00 PM',
        length: 58,
        truncated: false,
        smsCount: 1
      };

      const validation = {
        isValid: true,
        warnings: [],
        errors: [],
        length: 58,
        smsCount: 1
      };

      const smsResult = {
        messageId: 'msg_123456',
        provider: 'twilio',
        status: 'sent',
        cost: 0.0075
      };

      mockTemplateEngine.renderTemplate.mockReturnValue(templateResult);
      mockTemplateEngine.validateSMSContent.mockReturnValue(validation);
      mockSMSManager.sendSMS.mockResolvedValue(smsResult);

      // Test data
      const smsData = {
        templateId: 'appointment_reminder',
        templateData: {
          doctorName: 'Dr. Smith',
          date: 'tomorrow',
          time: '2:00 PM'
        },
        to: '+1234567890',
        userId: 'user_123',
        notificationId: 'notif_456',
        priority: 'high'
      };

      // Execute
      const result = await smsDeliveryService.sendOptimizedSMS(smsData);

      // Verify
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123456');
      expect(result.provider).toBe('twilio');
      expect(result.templateResult).toEqual(templateResult);
      expect(result.validation).toEqual(validation);
      expect(result.cost).toBe(0.0075);

      // Verify method calls
      expect(mockTemplateEngine.renderTemplate).toHaveBeenCalledWith(
        'appointment_reminder',
        smsData.templateData,
        {}
      );
      expect(mockTemplateEngine.validateSMSContent).toHaveBeenCalledWith(templateResult.optimizedText);
      expect(mockSMSManager.sendSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+1234567890',
          message: templateResult.optimizedText,
          userId: 'user_123',
          notificationId: 'notif_456',
          priority: 'high'
        })
      );
    });

    it('should send SMS with raw message optimization', async () => {
      // Setup mocks
      const optimization = {
        text: 'Your order has been confirmed and will be delivered soon.',
        truncated: false,
        originalLength: 52
      };

      const validation = {
        isValid: true,
        warnings: [],
        errors: [],
        length: 52,
        smsCount: 1
      };

      const smsResult = {
        messageId: 'msg_789012',
        provider: 'aws-sns',
        status: 'sent',
        cost: 0.006
      };

      mockTemplateEngine.optimizeForSMS.mockReturnValue(optimization);
      mockTemplateEngine.calculateSMSCount.mockReturnValue(1);
      mockTemplateEngine.validateSMSContent.mockReturnValue(validation);
      mockSMSManager.sendSMS.mockResolvedValue(smsResult);

      // Test data
      const smsData = {
        message: 'Your order has been confirmed and will be delivered soon.',
        to: '+1987654321',
        priority: 'medium'
      };

      // Execute
      const result = await smsDeliveryService.sendOptimizedSMS(smsData);

      // Verify
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_789012');
      expect(result.provider).toBe('aws-sns');
      expect(result.templateResult.optimizedText).toBe(optimization.text);

      // Verify method calls
      expect(mockTemplateEngine.optimizeForSMS).toHaveBeenCalledWith(smsData.message);
      expect(mockTemplateEngine.validateSMSContent).toHaveBeenCalledWith(optimization.text);
    });

    it('should handle SMS validation errors', async () => {
      // Setup mocks
      const validation = {
        isValid: false,
        warnings: [],
        errors: ['SMS content exceeds maximum length'],
        length: 2000,
        smsCount: 13
      };

      mockTemplateEngine.optimizeForSMS.mockReturnValue({
        text: 'Very long message...'.repeat(100),
        truncated: true
      });
      mockTemplateEngine.calculateSMSCount.mockReturnValue(13);
      mockTemplateEngine.validateSMSContent.mockReturnValue(validation);

      // Test data
      const smsData = {
        message: 'Very long message...'.repeat(100),
        to: '+1234567890'
      };

      // Execute and verify error
      await expect(smsDeliveryService.sendOptimizedSMS(smsData)).rejects.toMatchObject({
        success: false,
        error: 'SMS validation failed: SMS content exceeds maximum length'
      });

      // Verify SMS was not sent
      expect(mockSMSManager.sendSMS).not.toHaveBeenCalled();
    });

    it('should handle delivery failures and retry', async () => {
      // Setup mocks
      const templateResult = {
        optimizedText: 'Test message',
        length: 12,
        smsCount: 1
      };

      const validation = {
        isValid: true,
        warnings: [],
        errors: []
      };

      mockTemplateEngine.renderTemplate.mockReturnValue(templateResult);
      mockTemplateEngine.validateSMSContent.mockReturnValue(validation);
      
      // First attempt fails with retryable error
      mockSMSManager.sendSMS
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({
          messageId: 'msg_retry_123',
          provider: 'twilio',
          status: 'sent',
          cost: 0.0075
        });

      // Test data
      const smsData = {
        templateId: 'test_template',
        templateData: {},
        to: '+1234567890'
      };

      // Execute first attempt (should fail and schedule retry)
      await expect(smsDeliveryService.sendOptimizedSMS(smsData)).rejects.toThrow('Delivery failed, retry scheduled');

      // Verify retry was scheduled
      expect(smsDeliveryService.retryQueue.size).toBe(1);

      // Simulate retry processing
      jest.advanceTimersByTime(2000); // Advance past retry delay
      
      // The retry should succeed (this would be handled by the retry processor)
      // For testing, we'll manually trigger the retry
      const deliveryId = Array.from(smsDeliveryService.deliveryTracking.keys())[0];
      const retryResult = await smsDeliveryService.attemptDelivery(deliveryId);

      expect(retryResult.messageId).toBe('msg_retry_123');
      expect(retryResult.provider).toBe('twilio');
    });

    it('should fail permanently after max retries', async () => {
      // Setup mocks
      const templateResult = {
        optimizedText: 'Test message',
        length: 12,
        smsCount: 1
      };

      const validation = {
        isValid: true,
        warnings: [],
        errors: []
      };

      mockTemplateEngine.renderTemplate.mockReturnValue(templateResult);
      mockTemplateEngine.validateSMSContent.mockReturnValue(validation);
      
      // All attempts fail
      mockSMSManager.sendSMS.mockRejectedValue(new Error('Service unavailable'));

      // Test data
      const smsData = {
        templateId: 'test_template',
        templateData: {},
        to: '+1234567890'
      };

      // Execute - should fail after retries
      await expect(smsDeliveryService.sendOptimizedSMS(smsData)).rejects.toThrow('Delivery failed, retry scheduled');

      // Get the delivery tracking
      const deliveryId = Array.from(smsDeliveryService.deliveryTracking.keys())[0];
      const tracking = smsDeliveryService.deliveryTracking.get(deliveryId);

      // Manually exhaust retries
      tracking.attempts = 3; // Max retries
      
      await expect(smsDeliveryService.attemptDelivery(deliveryId)).rejects.toThrow('Service unavailable');
      
      // Verify final status
      expect(tracking.status).toBe('failed');
      expect(tracking.attempts).toBe(4); // 3 retries + 1 initial attempt
    });
  });

  describe('sendBulkOptimizedSMS', () => {
    it('should send bulk SMS successfully', async () => {
      // Setup mocks
      const templateResult = {
        optimizedText: 'Bulk message',
        length: 12,
        smsCount: 1
      };

      const validation = {
        isValid: true,
        warnings: [],
        errors: []
      };

      mockTemplateEngine.renderTemplate.mockReturnValue(templateResult);
      mockTemplateEngine.validateSMSContent.mockReturnValue(validation);
      mockSMSManager.sendSMS.mockResolvedValue({
        messageId: 'msg_bulk_123',
        provider: 'twilio',
        status: 'sent',
        cost: 0.0075
      });

      // Test data
      const recipients = ['+1234567890', '+1987654321', '+1122334455'];
      const smsData = {
        templateId: 'bulk_template',
        templateData: { message: 'Bulk notification' }
      };

      // Execute
      const result = await smsDeliveryService.sendBulkOptimizedSMS(recipients, smsData);

      // Verify
      expect(result.totalRecipients).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.successRate).toBe(100);
      expect(result.totalCost).toBe(0.0225); // 3 * 0.0075

      // Verify all recipients were processed
      expect(mockSMSManager.sendSMS).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk SMS', async () => {
      // Setup mocks
      const templateResult = {
        optimizedText: 'Bulk message',
        length: 12,
        smsCount: 1
      };

      const validation = {
        isValid: true,
        warnings: [],
        errors: []
      };

      mockTemplateEngine.renderTemplate.mockReturnValue(templateResult);
      mockTemplateEngine.validateSMSContent.mockReturnValue(validation);
      
      // First two succeed, third fails
      mockSMSManager.sendSMS
        .mockResolvedValueOnce({
          messageId: 'msg_1',
          provider: 'twilio',
          status: 'sent',
          cost: 0.0075
        })
        .mockResolvedValueOnce({
          messageId: 'msg_2',
          provider: 'twilio',
          status: 'sent',
          cost: 0.0075
        })
        .mockRejectedValueOnce(new Error('Invalid phone number'));

      // Test data
      const recipients = ['+1234567890', '+1987654321', 'invalid-number'];
      const smsData = {
        templateId: 'bulk_template',
        templateData: { message: 'Bulk notification' }
      };

      // Execute
      const result = await smsDeliveryService.sendBulkOptimizedSMS(recipients, smsData);

      // Verify
      expect(result.totalRecipients).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.successRate).toBe(66.67); // Rounded
      expect(result.totalCost).toBe(0.015); // 2 * 0.0075

      // Check individual results
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(result.results[2].success).toBe(false);
      expect(result.results[2].error).toContain('Invalid phone number');
    });
  });

  describe('trackDeliveryStatus', () => {
    it('should track delivery status updates from webhooks', async () => {
      // First, create a delivery to track
      const templateResult = {
        optimizedText: 'Test message',
        length: 12,
        smsCount: 1
      };

      const validation = {
        isValid: true,
        warnings: [],
        errors: []
      };

      mockTemplateEngine.renderTemplate.mockReturnValue(templateResult);
      mockTemplateEngine.validateSMSContent.mockReturnValue(validation);
      mockSMSManager.sendSMS.mockResolvedValue({
        messageId: 'msg_track_123',
        provider: 'twilio',
        status: 'sent',
        cost: 0.0075
      });

      // Send SMS first
      await smsDeliveryService.sendOptimizedSMS({
        templateId: 'test_template',
        templateData: {},
        to: '+1234567890'
      });

      // Now track delivery status
      const webhookData = {
        messageId: 'msg_track_123',
        status: 'delivered',
        timestamp: new Date().toISOString(),
        recipient: '+1234567890',
        provider: 'twilio'
      };

      // Execute tracking
      const result = await smsDeliveryService.trackDeliveryStatus(webhookData);

      // Verify
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('delivered');
      expect(result.previousStatus).toBe('sent');

      // Verify tracking data was updated
      const deliveryId = result.deliveryId;
      const tracking = smsDeliveryService.getDeliveryStatus(deliveryId);
      expect(tracking.status).toBe('delivered');
      expect(tracking.deliveredAt).toBeDefined();
    });

    it('should handle failed delivery status updates', async () => {
      // First, create a delivery to track
      const templateResult = {
        optimizedText: 'Test message',
        length: 12,
        smsCount: 1
      };

      const validation = {
        isValid: true,
        warnings: [],
        errors: []
      };

      mockTemplateEngine.renderTemplate.mockReturnValue(templateResult);
      mockTemplateEngine.validateSMSContent.mockReturnValue(validation);
      mockSMSManager.sendSMS.mockResolvedValue({
        messageId: 'msg_fail_123',
        provider: 'twilio',
        status: 'sent',
        cost: 0.0075
      });

      // Send SMS first
      await smsDeliveryService.sendOptimizedSMS({
        templateId: 'test_template',
        templateData: {},
        to: '+1234567890'
      });

      // Track failure status
      const webhookData = {
        messageId: 'msg_fail_123',
        status: 'failed',
        timestamp: new Date().toISOString(),
        recipient: '+1234567890',
        errorCode: '30008',
        provider: 'twilio'
      };

      // Execute tracking
      const result = await smsDeliveryService.trackDeliveryStatus(webhookData);

      // Verify
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('failed');

      // Verify tracking data was updated
      const deliveryId = result.deliveryId;
      const tracking = smsDeliveryService.getDeliveryStatus(deliveryId);
      expect(tracking.status).toBe('failed');
      expect(tracking.errorCode).toBe('30008');
    });

    it('should handle webhook for unknown message ID', async () => {
      const webhookData = {
        messageId: 'unknown_msg_123',
        status: 'delivered',
        timestamp: new Date().toISOString(),
        recipient: '+1234567890',
        provider: 'twilio'
      };

      // Execute tracking
      const result = await smsDeliveryService.trackDeliveryStatus(webhookData);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe('Tracking not found');
    });
  });

  describe('getDeliveryStats', () => {
    it('should return accurate delivery statistics', () => {
      // Manually update stats
      smsDeliveryService.stats.totalSent = 100;
      smsDeliveryService.stats.totalDelivered = 95;
      smsDeliveryService.stats.totalFailed = 5;
      smsDeliveryService.stats.totalRetries = 10;

      const stats = smsDeliveryService.getDeliveryStats();

      expect(stats.totalSent).toBe(100);
      expect(stats.totalDelivered).toBe(95);
      expect(stats.totalFailed).toBe(5);
      expect(stats.totalRetries).toBe(10);
      expect(stats.successRate).toBe(95);
      expect(stats.failureRate).toBe(5);
      expect(stats.retryRate).toBe(10);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status with good metrics', () => {
      // Setup good stats
      smsDeliveryService.stats.totalSent = 100;
      smsDeliveryService.stats.totalDelivered = 95;
      smsDeliveryService.stats.totalFailed = 5;

      const health = smsDeliveryService.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.deliveryStats.successRate).toBe(95);
      expect(health.providerHealth).toBeDefined();
      expect(health.templateStats).toBeDefined();
    });

    it('should return degraded status with moderate metrics', () => {
      // Setup moderate stats
      smsDeliveryService.stats.totalSent = 100;
      smsDeliveryService.stats.totalDelivered = 75;
      smsDeliveryService.stats.totalFailed = 25;

      const health = smsDeliveryService.getHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.deliveryStats.successRate).toBe(75);
    });

    it('should return unhealthy status with poor metrics', () => {
      // Setup poor stats
      smsDeliveryService.stats.totalSent = 100;
      smsDeliveryService.stats.totalDelivered = 60;
      smsDeliveryService.stats.totalFailed = 40;

      const health = smsDeliveryService.getHealthStatus();

      expect(health.status).toBe('unhealthy');
      expect(health.deliveryStats.successRate).toBe(60);
    });
  });

  describe('shouldRetry', () => {
    it('should identify retryable errors', () => {
      const retryableErrors = [
        new Error('Rate limit exceeded'),
        new Error('Network timeout'),
        new Error('Service unavailable'),
        new Error('Internal server error'),
        new Error('Connection failed'),
        new Error('Provider failure')
      ];

      retryableErrors.forEach(error => {
        expect(smsDeliveryService.shouldRetry(error)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableErrors = [
        new Error('Invalid phone number'),
        new Error('Account suspended'),
        new Error('Insufficient funds'),
        new Error('Message blocked'),
        new Error('Unauthorized')
      ];

      nonRetryableErrors.forEach(error => {
        expect(smsDeliveryService.shouldRetry(error)).toBe(false);
      });
    });
  });

  describe('cleanupOldDeliveries', () => {
    it('should clean up old completed deliveries', () => {
      // Add some old deliveries
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      
      smsDeliveryService.deliveryTracking.set('old_delivery_1', {
        createdAt: oldDate,
        status: 'delivered'
      });
      
      smsDeliveryService.deliveryTracking.set('old_delivery_2', {
        createdAt: oldDate,
        status: 'failed'
      });
      
      smsDeliveryService.deliveryTracking.set('recent_delivery', {
        createdAt: new Date(),
        status: 'delivered'
      });

      // Clean up with 24 hour max age
      const cleaned = smsDeliveryService.cleanupOldDeliveries(24 * 60 * 60 * 1000);

      expect(cleaned).toBe(2);
      expect(smsDeliveryService.deliveryTracking.has('old_delivery_1')).toBe(false);
      expect(smsDeliveryService.deliveryTracking.has('old_delivery_2')).toBe(false);
      expect(smsDeliveryService.deliveryTracking.has('recent_delivery')).toBe(true);
    });
  });
});