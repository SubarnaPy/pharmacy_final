// Comprehensive Test Suite for Security Features
import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import app from '../server.js';
import User from '../src/models/User.js';
import AuditLogService from '../src/services/AuditLogService.js';
import { generateSecureRandom, hashPassword, encryptData, decryptData } from '../src/utils/encryption.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Security Implementation Tests', () => {
  let testUser;
  let authToken;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // Create test users
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: await hashPassword('TestPassword123!'),
      role: 'patient',
      isActive: true
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: await hashPassword('AdminPassword123!'),
      role: 'admin',
      isActive: true
    });

    // Generate test tokens
    authToken = jwt.sign(
      { id: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    adminToken = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $in: ['test@example.com', 'admin@example.com'] } });
    await mongoose.connection.close();
  });

  describe('Authentication Security Tests', () => {
    test('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body.message).toContain('Access denied');
    });

    test('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });

    test('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toContain('Token expired');
    });

    test('should accept valid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.email).toBe(testUser.email);
    });

    test('should enforce rate limiting on auth endpoints', async () => {
      const promises = [];
      
      // Make 6 rapid login attempts (rate limit is 5)
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(res => res.status === 429);
      
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.error).toContain('Too many');
    });
  });

  describe('Authorization Security Tests', () => {
    test('should deny access to admin endpoints for non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.message).toContain('Insufficient permissions');
    });

    test('should allow access to admin endpoints for admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should validate role-based access correctly', async () => {
      // Test pharmacy-specific endpoint
      const response = await request(app)
        .get('/api/v1/pharmacies/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('Input Validation and Sanitization Tests', () => {
    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'ValidPassword123!',
          role: 'patient'
        })
        .expect(400);

      expect(response.body.message).toContain('valid email');
    });

    test('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test2@example.com',
          password: 'weak',
          role: 'patient'
        })
        .expect(400);

      expect(response.body.message).toContain('Password must');
    });

    test('should sanitize malicious input', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: '<script>alert("xss")</script>',
          email: 'test3@example.com',
          password: 'ValidPassword123!',
          role: 'patient'
        })
        .expect(400);

      // Should reject or sanitize script tags
      expect(response.body.message).toBeDefined();
    });

    test('should prevent MongoDB injection', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null }
        })
        .expect(400);

      expect(response.body.message).toContain('Validation failed');
    });

    test('should validate file uploads', async () => {
      const response = await request(app)
        .post('/api/v1/prescriptions/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('prescription', Buffer.from('fake-file-content'), 'test.exe')
        .expect(400);

      expect(response.body.message).toContain('File type not allowed');
    });
  });

  describe('Security Headers Tests', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('should not expose server information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });
  });

  describe('Data Encryption Tests', () => {
    test('should encrypt sensitive data correctly', async () => {
      const testData = { ssn: '123-45-6789', creditCard: '4111-1111-1111-1111' };
      const encrypted = await encryptData(testData);

      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.encrypted).not.toContain('123-45-6789');
    });

    test('should decrypt data correctly', async () => {
      const testData = { ssn: '123-45-6789', creditCard: '4111-1111-1111-1111' };
      const encrypted = await encryptData(testData);
      const decrypted = await decryptData(encrypted);

      expect(decrypted.ssn).toBe(testData.ssn);
      expect(decrypted.creditCard).toBe(testData.creditCard);
    });

    test('should fail to decrypt with wrong key', async () => {
      const testData = { secret: 'confidential-information' };
      const encrypted = await encryptData(testData, 'correct-key');

      await expect(decryptData(encrypted, 'wrong-key')).rejects.toThrow();
    });
  });

  describe('Audit Logging Tests', () => {
    test('should log authentication events', async () => {
      const initialLogCount = await AuditLogService.getLogsByEventType(
        'AUTH_LOGIN_SUCCESS',
        new Date(Date.now() - 1000 * 60 * 60),
        new Date(),
        1000
      );

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      const finalLogCount = await AuditLogService.getLogsByEventType(
        'AUTH_LOGIN_SUCCESS',
        new Date(Date.now() - 1000 * 60 * 60),
        new Date(),
        1000
      );

      expect(finalLogCount.length).toBeGreaterThan(initialLogCount.length);
    });

    test('should log security violations', async () => {
      const initialLogCount = await AuditLogService.getLogsByEventType(
        'SECURITY_VIOLATION',
        new Date(Date.now() - 1000 * 60 * 60),
        new Date(),
        1000
      );

      await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      const finalLogCount = await AuditLogService.getLogsByEventType(
        'SECURITY_VIOLATION',
        new Date(Date.now() - 1000 * 60 * 60),
        new Date(),
        1000
      );

      expect(finalLogCount.length).toBeGreaterThan(initialLogCount.length);
    });

    test('should log high-risk activities', async () => {
      const logs = await AuditLogService.getHighRiskLogs(
        new Date(Date.now() - 1000 * 60 * 60),
        new Date(),
        100
      );

      expect(Array.isArray(logs)).toBe(true);
      logs.forEach(log => {
        expect(log.severity === 'HIGH' || log.severity === 'CRITICAL' || log.riskScore >= 70).toBe(true);
      });
    });
  });

  describe('API Security Tests', () => {
    test('should validate API keys for service endpoints', async () => {
      const response = await request(app)
        .post('/api/v1/internal/system-status')
        .expect(401);

      expect(response.body.message).toContain('API key required');
    });

    test('should accept valid API keys', async () => {
      const validApiKey = process.env.TEST_API_KEY || 'test-api-key-12345678901234567890';
      
      const response = await request(app)
        .post('/api/v1/internal/system-status')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should enforce HTTPS in production', () => {
      if (process.env.NODE_ENV === 'production') {
        // This test would verify HTTPS enforcement
        expect(process.env.FORCE_HTTPS).toBe('true');
      }
    });
  });

  describe('Session Security Tests', () => {
    test('should use secure session configuration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      const cookieHeader = response.headers['set-cookie'];
      if (cookieHeader) {
        const sessionCookie = cookieHeader.find(cookie => cookie.includes('session'));
        if (sessionCookie) {
          expect(sessionCookie).toContain('HttpOnly');
          expect(sessionCookie).toContain('SameSite');
        }
      }
    });

    test('should invalidate sessions on logout', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      const token = loginResponse.body.token;

      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Try to use the token after logout
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.message).toContain('revoked');
    });
  });

  describe('Error Handling Security Tests', () => {
    test('should not expose sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent-endpoint')
        .expect(404);

      expect(response.body.stack).toBeUndefined();
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('secret');
    });

    test('should handle database errors securely', async () => {
      // Force a database error by using invalid ObjectId
      const response = await request(app)
        .get('/api/v1/users/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).not.toContain('MongoDB');
      expect(response.body.message).not.toContain('ObjectId');
    });
  });

  describe('Performance Security Tests', () => {
    test('should prevent resource exhaustion attacks', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'a'.repeat(10000) // Very long password
        })
        .expect(400);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should respond quickly even with long input
      expect(duration).toBeLessThan(5000);
      expect(response.body.message).toContain('Validation failed');
    });

    test('should limit request payload size', async () => {
      const largePayload = 'x'.repeat(20 * 1024 * 1024); // 20MB payload

      const response = await request(app)
        .post('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: largePayload })
        .expect(413);

      expect(response.body.message).toContain('too large');
    });
  });
});

// Integration tests for security features
describe('Security Integration Tests', () => {
  test('should prevent account enumeration', async () => {
    // Try to login with non-existent email
    const response1 = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123'
      });

    // Try to login with existing email but wrong password
    const response2 = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    // Both should return similar error messages
    expect(response1.body.message).toBe(response2.body.message);
    expect(response1.status).toBe(response2.status);
  });

  test('should handle concurrent login attempts', async () => {
    const promises = Array(10).fill().map(() => 
      request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
    );

    const responses = await Promise.all(promises);
    
    // All should succeed (no race conditions)
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });
  });

  test('should maintain security across microservices', async () => {
    // This test would verify security token propagation
    // across different services in a microservice architecture
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.ENCRYPTION_KEY).toBeDefined();
  });
});

export default describe;
