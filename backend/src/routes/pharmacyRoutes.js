import express from 'express';
import rateLimit from 'express-rate-limit';
import pharmacyController from '../controllers/pharmacyController.js';
import adminPharmacyController from '../controllers/adminPharmacyController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validateRequest, validatePagination, validateCoordinates } from '../middleware/validationMiddleware.js';
import { body, query, param } from 'express-validator';
import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';

const router = express.Router();

// Simple test route to verify routing is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Pharmacy routes are working',
    timestamp: new Date().toISOString()
  });
});

// Public mock dashboard stats (no auth required)
router.get('/public-dashboard-stats', (req, res) => {
  res.json({
    success: true,
    message: 'Public mock dashboard statistics',
    data: {
      pendingRequests: 5,
      activeOrders: 12,
      totalFulfilled: 45,
      monthlyRevenue: 2500,
      averageRating: 4.7,
      totalCustomers: 89,
      inventoryStats: {
        totalItems: 150,
        lowStockItems: 3
      }
    }
  });
});

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.'
  }
});

// Validation rules
const pharmacyRegistrationValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Pharmacy name must be between 2 and 200 characters'),
  body('chainName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Chain name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('address.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  body('address.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  body('address.zipCode')
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Please provide a valid ZIP code'),
  body('address.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be between 2 and 50 characters'),
  body('coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
  body('coordinates.*')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Coordinates must be valid longitude/latitude values'),
  body('contact.phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('contact.fax')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid fax number'),
  body('contact.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('contact.website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  body('licenses')
    .isArray({ min: 1 })
    .withMessage('At least one license is required'),
  body('licenses.*.licenseNumber')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('License number must be between 3 and 50 characters'),
  body('licenses.*.licenseType')
    .isIn(['retail', 'hospital', 'clinic', 'compound', 'specialty', 'mail_order'])
    .withMessage('Invalid license type'),
  body('licenses.*.issuingAuthority')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Issuing authority must be between 2 and 100 characters'),
  body('licenses.*.issueDate')
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid issue date'),
  body('licenses.*.expiryDate')
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid expiry date'),
  body('licenses.*.documentUrl')
    .isURL()
    .withMessage('Please provide a valid document URL'),
  body('operatingHours')
    .isArray({ min: 7, max: 7 })
    .withMessage('Operating hours must be provided for all 7 days'),
  body('operatingHours.*.day')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day of week'),
  body('operatingHours.*.isOpen')
    .isBoolean()
    .withMessage('isOpen must be a boolean value'),
  body('operatingHours.*.openTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide time in HH:MM format'),
  body('operatingHours.*.closeTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide time in HH:MM format'),
  body('staff.pharmacists')
    .isArray({ min: 1 })
    .withMessage('At least one pharmacist is required'),
  body('staff.pharmacists.*.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Pharmacist name must be between 2 and 100 characters'),
  body('staff.pharmacists.*.licenseNumber')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Pharmacist license number must be between 3 and 50 characters'),
  body('staff.totalStaff')
    .isInt({ min: 1 })
    .withMessage('Total staff must be at least 1')
];

const pharmacyUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Pharmacy name must be between 2 and 200 characters'),
  body('chainName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Chain name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
  body('coordinates.*')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Coordinates must be valid longitude/latitude values'),
  body('contact.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('contact.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

const searchValidation = [
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('radius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Radius must be between 1 and 100 kilometers'),
  query('sortBy')
    .optional()
    .isIn(['distance', 'rating', 'name'])
    .withMessage('Sort by must be distance, rating, or name'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

const reviewValidation = [
  param('pharmacyId')
    .isMongoId()
    .withMessage('Invalid pharmacy ID'),
  body('action')
    .isIn(['approve', 'reject', 'request_info'])
    .withMessage('Action must be approve, reject, or request_info'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('licenseVerifications')
    .optional()
    .isArray()
    .withMessage('License verifications must be an array'),
  body('licenseVerifications.*.status')
    .optional()
    .isIn(['verified', 'rejected'])
    .withMessage('License status must be verified or rejected'),
  body('licenseVerifications.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('License notes cannot exceed 500 characters')
];

const statusToggleValidation = [
  param('pharmacyId')
    .isMongoId()
    .withMessage('Invalid pharmacy ID'),
  body('action')
    .isIn(['suspend', 'reactivate'])
    .withMessage('Action must be suspend or reactivate'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Reason cannot exceed 1000 characters')
];

const bulkReviewValidation = [
  body('pharmacyIds')
    .isArray({ min: 1 })
    .withMessage('Pharmacy IDs array is required'),
  body('pharmacyIds.*')
    .isMongoId()
    .withMessage('Invalid pharmacy ID'),
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be approve or reject'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Public Routes (no authentication required)

// Search pharmacies
router.get('/search',
  generalLimiter,
  searchValidation,
  validateRequest,
  validatePagination,
  validateCoordinates,
  pharmacyController.searchPharmacies
);

// Get nearby pharmacies
router.get('/nearby',
  generalLimiter,
  [
    query('latitude').notEmpty().isFloat({ min: -90, max: 90 }),
    query('longitude').notEmpty().isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  pharmacyController.getNearbyPharmacies
);

// Get public pharmacy details
router.get('/:pharmacyId',
  generalLimiter,
  [param('pharmacyId').isMongoId().withMessage('Invalid pharmacy ID')],
  validateRequest,
  authenticate, // Authentication required to view details
  pharmacyController.getPharmacyDetails
);

// Protected Routes (authentication required)

// Register new pharmacy
router.post('/register',
  authenticate,
  authorize(['pharmacy', 'admin']),
  registrationLimiter,
  pharmacyRegistrationValidation,
  validateRequest,
  pharmacyController.registerPharmacy
);

// Get current user's pharmacy status
router.get('/status/me',
  authenticate,
  authorize(['pharmacy', 'admin']),
  pharmacyController.getPharmacyStatus
);

// Get pharmacy dashboard statistics
router.get('/dashboard/stats',
  authenticate,
  authorize(['pharmacy']),
  generalLimiter,
  pharmacyController.getDashboardStats
);

// Update pharmacy information
router.put('/me',
  authenticate,
  authorize(['pharmacy', 'admin']),
  generalLimiter,
  pharmacyUpdateValidation,
  validateRequest,
  pharmacyController.updatePharmacy
);

// Admin Routes (admin authentication required)

// Get all pharmacies for admin
router.get('/admin/all',
  authenticate,
  authorize(['admin']),
  generalLimiter,
  [
    query('status').optional().isIn(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended', 'inactive']),
    query('verified').optional().isBoolean(),
    query('search').optional().trim().isLength({ max: 100 }),
    query('sortBy').optional().isIn(['createdAt', 'name', 'registrationStatus', 'rating.averageRating']),
    query('order').optional().isIn(['asc', 'desc'])
  ],
  validateRequest,
  validatePagination,
  adminPharmacyController.getAllPharmacies
);

// Get pharmacy statistics
router.get('/admin/stats',
  authenticate,
  authorize(['admin']),
  generalLimiter,
  adminPharmacyController.getPharmacyStats
);

// Get pharmacy for review (detailed admin view)
router.get('/admin/:pharmacyId/review',
  authenticate,
  authorize(['admin']),
  generalLimiter,
  [param('pharmacyId').isMongoId().withMessage('Invalid pharmacy ID')],
  validateRequest,
  adminPharmacyController.getPharmacyForReview
);

// Review pharmacy (approve/reject/request info)
router.post('/admin/:pharmacyId/review',
  authenticate,
  authorize(['admin']),
  generalLimiter,
  reviewValidation,
  validateRequest,
  adminPharmacyController.reviewPharmacy
);

// Toggle pharmacy status (suspend/reactivate)
router.post('/admin/:pharmacyId/toggle-status',
  authenticate,
  authorize(['admin']),
  generalLimiter,
  statusToggleValidation,
  validateRequest,
  adminPharmacyController.togglePharmacyStatus
);

// Bulk review pharmacies
router.post('/admin/bulk-review',
  authenticate,
  authorize(['admin']),
  generalLimiter,
  bulkReviewValidation,
  validateRequest,
  adminPharmacyController.bulkReviewPharmacies
);

// Development endpoints (only in development)
if (process.env.NODE_ENV === 'development') {
  // Simple test endpoint
  router.get('/dev/test', (req, res) => {
    res.json({
      success: true,
      message: 'Pharmacy routes are working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  // Test user endpoint
  router.get('/dev/test-user',
    authenticate,
    async (req, res, next) => {
      try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('email role profile pharmacy').lean();

        res.status(200).json({
          success: true,
          data: {
            user,
            userId,
            hasProfile: !!user?.profile,
            hasPharmacy: !!user?.pharmacy
          }
        });
      } catch (error) {
        console.error('Error testing user:', error);
        next(error);
      }
    }
  );

  // Development endpoint to create test pharmacy
  router.post('/dev/create-test-pharmacy',
    authenticate,
    authorize(['pharmacy', 'admin']),
    async (req, res, next) => {
      try {
        const userId = req.user._id;
        console.log('🔍 Creating test pharmacy for user:', userId, req.user.email);

        // Check if user already has a pharmacy
        const existingPharmacy = await Pharmacy.findOne({ owner: userId });
        if (existingPharmacy) {
          console.log('✅ User already has pharmacy:', existingPharmacy._id);
          // Update user reference if missing
          const user = await User.findById(userId);
          if (!user.pharmacy) {
            await User.findByIdAndUpdate(userId, { pharmacy: existingPharmacy._id });
            console.log('✅ Updated user pharmacy reference');
          }
          return res.status(200).json({
            success: true,
            message: 'User already has a pharmacy',
            data: { 
              pharmacyId: existingPharmacy._id,
              pharmacyName: existingPharmacy.name,
              status: existingPharmacy.registrationStatus
            }
          });
        }

        // Create test pharmacy
        const pharmacyDoc = {
          name: 'Test Pharmacy',
          owner: userId,
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'United States'
          },
          location: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          },
          contact: {
            phone: '+1-555-123-4567',
            email: req.user.email
          },
          licenses: [{
            licenseNumber: 'NY123456',
            licenseType: 'retail',
            issuingAuthority: 'New York State Board of Pharmacy',
            issueDate: new Date(),
            expiryDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)),
            documentUrl: 'https://example.com/license.pdf',
            verificationStatus: 'verified'
          }],
          operatingHours: [
            { day: 'monday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'friday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'saturday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
            { day: 'sunday', isOpen: false, openTime: '00:00', closeTime: '00:00' }
          ],
          staff: {
            pharmacists: [{
              name: req.user.profile?.firstName + ' ' + req.user.profile?.lastName || 'Test Pharmacist',
              licenseNumber: 'NY123456',
              specializations: ['General Pharmacy'],
              yearsExperience: 5
            }],
            totalStaff: 3
          },
          registrationStatus: 'approved',
          isVerified: true,
          isActive: true
        };

        console.log('📋 Creating pharmacy with data:', {
          name: pharmacyDoc.name,
          owner: pharmacyDoc.owner,
          email: pharmacyDoc.contact.email
        });
        
        const pharmacy = await Pharmacy.create(pharmacyDoc);
        console.log('✅ Test pharmacy created:', pharmacy._id, pharmacy.name);

        // Update user with pharmacy reference
        await User.findByIdAndUpdate(userId, {
          pharmacy: pharmacy._id,
          pharmacyDetails: {
            pharmacyName: pharmacy.name,
            licenseNumber: pharmacy.licenses[0].licenseNumber,
            verificationStatus: 'verified'
          }
        });
        console.log('✅ User updated with pharmacy reference');

        res.status(201).json({
          success: true,
          message: 'Test pharmacy created successfully',
          data: { pharmacyId: pharmacy._id }
        });

      } catch (error) {
        console.error('Error creating test pharmacy:', error);
        next(error);
      }
    }
  );
}

// Error handling for invalid routes
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Pharmacy endpoint not found'
  });
});

export default router;
