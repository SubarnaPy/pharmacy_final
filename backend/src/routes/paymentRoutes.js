/**
 * Payment Routes
 * Comprehensive payment processing routes with Stripe integration
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { PaymentController } from '../controllers/PaymentController.js';
import PaymentService from '../services/PaymentService.js';

const router = express.Router();

// === PAYMENT INTENT ROUTES ===

// Create payment intent
router.post('/create-payment-intent', authenticate, [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters'),
  body('paymentMethodId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Payment method ID cannot be empty')
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

    await PaymentController.createPaymentIntent(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Payment processing failed'
    });
  }
});

// Confirm payment intent
router.post('/confirm-payment-intent', authenticate, [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment intent ID is required'),
  body('paymentMethodId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Payment method ID cannot be empty')
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

    await PaymentController.confirmPaymentIntent(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Payment confirmation failed'
    });
  }
});

// === PAYMENT METHOD ROUTES ===

// Create payment method
router.post('/payment-methods', authenticate, [
  body('type')
    .notEmpty()
    .isIn(['card'])
    .withMessage('Payment method type must be card'),
  body('card')
    .isObject()
    .withMessage('Card information is required'),
  body('card.number')
    .notEmpty()
    .withMessage('Card number is required'),
  body('card.exp_month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Valid expiry month is required'),
  body('card.exp_year')
    .isInt({ min: new Date().getFullYear() })
    .withMessage('Valid expiry year is required'),
  body('card.cvc')
    .notEmpty()
    .withMessage('CVC is required'),
  body('billing_details')
    .optional()
    .isObject()
    .withMessage('Billing details must be an object')
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

    await PaymentController.createPaymentMethod(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to create payment method'
    });
  }
});

// Get user's payment methods
router.get('/payment-methods', authenticate, async (req, res) => {
  try {
    await PaymentController.getPaymentMethods(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to retrieve payment methods'
    });
  }
});

// Delete payment method
router.delete('/payment-methods/:paymentMethodId', authenticate, async (req, res) => {
  try {
    await PaymentController.deletePaymentMethod(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to delete payment method'
    });
  }
});

// Set default payment method
router.put('/payment-methods/:paymentMethodId/default', authenticate, async (req, res) => {
  try {
    await PaymentController.setDefaultPaymentMethod(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to set default payment method'
    });
  }
});

// === REFUND ROUTES ===

// Process refund
router.post('/refunds', authenticate, [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be greater than 0'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
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

    await PaymentController.processRefund(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Refund processing failed'
    });
  }
});

// === SUBSCRIPTION ROUTES ===

// Create subscription for recurring orders
router.post('/subscriptions', authenticate, [
  body('priceId')
    .notEmpty()
    .withMessage('Price ID is required'),
  body('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method ID is required'),
  body('trialPeriodDays')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Trial period must be between 0 and 365 days')
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

    // Get or create Stripe customer
    const customer = await PaymentController.getOrCreateStripeCustomer(req.user);
    
    const subscriptionData = {
      ...req.body,
      customerId: customer.id,
      metadata: {
        userId: req.user.id
      }
    };

    const result = await PaymentService.createSubscription(subscriptionData);
    
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Subscription created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Subscription creation failed'
    });
  }
});

// Update subscription
router.put('/subscriptions/:subscriptionId', authenticate, [
  body('action')
    .isIn(['pause', 'resume', 'cancel', 'update'])
    .withMessage('Invalid subscription action')
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

    const { subscriptionId } = req.params;
    const result = await PaymentService.updateSubscription(subscriptionId, req.body);
    
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Subscription updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Subscription update failed'
    });
  }
});

// === PAYMENT HISTORY AND ANALYTICS ===

// Get payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    await PaymentController.getPaymentHistory(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to retrieve payment history'
    });
  }
});

// Get payment analytics (admin only)
router.get('/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await PaymentService.generatePaymentAnalytics({ startDate, endDate });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.analytics
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Analytics retrieval failed'
    });
  }
});

// === DISPUTE MANAGEMENT (Admin only) ===

// Get disputes
router.get('/disputes', authenticate, authorize('admin'), async (req, res) => {
  try {
    // This would fetch disputes from Stripe
    res.json({
      success: true,
      data: {
        disputes: [],
        message: 'Dispute management endpoint - implementation depends on business requirements'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Handle dispute
router.put('/disputes/:disputeId', authenticate, authorize('admin'), [
  body('action')
    .isIn(['submit_evidence', 'close'])
    .withMessage('Invalid dispute action'),
  body('evidence')
    .optional()
    .isObject()
    .withMessage('Evidence must be an object')
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

    const { disputeId } = req.params;
    const { action, evidence } = req.body;
    
    const result = await PaymentService.manageDispute(disputeId, action, evidence);
    
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Dispute updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Dispute management failed'
    });
  }
});

// === WEBHOOK ROUTE ===

// Stripe webhook (requires raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    await PaymentController.handleWebhook(req, res);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// === UTILITY ROUTES ===

// Calculate order total
router.post('/calculate-total', authenticate, [
  body('medications')
    .isArray()
    .withMessage('Medications must be an array'),
  body('deliveryFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Delivery fee must be non-negative'),
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Tax rate must be between 0 and 1')
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

    const total = PaymentService.calculateOrderTotal(req.body);
    
    res.json({
      success: true,
      data: {
        pricing: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Total calculation failed'
    });
  }
});

// Validate payment method
router.get('/validate-payment-method/:paymentMethodId', authenticate, async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const validation = await PaymentService.validatePaymentMethod(paymentMethodId);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Validation failed'
    });
  }
});

// Create payment link
router.post('/payment-links', authenticate, [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be valid ISO8601 date')
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

    const result = await PaymentService.createPaymentLink(req.body);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.paymentLink,
        message: 'Payment link created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Payment link creation failed'
    });
  }
});

export default router;
