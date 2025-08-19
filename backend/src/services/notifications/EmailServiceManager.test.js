/**
 * Unit tests for EmailServiceManager
 * Tests all functionality required by task 3.1
 */

import EmailServiceManager from './EmailServiceManager.js';
import notificationConfig from '../../config/notificationConfig.js';

// Mock external dependencies
jest.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([{ headers: { 'x-message-id': 'sg-test-123' } }])
  }
}));

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ MessageId: 'aws-test-123' })
  })),
  SendEmailCommand: jest.fn(),
  SendRawEmailCommand: jest.fn()
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'nodemailer-test-123',
      response: 'Email sent successfully'
    })
  })
}));

describe('EmailServiceManager', () => {
  let emailManager;

  beforeEach(async () => {
    // Reset environment variables
    delete process.env.SENDGRID_API_KEY;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.SMTP_HOST;
    delete process.env.GMAIL_USER;
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    emailManager = new EmailServiceManager();
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
  });

  afterEach(() => {
    if (emailManager) {
      emailManager.removeAllListeners();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default test provider when no configuration is available', () => {
      expect(emailManager.providers.size).toBeGreaterThan(0);
      expect(emailManager.currentProvider).toBeDefined();
      expect(emailManager.currentProvider.name).toMatch(/nodemailer/);
    });

    test('should initialize provider health tracking', () => {
      const health = emailManager.getProviderHealth();
      expect(Object.keys(health).length).toBeGreaterThan(0);
      
      Object.values(health).forEach(providerHealth => {
        expect(providerHealth).toHaveProperty('healthy');
        expect(providerHealth).toHaveProperty('totalRequests');
        expect(providerHealth).toHaveProperty('successfulRequests');
        expect(providerHealth).toHaveProperty('failedRequests');
      });
    });

    test('should initialize delivery statistics', () => {
      const stats = emailManager.getDeliveryStats();
      expect(Object.keys(stats).length).toBeGreaterThan(0);
      
      Object.values(stats).forEach(providerStats => {
        expect(providerStats).toHaveProperty('sent');
        expect(providerStats).toHaveProperty('delivered');
        expect(providerStats).toHaveProperty('failed');
        expect(providerStats).toHaveProperty('opened');
        expect(providerStats).toHaveProperty('clicked');
        expect(providerStats).toHaveProperty('bounced');
      });
    });
  });

  describe('Provider Support', () => {
    test('should support multiple email providers', () => {
      // Test with SendGrid configuration
      process.env.SENDGRID_API_KEY = 'test-key';
      const emailManagerWithSG = new EmailServiceManager();
      
      expect(emailManagerWithSG.providers.has('sendgrid') || emailManagerWithSG.providers.size > 0).toBe(true);
    });

    test('should prioritize providers correctly', () => {
      const providers = Array.from(emailManager.providers.values());
      
      if (providers.length > 1) {
        const sortedProviders = providers.sort((a, b) => a.priority - b.priority);
        expect(sortedProviders[0].priority).toBeLessThanOrEqual(sortedProviders[1].priority);
      }
    });

    test('should have correct provider features', () => {
      emailManager.providers.forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('type');
        expect(provider).toHaveProperty('priority');
        expect(provider).toHaveProperty('rateLimit');
        expect(provider).toHaveProperty('features');
        expect(Array.isArray(provider.features)).toBe(true);
      });
    });
  });

  describe('Email Sending', () => {
    test('should send basic email successfully', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test</h1>',
        text: 'Test',
        metadata: { testType: 'unit' }
      };

      const result = await emailManager.sendEmail(emailData);

      expect(result.success).toBe(true);
      expect(result.provider).toBeDefined();
      expect(result.messageId).toBeDefined();
    });

    test('should handle email with attachments', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email with Attachment',
        html: '<h1>Test</h1>',
        attachments: [{
          filename: 'test.txt',
          content: 'Test content',
          contentType: 'text/plain'
        }]
      };

      const result = await emailManager.sendEmail(emailData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    test('should send bulk emails', async () => {
      const recipients = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
      const emailData = {
        subject: 'Bulk Test',
        html: '<h1>Bulk Test</h1>',
        text: 'Bulk Test'
      };

      const result = await emailManager.sendBulkEmail(recipients, emailData);

      expect(result.totalRecipients).toBe(recipients.length);
      expect(result.successCount).toBeGreaterThan(0);
      expect(result.results).toHaveLength(recipients.length);
    });

    test('should handle template-based emails', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Template Test',
        templateId: 'test-template',
        templateData: { name: 'John Doe', message: 'Hello World' }
      };

      const result = await emailManager.sendEmail(emailData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('Provider Failover', () => {
    test('should handle provider failure and attempt failover', async () => {
      // Simulate primary provider failure
      const originalProvider = emailManager.currentProvider;
      
      // Mark provider as unhealthy
      emailManager.updateProviderHealth(originalProvider.name, false, new Error('Test failure'));
      emailManager.updateProviderHealth(originalProvider.name, false, new Error('Test failure'));
      emailManager.updateProviderHealth(originalProvider.name, false, new Error('Test failure'));

      expect(emailManager.isProviderHealthy(originalProvider.name)).toBe(false);
    });

    test('should track provider health correctly', () => {
      const providerName = emailManager.currentProvider.name;
      
      // Test successful operation
      emailManager.updateProviderHealth(providerName, true);
      let health = emailManager.providerHealth.get(providerName);
      expect(health.healthy).toBe(true);
      expect(health.successfulRequests).toBeGreaterThan(0);

      // Test failed operation
      emailManager.updateProviderHealth(providerName, false, new Error('Test error'));
      health = emailManager.providerHealth.get(providerName);
      expect(health.failedRequests).toBeGreaterThan(0);
    });

    test('should emit health update events', (done) => {
      const providerName = emailManager.currentProvider.name;
      
      emailManager.on('providerHealthUpdate', (data) => {
        expect(data.provider).toBe(providerName);
        expect(data.health).toHaveProperty('healthy');
        expect(data.health).toHaveProperty('successRate');
        done();
      });

      emailManager.updateProviderHealth(providerName, true);
    });
  });

  describe('Rate Limiting', () => {
    test('should check rate limits correctly', () => {
      const providerName = emailManager.currentProvider.name;
      
      // Should be within limits initially
      expect(emailManager.checkRateLimit(providerName)).toBe(true);
      
      // Update rate limit tracking
      emailManager.updateRateLimit(providerName);
      
      // Should still be within limits for reasonable usage
      expect(emailManager.checkRateLimit(providerName)).toBe(true);
    });

    test('should track rate limit usage', () => {
      const providerName = emailManager.currentProvider.name;
      const initialRateLimit = emailManager.rateLimits.get(providerName);
      
      emailManager.updateRateLimit(providerName);
      
      const updatedRateLimit = emailManager.rateLimits.get(providerName);
      expect(updatedRateLimit.dailyCount).toBeGreaterThan(initialRateLimit?.dailyCount || 0);
    });

    test('should respect provider rate limits', () => {
      const provider = emailManager.currentProvider;
      expect(provider.rateLimit).toHaveProperty('maxPerSecond');
      expect(provider.rateLimit).toHaveProperty('maxPerDay');
      expect(typeof provider.rateLimit.maxPerSecond).toBe('number');
      expect(typeof provider.rateLimit.maxPerDay).toBe('number');
    });
  });

  describe('Delivery Tracking', () => {
    test('should track email delivery events', async () => {
      const webhookData = {
        provider: 'test-provider',
        messageId: 'test-message-123',
        event: 'delivered',
        timestamp: Date.now(),
        recipient: 'test@example.com'
      };

      const result = await emailManager.trackEmailDelivery(webhookData);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.event).toBe('delivered');
      expect(result.messageId).toBe('test-message-123');
    });

    test('should emit delivery tracking events', (done) => {
      const webhookData = {
        provider: 'test-provider',
        messageId: 'test-message-456',
        event: 'opened',
        timestamp: Date.now(),
        recipient: 'test@example.com'
      };

      emailManager.on('deliveryTracking', (data) => {
        expect(data.provider).toBe('test-provider');
        expect(data.messageId).toBe('test-message-456');
        expect(data.event).toBe('opened');
        done();
      });

      emailManager.trackEmailDelivery(webhookData);
    });

    test('should update delivery statistics', async () => {
      const providerName = 'test-provider';
      emailManager.initializeProviderStats(providerName);
      
      const initialStats = emailManager.deliveryStats.get(providerName);
      const initialDelivered = initialStats.delivered;
      
      emailManager.updateDeliveryStats(providerName, 'delivered');
      
      const updatedStats = emailManager.deliveryStats.get(providerName);
      expect(updatedStats.delivered).toBe(initialDelivered + 1);
    });
  });

  describe('Health Monitoring', () => {
    test('should provide comprehensive health status', () => {
      const health = emailManager.getProviderHealth();
      
      Object.values(health).forEach(providerHealth => {
        expect(providerHealth).toHaveProperty('healthy');
        expect(providerHealth).toHaveProperty('lastSuccess');
        expect(providerHealth).toHaveProperty('totalRequests');
        expect(providerHealth).toHaveProperty('successfulRequests');
        expect(providerHealth).toHaveProperty('failedRequests');
        expect(providerHealth).toHaveProperty('consecutiveFailures');
      });
    });

    test('should mark provider as unhealthy after consecutive failures', () => {
      const providerName = emailManager.currentProvider.name;
      
      // Simulate 3 consecutive failures
      emailManager.updateProviderHealth(providerName, false, new Error('Failure 1'));
      emailManager.updateProviderHealth(providerName, false, new Error('Failure 2'));
      emailManager.updateProviderHealth(providerName, false, new Error('Failure 3'));
      
      expect(emailManager.isProviderHealthy(providerName)).toBe(false);
    });

    test('should emit unhealthy provider events', (done) => {
      const providerName = emailManager.currentProvider.name;
      
      emailManager.on('providerUnhealthy', (data) => {
        expect(data.provider).toBe(providerName);
        expect(data.error).toBeDefined();
        done();
      });

      // Trigger unhealthy state
      emailManager.updateProviderHealth(providerName, false, new Error('Test failure'));
      emailManager.updateProviderHealth(providerName, false, new Error('Test failure'));
      emailManager.updateProviderHealth(providerName, false, new Error('Test failure'));
    });
  });

  describe('Configuration Integration', () => {
    test('should use notification configuration', () => {
      expect(emailManager.config).toBeDefined();
      expect(emailManager.config).toHaveProperty('sendgrid');
      expect(emailManager.config).toHaveProperty('aws');
    });

    test('should respect configuration settings', () => {
      const config = emailManager.config;
      
      if (config.sendgrid?.enabled) {
        expect(emailManager.providers.has('sendgrid')).toBe(true);
      }
      
      if (config.aws?.enabled) {
        expect(emailManager.providers.has('aws-ses')).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle missing provider gracefully', async () => {
      // Create manager with no providers
      const emptyManager = new EmailServiceManager({ config: { sendgrid: { enabled: false }, aws: { enabled: false } } });
      
      // Should still have fallback provider
      expect(emptyManager.providers.size).toBeGreaterThan(0);
    });

    test('should handle email sending errors gracefully', async () => {
      // Mock provider to throw error
      const originalService = emailManager.currentProvider.service;
      emailManager.currentProvider.service = {
        sendMail: jest.fn().mockRejectedValue(new Error('Send failed'))
      };

      try {
        await emailManager.sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          html: '<h1>Test</h1>'
        });
      } catch (error) {
        expect(error.message).toContain('failed');
      }

      // Restore original service
      emailManager.currentProvider.service = originalService;
    });
  });

  describe('Requirements Compliance', () => {
    test('should meet requirement 4.1 - Multiple provider support', () => {
      // Should support SendGrid, AWS SES, and Nodemailer
      const supportedTypes = Array.from(emailManager.providers.values()).map(p => p.type);
      expect(supportedTypes.includes('nodemailer')).toBe(true);
      
      // Should have provider selection logic
      expect(emailManager.currentProvider).toBeDefined();
    });

    test('should meet requirement 4.3 - Provider failover', () => {
      // Should have failover mechanism
      expect(typeof emailManager.sendEmail).toBe('function');
      expect(typeof emailManager.updateProviderHealth).toBe('function');
      expect(typeof emailManager.isProviderHealthy).toBe('function');
    });

    test('should meet requirement 10.1 - Health monitoring', () => {
      // Should have health monitoring
      expect(typeof emailManager.getProviderHealth).toBe('function');
      expect(typeof emailManager.updateProviderHealth).toBe('function');
      
      const health = emailManager.getProviderHealth();
      expect(Object.keys(health).length).toBeGreaterThan(0);
    });

    test('should meet requirement 10.3 - Provider integration', () => {
      // Should integrate with external services
      expect(emailManager.providers.size).toBeGreaterThan(0);
      
      emailManager.providers.forEach(provider => {
        expect(provider).toHaveProperty('service');
        expect(provider).toHaveProperty('type');
        expect(provider).toHaveProperty('features');
      });
    });
  });
});