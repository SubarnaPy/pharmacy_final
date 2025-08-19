import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Appointment from '../models/Appointment.js';
import NotificationService from './NotificationService.js';

class PaymentService {
  constructor() {
    // Initialize Razorpay only if credentials are available and not placeholders
    const hasValidCredentials = process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_KEY_ID !== 'your-razorpay-key-id' &&
      process.env.RAZORPAY_KEY_SECRET !== 'your-razorpay-key-secret';

    if (hasValidCredentials) {
      try {
        this.razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        console.log('✅ Razorpay initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Razorpay:', error.message);
        this.razorpay = null;
      }
    } else {
      console.warn('⚠️ Razorpay credentials not configured. Payment features will use mock responses.');
      this.razorpay = null;
    }

    // Platform fee percentage
    this.platformFeePercentage = 0.10; // 10%
    this.gstPercentage = 0.18; // 18%
  }

  // Calculate payment breakdown
  calculatePaymentBreakdown(consultationFee, discountAmount = 0, couponDiscount = 0) {
    const baseAmount = consultationFee - discountAmount - couponDiscount;
    const platformFee = Math.round(baseAmount * this.platformFeePercentage);
    const subtotal = baseAmount + platformFee;
    const gst = Math.round(subtotal * this.gstPercentage);
    const totalAmount = subtotal + gst;

    return {
      consultationFee,
      platformFee,
      gst,
      discount: discountAmount,
      couponDiscount,
      totalAmount
    };
  }

  // Create Razorpay order
  async createRazorpayOrder(amount, currency = 'INR', notes = {}) {
    try {
      if (!this.razorpay) {
        return {
          success: false,
          error: 'Razorpay not initialized. Please check your credentials.'
        };
      }

      const order = await this.razorpay.orders.create({
        amount: amount * 100, // Amount in paise
        currency,
        notes,
        receipt: `receipt_${Date.now()}`
      });

      return {
        success: true,
        order
      };
    } catch (error) {
      console.error('Razorpay order creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify Razorpay payment signature
  verifyRazorpaySignature(orderId, paymentId, signature) {
    try {
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  // Process payment for appointment
  async processAppointmentPayment(appointmentId, paymentData) {
    try {
      const {
        paymentId,
        orderId,
        signature,
        paymentMethod,
        gatewayResponse
      } = paymentData;

      // Find appointment and associated payment record
      const appointment = await Appointment.findById(appointmentId)
        .populate('patient', 'name email phone')
        .populate('doctor', 'name email');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const payment = await Payment.findOne({ appointment: appointmentId });
      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Verify payment signature for Razorpay
      if (paymentMethod === 'razorpay') {
        const isSignatureValid = this.verifyRazorpaySignature(orderId, paymentId, signature);
        if (!isSignatureValid) {
          throw new Error('Invalid payment signature');
        }
      }

      // Update payment record
      payment.status = 'completed';
      payment.paymentMethod = paymentMethod;
      payment.transactionId = paymentId;
      payment.gatewayTransactionId = paymentId;
      payment.gatewayOrderId = orderId;
      payment.gatewayResponse = {
        raw: gatewayResponse,
        status: 'success',
        message: 'Payment completed successfully'
      };
      payment.completedAt = new Date();

      await payment.save();

      // Update appointment status and payment details
      appointment.status = 'confirmed';
      appointment.payment.status = 'completed';
      appointment.payment.method = paymentMethod;
      appointment.payment.transactionId = paymentId;
      appointment.payment.paidAt = new Date();

      await appointment.save();

      // Send payment confirmation notification
      await NotificationService.sendPaymentConfirmation(payment._id, appointmentId);

      // Send appointment confirmation
      await NotificationService.sendAppointmentConfirmation(appointmentId);

      return {
        success: true,
        payment,
        appointment,
        message: 'Payment processed successfully'
      };
    } catch (error) {
      console.error('Payment processing failed:', error);

      // Update payment status to failed
      try {
        const payment = await Payment.findOne({ appointment: appointmentId });
        if (payment) {
          payment.status = 'failed';
          payment.gatewayResponse = {
            status: 'failed',
            message: error.message
          };
          payment.failedAt = new Date();
          await payment.save();
        }
      } catch (updateError) {
        console.error('Failed to update payment status:', updateError);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Initiate refund
  async initiateRefund(paymentId, refundAmount, reason, initiatedBy) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments');
      }

      const maxRefundAmount = payment.amount - (payment.refund?.amount || 0);
      if (refundAmount > maxRefundAmount) {
        throw new Error('Refund amount exceeds available refund amount');
      }

      // Create refund in payment gateway
      let refundResponse;
      if (payment.paymentProvider === 'razorpay') {
        refundResponse = await this.createRazorpayRefund(
          payment.gatewayTransactionId,
          refundAmount * 100 // Amount in paise
        );
      }

      if (!refundResponse.success) {
        throw new Error(`Refund failed: ${refundResponse.error}`);
      }

      // Update payment record
      payment.refund = {
        amount: refundAmount,
        reason,
        initiatedBy,
        initiatedAt: new Date(),
        status: 'processing',
        refundTransactionId: refundResponse.refund.id,
        gatewayResponse: refundResponse.refund
      };

      await payment.save();

      // Update appointment if full refund
      if (refundAmount >= payment.amount) {
        const appointment = await Appointment.findById(payment.appointment);
        if (appointment) {
          appointment.payment.status = 'refunded';
          await appointment.save();
        }
      }

      return {
        success: true,
        refund: payment.refund,
        message: 'Refund initiated successfully'
      };
    } catch (error) {
      console.error('Refund initiation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create Razorpay refund
  async createRazorpayRefund(paymentId, amount, notes = {}) {
    try {
      if (!this.razorpay) {
        return {
          success: false,
          error: 'Razorpay not initialized. Please check your credentials.'
        };
      }

      const refund = await this.razorpay.payments.refund(paymentId, {
        amount,
        notes,
        receipt: `refund_${Date.now()}`
      });

      return {
        success: true,
        refund
      };
    } catch (error) {
      console.error('Razorpay refund creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process doctor settlement
  async processDoctorSettlement(doctorId, settlementAmount, bankDetails) {
    try {
      // Find pending settlements for doctor
      const pendingPayments = await Payment.findPendingSettlements(doctorId, 100);

      let totalSettlementAmount = 0;
      const settledPayments = [];

      for (const payment of pendingPayments) {
        if (totalSettlementAmount + payment.settlement.amount <= settlementAmount) {
          totalSettlementAmount += payment.settlement.amount;
          settledPayments.push(payment);
        }
      }

      if (totalSettlementAmount === 0) {
        throw new Error('No pending settlements found');
      }

      // Generate UTR number (in real implementation, this would come from bank)
      const utrNumber = `UTR${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Update payment records
      for (const payment of settledPayments) {
        await payment.processSettlement(utrNumber, bankDetails);
      }

      return {
        success: true,
        totalAmount: totalSettlementAmount,
        paymentsSettled: settledPayments.length,
        utrNumber,
        message: 'Settlement processed successfully'
      };
    } catch (error) {
      console.error('Settlement processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get payment analytics
  async getPaymentAnalytics(startDate, endDate, filters = {}) {
    try {
      const matchQuery = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

      if (filters.status) {
        matchQuery.status = filters.status;
      }

      if (filters.paymentMethod) {
        matchQuery.paymentMethod = filters.paymentMethod;
      }

      const analytics = await Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$breakdown.platformFee' },
            totalGST: { $sum: '$breakdown.gst' },
            totalTransactions: { $sum: 1 },
            totalVolume: { $sum: '$amount' },
            averageTransaction: { $avg: '$amount' },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            totalRefunds: {
              $sum: { $cond: [{ $gt: ['$refund.amount', 0] }, '$refund.amount', 0] }
            }
          }
        }
      ]);

      // Payment method breakdown
      const paymentMethodBreakdown = await Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      // Daily trend
      const dailyTrend = await Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$breakdown.platformFee' },
            transactions: { $sum: 1 },
            volume: { $sum: '$amount' }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      return {
        success: true,
        analytics: analytics[0] || {},
        paymentMethodBreakdown,
        dailyTrend
      };
    } catch (error) {
      console.error('Failed to get payment analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Handle payment webhooks
  async handleWebhook(provider, payload, signature) {
    try {
      let event;

      if (provider === 'razorpay') {
        // Verify webhook signature
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
          .update(JSON.stringify(payload))
          .digest('hex');

        if (expectedSignature !== signature) {
          throw new Error('Invalid webhook signature');
        }

        event = payload;
      }

      // Process different event types
      switch (event.event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(event.payload.payment.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(event.payload.payment.entity);
          break;
        case 'refund.processed':
          await this.handleRefundProcessed(event.payload.refund.entity);
          break;
        default:
          console.log(`Unhandled webhook event: ${event.event}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook handling failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle payment captured webhook
  async handlePaymentCaptured(paymentData) {
    try {
      const payment = await Payment.findOne({
        gatewayTransactionId: paymentData.id
      });

      if (payment && payment.status !== 'completed') {
        payment.status = 'completed';
        payment.completedAt = new Date();
        payment.gatewayResponse.raw = paymentData;
        await payment.save();

        // Update appointment
        const appointment = await Appointment.findById(payment.appointment);
        if (appointment) {
          appointment.status = 'confirmed';
          appointment.payment.status = 'completed';
          await appointment.save();
        }

        console.log(`Payment captured: ${payment._id}`);
      }
    } catch (error) {
      console.error('Failed to handle payment captured:', error);
    }
  }

  // Handle payment failed webhook
  async handlePaymentFailed(paymentData) {
    try {
      const payment = await Payment.findOne({
        gatewayTransactionId: paymentData.id
      });

      if (payment && payment.status === 'processing') {
        payment.status = 'failed';
        payment.failedAt = new Date();
        payment.gatewayResponse.raw = paymentData;
        payment.gatewayResponse.message = paymentData.error_description || 'Payment failed';
        await payment.save();

        console.log(`Payment failed: ${payment._id}`);
      }
    } catch (error) {
      console.error('Failed to handle payment failed:', error);
    }
  }

  // Handle refund processed webhook
  async handleRefundProcessed(refundData) {
    try {
      const payment = await Payment.findOne({
        'refund.refundTransactionId': refundData.id
      });

      if (payment && payment.refund.status === 'processing') {
        payment.refund.status = 'completed';
        payment.refund.completedAt = new Date();
        payment.refund.gatewayResponse = refundData;

        // Update main payment status
        if (payment.refund.amount >= payment.amount) {
          payment.status = 'refunded';
        } else {
          payment.status = 'partially-refunded';
        }

        await payment.save();

        console.log(`Refund processed: ${payment._id}`);
      }
    } catch (error) {
      console.error('Failed to handle refund processed:', error);
    }
  }

  // Additional methods for compatibility with payment routes

  // Create subscription (placeholder for Razorpay subscriptions)
  async createSubscription(subscriptionData) {
    try {
      // This would be implemented with Razorpay subscriptions
      console.log('Creating subscription:', subscriptionData);
      return {
        success: false,
        error: 'Subscription feature not implemented for Razorpay yet'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update subscription (placeholder)
  async updateSubscription(subscriptionId, updateData) {
    try {
      console.log('Updating subscription:', subscriptionId, updateData);
      return {
        success: false,
        error: 'Subscription update feature not implemented for Razorpay yet'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate payment analytics
  async generatePaymentAnalytics(dateRange = {}) {
    try {
      const { startDate, endDate, timeRange } = dateRange;

      // If timeRange is provided, calculate dates
      let start, end;
      if (timeRange) {
        end = new Date();
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
        start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
      } else {
        start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        end = endDate ? new Date(endDate) : new Date();
      }

      // Call the existing getPaymentAnalytics method
      const result = await this.getPaymentAnalytics(start, end);

      return {
        success: true,
        analytics: result.analytics || result,
        paymentMethodBreakdown: result.paymentMethodBreakdown || [],
        dailyTrend: result.dailyTrend || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Manage dispute (placeholder)
  async manageDispute(disputeId, action, evidence = {}) {
    try {
      console.log('Managing dispute:', disputeId, action, evidence);
      return {
        success: false,
        error: 'Dispute management not implemented for Razorpay yet'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calculate order total
  calculateOrderTotal(orderData) {
    try {
      const { medications = [], deliveryFee = 0, taxRate = 0.18 } = orderData;

      let subtotal = 0;
      medications.forEach(med => {
        subtotal += (med.price || 0) * (med.quantity || 1);
      });

      const tax = subtotal * taxRate;
      const total = subtotal + deliveryFee + tax;

      return {
        subtotal,
        deliveryFee,
        tax,
        total
      };
    } catch (error) {
      throw new Error(`Order total calculation failed: ${error.message}`);
    }
  }

  // Validate payment method (placeholder)
  async validatePaymentMethod(paymentMethodId) {
    try {
      console.log('Validating payment method:', paymentMethodId);
      return {
        isValid: true,
        warnings: [],
        errors: []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  // Create payment link (placeholder)
  async createPaymentLink(orderData) {
    try {
      console.log('Creating payment link:', orderData);
      return {
        success: false,
        error: 'Payment link creation not implemented for Razorpay yet'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new PaymentService();
