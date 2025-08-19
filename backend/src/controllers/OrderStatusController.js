import {Order} from '../models/Order.js';
import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import NotificationService from '../services/realtime/NotificationService.js';

/**
 * Order Status Controller
 * Handles order status updates, tracking, and notifications
 */
class OrderStatusController {
  constructor() {
    this.notificationService = new NotificationService();
    console.log('✅ Order Status Controller initialized');
  }

  /**
   * Get orders for pharmacy
   * GET /api/v1/orders/pharmacy/orders
   */
  async getPharmacyOrders(req, res) {
    try {
      const userId = req.user.id;
      const {
        status,
        dateRange,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        limit = 50,
        skip = 0
      } = req.query;

      // Get pharmacy for this user
      const user = await User.findById(userId);
      let pharmacy = null;

      if (user && user.pharmacy) {
        pharmacy = await Pharmacy.findById(user.pharmacy);
      } else {
        pharmacy = await Pharmacy.findOne({ owner: userId });
        if (pharmacy && user) {
          await User.findByIdAndUpdate(userId, { pharmacy: pharmacy._id });
        }
      }

      if (!pharmacy) {
        return res.status(403).json({
          success: false,
          message: 'User is not associated with a pharmacy'
        });
      }

      // Build query
      const query = { pharmacyId: pharmacy._id };

      // Add status filter
      if (status && status !== 'all') {
        query.status = status;
      }

      // Add date range filter
      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        let startDate;

        switch (dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }

        if (startDate) {
          query.createdAt = { $gte: startDate };
        }
      }

      // Add search filter
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'patient.profile.firstName': { $regex: search, $options: 'i' } },
          { 'patient.profile.lastName': { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort criteria
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const orders = await Order.find(query)
        .populate('patientId', 'profile contact')
        .populate('pharmacyId', 'name address phone')
        .populate('prescriptionId', 'medications')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: orders
      });

    } catch (error) {
      console.error('❌ Error getting pharmacy orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get orders for patient
   * GET /api/v1/orders/my-orders
   */
  async getPatientOrders(req, res) {
    try {
      const userId = req.user.id;
      const {
        status,
        dateRange,
        search,
        limit = 50,
        skip = 0
      } = req.query;

      // Build query
      const query = { patientId: userId };

      // Add status filter
      if (status && status !== 'all') {
        query.status = status;
      }

      // Add date range filter
      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        let startDate;

        switch (dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }

        if (startDate) {
          query.createdAt = { $gte: startDate };
        }
      }

      // Add search filter
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'pharmacy.name': { $regex: search, $options: 'i' } }
        ];
      }

      const orders = await Order.find(query)
        .populate('patientId', 'profile contact')
        .populate('pharmacyId', 'name address phone rating')
        .populate('prescriptionId', 'medications')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      // Add additional fields for patient view
      const ordersWithExtras = orders.map(order => ({
        ...order.toObject(),
        canCancel: ['pending', 'confirmed'].includes(order.status),
        canRate: order.status === 'delivered' && !order.rating,
        trackingNumber: order.trackingInfo?.trackingNumber || `TRK${order.orderNumber.slice(-6)}`
      }));

      res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: ordersWithExtras
      });

    } catch (error) {
      console.error('❌ Error getting patient orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update order status
   * PUT /api/v1/orders/:orderId/status
   */
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, notes, updatedBy } = req.body;
      const userId = req.user.id;

      const order = await Order.findById(orderId)
        .populate('patientId', 'profile contact')
        .populate('pharmacyId', 'name address phone');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Authorization check
      let authorized = false;
      if (req.user.role === 'pharmacy') {
        // Check if user owns the pharmacy
        const pharmacy = await Pharmacy.findOne({ owner: userId });
        authorized = pharmacy && order.pharmacyId._id.toString() === pharmacy._id.toString();
      } else if (req.user.role === 'patient') {
        // Patients can only cancel their own orders
        authorized = order.patientId._id.toString() === userId && status === 'cancelled';
      } else if (req.user.role === 'admin') {
        authorized = true;
      }

      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to update this order'
        });
      }

      // Update order status
      const previousStatus = order.status;
      order.status = status;
      order.updatedAt = new Date();

      // Add status history entry
      if (!order.statusHistory) {
        order.statusHistory = [];
      }

      order.statusHistory.push({
        status,
        updatedBy: userId,
        timestamp: new Date(),
        notes: notes || ''
      });

      // Set specific timestamps based on status
      switch (status) {
        case 'confirmed':
          order.confirmedAt = new Date();
          break;
        case 'preparing':
          order.preparingAt = new Date();
          break;
        case 'ready':
          order.readyAt = new Date();
          break;
        case 'out_for_delivery':
          order.shippedAt = new Date();
          break;
        case 'delivered':
          order.deliveredAt = new Date();
          break;
        case 'cancelled':
          order.cancelledAt = new Date();
          order.cancellationReason = notes || 'Cancelled by user';
          break;
      }

      await order.save();

      // Trigger order status update notification
      if (req.notify) {
        await req.notify.trigger('order.status_updated', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerId: order.patientId._id,
          pharmacyId: order.pharmacyId._id,
          pharmacyName: order.pharmacyId.name,
          previousStatus: previousStatus,
          newStatus: status,
          updatedBy: userId,
          updatedAt: new Date(),
          notes: notes
        });
      }

      // Send notification to patient about status change
      if (req.user.role === 'pharmacy') {
        await this.notificationService.createNotification({
          type: 'order_status_update',
          recipient: order.patientId._id,
          recipientType: 'patient',
          title: 'Order Status Updated',
          message: `Your order ${order.orderNumber} status has been updated to ${this.getStatusLabel(status)}`,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status,
            pharmacyName: order.pharmacyId.name
          },
          priority: 'medium'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: order
      });

    } catch (error) {
      console.error('❌ Error updating order status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Cancel order
   * PUT /api/v1/orders/:orderId/cancel
   */
  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const order = await Order.findById(orderId)
        .populate('patientId', 'profile contact')
        .populate('pharmacyId', 'name address phone');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if user can cancel this order
      const canCancel = (
        (req.user.role === 'patient' && order.patientId._id.toString() === userId) ||
        (req.user.role === 'pharmacy' && order.pharmacyId.owner?.toString() === userId) ||
        req.user.role === 'admin'
      ) && ['pending', 'confirmed'].includes(order.status);

      if (!canCancel) {
        return res.status(403).json({
          success: false,
          message: 'Cannot cancel this order'
        });
      }

      // Update order status to cancelled
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.cancellationReason = reason || 'Cancelled by user';
      order.updatedAt = new Date();

      // Add to status history
      if (!order.statusHistory) {
        order.statusHistory = [];
      }

      order.statusHistory.push({
        status: 'cancelled',
        updatedBy: userId,
        timestamp: new Date(),
        notes: reason || 'Order cancelled'
      });

      await order.save();

      // Send notification to the other party
      const notificationRecipient = req.user.role === 'patient' ? order.pharmacyId.owner : order.patientId._id;
      const notificationMessage = req.user.role === 'patient' 
        ? `Order ${order.orderNumber} has been cancelled by the patient`
        : `Order ${order.orderNumber} has been cancelled by the pharmacy`;

      await this.notificationService.createNotification({
        type: 'order_cancelled',
        recipient: notificationRecipient,
        recipientType: req.user.role === 'patient' ? 'pharmacy' : 'patient',
        title: 'Order Cancelled',
        message: notificationMessage,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          reason: reason || 'No reason provided'
        },
        priority: 'medium'
      });

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: order
      });

    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Rate order
   * POST /api/v1/orders/:orderId/rate
   */
  async rateOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { rating, review } = req.body;
      const userId = req.user.id;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      const order = await Order.findById(orderId)
        .populate('patientId', 'profile contact')
        .populate('pharmacyId', 'name address phone');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if user can rate this order
      if (order.patientId._id.toString() !== userId || order.status !== 'delivered') {
        return res.status(403).json({
          success: false,
          message: 'Cannot rate this order'
        });
      }

      if (order.rating) {
        return res.status(400).json({
          success: false,
          message: 'Order has already been rated'
        });
      }

      // Update order with rating
      order.rating = rating;
      order.review = review || '';
      order.ratedAt = new Date();
      order.updatedAt = new Date();

      await order.save();

      // Update pharmacy's overall rating
      await this.updatePharmacyRating(order.pharmacyId._id);

      // Send notification to pharmacy
      await this.notificationService.createNotification({
        type: 'order_rated',
        recipient: order.pharmacyId.owner,
        recipientType: 'pharmacy',
        title: 'Order Rated',
        message: `Order ${order.orderNumber} has been rated ${rating} stars`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          rating,
          review: review || ''
        },
        priority: 'low'
      });

      res.status(200).json({
        success: true,
        message: 'Order rated successfully',
        data: order
      });

    } catch (error) {
      console.error('❌ Error rating order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rate order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get order details
   * GET /api/v1/orders/:orderId
   */
  async getOrderDetails(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await Order.findById(orderId)
        .populate('patientId', 'profile contact')
        .populate('pharmacyId', 'name address phone rating')
        .populate('prescriptionId', 'medications');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check authorization
      let authorized = false;
      if (req.user.role === 'patient') {
        authorized = order.patientId._id.toString() === userId;
      } else if (req.user.role === 'pharmacy') {
        const pharmacy = await Pharmacy.findOne({ owner: userId });
        authorized = pharmacy && order.pharmacyId._id.toString() === pharmacy._id.toString();
      } else if (req.user.role === 'admin') {
        authorized = true;
      }

      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this order'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Order details retrieved successfully',
        data: order
      });

    } catch (error) {
      console.error('❌ Error getting order details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve order details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update pharmacy's overall rating based on order ratings
   * @param {string} pharmacyId - Pharmacy ID
   */
  async updatePharmacyRating(pharmacyId) {
    try {
      const orders = await Order.find({
        pharmacyId: pharmacyId,
        rating: { $exists: true, $ne: null }
      });

      if (orders.length === 0) return;

      const totalRating = orders.reduce((sum, order) => sum + order.rating, 0);
      const averageRating = totalRating / orders.length;

      await Pharmacy.findByIdAndUpdate(pharmacyId, {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        reviewCount: orders.length
      });

    } catch (error) {
      console.error('❌ Error updating pharmacy rating:', error);
    }
  }

  /**
   * Get human-readable status label
   * @param {string} status - Order status
   * @returns {string} - Human-readable label
   */
  getStatusLabel(status) {
    const statusLabels = {
      'pending': 'Order Placed',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'ready': 'Ready for Pickup',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };

    return statusLabels[status] || status;
  }
}

export default OrderStatusController;