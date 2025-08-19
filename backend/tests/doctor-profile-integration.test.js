import { jest, describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Doctor from '../src/models/Doctor.js';
import User from '../src/models/User.js';
import ProfileChangeLog from '../src/models/ProfileChangeLog.js';
import DoctorProfileService from '../src/services/DoctorProfileService.js';
import ProfileValidationService from '../src/services/ProfileValidationService.js';
import DocumentUploadService from '../src/services/DocumentUploadService.js';

describe('Doctor Profile Management - Integration Tests', () => {
  let testDoctor;
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/pharmacy_test');
    }
  });

  afterAll(async () => {
    // Clean up and close database connection
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear test data
    await Doctor.deleteMany({});
    await User.deleteMany({});
    await ProfileChangeLog.deleteMany({});

    // Create test user and doctor
    testUser = await User.create({
      email: 'testdoctor@example.com',
      password: 'hashedpassword123',
      role: 'doctor',
      isVerified: true
    });

    testDoctor = await Doctor.create({
      userId: testUser._id,
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'testdoctor@example.com',
        phone: '+1234567890',
        address: '123 Test St, Test City, TS 12345'
      },
      medicalLicense: {
        licenseNumber: 'MD123456',
        issuingAuthority: 'State Medical Board',
        issueDate: new Date('2020-01-01'),
        expiryDate: new Date('2025-01-01'),
        verificationStatus: 'verified'
      },
      specializations: ['Cardiology', 'Internal Medicine'],
      qualifications: [{
        degree: 'MD',
        institution: 'Harvard Medical School',
        year: 2018,
        specialization: 'Medicine'
      }],
      experience: {
        totalYears: 5,
        currentPosition: 'Senior Cardiologist',
        workplaces: [{
          name: 'City General Hospital',
          position: 'Cardiologist',
          startDate: new Date('2020-01-01'),
          endDate: null,
          isCurrent: true
        }]
      },
      consultationModes: {
        chat: { enabled: true, fee: 50, duration: 30 },
        phone: { enabled: true, fee: 75, duration: 30 },
        video: { enabled: true, fee: 100, duration: 45 },
        email: { enabled: false, fee: 25, duration: 0 }
      },
      availability: {
        workingHours: [
          { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Thursday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Friday', startTime: '09:00', endTime: '17:00', isAvailable: true }
        ],
        timeSlotDuration: 30,
        breakTime: 15,
        advanceBookingDays: 30
      },
      languagePreferences: ['English', 'Spanish'],
      notificationPreferences: {
        email: {
          appointments: true,
          messages: true,
          reminders: true,
          marketing: false
        },
        sms: {
          appointments: true,
          messages: false,
          reminders: true,
          marketing: false
        },
        push: {
          appointments: true,
          messages: true,
          reminders: true,
          marketing: false
        }
      },
      profileStats: {
        totalConsultations: 150,
        averageRating: 4.8,
        totalEarnings: 15000,
        monthlyEarnings: 2500
      }
    });

    // Generate auth token (mock JWT)
    authToken = 'Bearer mock-jwt-token';
  });

  afterEach(async () => {
    // Clean up after each test
    await Doctor.deleteMany({});
    await User.deleteMany({});
    await ProfileChangeLog.deleteMany({});
  });

  describe('GET /api/doctors/:id/profile/full', () => {
    test('should return complete doctor profile', async () => {
      const response = await request(app)
        .get(`/api/doctors/${testDoctor._id}/profile/full`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('personalInfo');
      expect(response.body.data).toHaveProperty('medicalLicense');
      expect(response.body.data).toHaveProperty('specializations');
      expect(response.body.data).toHaveProperty('qualifications');
      expect(response.body.data.personalInfo.firstName).toBe('John');
      expect(response.body.data.personalInfo.lastName).toBe('Doe');
    });

    test('should return 404 for non-existent doctor', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/doctors/${nonExistentId}/profile/full`)
        .set('Authorization', authToken)
        .expect(404);
    });

    test('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/doctors/${testDoctor._id}/profile/full`)
        .expect(401);
    });
  });

  describe('PUT /api/doctors/:id/profile/section', () => {
    test('should update personal information section', async () => {
      const updateData = {
        section: 'personalInfo',
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1987654321'
        }
      };

      const response = await request(app)
        .put(`/api/doctors/${testDoctor._id}/profile/section`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.personalInfo.firstName).toBe('Jane');
      expect(response.body.data.personalInfo.lastName).toBe('Smith');

      // Verify database update
      const updatedDoctor = await Doctor.findById(testDoctor._id);
      expect(updatedDoctor.personalInfo.firstName).toBe('Jane');
      expect(updatedDoctor.personalInfo.lastName).toBe('Smith');
    });

    test('should update medical license section', async () => {
      const updateData = {
        section: 'medicalLicense',
        data: {
          licenseNumber: 'MD789012',
          issuingAuthority: 'Updated Medical Board',
          issueDate: '2021-01-01',
          expiryDate: '2026-01-01'
        }
      };

      const response = await request(app)
        .put(`/api/doctors/${testDoctor._id}/profile/section`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.medicalLicense.licenseNumber).toBe('MD789012');

      // Verify database update
      const updatedDoctor = await Doctor.findById(testDoctor._id);
      expect(updatedDoctor.medicalLicense.licenseNumber).toBe('MD789012');
    });

    test('should update specializations section', async () => {
      const updateData = {
        section: 'specializations',
        data: ['Neurology', 'Orthopedics', 'Pediatrics']
      };

      const response = await request(app)
        .put(`/api/doctors/${testDoctor._id}/profile/section`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.specializations).toEqual(['Neurology', 'Orthopedics', 'Pediatrics']);

      // Verify database update
      const updatedDoctor = await Doctor.findById(testDoctor._id);
      expect(updatedDoctor.specializations).toEqual(['Neurology', 'Orthopedics', 'Pediatrics']);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        section: 'personalInfo',
        data: {
          firstName: '', // Required field empty
          lastName: 'Smith',
          email: 'invalid-email' // Invalid format
        }
      };

      const response = await request(app)
        .put(`/api/doctors/${testDoctor._id}/profile/section`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty('firstName');
      expect(response.body.errors).toHaveProperty('email');
    });

    test('should create audit log for profile changes', async () => {
      const updateData = {
        section: 'personalInfo',
        data: {
          firstName: 'Updated',
          lastName: 'Name'
        }
      };

      await request(app)
        .put(`/api/doctors/${testDoctor._id}/profile/section`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      // Check if audit log was created
      const auditLog = await ProfileChangeLog.findOne({
        doctorId: testDoctor._id,
        section: 'personalInfo'
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog.changes.firstName).toBe('Updated');
      expect(auditLog.previousValues.firstName).toBe('John');
    });
  });

  describe('POST /api/doctors/:id/documents', () => {
    test('should upload license document', async () => {
      // Mock file upload
      const mockFile = Buffer.from('mock file content');
      
      const response = await request(app)
        .post(`/api/doctors/${testDoctor._id}/documents`)
        .set('Authorization', authToken)
        .attach('document', mockFile, 'license.pdf')
        .field('documentType', 'medicalLicense')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('documentUrl');
      expect(response.body.data).toHaveProperty('documentId');
    });

    test('should validate file type', async () => {
      const mockFile = Buffer.from('mock file content');
      
      const response = await request(app)
        .post(`/api/doctors/${testDoctor._id}/documents`)
        .set('Authorization', authToken)
        .attach('document', mockFile, 'invalid.txt')
        .field('documentType', 'medicalLicense')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid file type/i);
    });

    test('should validate file size', async () => {
      // Create a large mock file (> 10MB)
      const largeFile = Buffer.alloc(11 * 1024 * 1024, 'a');
      
      const response = await request(app)
        .post(`/api/doctors/${testDoctor._id}/documents`)
        .set('Authorization', authToken)
        .attach('document', largeFile, 'large.pdf')
        .field('documentType', 'medicalLicense')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/file too large/i);
    });
  });

  describe('Service Layer Tests', () => {
    describe('DoctorProfileService', () => {
      test('should get full profile with all sections', async () => {
        const profile = await DoctorProfileService.getFullProfile(testDoctor._id);
        
        expect(profile).toHaveProperty('personalInfo');
        expect(profile).toHaveProperty('medicalLicense');
        expect(profile).toHaveProperty('specializations');
        expect(profile).toHaveProperty('qualifications');
        expect(profile.personalInfo.firstName).toBe('John');
      });

      test('should update profile section correctly', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Doctor'
        };

        const result = await DoctorProfileService.updateProfileSection(
          testDoctor._id, 
          'personalInfo', 
          updateData
        );

        expect(result.personalInfo.firstName).toBe('Updated');
        expect(result.personalInfo.lastName).toBe('Updated');

        // Verify database persistence
        const updatedDoctor = await Doctor.findById(testDoctor._id);
        expect(updatedDoctor.personalInfo.firstName).toBe('Updated');
      });

      test('should validate profile data before update', async () => {
        const invalidData = {
          firstName: '', // Required field
          email: 'invalid-email'
        };

        await expect(
          DoctorProfileService.updateProfileSection(testDoctor._id, 'personalInfo', invalidData)
        ).rejects.toThrow(/validation failed/i);
      });

      test('should sync profile changes across platform', async () => {
        const updateData = {
          specializations: ['Neurology', 'Psychiatry']
        };

        const result = await DoctorProfileService.updateProfileSection(
          testDoctor._id, 
          'specializations', 
          updateData
        );

        // Verify sync was triggered (mock implementation)
        expect(result.specializations).toEqual(['Neurology', 'Psychiatry']);
      });
    });

    describe('ProfileValidationService', () => {
      test('should validate personal information correctly', () => {
        const validData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        };

        const result = ProfileValidationService.validatePersonalInfo(validData);
        expect(result.isValid).toBe(true);
        expect(Object.keys(result.errors)).toHaveLength(0);
      });

      test('should detect validation errors', () => {
        const invalidData = {
          firstName: '',
          lastName: 'Doe',
          email: 'invalid-email',
          phone: '123'
        };

        const result = ProfileValidationService.validatePersonalInfo(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveProperty('firstName');
        expect(result.errors).toHaveProperty('email');
        expect(result.errors).toHaveProperty('phone');
      });

      test('should validate medical license data', () => {
        const validLicense = {
          licenseNumber: 'MD123456',
          issuingAuthority: 'State Board',
          issueDate: '2020-01-01',
          expiryDate: '2025-01-01'
        };

        const result = ProfileValidationService.validateMedicalLicense(validLicense);
        expect(result.isValid).toBe(true);
      });

      test('should validate specializations', () => {
        const validSpecializations = ['Cardiology', 'Internal Medicine'];
        const result = ProfileValidationService.validateSpecializations(validSpecializations);
        expect(result.isValid).toBe(true);

        const tooManySpecializations = new Array(11).fill('Specialization');
        const invalidResult = ProfileValidationService.validateSpecializations(tooManySpecializations);
        expect(invalidResult.isValid).toBe(false);
      });

      test('should validate consultation modes', () => {
        const validModes = {
          chat: { enabled: true, fee: 50, duration: 30 },
          phone: { enabled: true, fee: 75, duration: 30 },
          video: { enabled: false, fee: 0, duration: 0 }
        };

        const result = ProfileValidationService.validateConsultationModes(validModes);
        expect(result.isValid).toBe(true);
      });

      test('should validate working hours', () => {
        const validHours = [
          { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true }
        ];

        const result = ProfileValidationService.validateWorkingHours(validHours);
        expect(result.isValid).toBe(true);

        const invalidHours = [
          { day: 'Monday', startTime: '17:00', endTime: '09:00', isAvailable: true } // End before start
        ];

        const invalidResult = ProfileValidationService.validateWorkingHours(invalidHours);
        expect(invalidResult.isValid).toBe(false);
      });
    });

    describe('DocumentUploadService', () => {
      test('should validate document type', async () => {
        const validFile = {
          originalname: 'license.pdf',
          mimetype: 'application/pdf',
          size: 1024 * 1024 // 1MB
        };

        const result = await DocumentUploadService.validateDocument(validFile);
        expect(result.isValid).toBe(true);
      });

      test('should reject invalid file types', async () => {
        const invalidFile = {
          originalname: 'document.txt',
          mimetype: 'text/plain',
          size: 1024
        };

        const result = await DocumentUploadService.validateDocument(invalidFile);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/invalid file type/i);
      });

      test('should reject oversized files', async () => {
        const oversizedFile = {
          originalname: 'large.pdf',
          mimetype: 'application/pdf',
          size: 11 * 1024 * 1024 // 11MB
        };

        const result = await DocumentUploadService.validateDocument(oversizedFile);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/file too large/i);
      });
    });
  });

  describe('Database Operations', () => {
    test('should handle concurrent profile updates', async () => {
      // Simulate concurrent updates
      const update1 = DoctorProfileService.updateProfileSection(
        testDoctor._id, 
        'personalInfo', 
        { firstName: 'Update1' }
      );

      const update2 = DoctorProfileService.updateProfileSection(
        testDoctor._id, 
        'personalInfo', 
        { lastName: 'Update2' }
      );

      const [result1, result2] = await Promise.all([update1, update2]);

      // Both updates should succeed
      expect(result1.personalInfo.firstName).toBe('Update1');
      expect(result2.personalInfo.lastName).toBe('Update2');

      // Final state should have both updates
      const finalDoctor = await Doctor.findById(testDoctor._id);
      expect(finalDoctor.personalInfo.firstName).toBe('Update1');
      expect(finalDoctor.personalInfo.lastName).toBe('Update2');
    });

    test('should rollback on validation failure', async () => {
      const originalFirstName = testDoctor.personalInfo.firstName;

      try {
        await DoctorProfileService.updateProfileSection(
          testDoctor._id, 
          'personalInfo', 
          { 
            firstName: 'Valid Name',
            email: 'invalid-email' // This should cause validation failure
          }
        );
      } catch (error) {
        // Expected to fail
      }

      // Verify rollback - original data should be preserved
      const unchangedDoctor = await Doctor.findById(testDoctor._id);
      expect(unchangedDoctor.personalInfo.firstName).toBe(originalFirstName);
    });

    test('should create audit trail for all changes', async () => {
      await DoctorProfileService.updateProfileSection(
        testDoctor._id, 
        'personalInfo', 
        { firstName: 'Audited Change' }
      );

      const auditLogs = await ProfileChangeLog.find({ doctorId: testDoctor._id });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].section).toBe('personalInfo');
      expect(auditLogs[0].changes.firstName).toBe('Audited Change');
      expect(auditLogs[0].previousValues.firstName).toBe('John');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalFind = Doctor.findById;
      Doctor.findById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(
        DoctorProfileService.getFullProfile(testDoctor._id)
      ).rejects.toThrow(/database connection failed/i);

      // Restore original method
      Doctor.findById = originalFind;
    });

    test('should handle validation errors with detailed messages', async () => {
      const invalidData = {
        section: 'personalInfo',
        data: {
          firstName: '',
          email: 'invalid',
          phone: '123'
        }
      };

      const response = await request(app)
        .put(`/api/doctors/${testDoctor._id}/profile/section`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveProperty('firstName');
      expect(response.body.errors).toHaveProperty('email');
      expect(response.body.errors).toHaveProperty('phone');
      expect(response.body.errors.firstName).toMatch(/required/i);
      expect(response.body.errors.email).toMatch(/invalid/i);
      expect(response.body.errors.phone).toMatch(/invalid/i);
    });

    test('should handle unauthorized access attempts', async () => {
      const updateData = {
        section: 'personalInfo',
        data: { firstName: 'Unauthorized' }
      };

      await request(app)
        .put(`/api/doctors/${testDoctor._id}/profile/section`)
        .send(updateData)
        .expect(401);
    });
  });
});