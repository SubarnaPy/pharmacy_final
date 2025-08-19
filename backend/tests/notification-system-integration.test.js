/**
 * Integration and End-to-End Tests for Advanced Notification System
 * Tests controller integration, multi-channel delivery, and failure scenarios
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';

// Import server components
import { createServer } from '../server.js';
import EnhancedNotificationService from '../src/services/notifications/EnhancedNotificationService.js';
import NotificationMiddleware from '../src/middleware/NotificationMiddleware.js';

// Import controllers for integration testing
import authController from '../src/controllers/authController.js';
import DoctorController from '../src/controllers/DoctorController.js';
import PrescriptionController from '../src/controllers/PrescriptionController.js';
import OrderController from '../src/controllers/OrderController.js';
import NotificationController from '../src/controllers/NotificationController.js';

// Import models
import User from '../src/models/User.js';
import Doctor from '../src/models/Doctor.js';
import Pharmacy from '../src/models/Pharmacy.js';
import Prescription from '../src/models/Prescription.js';
import Order from '../src/models/Order.js';
import Notification from '../src/models/Notification.js';
import NotificationTemplate from '../src/models/NotificationTemplate.js';
import UserNotificationPreferences from '../src/models/UserNotificationPreferences.js';

describe('Advanced Notification System - Integration Tests', () => {
  let app;
  let server;
  let notificationService;
  let testPatient;
  let testDoctor;
  let testPharmacy;
  let testAdmin;
  let authTokens = {};

  beforeAll(async () => {
    // Create test server
    app = await createServer();
    server = app.listen(0); // Use random port for testing
    
    // Initialize notification service
    notificationService = new EnhancedNotificationService({
      webSocketService: global.mockServices?.webSocket,
      emailService: global.mockEmailService,
      smsService: global.mockSMSService
    });

    // Create test users
    await createTestUsers();
    await createTestTemplates();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Reset mock functions
    jest.clearAllMocks();
    global.mockEmailService.sendEmail.mockClear();
    global.mockSMSService.sendSMS.mockClear();
  });

  afterEach(async () => {
    // Clean up any test-specific data
    await Notification.deleteMany({ 
      'content.title': { $regex: /test/i } 
    });
  });

  async function createTestUsers() {
    // Create test patient
    testPatient = new User({
      name: 'Test Patient',
      email: 'patient@test.com',
      password: 'TestPassword123!',
      role: 'patient',
      phone: '+1234567890',
      isActive: true
    });
    await testPatient.save();

    // Create test doctor
    testDoctor = new User({
      name: 'Dr. Test Doctor',
      email: 'doctor@test.com',
      password: 'TestPassword123!',
      role: 'doctor',
      phone: '+1234567891',
      isActive: true
    });
    await testDoctor.save();

    // Create doctor profile
    const doctorProfile = new Doctor({
      userId: testDoctor._id,
      specialization: ['General Medicine'],
      licenseNumber: 'TEST123456',
      experience: 5,
      qualifications: ['MD'],
      consultationFee: 100,
      availability: {
        monday: { available: true, slots: ['09:00-17:00'] },
        tuesday: { available: true, slots: ['09:00-17:00'] }
      }
    });
    await doctorProfile.save();

    // Create test pharmacy
    testPharmacy = new User({
      name: 'Test Pharmacy',
      email: 'pharmacy@test.com',
      password: 'TestPassword123!',
      role: 'pharmacy',
      phone: '+1234567892',
      isActive: true
    });
    await testPharmacy.save();

    // Create pharmacy profile
    const pharmacyProfile = new Pharmacy({
      userId: testPharmacy._id,
      licenseNumber: 'PHARM123456',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        coordinates: [-74.0060, 40.7128]
      },
      operatingHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' }
      }
    });
    await pharmacyProfile.save();

    // Create test admin
    testAdmin = new User({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'TestPassword123!',
      role: 'admin',
      phone: '+1234567893',
      isActive: true
    });
    await testAdmin.save();

    // Generate auth tokens
    authTokens.patient = testPatient.generateAuthToken();
    authTokens.doctor = testDoctor.generateAuthToken();
    authTokens.pharmacy = testPharmacy.generateAuthToken();
    authTokens.admin = testAdmin.generateAuthToken();
  }

  async function createTestTemplates() {
    const templates = [
      {
        name: 'User Registration Template',
        type: 'user_registered',
        category: 'administrative',
        variants: [
          {
            channel: 'email',
            userRole: 'patient',
            language: 'en',
            subject: 'Welcome to Our Healthcare Platform',
            title: 'Welcome {{name}}!',
            body: 'Thank you for registering with our healthcare platform.',
            htmlBody: '<h1>Welcome {{name}}!</h1><p>Thank you for registering with our healthcare platform.</p>'
          },
          {
            channel: 'websocket',
            userRole: 'patient',
            language: 'en',
            title: 'Registration Successful',
            body: 'Your account has been created successfully.'
          }
        ]
      },
      {
        name: 'Prescription Created Template',
        type: 'prescription_created',
        category: 'medical',
        variants: [
          {
            channel: 'email',
            userRole: 'patient',
            language: 'en',
            subject: 'New Prescription Available',
            title: 'Prescription Ready',
            body: 'Your prescription for {{medication}} has been created.',
            htmlBody: '<h1>Prescription Ready</h1><p>Your prescription for {{medication}} has been created.</p>'
          },
          {
            channel: 'websocket',
            userRole: 'pharmacy',
            language: 'en',
            title: 'New Prescription Request',
            body: 'New prescription request from {{patientName}} for {{medication}}.'
          }
        ]
      },
      {
        name: 'Order Status Template',
        type: 'order_status_changed',
        category: 'administrative',
        variants: [
          {
            channel: 'email',
            userRole: 'patient',
            language: 'en',
            subject: 'Order Status Update',
            title: 'Order {{orderNumber}} Update',
            body: 'Your order status has been updated to {{status}}.',
            htmlBody: '<h1>Order Update</h1><p>Your order {{orderNumber}} status: {{status}}</p>'
          },
          {
            channel: 'sms',
            userRole: 'patient',
            language: 'en',
            title: 'Order Update',
            body: 'Order {{orderNumber}} is now {{status}}.'
          }
        ]
      }
    ];

    for (const templateData of templates) {
      const template = new NotificationTemplate(templateData);
      await template.save();
    }
  }

  async function cleanupTestData() {
    await User.deleteMany({ email: /@test\.com$/ });
    await Doctor.deleteMany({});
    await Pharmacy.deleteMany({});
    await Prescription.deleteMany({});
    await Order.deleteMany({});
    await Notification.deleteMany({});
    await NotificationTemplate.deleteMany({});
    await UserNotificationPreferences.deleteMany({});
  }

  describe('Controller Integration Tests', () => {
    describe('User Registration Notifications', () => {
      test('should trigger notification on user registration', async () => {
        const userData = {
          name: 'New Test User',
          email: 'newuser@test.com',
          password: 'TestPassword123!',
          role: 'patient',
          phone: '+1234567894'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);

        // Wait for notification processing
        await global.testUtils.waitFor(1000);

        // Check if notification was created
        const notifications = await Notification.find({
          type: 'user_registered',
          'recipients.userId': response.body.user._id
        });

        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[0].content.title).toContain('Welcome');
      });

      test('should send welcome email on registration', async () => {
        const userData = {
          name: 'Email Test User',
          email: 'emailtest@test.com',
          password: 'TestPassword123!',
          role: 'patient',
          phone: '+1234567895'
        };

        await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        // Wait for email processing
        await global.testUtils.waitFor(1500);

        // Verify email was sent
        expect(global.mockEmailService.sendEmail).toHaveBeenCalled();
        const emailCall = global.mockEmailService.sendEmail.mock.calls[0][0];
        expect(emailCall.subject).toContain('Welcome');
        expect(emailCall.to).toBe('emailtest@test.com');
      });
    });

    describe('Prescription Notifications', () => {
      test('should notify patient and pharmacy on prescription creation', async () => {
        const prescriptionData = {
          patientId: testPatient._id,
          doctorId: testDoctor._id,
          medications: [{
            name: 'Test Medication',
            dosage: '10mg',
            quantity: 30,
            frequency: 'Once daily',
            duration: '30 days'
          }],
          notes: 'Test prescription for integration testing'
        };

        const response = await request(app)
          .post('/api/prescriptions')
          .set('Authorization', `Bearer ${authTokens.doctor}`)
          .send(prescriptionData)
          .expect(201);

        expect(response.body.success).toBe(true);

        // Wait for notification processing
        await global.testUtils.waitFor(1000);

        // Check patient notification
        const patientNotifications = await Notification.find({
          type: 'prescription_created',
          'recipients.userId': testPatient._id
        });

        expect(patientNotifications.length).toBeGreaterThan(0);

        // Check pharmacy notifications (should be sent to all pharmacies)
        const pharmacyNotifications = await Notification.find({
          type: 'prescription_created',
          'recipients.userRole': 'pharmacy'
        });

        expect(pharmacyNotifications.length).toBeGreaterThan(0);
      });

      test('should handle prescription status updates', async () => {
        // First create a prescription
        const prescription = new Prescription({
          patientId: testPatient._id,
          doctorId: testDoctor._id,
          medications: [{
            name: 'Status Test Medication',
            dosage: '5mg',
            quantity: 15,
            frequency: 'Twice daily'
          }],
          status: 'pending'
        });
        await prescription.save();

        // Update prescription status
        const response = await request(app)
          .put(`/api/prescriptions/${prescription._id}/status`)
          .set('Authorization', `Bearer ${authTokens.pharmacy}`)
          .send({ status: 'filled', pharmacyId: testPharmacy._id })
          .expect(200);

        expect(response.body.success).toBe(true);

        // Wait for notification processing
        await global.testUtils.waitFor(1000);

        // Check status update notification
        const statusNotifications = await Notification.find({
          type: 'prescription_status_changed',
          'recipients.userId': testPatient._id
        });

        expect(statusNotifications.length).toBeGreaterThan(0);
      });
    });

    describe('Order Notifications', () => {
      test('should notify on order creation', async () => {
        const orderData = {
          patientId: testPatient._id,
          pharmacyId: testPharmacy._id,
          items: [{
            name: 'Test Medication',
            quantity: 1,
            price: 25.99
          }],
          totalAmount: 25.99,
          deliveryAddress: {
            street: '456 Test Ave',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345'
          }
        };

        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${authTokens.patient}`)
          .send(orderData)
          .expect(201);

        expect(response.body.success).toBe(true);

        // Wait for notification processing
        await global.testUtils.waitFor(1000);

        // Check order confirmation notification
        const orderNotifications = await Notification.find({
          type: 'order_created',
          'recipients.userId': testPatient._id
        });

        expect(orderNotifications.length).toBeGreaterThan(0);
      });

      test('should notify on order status changes', async () => {
        // Create an order first
        const order = new Order({
          patientId: testPatient._id,
          pharmacyId: testPharmacy._id,
          items: [{
            name: 'Status Test Item',
            quantity: 1,
            price: 15.99
          }],
          totalAmount: 15.99,
          status: 'pending'
        });
        await order.save();

        // Update order status
        const response = await request(app)
          .put(`/api/orders/${order._id}/status`)
          .set('Authorization', `Bearer ${authTokens.pharmacy}`)
          .send({ status: 'processing' })
          .expect(200);

        expect(response.body.success).toBe(true);

        // Wait for notification processing
        await global.testUtils.waitFor(1000);

        // Check status update notification
        const statusNotifications = await Notification.find({
          type: 'order_status_changed',
          'recipients.userId': testPatient._id
        });

        expect(statusNotifications.length).toBeGreaterThan(0);
      });
    });

    describe('Doctor Profile Notifications', () => {
      test('should notify patients on doctor profile updates', async () => {
        const updateData = {
          consultationFee: 120,
          availability: {
            monday: { available: true, slots: ['10:00-16:00'] },
            tuesday: { available: false, slots: [] }
          }
        };

        const response = await request(app)
          .put('/api/doctors/profile')
          .set('Authorization', `Bearer ${authTokens.doctor}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Wait for notification processing
        await global.testUtils.waitFor(1000);

        // Check profile update notifications
        const profileNotifications = await Notification.find({
          type: 'doctor_profile_updated'
        });

        expect(profileNotifications.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Multi-Channel Delivery Tests', () => {
    test('should deliver notifications through multiple channels', async () => {
      // Set user preferences for multi-channel delivery
      const preferences = new UserNotificationPreferences({
        userId: testPatient._id,
        globalSettings: { enabled: true },
        channels: {
          websocket: { enabled: true },
          email: { enabled: true },
          sms: { enabled: true }
        },
        notificationTypes: {
          test_multi_channel: { enabled: true, channels: ['websocket', 'email', 'sms'] }
        }
      });
      await preferences.save();

      // Send multi-channel notification
      const notification = await notificationService.sendNotification(
        testPatient._id.toString(),
        'test_multi_channel',
        { testData: 'multi-channel' },
        {
          title: 'Multi-Channel Test',
          message: 'This should be delivered via multiple channels',
          userRole: 'patient',
          channels: ['websocket', 'email', 'sms']
        }
      );

      expect(notification).toBeDefined();

      // Wait for delivery processing
      await global.testUtils.waitFor(2000);

      // Verify delivery through different channels
      const savedNotification = await Notification.findById(notification._id);
      expect(savedNotification.recipients[0].deliveryChannels).toContain('websocket');
      expect(savedNotification.recipients[0].deliveryChannels).toContain('email');
      expect(savedNotification.recipients[0].deliveryChannels).toContain('sms');
    });

    test('should respect user channel preferences', async () => {
      // Set user preferences to disable email
      const preferences = new UserNotificationPreferences({
        userId: testPatient._id,
        globalSettings: { enabled: true },
        channels: {
          websocket: { enabled: true },
          email: { enabled: false },
          sms: { enabled: true }
        }
      });
      await preferences.save();

      // Send notification
      await notificationService.sendNotification(
        testPatient._id.toString(),
        'test_preference_respect',
        { testData: 'preferences' },
        {
          title: 'Preference Test',
          message: 'This should respect user preferences',
          userRole: 'patient',
          channels: ['websocket', 'email', 'sms']
        }
      );

      // Wait for processing
      await global.testUtils.waitFor(1000);

      // Email should not be sent due to user preferences
      expect(global.mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    test('should override preferences for critical notifications', async () => {
      // Set user preferences to disable all channels
      const preferences = new UserNotificationPreferences({
        userId: testPatient._id,
        globalSettings: { enabled: false },
        channels: {
          websocket: { enabled: false },
          email: { enabled: false },
          sms: { enabled: false }
        }
      });
      await preferences.save();

      // Send critical notification
      await notificationService.sendNotification(
        testPatient._id.toString(),
        'emergency_alert',
        { emergency: 'critical situation' },
        {
          title: 'Emergency Alert',
          message: 'This is a critical emergency notification',
          userRole: 'patient',
          priority: 'critical',
          channels: ['websocket', 'email', 'sms']
        }
      );

      // Wait for processing
      await global.testUtils.waitFor(1000);

      // Critical notifications should override user preferences
      // At least one channel should be attempted
      const notifications = await Notification.find({
        type: 'emergency_alert',
        'recipients.userId': testPatient._id
      });

      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('Failure Scenario and Recovery Tests', () => {
    test('should handle email service failures with fallback', async () => {
      // Mock email service to fail
      global.mockEmailService.sendEmail.mockRejectedValueOnce(
        new Error('Email service unavailable')
      );

      // Send notification with email and SMS channels
      await notificationService.sendNotification(
        testPatient._id.toString(),
        'test_email_failure',
        { testData: 'email-failure' },
        {
          title: 'Email Failure Test',
          message: 'Testing email failure fallback',
          userRole: 'patient',
          channels: ['email', 'sms']
        }
      );

      // Wait for processing and fallback
      await global.testUtils.waitFor(2000);

      // Email should have failed, but SMS should succeed
      expect(global.mockEmailService.sendEmail).toHaveBeenCalled();
      expect(global.mockSMSService.sendSMS).toHaveBeenCalled();
    });

    test('should handle SMS service failures with fallback', async () => {
      // Mock SMS service to fail
      global.mockSMSService.sendSMS.mockRejectedValueOnce(
        new Error('SMS service unavailable')
      );

      // Send notification with SMS and email channels
      await notificationService.sendNotification(
        testPatient._id.toString(),
        'test_sms_failure',
        { testData: 'sms-failure' },
        {
          title: 'SMS Failure Test',
          message: 'Testing SMS failure fallback',
          userRole: 'patient',
          channels: ['sms', 'email']
        }
      );

      // Wait for processing and fallback
      await global.testUtils.waitFor(2000);

      // SMS should have failed, but email should succeed
      expect(global.mockSMSService.sendSMS).toHaveBeenCalled();
      expect(global.mockEmailService.sendEmail).toHaveBeenCalled();
    });

    test('should retry failed notifications', async () => {
      // Mock service to fail first time, succeed second time
      global.mockEmailService.sendEmail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          success: true,
          messageId: 'retry-success-id',
          provider: 'test'
        });

      // Send notification
      const notification = await notificationService.sendNotification(
        testPatient._id.toString(),
        'test_retry',
        { testData: 'retry-test' },
        {
          title: 'Retry Test',
          message: 'Testing retry mechanism',
          userRole: 'patient',
          channels: ['email']
        }
      );

      // Wait for initial attempt and retry
      await global.testUtils.waitFor(3000);

      // Email service should have been called multiple times
      expect(global.mockEmailService.sendEmail.mock.calls.length).toBeGreaterThan(1);
    });

    test('should handle database connection failures gracefully', async () => {
      // Temporarily close database connection
      await mongoose.connection.close();

      // Attempt to send notification
      let error;
      try {
        await notificationService.sendNotification(
          testPatient._id.toString(),
          'test_db_failure',
          { testData: 'db-failure' },
          {
            title: 'DB Failure Test',
            message: 'Testing database failure handling',
            userRole: 'patient'
          }
        );
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();

      // Reconnect database
      await mongoose.connect(process.env.MONGODB_URI);
    });

    test('should handle template not found scenarios', async () => {
      // Send notification with non-existent template type
      const notification = await notificationService.sendNotification(
        testPatient._id.toString(),
        'non_existent_template',
        { testData: 'no-template' },
        {
          title: 'No Template Test',
          message: 'Testing missing template handling',
          userRole: 'patient',
          channels: ['websocket']
        }
      );

      expect(notification).toBeDefined();
      
      // Should still create notification even without template
      expect(notification.content.title).toBe('No Template Test');
    });
  });

  describe('Performance and Load Tests', () => {
    test('should handle bulk notification sending', async () => {
      const startTime = Date.now();
      
      // Create multiple recipients
      const recipients = [];
      for (let i = 0; i < 50; i++) {
        recipients.push({
          userId: new mongoose.Types.ObjectId().toString(),
          userRole: 'patient',
          deliveryChannels: ['websocket']
        });
      }

      // Send bulk notification
      const notification = await notificationService.sendBulkNotification(
        recipients,
        'bulk_test',
        { testData: 'bulk-performance' },
        {
          title: 'Bulk Performance Test',
          message: 'Testing bulk notification performance'
        }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(notification).toBeDefined();
      expect(notification.recipients).toHaveLength(50);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent notification requests', async () => {
      const concurrentRequests = [];
      
      // Create 10 concurrent notification requests
      for (let i = 0; i < 10; i++) {
        const request = notificationService.sendNotification(
          testPatient._id.toString(),
          `concurrent_test_${i}`,
          { testData: `concurrent-${i}` },
          {
            title: `Concurrent Test ${i}`,
            message: `Testing concurrent request ${i}`,
            userRole: 'patient',
            channels: ['websocket']
          }
        );
        concurrentRequests.push(request);
      }

      // Wait for all requests to complete
      const results = await Promise.allSettled(concurrentRequests);

      // All requests should succeed
      const successfulRequests = results.filter(r => r.status === 'fulfilled');
      expect(successfulRequests).toHaveLength(10);
    });
  });

  describe('Notification API Endpoints', () => {
    test('should get user notifications', async () => {
      // Create a notification for the test patient
      await notificationService.sendNotification(
        testPatient._id.toString(),
        'api_test',
        { testData: 'api-test' },
        {
          title: 'API Test Notification',
          message: 'Testing notification API',
          userRole: 'patient'
        }
      );

      // Wait for notification to be created
      await global.testUtils.waitFor(1000);

      // Get notifications via API
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.notifications).toBeDefined();
      expect(response.body.notifications.length).toBeGreaterThan(0);
    });

    test('should mark notification as read', async () => {
      // Create a notification
      const notification = await notificationService.sendNotification(
        testPatient._id.toString(),
        'read_test',
        { testData: 'read-test' },
        {
          title: 'Read Test Notification',
          message: 'Testing notification read functionality',
          userRole: 'patient'
        }
      );

      // Wait for notification to be created
      await global.testUtils.waitFor(1000);

      // Mark as read via API
      const response = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${authTokens.patient}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify notification is marked as read
      const updatedNotification = await Notification.findById(notification._id);
      const recipient = updatedNotification.recipients.find(
        r => r.userId.toString() === testPatient._id.toString()
      );
      expect(recipient.readAt).toBeDefined();
    });

    test('should get notification statistics for admin', async () => {
      // Send some test notifications
      await notificationService.sendNotification(
        testPatient._id.toString(),
        'stats_test_1',
        {},
        { title: 'Stats Test 1', userRole: 'patient' }
      );

      await notificationService.sendNotification(
        testDoctor._id.toString(),
        'stats_test_2',
        {},
        { title: 'Stats Test 2', userRole: 'doctor' }
      );

      // Wait for notifications to be processed
      await global.testUtils.waitFor(1000);

      // Get statistics via admin API
      const response = await request(app)
        .get('/api/admin/notifications/stats')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalNotifications).toBeGreaterThan(0);
    });
  });

  describe('Real-time Notification Tests', () => {
    test('should deliver real-time notifications via WebSocket', async () => {
      // Mock WebSocket service to track calls
      const mockWebSocketSend = jest.fn();
      global.mockServices = {
        webSocket: {
          sendNotificationToUser: mockWebSocketSend,
          isUserConnected: jest.fn().mockReturnValue(true)
        }
      };

      // Create notification service with mocked WebSocket
      const realtimeNotificationService = new EnhancedNotificationService({
        webSocketService: global.mockServices.webSocket,
        emailService: global.mockEmailService,
        smsService: global.mockSMSService
      });

      // Send real-time notification
      await realtimeNotificationService.sendNotification(
        testPatient._id.toString(),
        'realtime_test',
        { urgent: true },
        {
          title: 'Real-time Test',
          message: 'Testing real-time delivery',
          userRole: 'patient',
          channels: ['websocket']
        }
      );

      // Wait for processing
      await global.testUtils.waitFor(1000);

      // Verify WebSocket was called
      expect(mockWebSocketSend).toHaveBeenCalled();
      const callArgs = mockWebSocketSend.mock.calls[0];
      expect(callArgs[0]).toBe(testPatient._id.toString());
      expect(callArgs[1]).toMatchObject({
        type: 'realtime_test',
        title: 'Real-time Test'
      });
    });

    test('should queue notifications for offline users', async () => {
      // Mock WebSocket service to indicate user is offline
      global.mockServices = {
        webSocket: {
          sendNotificationToUser: jest.fn(),
          isUserConnected: jest.fn().mockReturnValue(false)
        }
      };

      const offlineNotificationService = new EnhancedNotificationService({
        webSocketService: global.mockServices.webSocket,
        emailService: global.mockEmailService,
        smsService: global.mockSMSService
      });

      // Send notification to offline user
      const notification = await offlineNotificationService.sendNotification(
        testPatient._id.toString(),
        'offline_test',
        { queued: true },
        {
          title: 'Offline Test',
          message: 'Testing offline user notification',
          userRole: 'patient',
          channels: ['websocket']
        }
      );

      expect(notification).toBeDefined();
      
      // Notification should be created but queued for later delivery
      expect(notification.recipients[0].deliveryStatus.websocket.status).toBe('pending');
    });
  });
});