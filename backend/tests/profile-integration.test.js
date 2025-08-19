import request from 'supertest';
import { expect } from 'chai';
import app from '../server.js';
import User from '../src/models/User.js';
import Doctor from '../src/models/Doctor.js';
import jwt from 'jsonwebtoken';

describe('Profile Management Integration Tests', () => {
  let doctorUser;
  let doctorProfile;
  let authToken;

  before(async () => {
    // Create a test doctor user
    doctorUser = await User.create({
      email: 'test.doctor@example.com',
      password: 'testpassword123',
      role: 'doctor',
      profile: {
        firstName: 'Test',
        lastName: 'Doctor',
        phone: '+1234567890'
      },
      emailVerification: {
        isVerified: true
      }
    });

    // Create doctor profile
    doctorProfile = await Doctor.create({
      user: doctorUser._id,
      medicalLicense: {
        licenseNumber: 'TEST123456',
        issuingAuthority: 'Test Medical Board',
        issueDate: new Date('2020-01-01'),
        expiryDate: new Date('2025-12-31'),
        isVerified: true
      },
      specializations: ['General Medicine'],
      qualifications: [{
        degree: 'MD',
        institution: 'Test Medical School',
        year: 2019,
        specialization: 'General Medicine'
      }],
      consultationModes: {
        video: { available: true, fee: 100, duration: 30 },
        chat: { available: true, fee: 50, duration: 30 }
      },
      workingHours: {
        monday: { start: '09:00', end: '17:00', available: true },
        tuesday: { start: '09:00', end: '17:00', available: true }
      },
      bio: 'Test doctor bio for integration testing',
      status: 'verified'
    });

    // Update user with doctor profile reference
    await User.findByIdAndUpdate(doctorUser._id, {
      doctorProfile: doctorProfile._id
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: doctorUser._id, email: doctorUser.email, role: doctorUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    // Cleanup test data
    if (doctorProfile) await Doctor.findByIdAndDelete(doctorProfile._id);
    if (doctorUser) await User.findByIdAndDelete(doctorUser._id);
  });

  describe('Profile Completion Status', () => {
    it('should get profile completion status', async () => {
      const response = await request(app)
        .get(`/api/doctors/${doctorProfile._id}/profile/completion`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('completionPercentage');
      expect(response.body.data).to.have.property('isComplete');
      expect(response.body.data).to.have.property('missingFields');
      expect(response.body.data).to.have.property('recommendations');
      expect(response.body.data.completionPercentage).to.be.a('number');
    });

    it('should track profile progress', async () => {
      const response = await request(app)
        .post(`/api/doctors/${doctorProfile._id}/profile/track-progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.success).to.be.true;
    });
  });

  describe('Profile Section Updates with Integration', () => {
    it('should update specializations and sync with search index', async () => {
      const updateData = {
        section: 'specializations',
        data: ['General Medicine', 'Internal Medicine']
      };

      const response = await request(app)
        .put(`/api/doctors/${doctorProfile._id}/profile/section`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('integrationInfo');
      expect(response.body.data.integrationInfo).to.have.property('searchIndex');
    });

    it('should update consultation modes and sync with booking system', async () => {
      const updateData = {
        section: 'consultation',
        data: {
          video: { available: true, fee: 120, duration: 30 },
          chat: { available: true, fee: 60, duration: 30 },
          phone: { available: true, fee: 80, duration: 30 }
        }
      };

      const response = await request(app)
        .put(`/api/doctors/${doctorProfile._id}/profile/section`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('integrationInfo');
      expect(response.body.data.integrationInfo).to.have.property('bookingSystem');
    });

    it('should update availability and trigger patient notifications', async () => {
      const updateData = {
        section: 'availability',
        data: {
          monday: { start: '08:00', end: '18:00', available: true },
          tuesday: { start: '08:00', end: '18:00', available: true },
          wednesday: { start: '08:00', end: '16:00', available: true }
        }
      };

      const response = await request(app)
        .put(`/api/doctors/${doctorProfile._id}/profile/section`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('integrationInfo');
      expect(response.body.data.integrationInfo).to.have.property('patientNotifications');
    });
  });

  describe('Authorization Integration', () => {
    it('should deny access without authentication', async () => {
      await request(app)
        .get(`/api/doctors/${doctorProfile._id}/profile/completion`)
        .expect(401);
    });

    it('should deny access to other doctor\'s profile', async () => {
      // Create another doctor user
      const otherUser = await User.create({
        email: 'other.doctor@example.com',
        password: 'testpassword123',
        role: 'doctor',
        profile: { firstName: 'Other', lastName: 'Doctor' },
        emailVerification: { isVerified: true }
      });

      const otherToken = jwt.sign(
        { id: otherUser._id, email: otherUser.email, role: otherUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      await request(app)
        .get(`/api/doctors/${doctorProfile._id}/profile/completion`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      // Cleanup
      await User.findByIdAndDelete(otherUser._id);
    });

    it('should allow admin access to any profile', async () => {
      // Create admin user
      const adminUser = await User.create({
        email: 'admin@example.com',
        password: 'adminpassword123',
        role: 'admin',
        profile: { firstName: 'Admin', lastName: 'User' },
        emailVerification: { isVerified: true }
      });

      const adminToken = jwt.sign(
        { id: adminUser._id, email: adminUser.email, role: adminUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/api/doctors/${doctorProfile._id}/profile/completion`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;

      // Cleanup
      await User.findByIdAndDelete(adminUser._id);
    });
  });

  describe('Dashboard Integration', () => {
    it('should provide profile completion data for dashboard', async () => {
      const response = await request(app)
        .get(`/api/doctors/${doctorProfile._id}/profile/completion`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const completionData = response.body.data;
      
      // Verify dashboard-required fields
      expect(completionData).to.have.property('completionPercentage');
      expect(completionData).to.have.property('isComplete');
      expect(completionData).to.have.property('missingFields');
      expect(completionData).to.have.property('recommendations');
      expect(completionData).to.have.property('nextSteps');

      // Verify recommendations have required structure
      if (completionData.recommendations.length > 0) {
        const recommendation = completionData.recommendations[0];
        expect(recommendation).to.have.property('priority');
        expect(recommendation).to.have.property('title');
        expect(recommendation).to.have.property('description');
        expect(recommendation).to.have.property('action');
      }
    });
  });

  describe('Search Integration', () => {
    it('should update search cache when specializations change', async () => {
      const updateData = {
        section: 'specializations',
        data: ['Cardiology', 'Internal Medicine']
      };

      await request(app)
        .put(`/api/doctors/${doctorProfile._id}/profile/section`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Verify doctor profile was updated with search cache
      const updatedDoctor = await Doctor.findById(doctorProfile._id);
      expect(updatedDoctor.searchCache).to.exist;
      expect(updatedDoctor.searchCache.specializations).to.include('Cardiology');
      expect(updatedDoctor.searchCache.specializations).to.include('Internal Medicine');
      expect(updatedDoctor.searchCache.lastUpdated).to.be.a('date');
    });
  });
});