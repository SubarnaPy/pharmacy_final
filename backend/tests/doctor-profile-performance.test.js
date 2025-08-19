import { jest, describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Doctor from '../src/models/Doctor.js';
import User from '../src/models/User.js';
import ProfileChangeLog from '../src/models/ProfileChangeLog.js';
import DoctorProfileService from '../src/services/DoctorProfileService.js';

describe('Doctor Profile Management - Performance Tests', () => {
  let testDoctors = [];
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

    // Create test data for performance testing
    await createTestData();
    
    // Generate auth token (mock JWT)
    authToken = 'Bearer mock-jwt-token';
  });

  afterEach(async () => {
    // Clean up after each test
    await Doctor.deleteMany({});
    await User.deleteMany({});
    await ProfileChangeLog.deleteMany({});
    testDoctors = [];
  });

  async function createTestData() {
    const doctorPromises = [];
    
    // Create 100 test doctors for performance testing
    for (let i = 0; i < 100; i++) {
      const user = new User({
        email: `testdoctor${i}@example.com`,
        password: 'hashedpassword123',
        role: 'doctor',
        isVerified: true
      });

      const doctor = new Doctor({
        userId: user._id,
        personalInfo: {
          firstName: `Doctor${i}`,
          lastName: `Test${i}`,
          email: `testdoctor${i}@example.com`,
          phone: `+123456789${i.toString().padStart(2, '0')}`,
          address: `${i} Test St, Test City, TS 12345`
        },
        medicalLicense: {
          licenseNumber: `MD${i.toString().padStart(6, '0')}`,
          issuingAuthority: 'State Medical Board',
          issueDate: new Date('2020-01-01'),
          expiryDate: new Date('2025-01-01'),
          verificationStatus: 'verified'
        },
        specializations: ['Cardiology', 'Internal Medicine', 'Neurology'].slice(0, (i % 3) + 1),
        qualifications: [{
          degree: 'MD',
          institution: `Medical School ${i}`,
          year: 2018,
          specialization: 'Medicine'
        }],
        experience: {
          totalYears: 5 + (i % 10),
          currentPosition: `Position ${i}`,
          bio: `Bio for doctor ${i}. `.repeat(50), // ~500 characters
          workplaces: [{
            name: `Hospital ${i}`,
            position: `Doctor ${i}`,
            startDate: new Date('2020-01-01'),
            endDate: null,
            isCurrent: true
          }]
        },
        consultationModes: {
          chat: { enabled: true, fee: 50 + (i % 50), duration: 30 },
          phone: { enabled: true, fee: 75 + (i % 25), duration: 30 },
          video: { enabled: true, fee: 100 + (i % 100), duration: 45 },
          email: { enabled: i % 2 === 0, fee: 25, duration: 0 }
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
        languagePreferences: ['English', 'Spanish', 'French'].slice(0, (i % 3) + 1),
        notificationPreferences: {
          email: {
            appointments: true,
            messages: true,
            reminders: true,
            marketing: i % 2 === 0
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
          totalConsultations: 100 + (i * 10),
          averageRating: 4.0 + (i % 10) / 10,
          totalEarnings: 10000 + (i * 1000),
          monthlyEarnings: 2000 + (i * 100)
        }
      });

      doctorPromises.push(
        user.save().then(() => doctor.save())
      );
    }

    testDoctors = await Promise.all(doctorPromises);
  }

  describe('Profile Loading Performance', () => {
    test('should load single doctor profile within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/doctors/${testDoctors[0]._id}/profile/full`)
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
      
      console.log(`Single profile load time: ${responseTime}ms`);
    });

    test('should handle concurrent profile loads efficiently', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();
      
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        request(app)
          .get(`/api/doctors/${testDoctors[i]._id}/profile/full`)
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(1000); // Average under 1 second
      
      console.log(`Concurrent loads (${concurrentRequests}): Total ${totalTime}ms, Average ${averageTime}ms`);
    });

    test('should efficiently load profiles with large datasets', async () => {
      // Create a doctor with extensive data
      const largeDoctor = await Doctor.create({
        userId: new mongoose.Types.ObjectId(),
        personalInfo: {
          firstName: 'Large',
          lastName: 'Dataset',
          email: 'large@example.com',
          phone: '+1234567890',
          address: 'Large address with lots of details and information'
        },
        specializations: new Array(10).fill().map((_, i) => `Specialization ${i}`),
        qualifications: new Array(20).fill().map((_, i) => ({
          degree: `Degree ${i}`,
          institution: `Institution ${i}`,
          year: 2000 + i,
          specialization: `Spec ${i}`
        })),
        experience: {
          bio: 'Very long bio. '.repeat(1000), // ~15KB bio
          workplaces: new Array(50).fill().map((_, i) => ({
            name: `Workplace ${i}`,
            position: `Position ${i}`,
            startDate: new Date(2000 + i, 0, 1),
            endDate: new Date(2001 + i, 0, 1),
            isCurrent: false
          }))
        }
      });

      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/doctors/${largeDoctor._id}/profile/full`)
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should handle large data within 1 second
      
      console.log(`Large dataset load time: ${responseTime}ms`);
    });
  });

  describe('Profile Update Performance', () => {
    test('should update profile sections within acceptable time', async () => {
      const updateData = {
        section: 'personalInfo',
        data: {
          firstName: 'Updated',
          lastName: 'Name',
          email: 'updated@example.com',
          phone: '+1987654321'
        }
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .put(`/api/doctors/${testDoctors[0]._id}/profile/section`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should update within 1 second
      
      console.log(`Profile update time: ${responseTime}ms`);
    });

    test('should handle concurrent profile updates efficiently', async () => {
      const concurrentUpdates = 10;
      const startTime = Date.now();
      
      const requests = Array.from({ length: concurrentUpdates }, (_, i) => 
        request(app)
          .put(`/api/doctors/${testDoctors[i]._id}/profile/section`)
          .set('Authorization', authToken)
          .send({
            section: 'personalInfo',
            data: {
              firstName: `Updated${i}`,
              lastName: `Concurrent${i}`
            }
          })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentUpdates;

      // All updates should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Average update time should be reasonable
      expect(averageTime).toBeLessThan(2000); // Average under 2 seconds
      
      console.log(`Concurrent updates (${concurrentUpdates}): Total ${totalTime}ms, Average ${averageTime}ms`);
    });

    test('should efficiently update large profile sections', async () => {
      const largeUpdateData = {
        section: 'experience',
        data: {
          bio: 'Very large bio update. '.repeat(2000), // ~30KB bio
          workplaces: new Array(100).fill().map((_, i) => ({
            name: `Updated Workplace ${i}`,
            position: `Updated Position ${i}`,
            startDate: new Date(2000 + i, 0, 1),
            endDate: new Date(2001 + i, 0, 1),
            isCurrent: false
          }))
        }
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .put(`/api/doctors/${testDoctors[0]._id}/profile/section`)
        .set('Authorization', authToken)
        .send(largeUpdateData)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(2000); // Should handle large updates within 2 seconds
      
      console.log(`Large update time: ${responseTime}ms`);
    });
  });

  describe('Database Performance', () => {
    test('should efficiently query profiles with indexes', async () => {
      const startTime = Date.now();
      
      // Query by email (should use index)
      const profileByEmail = await Doctor.findOne({ 
        'personalInfo.email': 'testdoctor0@example.com' 
      });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(profileByEmail).toBeTruthy();
      expect(queryTime).toBeLessThan(100); // Should be very fast with proper indexing
      
      console.log(`Indexed query time: ${queryTime}ms`);
    });

    test('should efficiently query profiles by specializations', async () => {
      const startTime = Date.now();
      
      // Query by specialization (should use index)
      const cardiologists = await Doctor.find({ 
        specializations: 'Cardiology' 
      }).limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(cardiologists.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(200); // Should be fast with proper indexing
      
      console.log(`Specialization query time: ${queryTime}ms`);
    });

    test('should efficiently handle bulk profile updates', async () => {
      const startTime = Date.now();
      
      // Bulk update multiple profiles
      const bulkOps = testDoctors.slice(0, 50).map(doctor => ({
        updateOne: {
          filter: { _id: doctor._id },
          update: { 
            $set: { 
              'personalInfo.firstName': 'BulkUpdated',
              'profileStats.lastUpdated': new Date()
            }
          }
        }
      }));

      await Doctor.bulkWrite(bulkOps);
      
      const endTime = Date.now();
      const bulkUpdateTime = endTime - startTime;

      expect(bulkUpdateTime).toBeLessThan(1000); // Bulk update should be efficient
      
      console.log(`Bulk update time (50 profiles): ${bulkUpdateTime}ms`);
    });
  });

  describe('Service Layer Performance', () => {
    test('should efficiently validate profile data', async () => {
      const profileData = {
        personalInfo: {
          firstName: 'Performance',
          lastName: 'Test',
          email: 'performance@example.com',
          phone: '+1234567890'
        },
        medicalLicense: {
          licenseNumber: 'MD999999',
          issuingAuthority: 'Test Board',
          issueDate: '2020-01-01',
          expiryDate: '2025-01-01'
        },
        specializations: ['Cardiology', 'Internal Medicine'],
        qualifications: new Array(10).fill().map((_, i) => ({
          degree: `Degree ${i}`,
          institution: `Institution ${i}`,
          year: 2010 + i
        }))
      };

      const startTime = Date.now();
      
      const validationResult = await DoctorProfileService.validateProfileData(profileData);
      
      const endTime = Date.now();
      const validationTime = endTime - startTime;

      expect(validationResult.isValid).toBe(true);
      expect(validationTime).toBeLessThan(100); // Validation should be very fast
      
      console.log(`Profile validation time: ${validationTime}ms`);
    });

    test('should efficiently sync profile changes', async () => {
      const changes = {
        personalInfo: {
          firstName: 'Synced',
          lastName: 'Profile'
        },
        specializations: ['Updated Specialization']
      };

      const startTime = Date.now();
      
      await DoctorProfileService.syncProfileChanges(testDoctors[0]._id, changes);
      
      const endTime = Date.now();
      const syncTime = endTime - startTime;

      expect(syncTime).toBeLessThan(500); // Sync should be reasonably fast
      
      console.log(`Profile sync time: ${syncTime}ms`);
    });
  });

  describe('Memory Usage Performance', () => {
    test('should not cause memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many profile operations
      for (let i = 0; i < 100; i++) {
        await DoctorProfileService.getFullProfile(testDoctors[i % testDoctors.length]._id);
        
        if (i % 10 === 0) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(2)}%)`);
    });

    test('should efficiently handle large result sets', async () => {
      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Load all profiles at once
      const allProfiles = await Doctor.find({}).limit(100);
      
      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;
      
      const queryTime = endTime - startTime;
      const memoryUsed = finalMemory - initialMemory;

      expect(allProfiles.length).toBe(100);
      expect(queryTime).toBeLessThan(2000); // Should load within 2 seconds
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // Should use less than 50MB
      
      console.log(`Large result set: ${queryTime}ms, ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Stress Testing', () => {
    test('should handle high load profile requests', async () => {
      const highLoadRequests = 100;
      const batchSize = 10;
      const batches = Math.ceil(highLoadRequests / batchSize);
      
      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;

      for (let batch = 0; batch < batches; batch++) {
        const batchRequests = Array.from({ length: batchSize }, (_, i) => {
          const doctorIndex = (batch * batchSize + i) % testDoctors.length;
          return request(app)
            .get(`/api/doctors/${testDoctors[doctorIndex]._id}/profile/full`)
            .set('Authorization', authToken)
            .then(response => {
              if (response.status === 200) {
                successCount++;
              } else {
                errorCount++;
              }
              return response;
            })
            .catch(() => {
              errorCount++;
            });
        });

        await Promise.all(batchRequests);
        
        // Small delay between batches to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / highLoadRequests;
      const successRate = (successCount / highLoadRequests) * 100;

      expect(successRate).toBeGreaterThan(95); // At least 95% success rate
      expect(averageTime).toBeLessThan(2000); // Average response time under 2 seconds
      
      console.log(`High load test: ${successCount}/${highLoadRequests} success (${successRate.toFixed(2)}%), Average: ${averageTime.toFixed(2)}ms`);
    });

    test('should maintain performance under sustained load', async () => {
      const sustainedDuration = 30000; // 30 seconds
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      
      let requestCount = 0;
      let successCount = 0;
      let errorCount = 0;
      let responseTimes = [];

      const makeRequest = async () => {
        const doctorIndex = requestCount % testDoctors.length;
        const requestStart = Date.now();
        
        try {
          const response = await request(app)
            .get(`/api/doctors/${testDoctors[doctorIndex]._id}/profile/full`)
            .set('Authorization', authToken);
          
          const requestEnd = Date.now();
          const responseTime = requestEnd - requestStart;
          responseTimes.push(responseTime);
          
          if (response.status === 200) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
        
        requestCount++;
      };

      // Run sustained load test
      const interval = setInterval(makeRequest, requestInterval);
      
      await new Promise(resolve => setTimeout(resolve, sustainedDuration));
      clearInterval(interval);

      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const successRate = (successCount / requestCount) * 100;

      expect(successRate).toBeGreaterThan(90); // At least 90% success rate under sustained load
      expect(averageResponseTime).toBeLessThan(3000); // Average response time under 3 seconds
      
      console.log(`Sustained load test (${actualDuration}ms): ${requestCount} requests, ${successRate.toFixed(2)}% success, ${averageResponseTime.toFixed(2)}ms avg`);
    });
  });
});