import express from 'express';
import PrescriptionRequestController from '../controllers/PrescriptionRequestController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validation.js';
import { body, query, param } from 'express-validator';

const router = express.Router();
const prescriptionRequestController = new PrescriptionRequestController();

// Simple test route to verify routing is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Prescription request routes are working',
    timestamp: new Date().toISOString()
  });
});

// Test authenticated route
router.get('/test-auth',
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      message: 'Authentication is working',
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role
      },
      timestamp: new Date().toISOString()
    });
  }
);

// Public mock queue endpoint for testing (no auth required)
router.get('/public-mock-queue', (req, res) => {
  const mockRequests = [
    {
      _id: '507f1f77bcf86cd799439011',
      requestNumber: 'PRX-2024-001',
      patient: {
        _id: 'patient1',
        profile: { firstName: 'John', lastName: 'Doe' },
        contact: { phone: '+1-555-0123' }
      },
      medications: [
        { 
          name: 'Metformin 500mg', 
          dosage: { instructions: '1 tablet twice daily' }, 
          quantity: { prescribed: 60, unit: 'tablets' },
          frequency: 'Twice daily' 
        }
      ],
      preferences: {
        urgency: 'routine',
        deliveryMethod: 'pickup'
      },
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
      status: 'submitted',
      estimatedValue: 45.99
    }
  ];

  res.json({
    success: true,
    message: 'Public mock prescription queue data',
    data: {
      pharmacyId: 'mock-pharmacy-id',
      pharmacyName: 'Mock Pharmacy',
      queue: mockRequests,
      queueSize: mockRequests.length
    }
  });
});

/**
 * Validation schemas for prescription request operations
 */

// Create prescription request validation
const createRequestValidation = [
  body('prescriber.name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Prescriber name is required and must be 2-100 characters'),
  
  body('prescriber.npiNumber')
    .optional()
    .isLength({ min: 10, max: 10 })
    .withMessage('NPI number must be exactly 10 digits'),
  
  body('medications')
    .isArray({ min: 1 })
    .withMessage('At least one medication is required'),
  
  body('medications.*.name')
    .notEmpty()
    .trim()
    .withMessage('Medication name is required'),
  
  body('medications.*.quantity.prescribed')
    .isNumeric()
    .isFloat({ min: 0.01 })
    .withMessage('Prescribed quantity must be a positive number'),
  
  body('preferences.deliveryMethod')
    .optional()
    .isIn(['pickup', 'delivery', 'either'])
    .withMessage('Invalid delivery method'),
  
  body('preferences.urgency')
    .optional()
    .isIn(['routine', 'urgent', 'emergency'])
    .withMessage('Invalid urgency level'),
  
  body('preferences.maxPrice')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a positive number'),
  
  body('preferences.deliveryAddress.zipCode')
    .optional()
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Invalid ZIP code format'),
  
  body('metadata.geoLocation')
    .optional()
    .isArray()
    .custom((value) => {
      if (value.length !== 2) return false;
      const [lng, lat] = value;
      return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
    })
    .withMessage('Geo location must be [longitude, latitude] within valid ranges')
];

// Submit request validation
const submitRequestValidation = [
  body('pharmacyIds')
    .optional()
    .isArray()
    .withMessage('Pharmacy IDs must be an array'),
  
  body('pharmacyIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each pharmacy ID must be a valid MongoDB ObjectId')
];

// Pharmacy response validation
const pharmacyResponseValidation = [
  body('action')
    .notEmpty()
    .isIn(['accept', 'decline'])
    .withMessage('Action must be either "accept" or "decline"'),
  
  body('estimatedFulfillmentTime')
    .if(body('action').equals('accept'))
    .isNumeric()
    .isInt({ min: 5, max: 1440 })
    .withMessage('Estimated fulfillment time must be between 5 and 1440 minutes'),
  
  body('quotedPrice.total')
    .if(body('action').equals('accept'))
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Quoted price must be a positive number'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  
  body('substitutions')
    .optional()
    .isArray()
    .withMessage('Substitutions must be an array'),
  
  body('substitutions.*.originalMedication')
    .optional()
    .notEmpty()
    .withMessage('Original medication name is required for substitutions'),
  
  body('substitutions.*.substituteMedication')
    .optional()
    .notEmpty()
    .withMessage('Substitute medication name is required for substitutions')
];

// Select pharmacy validation
const selectPharmacyValidation = [
  body('pharmacyId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid pharmacy ID is required'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

// Status update validation
const statusUpdateValidation = [
  body('status')
    .notEmpty()
    .isIn([
      'draft', 'submitted', 'pending', 'accepted', 'in_preparation', 
      'ready', 'fulfilled', 'cancelled', 'expired', 'declined_all'
    ])
    .withMessage('Invalid status'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Query parameter validation
const queryValidation = [
  query('limit')
    .optional()
    .custom((value) => {
      if (value === '' || value === undefined || value === null) return true;
      const num = parseInt(value);
      return !isNaN(num) && num >= 1 && num <= 100;
    })
    .withMessage('Limit must be between 1 and 100'),
  
  query('skip')
    .optional()
    .custom((value) => {
      if (value === '' || value === undefined || value === null) return true;
      const num = parseInt(value);
      return !isNaN(num) && num >= 0;
    })
    .withMessage('Skip must be a non-negative integer'),
  
  query('status')
    .optional()
    .custom((value) => {
      // Allow empty string (treated as no filter)
      if (value === '' || value === undefined || value === null) {
        return true;
      }
      
      const validStatuses = [
        'draft', 'submitted', 'pending', 'accepted', 'in_preparation',
        'ready', 'fulfilled', 'cancelled', 'expired', 'declined_all'
      ];
      
      if (Array.isArray(value)) {
        return value.every(status => validStatuses.includes(status));
      }
      
      return validStatuses.includes(value);
    })
    .withMessage('Invalid status value(s)'),
  
  query('sortBy')
    .optional()
    .custom((value) => {
      if (value === '' || value === undefined || value === null) return true;
      const validSortFields = ['createdAt', 'updatedAt', 'urgency', 'status', 'newest', 'oldest', 'urgency_priority', 'value'];
      return validSortFields.includes(value);
    })
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .custom((value) => {
      if (value === '' || value === undefined || value === null) return true;
      return ['asc', 'desc'].includes(value);
    })
    .withMessage('Sort order must be "asc" or "desc"'),
  
  query('search')
    .optional()
    .custom((value) => {
      if (value === '' || value === undefined || value === null) return true;
      return typeof value === 'string' && value.length <= 100;
    })
    .withMessage('Search term must be a string with max 100 characters'),
  
  query('urgency')
    .optional()
    .custom((value) => {
      if (value === '' || value === undefined || value === null) return true;
      const validUrgencies = ['routine', 'urgent', 'emergency', 'all'];
      return validUrgencies.includes(value);
    })
    .withMessage('Invalid urgency value')
];

// Request ID parameter validation
const requestIdValidation = [
  param('requestId')
    .isMongoId()
    .withMessage('Valid request ID is required')
];

/**
 * @route   POST /api/v1/prescription-requests
 * @desc    Create a new prescription request
 * @access  Private (Patient)
 */
router.post('/',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  createRequestValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionRequestController.createRequest(req, res);
  }
);

/**
 * @route   POST /api/v1/prescription-requests/:requestId/submit
 * @desc    Submit prescription request to pharmacies
 * @access  Private (Patient - own requests only)
 */
router.post('/:requestId/submit',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  requestIdValidation,
  submitRequestValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionRequestController.submitRequest(req, res);
  }
);

/**
 * @route   POST /api/v1/prescription-requests/:requestId/respond
 * @desc    Pharmacy accepts or declines a prescription request
 * @access  Private (Pharmacy)
 */
router.post('/:requestId/respond',
  authenticate,
  authorize(['pharmacy']),
  rateLimiter,
  requestIdValidation,
  pharmacyResponseValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionRequestController.respondToRequest(req, res);
  }
);

/**
 * @route   POST /api/v1/prescription-requests/:requestId/select-pharmacy
 * @desc    Patient selects a pharmacy from accepted responses
 * @access  Private (Patient - own requests only)
 */
router.post('/:requestId/select-pharmacy',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  requestIdValidation,
  selectPharmacyValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionRequestController.selectPharmacy(req, res);
  }
);

/**
 * @route   GET /api/v1/prescription-requests
 * @desc    Get prescription requests for current user
 * @access  Private (Patient, Pharmacy)
 */
router.get('/',
  authenticate,
  authorize(['patient', 'pharmacy', 'admin']),

  queryValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionRequestController.getUserRequests(req, res);
  }
);

/**
 * @route   GET /api/v1/prescription-requests/my-requests
 * @desc    Get prescription requests for the authenticated patient
 * @access  Private (Patient)
 */
router.get('/my-requests',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  async (req, res) => {
    await prescriptionRequestController.getMyRequests(req, res);
  }
);

/**
 * @route   GET /api/v1/prescription-requests/pharmacy/queue
 * @desc    Get pharmacy queue (pharmacy-specific endpoint)
 * @access  Private (Pharmacy)
 */
router.get('/pharmacy/queue',
  authenticate,
  authorize(['pharmacy']),

  (req, res, next) => {
    console.log('🔍 ROUTE: Pharmacy queue route hit');
    console.log('🔍 ROUTE: Query params:', req.query);
    console.log('🔍 ROUTE: User:', { id: req.user.id, email: req.user.email, role: req.user.role });
    next();
  },
  queryValidation,
  (req, res, next) => {
    console.log('🔍 ROUTE: After queryValidation');
    next();
  },
  validateRequest,
  (req, res, next) => {
    console.log('🔍 ROUTE: After validateRequest, calling controller...');
    next();
  },
  async (req, res) => {
    console.log('🔍 ROUTE: About to call controller.getPharmacyQueue');
    await prescriptionRequestController.getPharmacyQueue(req, res);
  }
);

/**
 * @route   GET /api/v1/prescription-requests/stats
 * @desc    Get prescription request statistics
 * @access  Private (Patient, Pharmacy, Admin - role-based data)
 */
router.get('/stats',
  authenticate,
  authorize(['patient', 'pharmacy', 'admin']),
  rateLimiter,
  async (req, res) => {
    await prescriptionRequestController.getStatistics(req, res);
  }
);

/**
 * @route   GET /api/v1/prescription-requests/:requestId/responses
 * @desc    Get pharmacy responses for a specific prescription request
 * @access  Private (Patient - own requests)
 */
router.get('/:requestId/responses',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  [
    param('requestId')
      .isMongoId()
      .withMessage('Valid request ID is required')
  ],
  validateRequest,
  async (req, res) => {
    await prescriptionRequestController.getRequestResponses(req, res);
  }
);

/**
 * @route   GET /api/v1/prescription-requests/:requestId
 * @desc    Get detailed prescription request information
 * @access  Private (Patient - own requests, Pharmacy - targeted requests, Admin)
 */
router.get('/:requestId',
  authenticate,
  authorize(['patient', 'pharmacy', 'admin']),
  rateLimiter,
  requestIdValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionRequestController.getRequestDetails(req, res);
  }
);

/**
 * @route   PUT /api/v1/prescription-requests/:requestId/status
 * @desc    Update prescription request status
 * @access  Private (Patient - limited statuses, Pharmacy - fulfillment statuses, Admin - all)
 */
router.put('/:requestId/status',
  authenticate,
  authorize(['patient', 'pharmacy', 'admin']),
  rateLimiter,
  requestIdValidation,
  statusUpdateValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionRequestController.updateRequestStatus(req, res);
  }
);

/**
 * @route   DELETE /api/v1/prescription-requests/:requestId
 * @desc    Cancel a prescription request
 * @access  Private (Patient - own requests, Admin)
 */
router.delete('/:requestId',
  authenticate,
  authorize(['patient', 'admin']),
  rateLimiter,
  requestIdValidation,
  [
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason cannot exceed 500 characters')
  ],
  validateRequest,
  async (req, res) => {
    await prescriptionRequestController.cancelRequest(req, res);
  }
);

/**
 * Advanced endpoints for pharmacy management
 */

/**
 * @route   GET /api/v1/prescription-requests/pharmacy/pending
 * @desc    Get pending requests that need immediate attention
 * @access  Private (Pharmacy)
 */
router.get('/pharmacy/pending',
  authenticate,
  authorize(['pharmacy']),
  rateLimiter,
  async (req, res) => {
    try {
      // Override query to only get urgent pending requests
      req.query = {
        ...req.query,
        status: ['draft', 'pending', 'submitted'],
        sortBy: 'urgency_priority',
        limit: req.query.limit || '20'
      };
      
      await prescriptionRequestController.getPharmacyQueue(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pending requests',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @route   GET /api/v1/prescription-requests/pharmacy/accepted
 * @desc    Get requests accepted by this pharmacy
 * @access  Private (Pharmacy)
 */
router.get('/pharmacy/accepted',
  authenticate,
  authorize(['pharmacy']),
  rateLimiter,
  async (req, res) => {
    try {
      req.query = {
        ...req.query,
        status: ['accepted', 'in_preparation', 'ready'],
        sortBy: 'createdAt'
      };
      
      await prescriptionRequestController.getPharmacyQueue(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve accepted requests',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @route   PATCH /api/v1/prescription-requests/:requestId/fulfillment
 * @desc    Update fulfillment details (pharmacy only)
 * @access  Private (Pharmacy)
 */
router.patch('/:requestId/fulfillment',
  authenticate,
  authorize(['pharmacy']),
  rateLimiter,
  requestIdValidation,
  [
    body('estimatedCompletionAt')
      .optional()
      .isISO8601()
      .withMessage('Estimated completion time must be a valid ISO date'),
    
    body('pickupCode')
      .optional()
      .isLength({ min: 4, max: 8 })
      .withMessage('Pickup code must be 4-8 characters'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ],
  validateRequest,
  async (req, res) => {
    try {
      // This would be implemented in the controller
      res.status(501).json({
        success: false,
        message: 'Fulfillment update endpoint not yet implemented'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update fulfillment details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * Development endpoints (only in development)
 */
if (process.env.NODE_ENV === 'development') {
  /**
   * @route   GET /api/v1/prescription-requests/dev/test
   * @desc    Simple test endpoint to verify server is working
   * @access  Public (Development only)
   */
  router.get('/dev/test', (req, res) => {
    res.json({
      success: true,
      message: 'Prescription request routes are working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  /**
   * @route   GET /api/v1/prescription-requests/dev/mock-queue
   * @desc    Get mock prescription queue data for development
   * @access  Public (Development only)
   */
  router.get('/dev/mock-queue',
    async (req, res) => {
      try {
        const mockRequests = [
          {
            _id: '507f1f77bcf86cd799439011',
            requestNumber: 'PRX-2024-001',
            patient: {
              _id: 'patient1',
              profile: { firstName: 'John', lastName: 'Doe' },
              contact: { phone: '+1-555-0123' }
            },
            medications: [
              { 
                name: 'Metformin 500mg', 
                dosage: { instructions: '1 tablet twice daily' }, 
                quantity: { prescribed: 60, unit: 'tablets' },
                frequency: 'Twice daily' 
              },
              { 
                name: 'Lisinopril 10mg', 
                dosage: { instructions: '1 tablet once daily' }, 
                quantity: { prescribed: 30, unit: 'tablets' },
                frequency: 'Once daily' 
              }
            ],
            preferences: {
              urgency: 'routine',
              deliveryMethod: 'pickup'
            },
            submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
            status: 'submitted',
            estimatedValue: 45.99
          },
          {
            _id: '507f1f77bcf86cd799439012',
            requestNumber: 'PRX-2024-002',
            patient: {
              _id: 'patient2',
              profile: { firstName: 'Jane', lastName: 'Smith' },
              contact: { phone: '+1-555-0124' }
            },
            medications: [
              { 
                name: 'Amoxicillin 500mg', 
                dosage: { instructions: '1 capsule three times daily' }, 
                quantity: { prescribed: 21, unit: 'capsules' },
                frequency: 'Three times daily' 
              }
            ],
            preferences: {
              urgency: 'urgent',
              deliveryMethod: 'delivery'
            },
            submittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 23.5 * 60 * 60 * 1000).toISOString(),
            status: 'submitted',
            estimatedValue: 28.50
          },
          {
            _id: '507f1f77bcf86cd799439013',
            requestNumber: 'PRX-2024-003',
            patient: {
              _id: 'patient3',
              profile: { firstName: 'Bob', lastName: 'Wilson' },
              contact: { phone: '+1-555-0125' }
            },
            medications: [
              { 
                name: 'Ibuprofen 400mg', 
                dosage: { instructions: '1 tablet every 6 hours as needed' }, 
                quantity: { prescribed: 40, unit: 'tablets' },
                frequency: 'As needed' 
              }
            ],
            preferences: {
              urgency: 'emergency',
              deliveryMethod: 'pickup'
            },
            submittedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 5.75 * 60 * 60 * 1000).toISOString(),
            status: 'submitted',
            estimatedValue: 15.99
          }
        ];

        res.status(200).json({
          success: true,
          message: 'Mock prescription queue data',
          data: {
            pharmacyId: 'mock-pharmacy-id',
            pharmacyName: 'Mock Pharmacy',
            queue: mockRequests,
            queueSize: mockRequests.length
          }
        });

      } catch (error) {
        console.error('❌ Error creating mock queue:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create mock queue data',
          error: error.message
        });
      }
    }
  );

  /**
   * @route   POST /api/v1/prescription-requests/dev/create-test-requests
   * @desc    Create test prescription requests for development
   * @access  Private (Admin, Pharmacy)
   */
  router.post('/dev/create-test-requests',
    authenticate,
    authorize(['admin', 'pharmacy']),
    async (req, res) => {
      try {
        const User = (await import('../models/User.js')).default;
        const Pharmacy = (await import('../models/Pharmacy.js')).default;
        const PrescriptionRequest = (await import('../models/PrescriptionRequest.js')).default;

        // Find a patient user
        const patient = await User.findOne({ role: 'patient' });
        if (!patient) {
          return res.status(404).json({
            success: false,
            message: 'No patient user found. Please create a patient user first.'
          });
        }

        // Find pharmacies
        const pharmacies = await Pharmacy.find({ isActive: true }).limit(3);
        if (pharmacies.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'No pharmacies found. Please create pharmacies first.'
          });
        }

        // Clear existing test requests for this patient
        await PrescriptionRequest.deleteMany({ patient: patient._id });

        // Create test prescription requests
        const testRequests = [
          {
            patient: patient._id,
            prescriber: {
              name: 'Dr. John Smith',
              npiNumber: '1234567890',
              contactInfo: {
                phone: '+1-555-0123',
                email: 'dr.smith@clinic.com'
              }
            },
            medications: [
              {
                name: 'Metformin 500mg',
                genericName: 'Metformin',
                brandName: 'Glucophage',
                dosage: {
                  form: 'tablet',
                  instructions: '1 tablet twice daily with meals',
                  frequency: 'BID',
                  duration: '30 days'
                },
                quantity: {
                  prescribed: 60,
                  unit: 'tablets'
                },
                isGenericAcceptable: true
              }
            ],
            preferences: {
              deliveryMethod: 'pickup',
              urgency: 'routine',
              additionalRequirements: {
                consultationRequested: false,
                genericSubstitution: true
              }
            },
            targetPharmacies: pharmacies.map((pharmacy, index) => ({
              pharmacyId: pharmacy._id,
              notifiedAt: new Date(),
              priority: index + 1
            })),
            status: 'submitted',
            metadata: {
              geoLocation: [-74.006, 40.7128],
              source: 'api'
            }
          },
          {
            patient: patient._id,
            prescriber: {
              name: 'Dr. Sarah Johnson',
              npiNumber: '0987654321',
              contactInfo: {
                phone: '+1-555-0124',
                email: 'dr.johnson@hospital.com'
              }
            },
            medications: [
              {
                name: 'Amoxicillin 500mg',
                genericName: 'Amoxicillin',
                brandName: 'Amoxil',
                dosage: {
                  form: 'capsule',
                  instructions: '1 capsule three times daily',
                  frequency: 'TID',
                  duration: '7 days'
                },
                quantity: {
                  prescribed: 21,
                  unit: 'capsules'
                },
                isGenericAcceptable: true
              }
            ],
            preferences: {
              deliveryMethod: 'delivery',
              urgency: 'urgent',
              additionalRequirements: {
                consultationRequested: true,
                genericSubstitution: false
              }
            },
            targetPharmacies: pharmacies.map((pharmacy, index) => ({
              pharmacyId: pharmacy._id,
              notifiedAt: new Date(),
              priority: index + 1
            })),
            status: 'submitted',
            metadata: {
              geoLocation: [-74.006, 40.7128],
              source: 'api'
            }
          }
        ];

        const createdRequests = await PrescriptionRequest.insertMany(testRequests);

        res.status(201).json({
          success: true,
          message: `Created ${createdRequests.length} test prescription requests`,
          data: {
            requests: createdRequests.map(req => ({
              id: req._id,
              requestNumber: req.requestNumber,
              medications: req.medications.length,
              urgency: req.preferences.urgency,
              status: req.status
            })),
            patient: {
              id: patient._id,
              email: patient.email
            },
            pharmacies: pharmacies.map(p => ({
              id: p._id,
              name: p.name
            }))
          }
        });

      } catch (error) {
        console.error('❌ Error creating test prescription requests:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create test prescription requests',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  );
}

/**
 * Error handling for invalid routes
 */
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

export default router;
