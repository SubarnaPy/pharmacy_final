// Comprehensive API Integration Tests
import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import app from '../server.js';
import User from '../src/models/User.js';
import Pharmacy from '../src/models/Pharmacy.js';
import PrescriptionRequest from '../src/models/PrescriptionRequest.js';
import { hashPassword } from '../src/utils/encryption.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('API Integration Tests', () => {
  let testUser, testPharmacy, testAdmin;
  let userToken, pharmacyToken, adminToken;
  let testPrescriptionRequest;

  beforeAll(async () => {
    // Create test users
    testUser = await User.create({
      name: 'Test Patient',
      email: 'patient@test.com',
      password: await hashPassword('TestPassword123!'),
      role: 'patient',
      isActive: true,
      location: {
        type: 'Point',
        coordinates: [-73.935242, 40.730610] // NYC coordinates
      }
    });

    testPharmacy = await User.create({
      name: 'Test Pharmacy',
      email: 'pharmacy@test.com',
      password: await hashPassword('PharmacyPassword123!'),
      role: 'pharmacy',
      isActive: true,
      location: {
        type: 'Point',
        coordinates: [-73.936242, 40.731610]
      }
    });

    testAdmin = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: await hashPassword('AdminPassword123!'),
      role: 'admin',
      isActive: true
    });

    // Generate tokens
    userToken = jwt.sign(
      { id: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    pharmacyToken = jwt.sign(
      { id: testPharmacy._id, email: testPharmacy.email, role: testPharmacy.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    adminToken = jwt.sign(
      { id: testAdmin._id, email: testAdmin.email, role: testAdmin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create pharmacy profile
    await Pharmacy.create({
      userId: testPharmacy._id,
      name: 'Test Pharmacy',
      licenseNumber: 'TEST123456',
      phone: '+1234567890',
      address: {
        street: '123 Test St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        coordinates: [-73.936242, 40.731610]
      },
      operatingHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '10:00', close: '16:00' },
        sunday: { closed: true }
      },
      services: ['prescription_filling', 'consultation', 'delivery'],
      isVerified: true
    });
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ 
      email: { $in: ['patient@test.com', 'pharmacy@test.com', 'admin@test.com'] } 
    });
    await Pharmacy.deleteMany({ userId: testPharmacy._id });
    await PrescriptionRequest.deleteMany({ patientId: testUser._id });
    await mongoose.connection.close();
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/v1/auth/register - should register new user', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'NewPassword123!',
        role: 'patient'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();

      // Cleanup
      await User.deleteOne({ email: userData.email });
    });

    test('POST /api/v1/auth/login - should login user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    test('POST /api/v1/auth/logout - should logout user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('logged out');
    });

    test('POST /api/v1/auth/forgot-password - should send reset email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset link');
    });
  });

  describe('User Management Endpoints', () => {
    test('GET /api/v1/users/profile - should get user profile', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    test('PUT /api/v1/users/profile - should update user profile', async () => {
      const updateData = {
        name: 'Updated Test Patient',
        phone: '+1987654321'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.phone).toBe(updateData.phone);
    });

    test('POST /api/v1/users/change-password - should change password', async () => {
      const passwordData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewTestPassword123!',
        confirmPassword: 'NewTestPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password changed');

      // Change it back for other tests
      await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'NewTestPassword123!',
          newPassword: 'TestPassword123!',
          confirmPassword: 'TestPassword123!'
        });
    });
  });

  describe('Pharmacy Discovery Endpoints', () => {
    test('GET /api/v1/pharmacies/discover - should discover nearby pharmacies', async () => {
      const response = await request(app)
        .get('/api/v1/pharmacies/discover')
        .query({
          latitude: 40.730610,
          longitude: -73.935242,
          radius: 5000
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('GET /api/v1/pharmacies/:id - should get pharmacy details', async () => {
      const pharmacy = await Pharmacy.findOne({ userId: testPharmacy._id });
      
      const response = await request(app)
        .get(`/api/v1/pharmacies/${pharmacy._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Pharmacy');
    });

    test('GET /api/v1/pharmacies/search - should search pharmacies', async () => {
      const response = await request(app)
        .get('/api/v1/pharmacies/search')
        .query({
          query: 'Test Pharmacy',
          location: '40.730610,-73.935242'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Prescription Request Endpoints', () => {
    test('POST /api/v1/prescription-requests - should create prescription request', async () => {
      const requestData = {
        pharmacyId: (await Pharmacy.findOne({ userId: testPharmacy._id }))._id,
        medications: [
          {
            name: 'Aspirin',
            dosage: '81mg',
            quantity: 30,
            frequency: 'Once daily',
            duration: '30 days'
          }
        ],
        notes: 'Test prescription request',
        urgency: 'normal',
        deliveryOption: 'pickup'
      };

      const response = await request(app)
        .post('/api/v1/prescription-requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patientId).toBe(testUser._id.toString());
      expect(response.body.data.status).toBe('pending');

      testPrescriptionRequest = response.body.data;
    });

    test('GET /api/v1/prescription-requests - should get user prescription requests', async () => {
      const response = await request(app)
        .get('/api/v1/prescription-requests')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('GET /api/v1/prescription-requests/:id - should get specific request', async () => {
      const response = await request(app)
        .get(`/api/v1/prescription-requests/${testPrescriptionRequest._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testPrescriptionRequest._id);
    });

    test('PUT /api/v1/prescription-requests/:id/cancel - should cancel request', async () => {
      const response = await request(app)
        .put(`/api/v1/prescription-requests/${testPrescriptionRequest._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });
  });

  describe('Pharmacy Management Endpoints', () => {
    test('GET /api/v1/pharmacies/dashboard - should get pharmacy dashboard', async () => {
      const response = await request(app)
        .get('/api/v1/pharmacies/dashboard')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('GET /api/v1/pharmacies/requests - should get pharmacy requests', async () => {
      const response = await request(app)
        .get('/api/v1/pharmacies/requests')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('PUT /api/v1/pharmacies/profile - should update pharmacy profile', async () => {
      const updateData = {
        phone: '+1555123456',
        services: ['prescription_filling', 'consultation', 'delivery', 'compounding']
      };

      const response = await request(app)
        .put('/api/v1/pharmacies/profile')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe(updateData.phone);
      expect(response.body.data.services).toEqual(updateData.services);
    });
  });

  describe('Admin Endpoints', () => {
    test('GET /api/v1/admin/users - should get all users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/admin/pharmacies - should get all pharmacies', async () => {
      const response = await request(app)
        .get('/api/v1/admin/pharmacies')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('PUT /api/v1/admin/users/:id/status - should update user status', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/users/${testUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);

      // Reactivate for other tests
      await request(app)
        .put(`/api/v1/admin/users/${testUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });
    });

    test('GET /api/v1/admin/analytics - should get analytics data', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('File Upload Endpoints', () => {
    test('POST /api/v1/files/upload - should upload file', async () => {
      const testFile = Buffer.from('test file content');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', testFile, 'test.txt')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBeDefined();
    });

    test('POST /api/v1/prescriptions/upload - should upload prescription', async () => {
      const testPrescription = Buffer.from('prescription content');
      
      const response = await request(app)
        .post('/api/v1/prescriptions/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('prescription', testPrescription, 'prescription.pdf')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.prescriptionId).toBeDefined();
    });
  });

  describe('Real-time Features', () => {
    test('GET /api/v1/notifications - should get user notifications', async () => {
      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('PUT /api/v1/notifications/:id/read - should mark notification as read', async () => {
      // First create a notification by making a prescription request
      const requestData = {
        pharmacyId: (await Pharmacy.findOne({ userId: testPharmacy._id }))._id,
        medications: [{ name: 'Test Med', dosage: '10mg', quantity: 10 }],
        urgency: 'normal'
      };

      await request(app)
        .post('/api/v1/prescription-requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send(requestData);

      // Get notifications
      const notificationsResponse = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      if (notificationsResponse.body.data.length > 0) {
        const notificationId = notificationsResponse.body.data[0]._id;
        
        const response = await request(app)
          .put(`/api/v1/notifications/${notificationId}/read`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid request data', async () => {
      const response = await request(app)
        .post('/api/v1/prescription-requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          medications: [] // Invalid empty array
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    test('should handle resource not found', async () => {
      const response = await request(app)
        .get('/api/v1/prescription-requests/000000000000000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('Pagination and Filtering', () => {
    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/prescription-requests')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    test('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/v1/prescription-requests')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(request => {
        expect(request.status).toBe('pending');
      });
    });

    test('should support date range filtering', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/v1/prescription-requests')
        .query({
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString()
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});

export default describe;
