import express from 'express';
import multer from 'multer';
import { 
  uploadSingleProduct, 
  uploadInventoryCsv, 
  downloadCsvTemplate,
  getMedications,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getPharmacyInventory
} from '../../controllers/inventory/InventoryController.js';
import { authenticate, authorize } from '../../middleware/authMiddleware.js';
import { customRateLimiter } from '../../middleware/rateLimiter.js';

const router = express.Router();
const upload = multer();

/**
 * Apply authentication to all routes
 */
router.use(authenticate);

/**
 * Basic Inventory Routes
 */

// Get all medications with filters and pagination
router.get('/medications', 
  customRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
  getMedications
);

// Single Product Upload Route
router.post('/medications/single-upload',
  authorize(['pharmacist', 'admin']),
  uploadSingleProduct
);

// CSV Bulk Upload Route
router.post('/medications/upload-csv',
  authorize(['pharmacist', 'admin']),
  upload.single('file'),
  uploadInventoryCsv
);

// Download CSV template
router.get('/csv-template',
  authorize(['pharmacy', 'admin']),
  customRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }), // 10 requests per hour
  downloadCsvTemplate
);

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('Inventory route error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }
  
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry found',
      field: Object.keys(error.keyPattern)[0]
    });
  }
  
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

export default router;
