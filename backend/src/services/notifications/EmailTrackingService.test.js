import { jest } from '@jest/globals';
import EmailTrackingService from './EmailTrackingService.js';
import Notification from '../../models/Notification.js';
import NotificationAnalytics from '../../models/NotificationAnalytics.js';

// Mock the models
jest.mock('../../models/Notification.js');
jest.mock('../../models/NotificationAnalytics.js');

describe('EmailTrackingService', () => {
  let emailTrackingService;
  let mockNotification;
  let mockAnalytics;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Initialize service
    emailTrackingService = new EmailTrackingService({
      trackingPixelDomain: 'test.example.com',
      unsubscribeBaseUrl: 'http://test.example.com/api/notifications'
    });

    // Mock notification document
    mockNotification = {
      _id: 'notification123',
      type: 'prescription_created',
      recipients: [{
        userId: 'user123',
        userRole: 'patient',
        deliveryStatus: {
          email: {
            status: 'sent',
            messageId: 'msg123',
            deliveredAt: new Date()
          }
        }
      }],
      analytics: {
        deliveredCount: 1,
        readCount: 0,
        actionCount: 0,
        bounceCount: 0
      },
      save: jest.fn().mockResolvedValue(true)
    };

    // Mock analytics document
    mockAnalytics = {
      date: new Date(),
      channelMetrics: {
        email: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          failed: 0
        }
      },
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalActioned: 0,
      totalFailed: 0,
      save: jest.fn().mockResolvedValue(true)
    };
  });

  describe('generateTrackingPixelUrl', () => {
    it('should generate a valid tracking pixel URL', () => {
      const messageId = 'msg123';
      const userId = 'user123';
      const notificationId = 'notification123';

      const pixelUrl = emailTrackingService.generateTrackingPixelUrl(messageId, userId, notificationId);

      expect(pixelUrl).toMatch(/^https:\/\/test\.example\.com\/api\/notifications\/track\/open\/[a-f0-9]{32}\.png$/);
      expect(emailTrackingService.trackingData.size).toBe(1);
    });

    it('should store tracking data correctly', () => {
      const messageId = 'msg123';
      const userId = 'user123';
      const notificationId = 'notification123';

      emailTrackingService.generateTrackingPixelUrl(messageId, userId, notificationId);

      const trackingData = Array.from(emailTrackingService.trackingData.values())[0];
      expect(trackingData).toMatchObject({
        messageId,
        userId,
        notificationId,
        opened: false,
        openedAt: null,
        clicks: []
      });
    });
  });

  describe('generateTrackableLink', () => {
    it('should generate a valid trackable link', () => {
      const originalUrl = 'https://example.com/action';
      const messageId = 'msg123';
      const userId = 'user123';
      const notificationId = 'notification123';

      const trackableUrl = emailTrackingService.generateTrackableLink(originalUrl, messageId, userId, notificationId);

      expect(trackableUrl).toMatch(/^https:\/\/test\.example\.com\/api\/notifications\/track\/click\/[a-f0-9-]{36}$/);
      expect(emailTrackingService.clickTracking.size).toBe(1);
    });

    it('should store click tracking data correctly', () => {
      const originalUrl = 'https://example.com/action';
      const messageId = 'msg123';
      const userId = 'user123';
      const notificationId = 'notification123';

      emailTrackingService.generateTrackableLink(originalUrl, messageId, userId, notificationId);

      const clickData = Array.from(emailTrackingService.clickTracking.values())[0];
      expect(clickData).toMatchObject({
        originalUrl,
        messageId,
        userId,
        notificationId,
        clicked: false,
        clickedAt: null
      });
    });
  });

  describe('generateUnsubscribeLink', () => {
    it('should generate a valid unsubscribe link', () => {
      const userId = 'user123';
      const notificationType = 'prescription_notifications';

      const unsubscribeUrl = emailTrackingService.generateUnsubscribeLink(userId, notificationType);

      expect(unsubscribeUrl).toMatch(/^http:\/\/test\.example\.com\/api\/notifications\/unsubscribe\/[a-f0-9]{64}$/);
      expect(emailTrackingService.unsubscribeTokens.size).toBe(1);
    });

    it('should store unsubscribe token data correctly', () => {
      const userId = 'user123';
      const notificationType = 'prescription_notifications';

      emailTrackingService.generateUnsubscribeLink(userId, notificationType);

      const tokenData = Array.from(emailTrackingService.unsubscribeTokens.values())[0];
      expect(tokenData).toMatchObject({
        userId,
        notificationType
      });
      expect(tokenData.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('trackEmailOpen', () => {
    it('should track email open successfully', async () => {
      // Setup tracking data
      const trackingId = 'tracking123';
      emailTrackingService.trackingData.set(trackingId, {
        messageId: 'msg123',
        userId: 'user123',
        notificationId: 'notification123',
        opened: false,
        openedAt: null,
        clicks: []
      });

      // Mock notification update
      emailTrackingService.updateNotificationDeliveryStatus = jest.fn().mockResolvedValue(true);
      emailTrackingService.updateAnalytics = jest.fn().mockResolvedValue(true);

      const result = await emailTrackingService.trackEmailOpen(trackingId);

      expect(result.success).toBe(true);
      expect(result.event).toBe('opened');
      expect(emailTrackingService.trackingData.get(trackingId).opened).toBe(true);
      expect(emailTrackingService.trackingData.get(trackingId).openedAt).toBeInstanceOf(Date);
    });

    it('should handle invalid tracking ID', async () => {
      const result = await emailTrackingService.trackEmailOpen('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid tracking ID');
    });

    it('should not track multiple opens for same email', async () => {
      const trackingId = 'tracking123';
      const trackingData = {
        messageId: 'msg123',
        userId: 'user123',
        notificationId: 'notification123',
        opened: true,
        openedAt: new Date(),
        clicks: []
      };
      emailTrackingService.trackingData.set(trackingId, trackingData);

      emailTrackingService.updateNotificationDeliveryStatus = jest.fn();
      emailTrackingService.updateAnalytics = jest.fn();

      const result = await emailTrackingService.trackEmailOpen(trackingId);

      expect(result.success).toBe(true);
      expect(emailTrackingService.updateNotificationDeliveryStatus).not.toHaveBeenCalled();
      expect(emailTrackingService.updateAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('trackEmailClick', () => {
    it('should track email click successfully', async () => {
      const clickId = 'click123';
      const clickData = {
        trackingId: 'tracking123',
        originalUrl: 'https://example.com/action',
        messageId: 'msg123',
        userId: 'user123',
        notificationId: 'notification123',
        clicked: false,
        clickedAt: null
      };
      emailTrackingService.clickTracking.set(clickId, clickData);

      // Setup main tracking data
      emailTrackingService.trackingData.set('tracking123', {
        messageId: 'msg123',
        userId: 'user123',
        notificationId: 'notification123',
        opened: true,
        openedAt: new Date(),
        clicks: []
      });

      emailTrackingService.updateNotificationDeliveryStatus = jest.fn().mockResolvedValue(true);
      emailTrackingService.updateAnalytics = jest.fn().mockResolvedValue(true);

      const result = await emailTrackingService.trackEmailClick(clickId);

      expect(result.success).toBe(true);
      expect(result.event).toBe('clicked');
      expect(result.redirectUrl).toBe('https://example.com/action');
      expect(emailTrackingService.clickTracking.get(clickId).clicked).toBe(true);
    });

    it('should handle invalid click ID', async () => {
      const result = await emailTrackingService.trackEmailClick('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid click ID');
    });
  });

  describe('handleDeliveryWebhook', () => {
    it('should handle SendGrid webhook successfully', async () => {
      const webhookData = [{
        event: 'delivered',
        sg_message_id: 'msg123',
        email: 'test@example.com',
        timestamp: Math.floor(Date.now() / 1000)
      }];

      Notification.findOne.mockResolvedValue(mockNotification);
      emailTrackingService.updateAnalytics = jest.fn().mockResolvedValue(true);

      const result = await emailTrackingService.handleDeliveryWebhook('sendgrid', webhookData);

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('should handle AWS SES webhook successfully', async () => {
      const webhookData = {
        Message: JSON.stringify({
          eventType: 'delivery',
          mail: {
            messageId: 'msg123',
            destination: ['test@example.com'],
            timestamp: new Date().toISOString()
          }
        })
      };

      Notification.findOne.mockResolvedValue(mockNotification);
      emailTrackingService.updateAnalytics = jest.fn().mockResolvedValue(true);

      const result = await emailTrackingService.handleDeliveryWebhook('aws-ses', webhookData);

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });

    it('should handle unknown provider', async () => {
      const result = await emailTrackingService.handleDeliveryWebhook('unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown provider');
    });
  });

  describe('handleEmailBounce', () => {
    it('should handle permanent bounce correctly', async () => {
      const bounceData = {
        messageId: 'msg123',
        email: 'test@example.com',
        bounceType: 'Permanent',
        bounceSubType: 'NoEmail',
        timestamp: new Date(),
        notificationId: 'notification123',
        userId: 'user123'
      };

      emailTrackingService.updateNotificationDeliveryStatus = jest.fn().mockResolvedValue(true);
      emailTrackingService.markEmailAsInvalid = jest.fn().mockResolvedValue(true);
      emailTrackingService.updateAnalytics = jest.fn().mockResolvedValue(true);

      const result = await emailTrackingService.handleEmailBounce(bounceData);

      expect(result.success).toBe(true);
      expect(result.event).toBe('bounced');
      expect(result.permanent).toBe(true);
      expect(emailTrackingService.markEmailAsInvalid).toHaveBeenCalledWith('test@example.com', 'NoEmail');
    });

    it('should handle temporary bounce correctly', async () => {
      const bounceData = {
        messageId: 'msg123',
        email: 'test@example.com',
        bounceType: 'Transient',
        bounceSubType: 'MailboxFull',
        timestamp: new Date(),
        notificationId: 'notification123',
        userId: 'user123'
      };

      emailTrackingService.updateNotificationDeliveryStatus = jest.fn().mockResolvedValue(true);
      emailTrackingService.markEmailAsInvalid = jest.fn().mockResolvedValue(true);
      emailTrackingService.updateAnalytics = jest.fn().mockResolvedValue(true);

      const result = await emailTrackingService.handleEmailBounce(bounceData);

      expect(result.success).toBe(true);
      expect(result.permanent).toBe(false);
      expect(emailTrackingService.markEmailAsInvalid).not.toHaveBeenCalled();
    });
  });

  describe('handleUnsubscribe', () => {
    it('should handle valid unsubscribe token', async () => {
      const token = 'valid-token';
      const unsubscribeData = {
        userId: 'user123',
        notificationType: 'prescription_notifications',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      };
      emailTrackingService.unsubscribeTokens.set(token, unsubscribeData);

      emailTrackingService.updateUserNotificationPreferences = jest.fn().mockResolvedValue(true);
      emailTrackingService.updateAnalytics = jest.fn().mockResolvedValue(true);

      const result = await emailTrackingService.handleUnsubscribe(token);

      expect(result.success).toBe(true);
      expect(result.event).toBe('unsubscribed');
      expect(result.userId).toBe('user123');
      expect(result.notificationType).toBe('prescription_notifications');
      expect(emailTrackingService.unsubscribeTokens.has(token)).toBe(false);
    });

    it('should handle invalid token', async () => {
      const result = await emailTrackingService.handleUnsubscribe('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired unsubscribe token');
    });

    it('should handle expired token', async () => {
      const token = 'expired-token';
      const unsubscribeData = {
        userId: 'user123',
        notificationType: 'prescription_notifications',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      };
      emailTrackingService.unsubscribeTokens.set(token, unsubscribeData);

      const result = await emailTrackingService.handleUnsubscribe(token);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsubscribe token has expired');
      expect(emailTrackingService.unsubscribeTokens.has(token)).toBe(false);
    });
  });

  describe('generateDeliveryReport', () => {
    it('should generate comprehensive delivery report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockAnalyticsData = [
        {
          date: new Date('2024-01-01'),
          channelMetrics: {
            email: {
              sent: 100,
              delivered: 95,
              opened: 50,
              clicked: 10,
              bounced: 3,
              failed: 2
            }
          },
          roleMetrics: {
            patient: { sent: 80, delivered: 76, engagement: 60 },
            doctor: { sent: 20, delivered: 19, engagement: 80 }
          }
        },
        {
          date: new Date('2024-01-02'),
          channelMetrics: {
            email: {
              sent: 120,
              delivered: 115,
              opened: 60,
              clicked: 15,
              bounced: 2,
              failed: 3
            }
          },
          roleMetrics: {
            patient: { sent: 100, delivered: 96, engagement: 65 },
            doctor: { sent: 20, delivered: 19, engagement: 85 }
          }
        }
      ];

      NotificationAnalytics.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockAnalyticsData)
      });

      const report = await emailTrackingService.generateDeliveryReport({
        startDate,
        endDate
      });

      expect(report.summary.totalSent).toBe(220);
      expect(report.summary.totalDelivered).toBe(210);
      expect(report.summary.totalOpened).toBe(110);
      expect(report.summary.totalClicked).toBe(25);
      expect(report.summary.deliveryRate).toBeCloseTo(95.45, 1);
      expect(report.summary.openRate).toBeCloseTo(52.38, 1);
      expect(report.daily).toHaveLength(2);
    });
  });

  describe('getRealtimeStats', () => {
    it('should return real-time statistics', () => {
      // Add some test data
      emailTrackingService.trackingData.set('test1', { messageId: 'msg1' });
      emailTrackingService.clickTracking.set('click1', { originalUrl: 'url1' });
      emailTrackingService.unsubscribeTokens.set('token1', { userId: 'user1' });

      const stats = emailTrackingService.getRealtimeStats();

      expect(stats.tracking.activeTracking).toBe(1);
      expect(stats.tracking.clickTracking).toBe(1);
      expect(stats.tracking.unsubscribeTokens).toBe(1);
      expect(stats.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('parseSendGridWebhook', () => {
    it('should parse SendGrid webhook events correctly', () => {
      const webhookData = [
        {
          event: 'delivered',
          sg_message_id: 'msg123',
          email: 'test@example.com',
          timestamp: 1640995200,
          customArgs: { userId: 'user123' }
        },
        {
          event: 'opened',
          sg_message_id: 'msg124',
          email: 'test2@example.com',
          timestamp: 1640995300,
          useragent: 'Mozilla/5.0',
          ip: '192.168.1.1'
        }
      ];

      const events = emailTrackingService.parseSendGridWebhook(webhookData);

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        provider: 'sendgrid',
        messageId: 'msg123',
        email: 'test@example.com',
        event: 'delivered',
        customArgs: { userId: 'user123' }
      });
      expect(events[1]).toMatchObject({
        provider: 'sendgrid',
        messageId: 'msg124',
        email: 'test2@example.com',
        event: 'opened',
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1'
      });
    });
  });

  describe('parseAWSSESWebhook', () => {
    it('should parse AWS SES webhook events correctly', () => {
      const webhookData = {
        Message: JSON.stringify({
          eventType: 'bounce',
          mail: {
            messageId: 'msg123',
            destination: ['test@example.com'],
            timestamp: '2024-01-01T12:00:00.000Z'
          },
          bounce: {
            bounceSubType: 'NoEmail'
          }
        })
      };

      const events = emailTrackingService.parseAWSSESWebhook(webhookData);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        provider: 'aws-ses',
        messageId: 'msg123',
        email: 'test@example.com',
        event: 'bounced',
        reason: 'NoEmail'
      });
    });
  });

  describe('Event Emission', () => {
    it('should emit events for email tracking actions', async () => {
      const emailOpenedSpy = jest.fn();
      const emailClickedSpy = jest.fn();
      const emailBouncedSpy = jest.fn();
      const emailUnsubscribedSpy = jest.fn();

      emailTrackingService.on('emailOpened', emailOpenedSpy);
      emailTrackingService.on('emailClicked', emailClickedSpy);
      emailTrackingService.on('emailBounced', emailBouncedSpy);
      emailTrackingService.on('emailUnsubscribed', emailUnsubscribedSpy);

      // Test email opened event
      const trackingId = 'tracking123';
      emailTrackingService.trackingData.set(trackingId, {
        messageId: 'msg123',
        userId: 'user123',
        notificationId: 'notification123',
        opened: false,
        openedAt: null,
        clicks: []
      });

      emailTrackingService.updateNotificationDeliveryStatus = jest.fn().mockResolvedValue(true);
      emailTrackingService.updateAnalytics = jest.fn().mockResolvedValue(true);

      await emailTrackingService.trackEmailOpen(trackingId);

      expect(emailOpenedSpy).toHaveBeenCalledWith(expect.objectContaining({
        messageId: 'msg123',
        userId: 'user123',
        notificationId: 'notification123'
      }));
    });
  });
});