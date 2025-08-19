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
 * Medication Routes
 */

// Get all medications with filters and pagination
router.get('/medications', 
  customRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
  getMedications
);

/**
 * CSV Upload Routes
 */

// Download CSV template
router.get('/csv-template',
  authorize('pharmacy', 'admin'),
  customRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }), // 10 requests per hour
  downloadCsvTemplate
);

// Upload CSV file for bulk medication import
router.post('/pharmacy/:pharmacyId/upload-csv',
  authorize('pharmacy', 'admin'),
  customRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }), // 5 uploads per hour
  upload.single('csvFile'),
  async (req, res, next) => {
    try {
      // Add pharmacyId from URL params to request body
            console.log( "============",req.params.pharmacyId);

      req.body.pharmacyId = req.params.pharmacyId;
      await uploadInventoryCsv(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Single Product Routes
 */

// Upload single product
router.post('/pharmacy/:pharmacyId/single-product',
  authorize('pharmacy', 'admin'),
  customRateLimiter({ windowMs: 60 * 60 * 1000, max: 20 }),
  async (req, res, next) => {
    try {
      // Add pharmacyId from URL params to request body
      console.log( req.params.pharmacyId);
      req.body.pharmacyId = req.params.pharmacyId;
      await uploadSingleProduct(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Pharmacy Inventory Routes
 */

// Get pharmacy inventory
router.get('/pharmacy/:pharmacyId',
  authorize('pharmacy', 'admin'),
  customRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  async (req, res, next) => {
    try {
      const { pharmacyId } = req.params;
      const userId = req.user._id || req.user.id;
      const result = await getPharmacyInventory(pharmacyId, userId, req.query, req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Add inventory item
router.post('/pharmacy/:pharmacyId/items',
  authorize('pharmacy', 'admin'),
  customRateLimiter({ windowMs: 60 * 60 * 1000, max: 50 }),
  async (req, res, next) => {
    try {
      const { pharmacyId } = req.params;
      const userId = req.user._id || req.user.id;
      const result = await addInventoryItem(pharmacyId, userId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Update inventory item
router.put('/items/:itemId',
  authorize('pharmacy', 'admin'),
  customRateLimiter({ windowMs: 60 * 60 * 1000, max: 100 }),
  async (req, res, next) => {
    try {
      const { itemId } = req.params;
      const userId = req.user._id || req.user.id;
      const result = await updateInventoryItem(itemId, userId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Delete inventory item
router.delete('/items/:itemId',
  authorize('pharmacy', 'admin'),
  customRateLimiter({ windowMs: 60 * 60 * 1000, max: 50 }),
  async (req, res, next) => {
    try {
      const { itemId } = req.params;
      const userId = req.user._id || req.user.id;
      const result = await deleteInventoryItem(itemId, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
