import express from 'express';
import MedicineController from '../controllers/MedicineController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateMedicineSearch, validateAutomaticPurchaseOrder } from '../middleware/validation.js';

const router = express.Router();
const medicineController = new MedicineController();

// Public routes (no authentication required)

/**
 * @route POST /api/medicines/search
 * @desc Search medicines with various search modes
 * @access Public
 */
router.post('/search', validateMedicineSearch, medicineController.searchMedicines.bind(medicineController));

/**
 * @route POST /api/medicines/search/image
 * @desc Search medicines by uploaded image
 * @access Public
 */
router.post('/search/image', 
  medicineController.getImageUploadMiddleware(),
  medicineController.searchByImage.bind(medicineController)
);

/**
 * @route POST /api/medicines/analyze-image
 * @desc Analyze medicine image for identification
 * @access Public
 */
router.post('/analyze-image',
  medicineController.getImageUploadMiddleware(),
  medicineController.analyzeMedicineImage.bind(medicineController)
);

/**
 * @route GET /api/medicines/popular
 * @desc Get popular medicines
 * @access Public
 */
router.get('/popular', medicineController.getPopularMedicines.bind(medicineController));

/**
 * @route GET /api/medicines/barcode/:barcode
 * @desc Search medicine by barcode
 * @access Public
 */
router.get('/barcode/:barcode', medicineController.searchByBarcode.bind(medicineController));

/**
 * @route GET /api/medicines/:id
 * @desc Get medicine details by ID
 * @access Public
 */
router.get('/:id', medicineController.getMedicineById.bind(medicineController));

/**
 * @route GET /api/medicines/:id/suggestions
 * @desc Get medicine suggestions and alternatives
 * @access Public
 */
router.get('/:id/suggestions', medicineController.getMedicineSuggestions.bind(medicineController));

// Protected routes (authentication required)

/**
 * @route POST /api/medicines/purchase
 * @desc Create medicine purchase order with automatic pharmacy selection
 * @access Private
 */
router.post('/purchase', 
  authenticateToken,
  validateAutomaticPurchaseOrder,
  medicineController.createPurchaseOrder.bind(medicineController)
);

/**
 * @route POST /api/medicines/confirm-payment
 * @desc Confirm payment and process order
 * @access Private
 */
router.post('/confirm-payment',
  authenticateToken,
  medicineController.confirmPayment.bind(medicineController)
);

/**
 * @route GET /api/medicines/orders/my
 * @desc Get user's medicine orders
 * @access Private
 */
router.get('/orders/my',
  authenticateToken,
  medicineController.getUserOrders.bind(medicineController)
);

/**
 * @route GET /api/medicines/orders/:orderId
 * @desc Get specific medicine order details
 * @access Private
 */
router.get('/orders/:orderId',
  authenticateToken,
  medicineController.getOrderById.bind(medicineController)
);

// Admin routes (additional authentication/authorization may be needed)

/**
 * @route POST /api/medicines/admin/clear-cache
 * @desc Clear search cache
 * @access Admin
 */
router.post('/admin/clear-cache',
  authenticateToken,
  medicineController.clearSearchCache.bind(medicineController)
);

/**
 * @route GET /api/medicines/admin/search-stats
 * @desc Get search statistics
 * @access Admin
 */
router.get('/admin/search-stats',
  authenticateToken,
  medicineController.getSearchStats.bind(medicineController)
);

export default router;