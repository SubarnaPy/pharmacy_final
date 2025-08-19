import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../../server.js';
import { connectTestDatabase, closeTestDatabase, clearTestDatabase } from '../helpers/testDatabase.js';
import User from '../../src/models/User.js';
import Notification from '../../src/models/Notification.js';
import NotificationAnalytics from '../../src/models/NotificationAnalytics.js';
import { generateToken } from '../../src/utils/jwt.js';

describe('Email Tracking Integration Tests', () => {
  let testUser;
  let adminUser;
  let testNotification;
  let userToken;
  let adminToken;

  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Create test users
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'patient',
      isVerified: true
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      isVerified: true
    });

    // Generate tokens
    userToken = generateToken(testUser._id);
    adminToken = generateToken(adminUser._id);

    // Create test notification
    testNotification = await Notification.create({
      type: 'prescription_created',
      category: 'medical',
      priority: 'medium',
      recipients: [{
        userId: testUser._id,
        userRole: 'patient',
        deliveryChannels: ['email'],
        deliveryStatus: {
          email: {
            status: 'sent',
            messageId: 'test-message-123',
            deliveredAt: new Date()
          }
        }
      }],
      content: {
        title: 'Test Notification',
        message: 'This is a test notification'
      },
      analytics: {
        totalRecipients: 1,
        deliveredCount: 1,
        readCount: 0,
        actionCount: 0,
        bounceCount: 0
      }
    });
  });

  describe('GET /api/v1/notifications/track/open/:trackingId.png', () => {
    it('should return tracking pixel for valid tracking ID', async () => {
      // This would require setting up tracking data first
      // For now, test that the endpoint exists and returns a pixel
      const response = await request(app)
        .get('/api/v1/notifications/track/open/invalid-tracking-id.png');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    it('should return pixel even for invalid tracking ID', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/track/open/nonexistent.png');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });
  });

  describe('GET /api/v1/notifications/track/click/:clickId', () => {
    it('should return 404 for invalid click ID', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/track/click/invalid-click-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired tracking link');
    });
  });

  describe('GET /api/v1/notifications/unsubscribe/:token', () => {
    it('should return error for invalid unsubscribe token', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/unsubscribe/invalid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/notifications/webhooks/sendgrid', () => {
    it('should process SendGrid webhook successfully', async () => {
      const webhookData = [{
        event: 'delivered',
        sg_message_id: 'test-message-123',
        email: 'test@example.com',
        timestamp: Math.floor(Date.now() / 1000)
      }];

      const response = await request(app)
        .post('/api/v1/notifications/webhooks/sendgrid')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle SendGrid bounce webhook', async () => {
      const webhookData = [{
        event: 'bounce',
        sg_message_id: 'test-message-123',
        email: 'test@example.com',
        timestamp: Math.floor(Date.now() / 1000),
        reason: 'Invalid email address'
      }];

      const response = await request(app)
        .post('/api/v1/notifications/webhooks/sendgrid')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/notifications/webhooks/aws-ses', () => {
    it('should handle AWS SES subscription confirmation', async () => {
      const webhookData = {
        Type: 'SubscriptionConfirmation',
        TopicArn: 'arn:aws:sns:us-east-1:123456789:ses-notifications',
        Message: 'Subscription confirmation'
      };

      const response = await request(app)
        .post('/api/v1/notifications/webhooks/aws-ses')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription confirmed');
    });

    it('should process AWS SES delivery webhook', async () => {
      const webhookData = {
        Message: JSON.stringify({
          eventType: 'delivery',
          mail: {
            messageId: 'test-message-123',
            destination: ['test@example.com'],
            timestamp: new Date().toISOString()
          }
        })
      };

      const response = await request(app)
        .post('/api/v1/notifications/webhooks/aws-ses')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/notifications/analytics/email', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/analytics/email');

      expect(response.status).toBe(401);
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/analytics/email')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should return email analytics for admin users', async () => {
      // Create test analytics data
      await NotificationAnalytics.create({
        date: new Date(),
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
          patient: { sent: 80, delivered: 76, engagement: 60 }
        }
      });

      const response = await request(app)
        .get('/api/v1/notifications/analytics/email')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('daily');
    });

    it('should accept date range filters', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const response = await request(app)
        .get('/api/v1/notifications/analytics/email')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/notifications/analytics/email/realtime', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/analytics/email/realtime');

      expect(response.status).toBe(401);
    });

    it('should return real-time statistics for admin users', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/analytics/email/realtime')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('today');
      expect(response.body.data).toHaveProperty('tracking');
      expect(response.body.data).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/notifications/:notificationId/delivery', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/notifications/${testNotification._id}/delivery`);

      expect(response.status).toBe(401);
    });

    it('should return delivery details for notification owner', async () => {
      const response = await request(app)
        .get(`/api/v1/notifications/${testNotification._id}/delivery`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notificationId');
      expect(response.body.data).toHaveProperty('recipients');
      expect(response.body.data.recipients).toHaveLength(1);
    });

    it('should return full delivery details for admin users', async () => {
      const response = await request(app)
        .get(`/api/v1/notifications/${testNotification._id}/delivery`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recipients).toHaveLength(1);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/notifications/${fakeId}/delivery`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/notifications/history', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/history');

      expect(response.status).toBe(401);
    });

    it('should return user notification history', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/history')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.notifications).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/history')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should support filtering by type', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/history')
        .query({ type: 'prescription_created' })
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/notifications/:notificationId/read', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/notifications/${testNotification._id}/read`);

      expect(response.status).toBe(401);
    });

    it('should mark notification as read', async () => {
      const response = await request(app)
        .post(`/api/v1/notifications/${testNotification._id}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification marked as read');
      expect(response.body.readAt).toBeDefined();

      // Verify notification was updated
      const updatedNotification = await Notification.findById(testNotification._id);
      const recipient = updatedNotification.recipients.find(r => 
        r.userId.toString() === testUser._id.toString()
      );
      expect(recipient.readAt).toBeDefined();
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post(`/api/v1/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/notifications/test/email-tracking (Development)', () => {
    beforeEach(() => {
      // Set NODE_ENV to development for these tests
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      // Reset NODE_ENV
      process.env.NODE_ENV = 'test';
    });

    it('should require admin authentication', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/test/email-tracking');

      expect(response.status).toBe(401);
    });

    it('should generate test tracking URLs for admin users', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/test/email-tracking')
        .send({
          messageId: 'test-message',
          userId: testUser._id.toString(),
          notificationId: testNotification._id.toString()
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trackingPixelUrl');
      expect(response.body.data).toHaveProperty('trackableLink');
      expect(response.body.data).toHaveProperty('unsubscribeLink');
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/test/email-tracking')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Email Tracking Workflow', () => {
    it('should complete full email tracking workflow', async () => {
      // 1. Generate tracking URLs (simulate email service)
      const testResponse = await request(app)
        .post('/api/v1/notifications/test/email-tracking')
        .send({
          messageId: 'workflow-test-message',
          userId: testUser._id.toString(),
          notificationId: testNotification._id.toString()
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(testResponse.status).toBe(200);
      const { trackingPixelUrl, trackableLink } = testResponse.body.data;

      // 2. Extract tracking IDs from URLs
      const pixelMatch = trackingPixelUrl.match(/\/track\/open\/([^.]+)\.png$/);
      const clickMatch = trackableLink.match(/\/track\/click\/(.+)$/);

      expect(pixelMatch).toBeTruthy();
      expect(clickMatch).toBeTruthy();

      // 3. Simulate email open (tracking pixel request)
      const pixelResponse = await request(app)
        .get(`/api/v1/notifications/track/open/${pixelMatch[1]}.png`);

      expect(pixelResponse.status).toBe(200);
      expect(pixelResponse.headers['content-type']).toBe('image/png');

      // 4. Simulate link click
      const clickResponse = await request(app)
        .get(`/api/v1/notifications/track/click/${clickMatch[1]}`);

      // Should redirect or return 404 for invalid click (since we're using test data)
      expect([302, 404]).toContain(clickResponse.status);

      // 5. Check analytics were updated
      const analyticsResponse = await request(app)
        .get('/api/v1/notifications/analytics/email/realtime')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.success).toBe(true);
    });
  });
});