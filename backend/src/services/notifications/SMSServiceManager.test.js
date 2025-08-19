import { jest } from '@jest/globals';
import SMSServiceManager from './SMSServiceManager.js';

// Mock external dependencies
jest.mock('twilio', () => ({
  default: jest.fn(() => ({
    messages: {
      create: jest.fn()
    }
  }))
}));

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn(() => ({
    send: jest.fn()
  })),
  PublishCommand: jest.fn(),
  SetSMSAttributesCommand: jest.fn()
}));

jest.mock('libphonenumber-js', () => ({
  parsePhoneNumber: jest.fn()
}));

describe('SMSServiceManager', () => {
  let smsManager;
  let mockConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock configuration
    mockConfig = {
      config: {
        twilio: {
          enabled: true,
          accountSid: 'test_account_sid',
          authToken: 'test_auth_token',
          fromNumber: '+1234567890'
        },
        aws: {
          enabled: true,
          region: 'us-east-1',
          sns: {
            region: 'us-east-1'
          }
        }
      }
    };

    // Set environment variables
    process.env.AWS_ACCESS_KEY_ID = 'test_access_key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test_secret_key';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  describe('Initialization', () => {
    test('should initialize SMS service manager successfully', async () => {
      smsManager = new SMSServiceManager(mockConfig);
      
      expect(smsManager).toBeInstanceOf(SMSServiceManager);
      expect(smsManager.providers.size).toBeGreaterThan(0);
      expect(smsManager.currentProvider).toBeDefined();
    });

    test('should initialize test provider in test environment', async () => {
      smsManager = new SMSServiceManager(mockConfig);
      
      expect(smsManager.providers.has('sms-test')).toBe(true);
      const testProvider = smsManager.providers.get('sms-test');
      expect(testProvider.testMode).toBe(true);
    });

    test('should handle initialization without external providers', async () => {
      const configWithoutProviders = {
        config: {
          twilio: { enabled: false },
          aws: { enabled: false }
        }
      };
      
      smsManager = new SMSServiceManager(configWithoutProviders);
      
      // Should still have test provider
      expect(smsManager.providers.size).toBeGreaterThan(0);
      expect(smsManager.currentProvider).toBeDefined();
    });
  });

  describe('Phone Number Validation', () => {
    beforeEach(() => {
      smsManager = new SMSServiceManager(mockConfig);
    });

    test('should validate and format valid phone number', async () => {
      const result = await smsManager.validateAndFormatPhoneNumber('+1234567890');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+1234567890');
    });

    test('should validate phone number without country code', async () => {
      const result = await smsManager.validateAndFormatPhoneNumber('1234567890');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+11234567890');
    });

    test('should reject invalid phone number', async () => {
      const result = await smsManager.validateAndFormatPhoneNumber('123');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle phone number with formatting characters', async () => {
      const result = await smsManager.validateAndFormatPhoneNumber('(123) 456-7890');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+11234567890');
    });

    test('should cache validation results', async () => {
      const phoneNumber = '+1234567890';
      
      // First call
      const result1 = await smsManager.validateAndFormatPhoneNumber(phoneNumber);
      
      // Second call should use cache
      const result2 = await smsManager.validateAndFormatPhoneNumber(phoneNumber);
      
      expect(result1).toEqual(result2);
      expect(smsManager.phoneValidationCache.has(`${phoneNumber}_US`)).toBe(true);
    });
  });

  describe('Message Optimization', () => {
    beforeEach(() => {
      smsManager = new SMSServiceManager(mockConfig);
    });

    test('should return message as-is if within limit', () => {
      const message = 'Short message';
      const result = smsManager.optimizeMessageForSMS(message);
      
      expect(result).toBe(message);
    });

    test('should truncate long message at word boundary', () => {
      const longMessage = 'This is a very long message that exceeds the SMS character limit and should be truncated at a word boundary to maintain readability and user experience.';
      const result = smsManager.optimizeMessageForSMS(longMessage, 100);
      
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result.endsWith('...')).toBe(true);
      expect(result.includes(' ')).toBe(true); // Should have word boundaries
    });

    test('should hard truncate if no good word boundary found', () => {
      const longMessage = 'Thisisaverylongmessagewithoutanyspacesorwordboundariesthatexceedsthesmslimitandneedstobehardtruncated';
      const result = smsManager.optimizeMessageForSMS(longMessage, 50);
      
      expect(result.length).toBe(50);
      expect(result.endsWith('...')).toBe(true);
    });

    test('should handle empty message', () => {
      const result = smsManager.optimizeMessageForSMS('');
      
      expect(result).toBe('');
    });

    test('should handle null/undefined message', () => {
      expect(smsManager.optimizeMessageForSMS(null)).toBe('');
      expect(smsManager.optimizeMessageForSMS(undefined)).toBe('');
    });
  });

  describe('SMS Sending', () => {
    beforeEach(() => {
      smsManager = new SMSServiceManager(mockConfig);
    });

    test('should send SMS successfully with test provider', async () => {
      const smsData = {
        to: '+1234567890',
        message: 'Test message',
        userId: 'user123',
        notificationId: 'notif123'
      };

      const result = await smsManager.sendSMS(smsData);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('sms-test');
      expect(result.messageId).toBeDefined();
      expect(result.cost).toBe(0.00);
    });

    test('should handle invalid phone number', async () => {
      const smsData = {
        to: 'invalid-phone',
        message: 'Test message'
      };

      await expect(smsManager.sendSMS(smsData)).rejects.toThrow('Invalid phone number');
    });

    test('should optimize long messages automatically', async () => {
      const longMessage = 'This is a very long message that exceeds the SMS character limit and should be automatically optimized by the SMS service manager to fit within the standard SMS length limits.';
      
      const smsData = {
        to: '+1234567890',
        message: longMessage
      };

      const result = await smsManager.sendSMS(smsData);

      expect(result.success).toBe(true);
      // The actual message sent should be optimized
      expect(result.result.body.length).toBeLessThanOrEqual(160);
    });

    test('should include metadata in SMS sending', async () => {
      const smsData = {
        to: '+1234567890',
        message: 'Test message',
        metadata: { type: 'appointment_reminder', urgency: 'high' },
        userId: 'user123',
        notificationId: 'notif123'
      };

      const result = await smsManager.sendSMS(smsData);

      expect(result.success).toBe(true);
      expect(result.result.metadata).toEqual(expect.objectContaining({
        type: 'appointment_reminder',
        urgency: 'high',
        userId: 'user123',
        notificationId: 'notif123'
      }));
    });
  });

  describe('Bulk SMS Sending', () => {
    beforeEach(() => {
      smsManager = new SMSServiceManager(mockConfig);
    });

    test('should send bulk SMS to multiple recipients', async () => {
      const recipients = ['+1234567890', '+1234567891', '+1234567892'];
      const smsData = {
        message: 'Bulk test message',
        metadata: { campaign: 'test_campaign' }
      };

      const result = await smsManager.sendBulkSMS(recipients, smsData);

      expect(result.totalRecipients).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.totalCost).toBe(0.00); // Test provider cost
      expect(result.results).toHaveLength(3);
    });

    test('should handle mixed success/failure in bulk sending', async () => {
      const recipients = ['+1234567890', 'invalid-phone', '+1234567892'];
      const smsData = {
        message: 'Bulk test message'
      };

      const result = await smsManager.sendBulkSMS(recipients, smsData);

      expect(result.totalRecipients).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results).toHaveLength(3);
      
      // Check that invalid phone number failed
      const failedResult = result.results.find(r => r.recipient === 'invalid-phone');
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBeDefined();
    });
  });

  describe('Provider Health Monitoring', () => {
    beforeEach(() => {
      smsManager = new SMSServiceManager(mockConfig);
    });

    test('should track provider health on successful send', async () => {
      const smsData = {
        to: '+1234567890',
        message: 'Test message'
      };

      await smsManager.sendSMS(smsData);

      const health = smsManager.getProviderHealth();
      expect(health['sms-test']).toBeDefined();
      expect(health['sms-test'].healthy).toBe(true);
      expect(health['sms-test'].successfulRequests).toBe(1);
      expect(health['sms-test'].totalRequests).toBe(1);
    });

    test('should update provider health on failure', () => {
      const providerName = 'sms-test';
      
      // Simulate failure
      smsManager.updateProviderHealth(providerName, false, new Error('Test error'));

      const health = smsManager.getProviderHealth();
      expect(health[providerName].failedRequests).toBe(1);
      expect(health[providerName].consecutiveFailures).toBe(1);
      expect(health[providerName].healthy).toBe(true); // Still healthy after 1 failure
    });

    test('should mark provider as unhealthy after consecutive failures', () => {
      const providerName = 'sms-test';
      
      // Simulate 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        smsManager.updateProviderHealth(providerName, false, new Error('Test error'));
      }

      const health = smsManager.getProviderHealth();
      expect(health[providerName].healthy).toBe(false);
      expect(health[providerName].consecutiveFailures).toBe(3);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      smsManager = new SMSServiceManager(mockConfig);
    });

    test('should check rate limits correctly', () => {
      const providerName = 'sms-test';
      
      // Should be within limits initially
      expect(smsManager.checkRateLimit(providerName)).toBe(true);
    });

    test('should update rate limit tracking', () => {
      const providerName = 'sms-test';
      
      // Update rate limit
      smsManager.updateRateLimit(providerName);
      
      const rateLimits = smsManager.rateLimits.get(providerName);
      expect(rateLimits).toBeDefined();
      expect(rateLimits.dailyCount).toBe(1);
      expect(rateLimits.requests).toHaveLength(1);
    });

    test('should respect per-second rate limits', () => {
      const providerName = 'sms-test';
      const provider = smsManager.providers.get(providerName);
      
      // Simulate reaching per-second limit
      for (let i = 0; i < provider.rateLimit.maxPerSecond; i++) {
        smsManager.updateRateLimit(providerName);
      }
      
      // Should now be at limit
      expect(smsManager.checkRateLimit(providerName)).toBe(false);
    });
  });

  describe('Cost Tracking', () => {
    beforeEach(() => {
      smsManager = new SMSServiceManager(mockConfig);
    });

    test('should track costs correctly', () => {
      const providerName = 'sms-test';
      const cost = 0.05;
      
      smsManager.updateCostTracking(providerName, cost);
      
      const costTracking = smsManager.getCostTracking();
      expect(costTracking[providerName]).toBeDefined();
      expect(costTracking[providerName].totalCost).toBe(cost);
      expect(costTracking[providerName].messageCount).toBe(1);
      expect(costTracking[providerName].averageCost).toBe(cost);
    });

    test('should calculate average costs correctly', () => {
      const providerName = 'sms-test';
      
      smsManager.updateCostTracking(providerName, 0.05);
      smsManager.updateCostTracking(providerName, 0.03);
      smsManager.updateCostTracking(providerName, 0.07);
      
      const costTracking = smsManager.getCostTracking();
      expect(costTracking[providerName].totalCost).toBe(0.15);
      expect(costTracking[providerName].messageCount).toBe(3);
      expect(costTracking[providerName].averageCost).toBe(0.05);
    });

    test('should emit cost alert when threshold exceeded', (done) => {
      const providerName = 'sms-test';
      process.env.SMS_DAILY_COST_THRESHOLD = '10';
      
      smsManager.on('costAlert', (data) => {
        expect(data.provider).toBe(providerName);
        expect(data.dailyCost).toBe(15);
        expect(data.threshold).toBe('10');
        done();
      });
      
      smsManager.updateCostTracking(providerName, 15);
    });
  });

  describe('Delivery Tracking', () => {
    beforeEach(() => {
      smsManager = new SMSServiceManager(mockConfig);
    });

    test('should track SMS delivery status', async () => {
      const webhookData = {
        provider: 'twilio',
        messageId: 'test-message-id',
        status: 'delivered',
        timestamp: new Date().toISOString(),
        recipient: '+1234567890'
      };

      const result = await smsManager.trackSMSDelivery(webhookData);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.status).toBe('delivered');
      expect(result.messageId).toBe('test-message-id');
    });

    test('should emit delivery tracking events', (done) => {
      const webhookData = {
        provider: 'twilio',
        messageId: 'test-message-id',
        status: 'delivered',
        timestamp: new Date().toISOString(),
        recipient: '+1234567890'
      };

      smsManager.on('deliveryTracking', (data) => {
        expect(data.provider).toBe('twilio');
        expect(data.messageId).toBe('test-message-id');
        expect(data.status).toBe('delivered');
        expect(data.recipient).toBe('+1234567890');
        done();
      });

      smsManager.trackSMSDelivery(webhookData);
    });

    test('should update delivery statistics', async () => {
      const webhookData = {
        provider: 'sms-test',
        messageId: 'test-message-id',
        status: 'delivered',
        timestamp: new Date().toISOString(),
        recipient: '+1234567890'
      };

      await smsManager.trackSMSDelivery(webhookData);

      const stats = smsManager.getDeliveryStats();
      expect(stats['sms-test'].delivered).toBe(1);
    });
  });

  describe('Provider Failover', () => {
    beforeEach(() => {
      smsManager = new SMSServiceManager(mockConfig);
    });

    test('should consider provider switch based on performance', () => {
      // Set up two providers with different success rates
      smsManager.updateProviderHealth('sms-test', true);
      smsManager.updateProviderHealth('sms-test', true);
      smsManager.updateProviderHealth('sms-test', false); // 66% success rate
      
      // Mock a backup provider
      smsManager.backupProvider = {
        name: 'backup-provider'
      };
      smsManager.initializeProviderHealth('backup-provider');
      smsManager.updateProviderHealth('backup-provider', true);
      smsManager.updateProviderHealth('backup-provider', true);
      smsManager.updateProviderHealth('backup-provider', true); // 100% success rate
      
      const originalPrimary = smsManager.currentProvider.name;
      
      smsManager.considerProviderSwitch();
      
      // Should switch if backup is significantly better
      const newPrimary = smsManager.currentProvider.name;
      expect(newPrimary).toBe('backup-provider');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      smsManager = new SMSServiceManager(mockConfig);
    });

    test('should handle SMS delivery tracking errors gracefully', async () => {
      const invalidWebhookData = {
        // Missing required fields
        provider: 'twilio'
      };

      await expect(smsManager.trackSMSDelivery(invalidWebhookData)).rejects.toThrow();
    });

    test('should handle provider initialization failures gracefully', () => {
      // Mock Twilio to throw an error
      const originalTwilio = jest.requireMock('twilio');
      originalTwilio.default.mockImplementation(() => {
        throw new Error('Twilio initialization failed');
      });

      // Should still initialize successfully with test provider
      expect(() => new SMSServiceManager(mockConfig)).not.toThrow();
    });
  });
});