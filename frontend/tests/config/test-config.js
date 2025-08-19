// Test configuration for doctor profile management tests

export const testConfig = {
  // API endpoints for testing
  apiEndpoints: {
    getProfile: (doctorId) => `/api/doctors/${doctorId}/profile/full`,
    updateProfile: (doctorId) => `/api/doctors/${doctorId}/profile/section`,
    uploadDocument: (doctorId) => `/api/doctors/${doctorId}/documents`,
    deleteDocument: (doctorId, documentId) => `/api/doctors/${doctorId}/documents/${documentId}`
  },

  // Test timeouts
  timeouts: {
    unit: 10000,      // 10 seconds for unit tests
    integration: 30000, // 30 seconds for integration tests
    e2e: 60000,       // 60 seconds for E2E tests
    performance: 120000 // 2 minutes for performance tests
  },

  // Performance benchmarks
  performance: {
    renderTime: {
      fast: 100,      // Under 100ms is fast
      acceptable: 500, // Under 500ms is acceptable
      slow: 1000      // Over 1000ms is slow
    },
    apiResponse: {
      fast: 200,      // Under 200ms is fast
      acceptable: 1000, // Under 1000ms is acceptable
      slow: 3000      // Over 3000ms is slow
    },
    memoryUsage: {
      low: 10 * 1024 * 1024,    // 10MB
      medium: 50 * 1024 * 1024,  // 50MB
      high: 100 * 1024 * 1024    // 100MB
    }
  },

  // Test data limits
  dataLimits: {
    maxSpecializations: 10,
    maxQualifications: 20,
    maxWorkplaces: 50,
    maxBioLength: 5000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
  },

  // Validation rules for testing
  validation: {
    personalInfo: {
      firstName: {
        required: true,
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-Z\s'-]+$/
      },
      lastName: {
        required: true,
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-Z\s'-]+$/
      },
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      phone: {
        required: true,
        pattern: /^\+?[\d\s\-\(\)]+$/,
        minLength: 10,
        maxLength: 20
      }
    },
    medicalLicense: {
      licenseNumber: {
        required: true,
        minLength: 5,
        maxLength: 20,
        pattern: /^[A-Z0-9]+$/
      },
      issuingAuthority: {
        required: true,
        minLength: 5,
        maxLength: 100
      },
      expiryDate: {
        required: true,
        futureDate: true
      }
    },
    consultationModes: {
      fee: {
        min: 0,
        max: 10000
      },
      duration: {
        min: 15,
        max: 180
      }
    }
  },

  // Mock data templates
  mockData: {
    doctor: {
      id: 'test-doctor-123',
      personalInfo: {
        firstName: 'Test',
        lastName: 'Doctor',
        email: 'test.doctor@example.com',
        phone: '+1234567890',
        address: '123 Test St, Test City, TS 12345'
      },
      medicalLicense: {
        licenseNumber: 'MD123456',
        issuingAuthority: 'Test Medical Board',
        issueDate: '2020-01-01',
        expiryDate: '2025-01-01',
        verificationStatus: 'verified'
      },
      specializations: ['Test Specialization 1', 'Test Specialization 2'],
      qualifications: [{
        id: 'qual-1',
        degree: 'MD',
        institution: 'Test Medical School',
        year: 2018,
        specialization: 'Medicine'
      }]
    },
    user: {
      id: 'test-user-123',
      email: 'test.doctor@example.com',
      role: 'doctor',
      isVerified: true
    },
    authToken: 'test-jwt-token-123'
  },

  // Test environment settings
  environment: {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    apiUrl: process.env.TEST_API_URL || 'http://localhost:5000',
    dbUrl: process.env.TEST_DB_URL || 'mongodb://localhost:27017/pharmacy_test',
    uploadPath: process.env.TEST_UPLOAD_PATH || './test-uploads'
  },

  // Browser settings for E2E tests
  browser: {
    headless: process.env.TEST_HEADLESS !== 'false',
    viewport: {
      width: 1280,
      height: 720
    },
    timeout: 30000,
    slowMo: process.env.TEST_SLOW_MO ? parseInt(process.env.TEST_SLOW_MO) : 0
  },

  // Coverage settings
  coverage: {
    threshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    exclude: [
      '**/node_modules/**',
      '**/tests/**',
      '**/coverage/**',
      '**/*.test.js',
      '**/*.test.jsx',
      '**/test-utils.jsx'
    ]
  },

  // Accessibility testing settings
  accessibility: {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'aria-labels': { enabled: true },
      'focus-management': { enabled: true }
    },
    standards: ['WCAG2A', 'WCAG2AA']
  },

  // Security testing settings
  security: {
    xss: {
      testPayloads: [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">'
      ]
    },
    injection: {
      testPayloads: [
        "'; DROP TABLE doctors; --",
        '1 OR 1=1',
        '${7*7}',
        '{{7*7}}'
      ]
    }
  },

  // Load testing settings
  loadTesting: {
    concurrent: {
      low: 10,
      medium: 50,
      high: 100
    },
    duration: {
      short: 30000,   // 30 seconds
      medium: 120000, // 2 minutes
      long: 300000    // 5 minutes
    },
    rampUp: {
      slow: 5000,     // 5 seconds
      medium: 10000,  // 10 seconds
      fast: 20000     // 20 seconds
    }
  }
};

// Test utilities
export const testUtils = {
  // Generate test data
  generateTestData: (type, count = 1, overrides = {}) => {
    const generators = {
      doctor: () => ({
        ...testConfig.mockData.doctor,
        id: `test-doctor-${Math.random().toString(36).substr(2, 9)}`,
        ...overrides
      }),
      user: () => ({
        ...testConfig.mockData.user,
        id: `test-user-${Math.random().toString(36).substr(2, 9)}`,
        ...overrides
      })
    };

    if (count === 1) {
      return generators[type]();
    }

    return Array.from({ length: count }, () => generators[type]());
  },

  // Wait for condition
  waitFor: (condition, timeout = 5000, interval = 100) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (condition()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Condition not met within ${timeout}ms`));
        } else {
          setTimeout(check, interval);
        }
      };
      
      check();
    });
  },

  // Simulate network delay
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random string
  randomString: (length = 10) => {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  // Generate random email
  randomEmail: () => {
    return `test.${testUtils.randomString(8)}@example.com`;
  },

  // Generate random phone
  randomPhone: () => {
    return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
  },

  // Validate test data
  validateTestData: (data, schema) => {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      if (rules.required && (!value || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value && rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      
      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be no more than ${rules.maxLength} characters`);
      }
      
      if (value && rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
      
      if (rules.futureDate && value && new Date(value) <= new Date()) {
        errors.push(`${field} must be a future date`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

export default testConfig;