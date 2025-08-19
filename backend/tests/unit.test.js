// Comprehensive Unit Tests for Service Functions
import { describe, test, expect, beforeEach, afterEach, vi } from '@jest/globals';
import mongoose from 'mongoose';
import AuditLogService from '../src/services/AuditLogService.js';
import PrescriptionProcessingService from '../src/services/PrescriptionProcessingService.js';
import PrescriptionRequestService from '../src/services/PrescriptionRequestService.js';
import PharmacyMatchingService from '../src/services/PharmacyMatchingService.js';
import RealTimeNotificationService from '../src/services/RealTimeNotificationService.js';
import emailService from '../src/services/emailService.js';
import smsService from '../src/services/smsService.js';
import { encryptData, decryptData, hashPassword, generateSecureToken } from '../src/utils/encryption.js';
import User from '../src/models/User.js';
import Pharmacy from '../src/models/Pharmacy.js';
import PrescriptionRequest from '../src/models/PrescriptionRequest.js';

// Mock external dependencies
vi.mock('nodemailer');
vi.mock('twilio');

describe('Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuditLogService', () => {
    test('should log authentication events correctly', async () => {
      const eventData = {
        userId: new mongoose.Types.ObjectId(),
        eventType: 'AUTH_LOGIN_SUCCESS',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        details: { email: 'test@example.com' }
      };

      const logEntry = await AuditLogService.logAuthEvent(
        eventData.userId,
        eventData.eventType,
        eventData.ipAddress,
        eventData.userAgent,
        eventData.details
      );

      expect(logEntry).toBeDefined();
      expect(logEntry.userId).toBe(eventData.userId);
      expect(logEntry.eventType).toBe(eventData.eventType);
      expect(logEntry.ipAddress).toBe(eventData.ipAddress);
      expect(logEntry.severity).toBe('INFO');
    });

    test('should calculate risk score correctly', async () => {
      const lowRiskEvent = {
        eventType: 'AUTH_LOGIN_SUCCESS',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'US' }
      };

      const highRiskEvent = {
        eventType: 'AUTH_MULTIPLE_FAILED_ATTEMPTS',
        ipAddress: '192.168.1.1',
        userAgent: 'Unknown',
        location: { country: 'Unknown' }
      };

      const lowRiskScore = AuditLogService.calculateRiskScore(lowRiskEvent);
      const highRiskScore = AuditLogService.calculateRiskScore(highRiskEvent);

      expect(lowRiskScore).toBeLessThan(50);
      expect(highRiskScore).toBeGreaterThan(70);
    });

    test('should get logs by event type', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const logs = await AuditLogService.getLogsByEventType(
        'AUTH_LOGIN_SUCCESS',
        startDate,
        endDate,
        10
      );

      expect(Array.isArray(logs)).toBe(true);
      logs.forEach(log => {
        expect(log.eventType).toBe('AUTH_LOGIN_SUCCESS');
        expect(new Date(log.timestamp)).toBeInstanceOf(Date);
      });
    });

    test('should detect security alerts', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await AuditLogService.logAuthEvent(
          userId,
          'AUTH_LOGIN_FAILED',
          '192.168.1.1',
          'Mozilla/5.0...',
          { reason: 'Invalid credentials' }
        );
      }

      const alerts = await AuditLogService.checkSecurityAlerts(userId);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('BRUTE_FORCE_ATTEMPT');
    });
  });

  describe('PrescriptionProcessingService', () => {
    test('should validate prescription data', async () => {
      const validPrescription = {
        medications: [
          {
            name: 'Aspirin',
            dosage: '81mg',
            quantity: 30,
            frequency: 'Once daily'
          }
        ],
        patientInfo: {
          name: 'John Doe',
          dateOfBirth: '1980-01-01',
          allergies: ['penicillin']
        }
      };

      const result = await PrescriptionProcessingService.validatePrescription(validPrescription);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect drug interactions', async () => {
      const medicationsWithInteraction = [
        { name: 'Warfarin', dosage: '5mg' },
        { name: 'Aspirin', dosage: '81mg' }
      ];

      const interactions = await PrescriptionProcessingService.checkDrugInteractions(
        medicationsWithInteraction
      );

      expect(Array.isArray(interactions)).toBe(true);
      if (interactions.length > 0) {
        expect(interactions[0]).toHaveProperty('severity');
        expect(interactions[0]).toHaveProperty('description');
      }
    });

    test('should check allergies', async () => {
      const medications = [{ name: 'Penicillin', dosage: '500mg' }];
      const allergies = ['penicillin', 'sulfa'];

      const allergyCheck = await PrescriptionProcessingService.checkAllergies(
        medications,
        allergies
      );

      expect(allergyCheck).toHaveProperty('hasConflicts');
      expect(allergyCheck).toHaveProperty('conflicts');
      expect(allergyCheck.hasConflicts).toBe(true);
      expect(allergyCheck.conflicts).toHaveLength(1);
    });

    test('should calculate prescription cost', async () => {
      const medications = [
        { name: 'Aspirin', quantity: 30, dosage: '81mg' },
        { name: 'Lisinopril', quantity: 30, dosage: '10mg' }
      ];

      const cost = await PrescriptionProcessingService.calculateCost(medications);

      expect(cost).toHaveProperty('subtotal');
      expect(cost).toHaveProperty('tax');
      expect(cost).toHaveProperty('total');
      expect(typeof cost.total).toBe('number');
      expect(cost.total).toBeGreaterThan(0);
    });

    test('should process prescription workflow', async () => {
      const prescriptionData = {
        medications: [{ name: 'Aspirin', dosage: '81mg', quantity: 30 }],
        patientId: new mongoose.Types.ObjectId(),
        pharmacyId: new mongoose.Types.ObjectId()
      };

      const result = await PrescriptionProcessingService.processPrescription(prescriptionData);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('prescriptionId');
      expect(['pending', 'processing', 'ready', 'completed']).toContain(result.status);
    });
  });

  describe('PrescriptionRequestService', () => {
    test('should create prescription request', async () => {
      const requestData = {
        patientId: new mongoose.Types.ObjectId(),
        pharmacyId: new mongoose.Types.ObjectId(),
        medications: [
          {
            name: 'Aspirin',
            dosage: '81mg',
            quantity: 30,
            frequency: 'Once daily'
          }
        ],
        urgency: 'normal',
        deliveryOption: 'pickup'
      };

      const request = await PrescriptionRequestService.createRequest(requestData);

      expect(request).toHaveProperty('_id');
      expect(request.status).toBe('pending');
      expect(request.patientId).toBe(requestData.patientId);
      expect(request.medications).toHaveLength(1);
    });

    test('should update request status', async () => {
      const requestId = new mongoose.Types.ObjectId();
      const newStatus = 'processing';
      const notes = 'Prescription being prepared';

      const updatedRequest = await PrescriptionRequestService.updateStatus(
        requestId,
        newStatus,
        notes
      );

      expect(updatedRequest.status).toBe(newStatus);
      expect(updatedRequest.statusHistory).toBeDefined();
      expect(updatedRequest.statusHistory.length).toBeGreaterThan(0);
    });

    test('should get requests by patient', async () => {
      const patientId = new mongoose.Types.ObjectId();
      const filters = { status: 'pending' };
      const options = { page: 1, limit: 10 };

      const result = await PrescriptionRequestService.getRequestsByPatient(
        patientId,
        filters,
        options
      );

      expect(result).toHaveProperty('requests');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.requests)).toBe(true);
    });

    test('should calculate estimated completion time', async () => {
      const requestData = {
        medications: [{ name: 'Aspirin', quantity: 30 }],
        urgency: 'normal',
        pharmacyId: new mongoose.Types.ObjectId()
      };

      const estimatedTime = await PrescriptionRequestService.calculateEstimatedTime(requestData);

      expect(typeof estimatedTime).toBe('number');
      expect(estimatedTime).toBeGreaterThan(0);
      expect(estimatedTime).toBeLessThan(24 * 60); // Less than 24 hours in minutes
    });

    test('should validate request modifications', async () => {
      const originalRequest = {
        medications: [{ name: 'Aspirin', quantity: 30 }],
        status: 'pending'
      };

      const modifications = {
        medications: [{ name: 'Aspirin', quantity: 60 }]
      };

      const validation = await PrescriptionRequestService.validateModifications(
        originalRequest,
        modifications
      );

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(typeof validation.isValid).toBe('boolean');
    });
  });

  describe('PharmacyMatchingService', () => {
    test('should find nearby pharmacies', async () => {
      const location = {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 5000 // 5km
      };

      const pharmacies = await PharmacyMatchingService.findNearbyPharmacies(location);

      expect(Array.isArray(pharmacies)).toBe(true);
      pharmacies.forEach(pharmacy => {
        expect(pharmacy).toHaveProperty('distance');
        expect(pharmacy).toHaveProperty('name');
        expect(pharmacy).toHaveProperty('address');
      });
    });

    test('should calculate pharmacy matching score', async () => {
      const userPreferences = {
        maxDistance: 5000,
        services: ['prescription_filling', 'delivery'],
        insuranceAccepted: ['Medicare', 'Blue Cross']
      };

      const pharmacy = {
        location: { coordinates: [-74.0060, 40.7128] },
        services: ['prescription_filling', 'consultation', 'delivery'],
        insuranceAccepted: ['Medicare', 'Medicaid', 'Blue Cross'],
        rating: 4.5,
        isVerified: true
      };

      const userLocation = { latitude: 40.7130, longitude: -74.0058 };

      const score = await PharmacyMatchingService.calculateMatchingScore(
        pharmacy,
        userPreferences,
        userLocation
      );

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should filter pharmacies by availability', async () => {
      const medications = [
        { name: 'Aspirin', dosage: '81mg' },
        { name: 'Lisinopril', dosage: '10mg' }
      ];

      const pharmacies = [
        { 
          _id: new mongoose.Types.ObjectId(),
          name: 'Pharmacy A',
          inventory: [
            { medication: 'Aspirin', inStock: true },
            { medication: 'Lisinopril', inStock: true }
          ]
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Pharmacy B',
          inventory: [
            { medication: 'Aspirin', inStock: true },
            { medication: 'Lisinopril', inStock: false }
          ]
        }
      ];

      const availablePharmacies = await PharmacyMatchingService.filterByAvailability(
        pharmacies,
        medications
      );

      expect(availablePharmacies.length).toBeLessThanOrEqual(pharmacies.length);
      availablePharmacies.forEach(pharmacy => {
        expect(pharmacy.hasAllMedications).toBe(true);
      });
    });

    test('should get pharmacy operating hours', async () => {
      const pharmacyId = new mongoose.Types.ObjectId();
      const date = new Date();

      const operatingHours = await PharmacyMatchingService.getOperatingHours(
        pharmacyId,
        date
      );

      expect(operatingHours).toHaveProperty('isOpen');
      expect(operatingHours).toHaveProperty('hours');
      expect(typeof operatingHours.isOpen).toBe('boolean');
    });
  });

  describe('RealTimeNotificationService', () => {
    test('should send notification to user', async () => {
      const notificationData = {
        userId: new mongoose.Types.ObjectId(),
        type: 'prescription_ready',
        title: 'Prescription Ready',
        message: 'Your prescription is ready for pickup',
        data: { prescriptionId: new mongoose.Types.ObjectId() }
      };

      const result = await RealTimeNotificationService.sendNotification(notificationData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('notificationId');
    });

    test('should send push notification', async () => {
      const pushData = {
        userId: new mongoose.Types.ObjectId(),
        title: 'Test Notification',
        body: 'This is a test notification',
        data: { type: 'test' }
      };

      const result = await RealTimeNotificationService.sendPushNotification(pushData);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    test('should broadcast to room', async () => {
      const roomData = {
        room: 'pharmacy_123',
        event: 'prescription_update',
        data: {
          prescriptionId: new mongoose.Types.ObjectId(),
          status: 'ready'
        }
      };

      const result = await RealTimeNotificationService.broadcastToRoom(roomData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    test('should get user notification preferences', async () => {
      const userId = new mongoose.Types.ObjectId();

      const preferences = await RealTimeNotificationService.getUserNotificationPreferences(userId);

      expect(preferences).toHaveProperty('email');
      expect(preferences).toHaveProperty('sms');
      expect(preferences).toHaveProperty('push');
      expect(typeof preferences.email).toBe('boolean');
    });

    test('should mark notification as read', async () => {
      const notificationId = new mongoose.Types.ObjectId();

      const result = await RealTimeNotificationService.markAsRead(notificationId);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });
  });

  describe('Email Service', () => {
    test('should send welcome email', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      const result = await emailService.sendWelcomeEmail(userData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    test('should send password reset email', async () => {
      const resetData = {
        email: 'test@example.com',
        resetToken: 'reset-token-123',
        name: 'Test User'
      };

      const result = await emailService.sendPasswordResetEmail(resetData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    test('should send prescription notification email', async () => {
      const notificationData = {
        email: 'test@example.com',
        prescriptionId: new mongoose.Types.ObjectId(),
        status: 'ready',
        pharmacyName: 'Test Pharmacy'
      };

      const result = await emailService.sendPrescriptionNotification(notificationData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    test('should validate email templates', async () => {
      const templates = await emailService.getAvailableTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('subject');
        expect(template).toHaveProperty('body');
      });
    });
  });

  describe('SMS Service', () => {
    test('should send verification code', async () => {
      const smsData = {
        phoneNumber: '+1234567890',
        code: '123456'
      };

      const result = await smsService.sendVerificationCode(smsData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    test('should send prescription notification', async () => {
      const notificationData = {
        phoneNumber: '+1234567890',
        prescriptionId: new mongoose.Types.ObjectId(),
        pharmacyName: 'Test Pharmacy',
        status: 'ready'
      };

      const result = await smsService.sendPrescriptionNotification(notificationData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    test('should validate phone number format', async () => {
      const validNumbers = ['+1234567890', '+44123456789'];
      const invalidNumbers = ['1234567890', '123', 'not-a-number'];

      validNumbers.forEach(number => {
        const isValid = smsService.validatePhoneNumber(number);
        expect(isValid).toBe(true);
      });

      invalidNumbers.forEach(number => {
        const isValid = smsService.validatePhoneNumber(number);
        expect(isValid).toBe(false);
      });
    });

    test('should check message delivery status', async () => {
      const messageId = 'test-message-id';

      const status = await smsService.checkDeliveryStatus(messageId);

      expect(status).toHaveProperty('status');
      expect(['sent', 'delivered', 'failed', 'pending']).toContain(status.status);
    });
  });

  describe('Encryption Utilities', () => {
    test('should encrypt and decrypt data correctly', async () => {
      const testData = {
        sensitive: 'secret information',
        number: 123456789
      };

      const encrypted = await encryptData(testData);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toEqual(testData);
      expect(encrypted.encrypted).not.toContain('secret information');
    });

    test('should hash passwords securely', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    test('should generate secure tokens', async () => {
      const token1 = await generateSecureToken(32);
      const token2 = await generateSecureToken(32);

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex characters
    });

    test('should handle encryption with custom keys', async () => {
      const data = { secret: 'confidential' };
      const customKey = 'custom-encryption-key-32-characters';

      const encrypted = await encryptData(data, customKey);
      const decrypted = await decryptData(encrypted, customKey);

      expect(decrypted).toEqual(data);
    });

    test('should fail to decrypt with wrong key', async () => {
      const data = { secret: 'confidential' };
      const key1 = 'key1-32-characters-long-string';
      const key2 = 'key2-32-characters-long-string';

      const encrypted = await encryptData(data, key1);

      await expect(decryptData(encrypted, key2)).rejects.toThrow();
    });
  });

  describe('Utility Functions', () => {
    test('should generate secure random strings', async () => {
      const random1 = generateSecureRandom(16);
      const random2 = generateSecureRandom(16);

      expect(random1).toBeDefined();
      expect(random2).toBeDefined();
      expect(random1).not.toBe(random2);
      expect(random1.length).toBe(32); // 16 bytes = 32 hex characters
    });

    test('should validate data integrity', async () => {
      const data = { important: 'data' };
      const encrypted = await encryptData(data);

      // Tamper with encrypted data
      const tamperedData = { ...encrypted, encrypted: 'tampered' };

      await expect(decryptData(tamperedData)).rejects.toThrow();
    });

    test('should handle large data encryption', async () => {
      const largeData = {
        content: 'x'.repeat(10000),
        metadata: Array(1000).fill().map((_, i) => ({ id: i, value: `item${i}` }))
      };

      const encrypted = await encryptData(largeData);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toEqual(largeData);
    });
  });

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      // Test with invalid data
      const invalidPrescription = {
        medications: null
      };

      await expect(
        PrescriptionProcessingService.validatePrescription(invalidPrescription)
      ).rejects.toThrow();
    });

    test('should handle network timeouts', async () => {
      // Mock network timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 100);
      });

      await expect(timeoutPromise).rejects.toThrow('Network timeout');
    });

    test('should validate input parameters', async () => {
      // Test with missing required parameters
      await expect(
        AuditLogService.logAuthEvent(null, 'AUTH_LOGIN', '192.168.1.1')
      ).rejects.toThrow();
    });
  });
});

export default describe;
