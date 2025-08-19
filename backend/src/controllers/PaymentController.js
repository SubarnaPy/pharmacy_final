/**
 * Payment Controller
 * Handles Stripe payment processing, payment intents, and payment management
 */

import Stripe from 'stripe';
import {Order} from '../models/Order.js';
import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import PrescriptionRequest from '../models/PrescriptionRequest.js';
import UserNotificationService from '../services/UserNotificationService.js';
import RealTimeNotificationService from '../services/RealTimeNotificationService.js';

// Initialize Stripe with secret key (use placeholder if not set)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key');

export class PaymentController {
  /**
   * Create payment intent for order
   */
  static async createPaymentIntent(req, res) {
    try {
      const { orderId, amount, currency = 'usd', paymentMethodId = null } = req.body;

      // Validate order exists and belongs to user
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.patient.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to access this order'
        });
      }

      // Create payment intent
      const paymentIntentData = {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          orderId: orderId,
          userId: req.user.id,
          userEmail: req.user.email
        },
        automatic_payment_methods: {
          enabled: true
        }
      };

      // If payment method provided, attach it
      if (paymentMethodId) {
        paymentIntentData.payment_method = paymentMethodId;
        paymentIntentData.confirmation_method = 'manual';
        paymentIntentData.confirm = true;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      // Update order with payment intent
      await Order.findByIdAndUpdate(orderId, {
        'payment.stripePaymentIntentId': paymentIntent.id,
        'payment.amount': amount,
        'payment.currency': currency,
        'payment.status': 'pending'
      });

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status
        }
      });

    } catch (error) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Confirm payment intent
   */
  static async confirmPaymentIntent(req, res) {
    try {
      const { paymentIntentId, paymentMethodId } = req.body;

      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId
      });

      // Update order status based on payment result
      const order = await Order.findOne({
        'payment.stripePaymentIntentId': paymentIntentId
      });

      if (order) {
        if (paymentIntent.status === 'succeeded') {
          await Order.findByIdAndUpdate(order._id, {
            'payment.status': 'completed',
            'payment.paidAt': new Date(),
            'payment.stripeChargeId': paymentIntent.charges?.data[0]?.id,
            currentStatus: 'payment_confirmed'
          });

          // Send enhanced payment success notifications
          try {
            const pharmacy = await Pharmacy.findById(order.pharmacyId);
            const pharmacyUser = pharmacy ? await User.findById(pharmacy.owner) : null;
            
            await UserNotificationService.sendPaymentSuccessful(
              paymentIntent.id,
              req.user.id,
              req.user.role,
              paymentIntent.amount / 100,
              order._id,
              pharmacyUser?._id
            );
            
            console.log('✅ Enhanced payment success notifications sent');
          } catch (notificationError) {
            console.error('⚠️ Failed to send payment success notification:', notificationError.message);
          }

          // Send notification
          await RealTimeNotificationService.sendOrderUpdate(order._id, {
            status: 'payment_confirmed',
            message: 'Payment processed successfully'
          });
        } else if (paymentIntent.status === 'requires_action') {
          // Handle 3D Secure or other authentication
          return res.json({
            success: true,
            requiresAction: true,
            clientSecret: paymentIntent.client_secret
          });
        } else {
          await Order.findByIdAndUpdate(order._id, {
            'payment.status': 'failed',
            'payment.failureReason': paymentIntent.last_payment_error?.message
          });

          // Send enhanced payment failure notification
          try {
            await UserNotificationService.sendPaymentFailed(
              paymentIntent.id,
              req.user.id,
              req.user.role,
              paymentIntent.amount / 100,
              paymentIntent.last_payment_error?.message
            );
          } catch (notificationError) {
            console.error('⚠️ Failed to send payment failure notification:', notificationError.message);
          }
        }
      }

      res.json({
        success: true,
        data: {
          status: paymentIntent.status,
          paymentIntent: paymentIntent
        }
      });

    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Create and attach payment method to customer
   */
  static async createPaymentMethod(req, res) {
    try {
      const { type, card, billing_details } = req.body;

      // Get or create Stripe customer
      let customer = await this.getOrCreateStripeCustomer(req.user);

      // Create payment method
      const paymentMethod = await stripe.paymentMethods.create({
        type,
        card,
        billing_details: {
          ...billing_details,
          email: req.user.email
        }
      });

      // Attach to customer
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customer.id
      });

      // Save payment method reference to user
      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          'paymentMethods': {
            stripePaymentMethodId: paymentMethod.id,
            type: paymentMethod.type,
            last4: paymentMethod.card?.last4,
            brand: paymentMethod.card?.brand,
            expiryMonth: paymentMethod.card?.exp_month,
            expiryYear: paymentMethod.card?.exp_year,
            isDefault: false,
            createdAt: new Date()
          }
        }
      });

      res.json({
        success: true,
        data: {
          paymentMethod: {
            id: paymentMethod.id,
            type: paymentMethod.type,
            card: paymentMethod.card
          }
        }
      });

    } catch (error) {
      console.error('Payment method creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment method',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get user's payment methods
   */
  static async getPaymentMethods(req, res) {
    try {
      const user = await User.findById(req.user.id);
      const paymentMethods = user.paymentMethods || [];

      // Get fresh data from Stripe for active methods
      const stripePaymentMethods = [];
      for (const pm of paymentMethods) {
        try {
          const stripePaymentMethod = await stripe.paymentMethods.retrieve(pm.stripePaymentMethodId);
          stripePaymentMethods.push({
            id: stripePaymentMethod.id,
            type: stripePaymentMethod.type,
            card: stripePaymentMethod.card,
            billing_details: stripePaymentMethod.billing_details,
            isDefault: pm.isDefault
          });
        } catch (err) {
          // Payment method might have been deleted
          console.warn(`Payment method ${pm.stripePaymentMethodId} not found in Stripe`);
        }
      }

      res.json({
        success: true,
        data: {
          paymentMethods: stripePaymentMethods
        }
      });

    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment methods',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Delete payment method
   */
  static async deletePaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.params;

      // Detach from Stripe
      await stripe.paymentMethods.detach(paymentMethodId);

      // Remove from user's payment methods
      await User.findByIdAndUpdate(req.user.id, {
        $pull: {
          paymentMethods: { stripePaymentMethodId: paymentMethodId }
        }
      });

      res.json({
        success: true,
        message: 'Payment method deleted successfully'
      });

    } catch (error) {
      console.error('Delete payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete payment method',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Set default payment method
   */
  static async setDefaultPaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.params;
      
      // Reset all payment methods to non-default
      await User.findByIdAndUpdate(req.user.id, {
        $set: {
          'paymentMethods.$[].isDefault': false
        }
      });

      // Set the specified method as default
      await User.findByIdAndUpdate(req.user.id, {
        $set: {
          'paymentMethods.$[elem].isDefault': true
        }
      }, {
        arrayFilters: [{ 'elem.stripePaymentMethodId': paymentMethodId }]
      });

      res.json({
        success: true,
        message: 'Default payment method updated'
      });

    } catch (error) {
      console.error('Set default payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set default payment method',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Process refund
   */
  static async processRefund(req, res) {
    try {
      const { orderId, amount, reason } = req.body;

      // Get order
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check authorization
      if (order.patient.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to refund this order'
        });
      }

      // Check if order has a successful payment
      if (!order.payment?.stripeChargeId || order.payment.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Order does not have a completed payment to refund'
        });
      }

      // Calculate refund amount
      const refundAmount = amount ? Math.round(amount * 100) : Math.round(order.payment.amount * 100);

      // Create refund in Stripe
      const refund = await stripe.refunds.create({
        charge: order.payment.stripeChargeId,
        amount: refundAmount,
        reason: reason || 'requested_by_customer',
        metadata: {
          orderId: orderId,
          userId: req.user.id
        }
      });

      // Update order
      await Order.findByIdAndUpdate(orderId, {
        'payment.refunds': [{
          stripeRefundId: refund.id,
          amount: refundAmount / 100,
          reason: reason,
          status: refund.status,
          createdAt: new Date()
        }],
        currentStatus: refund.amount === Math.round(order.payment.amount * 100) ? 'refunded' : 'partially_refunded'
      });

      // Send notification
      await RealTimeNotificationService.sendOrderUpdate(orderId, {
        status: 'refund_processed',
        message: `Refund of $${(refundAmount / 100).toFixed(2)} has been processed`
      });

      res.json({
        success: true,
        data: {
          refund: {
            id: refund.id,
            amount: refund.amount / 100,
            status: refund.status
          }
        },
        message: 'Refund processed successfully'
      });

    } catch (error) {
      console.error('Refund processing error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const orders = await Order.find({
        patient: req.user.id,
        'payment.status': { $exists: true }
      })
      .populate('pharmacy', 'name')
      .sort({ 'timing.orderPlaced': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      const totalOrders = await Order.countDocuments({
        patient: req.user.id,
        'payment.status': { $exists: true }
      });

      const payments = orders.map(order => ({
        orderId: order._id,
        orderNumber: order.orderNumber,
        pharmacy: order.pharmacy?.name,
        amount: order.payment.amount,
        currency: order.payment.currency,
        status: order.payment.status,
        paidAt: order.payment.paidAt,
        refunds: order.payment.refunds || [],
        medications: order.medications?.length || 0
      }));

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalOrders,
            pages: Math.ceil(totalOrders / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Handle Stripe webhooks
   */
  static async handleWebhook(req, res) {
    try {
      const sig = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object);
          break;
        
        case 'refund.updated':
          await this.handleRefundUpdated(event.data.object);
          break;
        
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });

    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook processing failed'
      });
    }
  }

  /**
   * Helper: Get or create Stripe customer
   */
  static async getOrCreateStripeCustomer(user) {
    if (user.stripeCustomerId) {
      try {
        return await stripe.customers.retrieve(user.stripeCustomerId);
      } catch (err) {
        // Customer might have been deleted, create new one
      }
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.profile?.firstName} ${user.profile?.lastName}`.trim(),
      metadata: {
        userId: user._id.toString()
      }
    });

    // Save customer ID to user
    await User.findByIdAndUpdate(user._id, {
      stripeCustomerId: customer.id
    });

    return customer;
  }

  /**
   * Helper: Handle successful payment
   */
  static async handlePaymentSucceeded(paymentIntent) {
    const order = await Order.findOne({
      'payment.stripePaymentIntentId': paymentIntent.id
    });

    if (order) {
      await Order.findByIdAndUpdate(order._id, {
        'payment.status': 'completed',
        'payment.paidAt': new Date(),
        'payment.stripeChargeId': paymentIntent.charges?.data[0]?.id,
        currentStatus: 'payment_confirmed'
      });

      await RealTimeNotificationService.sendOrderUpdate(order._id, {
        status: 'payment_confirmed',
        message: 'Payment completed successfully'
      });
    }
  }

  /**
   * Helper: Handle failed payment
   */
  static async handlePaymentFailed(paymentIntent) {
    const order = await Order.findOne({
      'payment.stripePaymentIntentId': paymentIntent.id
    });

    if (order) {
      await Order.findByIdAndUpdate(order._id, {
        'payment.status': 'failed',
        'payment.failureReason': paymentIntent.last_payment_error?.message
      });

      await RealTimeNotificationService.sendOrderUpdate(order._id, {
        status: 'payment_failed',
        message: 'Payment failed. Please try again.'
      });
    }
  }

  /**
   * Helper: Handle dispute created
   */
  static async handleDisputeCreated(dispute) {
    const order = await Order.findOne({
      'payment.stripeChargeId': dispute.charge
    });

    if (order) {
      await Order.findByIdAndUpdate(order._id, {
        'payment.disputes': [{
          stripeDisputeId: dispute.id,
          amount: dispute.amount / 100,
          reason: dispute.reason,
          status: dispute.status,
          createdAt: new Date()
        }]
      });

      // Notify admin about dispute
      await RealTimeNotificationService.sendAdminNotification({
        type: 'dispute_created',
        message: `Payment dispute created for order ${order.orderNumber}`,
        orderId: order._id
      });
    }
  }

  /**
   * Helper: Handle refund updated
   */
  static async handleRefundUpdated(refund) {
    const order = await Order.findOne({
      'payment.refunds.stripeRefundId': refund.id
    });

    if (order) {
      await Order.updateOne(
        { 
          _id: order._id,
          'payment.refunds.stripeRefundId': refund.id 
        },
        { 
          $set: { 
            'payment.refunds.$.status': refund.status 
          } 
        }
      );
    }
  }
}
