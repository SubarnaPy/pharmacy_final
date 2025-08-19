/**
 * Order Management Routes
 * Handles order status tracking, delivery management, and completion confirmation
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import OrderStatusController from '../controllers/OrderStatusController.js';
import OrderController from '../controllers/OrderController.js';

const router = Router();
const orderStatusController = new OrderStatusController();
const orderController = new OrderController();

// Validation schemas
const orderIdValidation = [
  param('orderId')
    .isMongoId()
    .withMessage('Invalid order ID format')
];

const createOrderValidation = [
  body('prescriptionRequestId')
    .isMongoId()
    .withMessage('Valid prescription request ID is required'),
  body('estimatedReadyTime')
    .optional()
    .isISO8601()
    .withMessage('Estimated ready time must be a valid date'),
  body('specialRequirements')
    .optional()
    .isObject()
    .withMessage('Special requirements must be an object'),
  body('pricing')
    .optional()
    .isObject()
    .withMessage('Pricing must be an object'),
  body('pricing.subtotal')
    .optional()
    .isNumeric()
    .withMessage('Subtotal must be a number'),
  body('pricing.tax')
    .optional()
    .isNumeric()
    .withMessage('Tax must be a number'),
  body('pricing.deliveryFee')
    .optional()
    .isNumeric()
    .withMessage('Delivery fee must be a number'),
  body('pricing.total')
    .optional()
    .isNumeric()
    .withMessage('Total must be a number')
];

const updateStatusValidation = [
  body('status')
    .isIn([
      'placed',
      'confirmed',
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
      'completed',
      'cancelled',
      'on_hold',
      // Legacy statuses for backward compatibility
      'order_placed',
      'prescription_verified',
      'payment_confirmed',
      'in_preparation',
      'quality_check',
      'ready_for_pickup',
      'ready_for_delivery',
      'in_transit',
      'delivery_attempted',
      'picked_up',
      'refunded'
    ])
    .withMessage('Invalid order status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  body('estimatedCompletion')
    .optional()
    .isISO8601()
    .withMessage('Estimated completion must be a valid date')
];

const deliveryTrackingValidation = [
  body('trackingNumber')
    .optional()
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Tracking number must be between 5 and 50 characters'),
  body('carrier')
    .optional()
    .isIn(['ups', 'fedex', 'usps', 'dhl', 'pharmacy_delivery', 'third_party', 'courier'])
    .withMessage('Invalid carrier'),
  body('estimatedDelivery')
    .optional()
    .isISO8601()
    .withMessage('Estimated delivery must be a valid date'),
  body('driver.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Driver name cannot exceed 100 characters'),
  body('driver.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid driver phone number'),
  body('notifyPatient')
    .optional()
    .isBoolean()
    .withMessage('Notify patient must be a boolean')
];

const completionValidation = [
  body('method')
    .isIn(['pickup', 'delivery'])
    .withMessage('Method must be either pickup or delivery'),
  body('pickupCode')
    .if(body('method').equals('pickup'))
    .notEmpty()
    .withMessage('Pickup code is required for pickup completion'),
  body('pickedUpBy.name')
    .if(body('method').equals('pickup'))
    .trim()
    .notEmpty()
    .withMessage('Name of person picking up is required'),
  body('pickedUpBy.relationship')
    .if(body('method').equals('pickup'))
    .isIn(['self', 'family', 'caregiver'])
    .withMessage('Invalid relationship'),
  body('deliveredTo.name')
    .if(body('method').equals('delivery'))
    .trim()
    .notEmpty()
    .withMessage('Name of person receiving delivery is required'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback cannot exceed 1000 characters'),
  body('qualityCheck.medicationsCorrect')
    .optional()
    .isBoolean()
    .withMessage('Medications correct must be a boolean'),
  body('qualityCheck.quantitiesCorrect')
    .optional()
    .isBoolean()
    .withMessage('Quantities correct must be a boolean'),
  body('qualityCheck.packagingIntact')
    .optional()
    .isBoolean()
    .withMessage('Packaging intact must be a boolean')
];

const queryValidation = [
  query('status')
    .optional()
    .custom((value) => {
      if (value === '' || value === 'all') return true; // Allow empty or 'all'
      
      const validStatuses = [
        'placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 
        'delivered', 'completed', 'cancelled', 'on_hold',
        // Legacy statuses for backward compatibility
        'order_placed', 'prescription_verified', 'payment_confirmed',
        'in_preparation', 'quality_check', 'ready_for_pickup',
        'ready_for_delivery', 'in_transit', 'delivery_attempted', 
        'picked_up', 'refunded'
      ];
      
      if (Array.isArray(value)) {
        return value.every(status => validStatuses.includes(status));
      }
      
      return validStatuses.includes(value);
    })
    .withMessage('Invalid status value(s)'),
  query('dateRange')
    .optional()
    .custom((value) => {
      if (value === '' || value === undefined || value === null) return true; // Allow empty values
      return ['all', 'today', 'week', 'month'].includes(value);
    })
    .withMessage('Invalid date range'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be a non-negative integer'),
  query('sortBy')
    .optional()
    .isIn([
      'createdAt', 'updatedAt', 'orderNumber', 'status', 'totalAmount',
      'timing.orderPlaced', 'currentStatus', 'timing.estimatedCompletion'
    ])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * @route   POST /api/v1/orders/create-from-prescription
 * @desc    Create an order from a prescription request and selected pharmacy
 * @access  Private (Patient)
 */
router.post('/create-from-prescription',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  [
    body('prescriptionRequestId')
      .notEmpty()
      .isMongoId()
      .withMessage('Valid prescription request ID is required'),
    
    body('selectedPharmacyId')
      .notEmpty()
      .isMongoId()
      .withMessage('Valid pharmacy ID is required'),
    
    body('pharmacyResponseId')
      .notEmpty()
      .isMongoId()
      .withMessage('Valid pharmacy response ID is required'),
    
    body('quotedPrice')
      .notEmpty()
      .custom((value) => {
        // Allow numbers >= 0 (including 0 for testing)
        if (typeof value === 'number' && value >= 0) return true;
        // Allow objects with total >= 0 (including 0 for testing)
        if (typeof value === 'object' && value !== null && typeof value.total === 'number' && value.total >= 0) return true;
        return false;
      })
      .withMessage('Valid quoted price is required (must be a number >= 0 or object with total >= 0)'),
    
    body('estimatedFulfillmentTime')
      .notEmpty()
      .isNumeric()
      .isInt({ min: 5, max: 1440 })
      .withMessage('Estimated fulfillment time must be between 5 and 1440 minutes'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ],
  validateRequest,
  async (req, res) => {
    await orderController.createFromPrescription(req, res);
  }
);

/**
 * @route   POST /api/v1/orders/create
 * @desc    Create new order from prescription request
 * @access  Private (Pharmacy)
 */
router.post('/create',
  authenticate,
  authorize(['pharmacy']),
  rateLimiter,
  createOrderValidation,
  validateRequest,
  async (req, res) => {
    await orderStatusController.createOrder(req, res);
  }
);

/**
 * @route   GET /api/v1/orders
 * @desc    Get orders for current user (patient or pharmacy)
 * @access  Private
 */
router.get('/',
  authenticate,
  authorize(['patient', 'pharmacy', 'admin']),
  rateLimiter,
  queryValidation,
  validateRequest,
  async (req, res) => {
    await orderStatusController.getUserOrders(req, res);
  }
);

/**
 * @route   GET /api/v1/orders/pharmacy/orders
 * @desc    Get orders for pharmacy (used by pharmacy OrderManagement component)
 * @access  Private (Pharmacy)
 */
router.get('/pharmacy/orders',
  authenticate,
  authorize(['pharmacy']),
  rateLimiter,
  queryValidation,
  validateRequest,
  async (req, res) => {
    await orderController.getPharmacyOrders(req, res);
  }
);

/**
 * @route   GET /api/v1/orders/my-orders
 * @desc    Get orders for patient (used by patient OrderManagement component)
 * @access  Private (Patient)
 */
router.get('/my-orders',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  queryValidation,
  validateRequest,
  async (req, res) => {
    await orderController.getPatientOrders(req, res);
  }
);

/**
 * @route   GET /api/v1/orders/:orderId
 * @desc    Get detailed order information
 * @access  Private (Order owner or pharmacy)
 */
router.get('/:orderId',
  authenticate,
  authorize(['patient', 'pharmacy', 'admin']),
  rateLimiter,
  orderIdValidation,
  validateRequest,
  async (req, res) => {
    await orderStatusController.getOrderDetails(req, res);
  }
);

/**
 * @route   PUT /api/v1/orders/:orderId/status
 * @desc    Update order status
 * @access  Private (Pharmacy or Admin)
 */
router.put('/:orderId/status',
  authenticate,
  authorize(['pharmacy', 'admin']),
  rateLimiter,
  orderIdValidation,
  updateStatusValidation,
  validateRequest,
  async (req, res) => {
    await orderStatusController.updateOrderStatus(req, res);
  }
);

/**
 * @route   PUT /api/v1/orders/:orderId/delivery-tracking
 * @desc    Update delivery tracking information
 * @access  Private (Pharmacy or Admin)
 */
router.put('/:orderId/delivery-tracking',
  authenticate,
  authorize(['pharmacy', 'admin']),
  rateLimiter,
  orderIdValidation,
  deliveryTrackingValidation,
  validateRequest,
  async (req, res) => {
    await orderStatusController.updateDeliveryTracking(req, res);
  }
);

/**
 * @route   POST /api/v1/orders/:orderId/complete
 * @desc    Confirm order completion (pickup or delivery)
 * @access  Private (Pharmacy, Patient, or Admin)
 */
router.post('/:orderId/complete',
  authenticate,
  authorize(['patient', 'pharmacy', 'admin']),
  rateLimiter,
  orderIdValidation,
  completionValidation,
  validateRequest,
  async (req, res) => {
    await orderStatusController.confirmCompletion(req, res);
  }
);

/**
 * @route   GET /api/v1/orders/analytics
 * @desc    Get order analytics for pharmacy or admin
 * @access  Private (Pharmacy or Admin)
 */
router.get('/analytics',
  authenticate,
  authorize(['pharmacy', 'admin']),
  rateLimiter,
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],
  validateRequest,
  async (req, res) => {
    await orderStatusController.getOrderAnalytics(req, res);
  }
);

/**
 * Pharmacy-specific routes
 */

/**
 * @route   GET /api/v1/orders/pharmacy/active
 * @desc    Get active orders for pharmacy
 * @access  Private (Pharmacy)
 */
router.get('/pharmacy/active',
  authenticate,
  authorize(['pharmacy']),
  rateLimiter,
  async (req, res) => {
    try {
      req.query = {
        ...req.query,
        status: [
          'order_placed',
          'prescription_verified',
          'payment_confirmed',
          'in_preparation',
          'quality_check',
          'ready_for_pickup',
          'ready_for_delivery',
          'out_for_delivery',
          'in_transit'
        ],
        sortBy: 'timing.orderPlaced',
        sortOrder: 'asc'
      };
      
      await orderStatusController.getUserOrders(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @route   GET /api/v1/orders/pharmacy/completed
 * @desc    Get completed orders for pharmacy
 * @access  Private (Pharmacy)
 */
router.get('/pharmacy/completed',
  authenticate,
  authorize(['pharmacy']),
  rateLimiter,
  async (req, res) => {
    try {
      req.query = {
        ...req.query,
        status: ['delivered', 'picked_up'],
        sortBy: 'timing.actualCompletion',
        sortOrder: 'desc'
      };
      
      await orderStatusController.getUserOrders(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve completed orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @route   GET /api/v1/orders/pharmacy/overdue
 * @desc    Get overdue orders for pharmacy
 * @access  Private (Pharmacy)
 */
router.get('/pharmacy/overdue',
  authenticate,
  authorize(['pharmacy']),
  rateLimiter,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const pharmacy = await Pharmacy.findOne({ owner: userId });
      
      if (!pharmacy) {
        return res.status(403).json({
          success: false,
          message: 'User is not associated with a pharmacy'
        });
      }

      const now = new Date();
      const overdueOrders = await Order.find({
        pharmacy: pharmacy._id,
        currentStatus: { $nin: ['delivered', 'picked_up', 'cancelled', 'refunded'] },
        'timing.estimatedCompletion': { $lt: now }
      })
      .populate('patient', 'profile contact')
      .populate('prescriptionRequest', 'requestNumber')
      .sort({ 'timing.estimatedCompletion': 1 });

      res.status(200).json({
        success: true,
        data: { 
          orders: overdueOrders,
          count: overdueOrders.length
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve overdue orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * Patient-specific routes
 */

/**
 * @route   GET /api/v1/orders/patient/active
 * @desc    Get active orders for patient
 * @access  Private (Patient)
 */
router.get('/patient/active',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  async (req, res) => {
    try {
      req.query = {
        ...req.query,
        status: [
          'order_placed',
          'prescription_verified',
          'payment_confirmed',
          'in_preparation',
          'quality_check',
          'ready_for_pickup',
          'ready_for_delivery',
          'out_for_delivery',
          'in_transit'
        ],
        sortBy: 'timing.orderPlaced',
        sortOrder: 'desc'
      };
      
      await orderStatusController.getUserOrders(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @route   GET /api/v1/orders/patient/history
 * @desc    Get order history for patient
 * @access  Private (Patient)
 */
router.get('/patient/history',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  async (req, res) => {
    try {
      req.query = {
        ...req.query,
        status: ['delivered', 'picked_up', 'cancelled', 'refunded'],
        sortBy: 'timing.actualCompletion',
        sortOrder: 'desc'
      };
      
      await orderStatusController.getUserOrders(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve order history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * Administrative routes
 */

/**
 * @route   GET /api/v1/orders/admin/stats
 * @desc    Get system-wide order statistics
 * @access  Private (Admin)
 */
router.get('/admin/stats',
  authenticate,
  authorize(['admin']),
  rateLimiter,
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const [
        totalOrders,
        completedOrders,
        activeOrders,
        overdueOrders,
        avgFulfillmentTime
      ] = await Promise.all([
        Order.countDocuments({ 'timing.orderPlaced': { $gte: startDate } }),
        Order.countDocuments({
          'timing.orderPlaced': { $gte: startDate },
          currentStatus: { $in: ['delivered', 'picked_up'] }
        }),
        Order.countDocuments({
          currentStatus: { $nin: ['delivered', 'picked_up', 'cancelled', 'refunded'] }
        }),
        Order.countDocuments({
          currentStatus: { $nin: ['delivered', 'picked_up', 'cancelled', 'refunded'] },
          'timing.estimatedCompletion': { $lt: new Date() }
        }),
        Order.aggregate([
          {
            $match: {
              'timing.orderPlaced': { $gte: startDate },
              'timing.actualFulfillmentTime': { $exists: true }
            }
          },
          {
            $group: {
              _id: null,
              avgTime: { $avg: '$timing.actualFulfillmentTime' }
            }
          }
        ])
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalOrders,
          completedOrders,
          activeOrders,
          overdueOrders,
          completionRate: totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(2) : 0,
          avgFulfillmentTime: avgFulfillmentTime[0]?.avgTime || 0,
          period: {
            days: parseInt(days),
            startDate,
            endDate: new Date()
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve admin statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// === REFILL REMINDER ROUTES ===

// Get user's refill reminders
router.get('/refill-reminders', authenticate, async (req, res) => {
  try {
    const reminders = await RefillReminder.find({ 
      userId: req.user.id,
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        reminders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve refill reminders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create refill reminder
router.post('/refill-reminders', authenticate, [
  body('medicationName')
    .trim()
    .notEmpty()
    .withMessage('Medication name is required')
    .isLength({ max: 200 })
    .withMessage('Medication name cannot exceed 200 characters'),
  body('daysBeforeEmpty')
    .isInt({ min: 1, max: 30 })
    .withMessage('Days before empty must be between 1 and 30'),
  body('reminderMethods')
    .isArray({ min: 1 })
    .withMessage('At least one reminder method is required')
    .custom((methods) => {
      const validMethods = ['email', 'sms', 'push'];
      return methods.every(method => validMethods.includes(method));
    })
    .withMessage('Invalid reminder methods'),
  body('recurring')
    .isBoolean()
    .withMessage('Recurring must be a boolean'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const reminderData = {
      ...req.body,
      userId: req.user.id,
      isActive: true,
      createdAt: new Date()
    };

    // Create placeholder reminder object (would use actual model in production)
    const reminder = {
      _id: new Date().getTime().toString(),
      ...reminderData
    };

    res.status(201).json({
      success: true,
      data: {
        reminder
      },
      message: 'Refill reminder created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create refill reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update refill reminder
router.put('/refill-reminders/:reminderId', authenticate, [
  body('medicationName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Medication name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Medication name cannot exceed 200 characters'),
  body('daysBeforeEmpty')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Days before empty must be between 1 and 30'),
  body('reminderMethods')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one reminder method is required')
    .custom((methods) => {
      const validMethods = ['email', 'sms', 'push'];
      return methods.every(method => validMethods.includes(method));
    })
    .withMessage('Invalid reminder methods'),
  body('recurring')
    .optional()
    .isBoolean()
    .withMessage('Recurring must be a boolean'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { reminderId } = req.params;

    // Update placeholder (would use actual model in production)
    const updatedReminder = {
      _id: reminderId,
      ...req.body,
      userId: req.user.id,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      data: {
        reminder: updatedReminder
      },
      message: 'Refill reminder updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update refill reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete refill reminder
router.delete('/refill-reminders/:reminderId', authenticate, async (req, res) => {
  try {
    const { reminderId } = req.params;

    // Delete placeholder (would use actual model in production)
    res.json({
      success: true,
      message: 'Refill reminder deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete refill reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/v1/orders/:orderId/cancel
 * @desc    Cancel order
 * @access  Private (Patient or Pharmacy)
 */
router.put('/:orderId/cancel',
  authenticate,
  authorize(['patient', 'pharmacy', 'admin']),
  rateLimiter,
  orderIdValidation,
  [
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason cannot exceed 500 characters')
  ],
  validateRequest,
  async (req, res) => {
    await orderController.cancelOrder(req, res);
  }
);

/**
 * @route   POST /api/v1/orders/:orderId/rate
 * @desc    Rate order
 * @access  Private (Patient)
 */
router.post('/:orderId/rate',
  authenticate,
  authorize(['patient']),
  rateLimiter,
  orderIdValidation,
  [
    body('rating')
      .notEmpty()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('review')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Review cannot exceed 1000 characters')
  ],
  validateRequest,
  async (req, res) => {
    await orderController.rateOrder(req, res);
  }
);

export default router;
