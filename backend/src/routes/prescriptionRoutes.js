import express from 'express';
import PrescriptionController from '../controllers/PrescriptionController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { rateLimiter, prescriptionRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validation.js';
import { body, query, param } from 'express-validator';
import multer from 'multer';

const router = express.Router();
const prescriptionController = new PrescriptionController();

/**
 * Validation schemas for prescription processing
 */
const prescriptionProcessingValidation = [
  body('skipImageProcessing').optional().isBoolean().withMessage('skipImageProcessing must be a boolean'),
  body('useMultipleOCREngines').optional().isBoolean().withMessage('useMultipleOCREngines must be a boolean'),
  body('validateMedications').optional().isBoolean().withMessage('validateMedications must be a boolean'),
  body('checkInteractions').optional().isBoolean().withMessage('checkInteractions must be a boolean'),
  body('detectAnomalies').optional().isBoolean().withMessage('detectAnomalies must be a boolean'),
  body('generateReport').optional().isBoolean().withMessage('generateReport must be a boolean'),
  body('confidenceThreshold').optional().isFloat({ min: 0, max: 1 }).withMessage('confidenceThreshold must be between 0 and 1'),
  body('saveToDatabase').optional().isBoolean().withMessage('saveToDatabase must be a boolean')
];

const batchProcessingValidation = [
  ...prescriptionProcessingValidation,
  body('concurrency').optional().isInt({ min: 1, max: 10 }).withMessage('concurrency must be between 1 and 10'),
  body('failFast').optional().isBoolean().withMessage('failFast must be a boolean')
];

const historyQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('status').optional().isIn(['completed', 'failed', 'processing']).withMessage('invalid status'),
  query('dateFrom').optional().isISO8601().withMessage('dateFrom must be a valid ISO date'),
  query('dateTo').optional().isISO8601().withMessage('dateTo must be a valid ISO date'),
  query('sortBy').optional().isIn(['createdAt', 'confidence', 'processingTime']).withMessage('invalid sortBy field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc')
];

const processingIdValidation = [
  param('processingId').isLength({ min: 1 }).withMessage('processingId is required')
];

const validationValidation = [
  body('validation').isIn(['approved', 'rejected', 'needs_review']).withMessage('validation must be approved, rejected, or needs_review'),
  body('comments').optional().isString().isLength({ max: 1000 }).withMessage('comments must be a string with max 1000 characters')
];

// Error handler middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 5 files',
        code: 'TOO_MANY_FILES'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type. Only JPEG, PNG, TIFF, BMP, and PDF files are allowed',
      code: 'INVALID_FILE_TYPE'
    });
  }

  next(error);
};

/**
 * @route   POST /api/prescriptions/process
 * @desc    Process a single prescription image with advanced OCR and AI
 * @access  Private
 * @body    prescription: File (required), processing options (optional)
 */
router.post('/process', 
  authenticate,
  prescriptionRateLimiter, // Specific rate limiting for prescription processing
  prescriptionController.getSingleUploadMiddleware(),
  handleMulterError,
  prescriptionProcessingValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionController.processSinglePrescription(req, res);
  }
);

/**
 * @route   POST /api/prescriptions/process-and-request
 * @desc    Process prescription and create pharmacy request automatically
 * @access  Private
 * @body    prescription: File (required), latitude: Number (required), longitude: Number (required), processing options (optional)
 */
router.post('/process-and-request',
  authenticate,
  authorize(['patient']), // Only patients can create prescription requests
  prescriptionRateLimiter,
  prescriptionController.getSingleUploadMiddleware(),
  handleMulterError,
  [
    ...prescriptionProcessingValidation,
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude between -90 and 90 is required'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude between -180 and 180 is required')
  ],
  validateRequest,
  async (req, res) => {
    await prescriptionController.processPrescriptionAndCreateRequest(req, res);
  }
);

/**
 * @route   POST /api/prescriptions/requests/:requestId/submit
 * @desc    Submit prescription request to matching pharmacies
 * @access  Private (Patient - own requests only)
 * @params  requestId: String (required)
 */
router.post('/requests/:requestId/submit',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  [
    param('requestId')
      .isMongoId()
      .withMessage('Valid prescription request ID is required')
  ],
  validateRequest,
  async (req, res) => {
    await prescriptionController.submitPrescriptionRequest(req, res);
  }
);

/**
 * @route   POST /api/prescriptions/process-batch
 * @desc    Process multiple prescription images in batch
 * @access  Private
 * @body    prescriptions: File[] (required), processing options (optional)
 */
router.post('/process-batch',
  authenticate,
  authorize(['pharmacist', 'admin']), // Only pharmacists and admins can do batch processing
  prescriptionRateLimiter,
  prescriptionController.getMultipleUploadMiddleware(),
  handleMulterError,
  batchProcessingValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionController.processBatchPrescriptions(req, res);
  }
);

/**
 * @route   GET /api/prescriptions/history
 * @desc    Get prescription processing history with pagination and filters
 * @access  Private
 * @query   page, limit, status, dateFrom, dateTo, sortBy, sortOrder
 */
router.get('/history',
  authenticate,
  rateLimiter,
  historyQueryValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionController.getProcessingHistory(req, res);
  }
);

/**
 * @route   GET /api/prescriptions/stats
 * @desc    Get prescription processing statistics
 * @access  Private
 */
router.get('/stats',
  authenticate,
  rateLimiter,
  async (req, res) => {
    await prescriptionController.getProcessingStats(req, res);
  }
);

/**
 * @route   GET /api/prescriptions/:processingId
 * @desc    Get specific prescription processing result
 * @access  Private
 * @params  processingId
 */
router.get('/:processingId',
  authenticate,
  rateLimiter,
  processingIdValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionController.getProcessingResult(req, res);
  }
);

/**
 * @route   POST /api/prescriptions/:processingId/reprocess
 * @desc    Reprocess a prescription with different options
 * @access  Private
 * @params  processingId
 * @body    processing options
 */
router.post('/:processingId/reprocess',
  authenticate,
  authorize(['pharmacist', 'admin']),
  prescriptionRateLimiter,
  processingIdValidation,
  prescriptionProcessingValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionController.reprocessPrescription(req, res);
  }
);

/**
 * @route   POST /api/prescriptions/:processingId/validate
 * @desc    Manually validate a prescription processing result
 * @access  Private (Pharmacist/Admin only)
 * @params  processingId
 * @body    validation, comments
 */
router.post('/:processingId/validate',
  authenticate,
  authorize(['pharmacist', 'admin']),
  rateLimiter,
  processingIdValidation,
  validationValidation,
  validateRequest,
  async (req, res) => {
    await prescriptionController.validatePrescription(req, res);
  }
);

/**
 * Health check endpoint for prescription processing service
 * @route   GET /api/prescriptions/health
 * @desc    Check health status of prescription processing services
 * @access  Public
 */
router.get('/health',
  rateLimiter,
  async (req, res) => {
    try {
      const stats = prescriptionController.processingService.getProcessingStats();
      
      const health = {
        status: 'operational',
        timestamp: new Date().toISOString(),
        services: {
          ocr: 'operational',
          ai: 'operational',
          imageProcessing: 'operational'
        },
        statistics: {
          totalProcessed: stats.totalProcessed,
          successRate: stats.successRate,
          averageProcessingTime: stats.averageProcessingTime
        },
        version: '1.0.0'
      };

      res.status(200).json({
        success: true,
        data: health,
        message: 'Prescription processing service is healthy'
      });

    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      res.status(503).json({
        success: false,
        error: 'Service health check failed',
        details: error.message,
        code: 'HEALTH_CHECK_ERROR'
      });
    }
  }
);

/**
 * Get supported file types
 * @route   GET /api/prescriptions/supported-types
 * @desc    Get list of supported file types for prescription upload
 * @access  Public
 */
router.get('/supported-types',
  rateLimiter,
  (req, res) => {
    const supportedTypes = {
      images: [
        { type: 'image/jpeg', extensions: ['.jpg', '.jpeg'], description: 'JPEG Image' },
        { type: 'image/png', extensions: ['.png'], description: 'PNG Image' },
        { type: 'image/tiff', extensions: ['.tiff', '.tif'], description: 'TIFF Image' },
        { type: 'image/bmp', extensions: ['.bmp'], description: 'Bitmap Image' }
      ],
      documents: [
        { type: 'application/pdf', extensions: ['.pdf'], description: 'PDF Document' }
      ],
      maxFileSize: '10MB',
      maxFiles: 5,
      recommendations: [
        'Use high-resolution images (at least 300 DPI)',
        'Ensure good lighting and clear text',
        'Avoid shadows and reflections',
        'Keep the prescription flat and fully visible',
        'Use JPEG or PNG format for best results'
      ]
    };

    res.status(200).json({
      success: true,
      data: supportedTypes,
      message: 'Supported file types retrieved successfully'
    });
  }
);

/**
 * Error handling middleware specific to prescription routes
 */
router.use((error, req, res, next) => {
  console.error('❌ Prescription route error:', error.message);
  
  // Handle specific prescription processing errors
  if (error.code === 'PROCESSING_ERROR') {
    return res.status(500).json({
      success: false,
      error: 'Prescription processing failed',
      details: error.message,
      code: 'PROCESSING_ERROR'
    });
  }

  if (error.code === 'OCR_ERROR') {
    return res.status(500).json({
      success: false,
      error: 'OCR processing failed',
      details: error.message,
      code: 'OCR_ERROR'
    });
  }

  if (error.code === 'AI_ERROR') {
    return res.status(500).json({
      success: false,
      error: 'AI processing failed',
      details: error.message,
      code: 'AI_ERROR'
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    code: 'INTERNAL_ERROR'
  });
});

export default router;
