// Test Setup and Configuration
import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs/promises';
import path from 'path';

let mongoServer;

// Global test setup
beforeAll(async () => {
  // Start in-memory MongoDB instance for testing
  mongoServer = await MongoMemoryServer.create({
    instance: {
      port: 27018,
      dbName: 'test-pharmacy-db'
    }
  });

  const mongoUri = mongoServer.getUri();
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongoUri;
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  process.env.EMAIL_FROM = 'test@pharmacy.com';
  process.env.SMS_PROVIDER = 'test';
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-api-key';
  process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
  process.env.TEST_API_KEY = 'test-api-key-12345678901234567890';
  process.env.RATE_LIMIT_WINDOW_MS = '900000'; // 15 minutes
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';
  process.env.AUTH_RATE_LIMIT_MAX = '5';
  process.env.UPLOAD_RATE_LIMIT_MAX = '10';

  // Connect to test database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  console.log('Test database connected');
});

// Global test cleanup
afterAll(async () => {
  try {
    // Clear all collections
    const collections = Object.keys(mongoose.connection.collections);
    for (const collectionName of collections) {
      await mongoose.connection.collections[collectionName].deleteMany({});
    }

    // Close database connection
    await mongoose.connection.close();
    
    // Stop MongoDB server
    if (mongoServer) {
      await mongoServer.stop();
    }

    console.log('Test database disconnected and cleaned up');
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});

// Test isolation setup
beforeEach(async () => {
  // Clear Redis cache if available
  if (global.redisClient && global.redisClient.flushdb) {
    try {
      await global.redisClient.flushdb();
    } catch (error) {
      // Redis might not be available in test environment
      console.warn('Redis not available for test cleanup:', error.message);
    }
  }

  // Reset any mocks
  if (global.gc) {
    global.gc();
  }
});

// Test isolation cleanup
afterEach(async () => {
  // Clear any test data created during the test
  const collections = Object.keys(mongoose.connection.collections);
  for (const collectionName of collections) {
    try {
      await mongoose.connection.collections[collectionName].deleteMany({
        email: { $regex: /@(test|loadtest|example)\.com$/ }
      });
    } catch (error) {
      // Collection might not exist
      console.warn(`Could not clean collection ${collectionName}:`, error.message);
    }
  }
});

// Mock external services for testing
global.mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPrescriptionNotification: jest.fn().mockResolvedValue({ success: true }),
  getAvailableTemplates: jest.fn().mockResolvedValue([
    { name: 'welcome', subject: 'Welcome', body: 'Welcome email' },
    { name: 'reset', subject: 'Password Reset', body: 'Reset email' }
  ])
};

global.mockSMSService = {
  sendSMS: jest.fn().mockResolvedValue({ success: true, messageId: 'test-sms-id' }),
  sendVerificationCode: jest.fn().mockResolvedValue({ success: true }),
  sendPrescriptionNotification: jest.fn().mockResolvedValue({ success: true }),
  validatePhoneNumber: jest.fn((number) => /^\+\d{10,15}$/.test(number)),
  checkDeliveryStatus: jest.fn().mockResolvedValue({ status: 'delivered' })
};

global.mockCloudinaryService = {
  upload: jest.fn().mockResolvedValue({
    public_id: 'test-upload-id',
    secure_url: 'https://test.cloudinary.com/test-image.jpg',
    bytes: 12345
  }),
  destroy: jest.fn().mockResolvedValue({ result: 'ok' })
};

global.mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushdb: jest.fn(),
  quit: jest.fn()
};

// Mock WebRTC for video calls
global.mockWebRTCService = {
  createRoom: jest.fn().mockResolvedValue({ roomId: 'test-room-id', token: 'test-token' }),
  joinRoom: jest.fn().mockResolvedValue({ token: 'test-participant-token' }),
  endCall: jest.fn().mockResolvedValue({ success: true }),
  recordCall: jest.fn().mockResolvedValue({ recordingId: 'test-recording-id' })
};

// Mock push notification service
global.mockPushNotificationService = {
  sendToUser: jest.fn().mockResolvedValue({ success: true }),
  sendToTopic: jest.fn().mockResolvedValue({ success: true }),
  subscribeToTopic: jest.fn().mockResolvedValue({ success: true }),
  unsubscribeFromTopic: jest.fn().mockResolvedValue({ success: true })
};

// Test utilities
global.testUtils = {
  // Generate test user data
  generateTestUser: (role = 'patient', index = 0) => ({
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)} ${index}`,
    email: `${role}${index}@test.com`,
    password: `Test${role.charAt(0).toUpperCase() + role.slice(1)}Password123!`,
    role,
    isActive: true,
    phone: `+123456789${index.toString().padStart(2, '0')}`,
    ...(role === 'pharmacy' && {
      licenseNumber: `LIC${index.toString().padStart(6, '0')}`,
      address: {
        street: `${index} Test Pharmacy St`,
        city: 'Test City',
        state: 'TS',
        zipCode: `1000${index}`,
        coordinates: [-74.0060 + index * 0.001, 40.7128 + index * 0.001]
      }
    })
  }),

  // Generate test prescription data
  generateTestPrescription: (patientId, pharmacyId, index = 0) => ({
    patientId,
    pharmacyId,
    medications: [
      {
        name: `Test Medication ${index}`,
        dosage: `${10 + index}mg`,
        quantity: 30 + index,
        frequency: 'Once daily',
        duration: '30 days',
        instructions: `Take with food. Test prescription ${index}.`
      }
    ],
    notes: `Test prescription request ${index}`,
    urgency: ['normal', 'urgent', 'critical'][index % 3],
    deliveryOption: ['pickup', 'delivery'][index % 2]
  }),

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Clean up test files
  cleanupTestFiles: async () => {
    const testUploadDir = path.join(process.cwd(), 'uploads', 'test');
    try {
      const files = await fs.readdir(testUploadDir);
      for (const file of files) {
        await fs.unlink(path.join(testUploadDir, file));
      }
    } catch (error) {
      // Directory might not exist
    }
  },

  // Generate random test data
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  randomEmail: () => `test${Date.now()}${Math.random().toString(36).substr(2, 5)}@test.com`,

  randomPhoneNumber: () => `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,

  // Database helpers
  clearCollection: async (collectionName) => {
    try {
      await mongoose.connection.collections[collectionName].deleteMany({});
    } catch (error) {
      console.warn(`Could not clear collection ${collectionName}:`, error.message);
    }
  },

  countDocuments: async (collectionName, filter = {}) => {
    try {
      return await mongoose.connection.collections[collectionName].countDocuments(filter);
    } catch (error) {
      console.warn(`Could not count documents in ${collectionName}:`, error.message);
      return 0;
    }
  }
};

// Performance monitoring for tests
global.performanceLogger = {
  start: (testName) => {
    global.performanceLogger._startTime = Date.now();
    global.performanceLogger._testName = testName;
  },
  
  end: () => {
    if (global.performanceLogger._startTime && global.performanceLogger._testName) {
      const duration = Date.now() - global.performanceLogger._startTime;
      if (duration > 5000) {
        console.warn(`Slow test detected: ${global.performanceLogger._testName} took ${duration}ms`);
      }
    }
  }
};

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Test environment validation
console.log('Test environment initialized:');
console.log(`- Node.js version: ${process.version}`);
console.log(`- MongoDB URI: ${process.env.MONGODB_URI}`);
console.log(`- Test timeout: ${30000}ms`);
console.log('- Mock services configured');
console.log('- Test utilities available');

export default {
  mongoServer,
  testUtils: global.testUtils,
  mockServices: {
    email: global.mockEmailService,
    sms: global.mockSMSService,
    cloudinary: global.mockCloudinaryService,
    redis: global.mockRedisClient,
    webrtc: global.mockWebRTCService,
    pushNotification: global.mockPushNotificationService
  }
};
