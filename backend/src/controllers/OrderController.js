import {Order} from '../models/Order.js';
import PrescriptionRequest from '../models/PrescriptionRequest.js';
import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import UserNotificationService from '../services/UserNotificationService.js';
import NotificationService from '../services/realtime/NotificationService.js';
import ConversationController from './ConversationController.js';

class OrderController {
  constructor() {
    this.notificationService = new NotificationService();
    this.conversationController = new ConversationController();
    console.log('✅ Order Controller initialized');
  }
  /**
   * POST /api/v1/orders/create-from-prescription
   * Create an order from a prescription request and selected pharmacy
   */
  async createFromPrescription(req, res) {
    console.log('🚀 === CREATE ORDER FROM PRESCRIPTION START ===');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Request params:', req.params);
    console.log('🔍 Request query:', req.query);
    try {
        const {
            prescriptionRequestId,
            selectedPharmacyId,
            pharmacyResponseId,
            quotedPrice,
            estimatedFulfillmentTime,
            notes
        } = req.body;

        const userId = req.user.id;
        console.log('🔍 Creating order for user:', userId);
        console.log('🔍 Request data:', {
            prescriptionRequestId,
            selectedPharmacyId,
            pharmacyResponseId,
            quotedPrice,
            estimatedFulfillmentTime
        });

        // Validate prescription request exists and belongs to user
        const prescriptionRequest = await PrescriptionRequest.findOne({
            _id: prescriptionRequestId,
            isActive: true,
            patient: userId
        });

        if (!prescriptionRequest) {
            return res.status(404).json({
                success: false,
                message: 'Prescription request not found'
            });
        }

        // Find the specific pharmacy response
        const pharmacyResponse = prescriptionRequest.pharmacyResponses.find(
            response => response._id.toString() === pharmacyResponseId &&
                       response.pharmacyId.toString() === selectedPharmacyId &&
                       response.status === 'accepted'
        );

        if (!pharmacyResponse) {
            return res.status(404).json({
                success: false,
                message: 'Pharmacy response not found or not accepted'
            });
        }

        // Get pharmacy details
        const pharmacy = await Pharmacy.findById(selectedPharmacyId);
        if (!pharmacy) {
            return res.status(404).json({
                success: false,
                message: 'Pharmacy not found'
            });
        }
        console.log('🔍 Pharmacy details:', pharmacyResponse);

        // Build order items from prescriptionRequest.medications
        const items = prescriptionRequest.medications.map(med => {
            let quantity = 1; // Default quantity
            
            // Handle different quantity formats
            if (typeof med.quantity === 'number') {
                quantity = med.quantity;
            } else if (typeof med.quantity === 'object' && med.quantity !== null) {
                quantity = med.quantity.prescribed || med.quantity.value || 1;
            }
            
            // Convert dosage object to string format
            let dosageString = 'As prescribed';
            if (med.dosage) {
                if (typeof med.dosage === 'string') {
                    dosageString = med.dosage;
                } else if (typeof med.dosage === 'object') {
                    // Convert dosage object to readable string
                    const parts = [];
                    if (med.dosage.instructions) parts.push(med.dosage.instructions);
                    if (med.dosage.frequency) parts.push(`(${med.dosage.frequency})`);
                    if (med.dosage.duration) parts.push(`for ${med.dosage.duration}`);
                    dosageString = parts.length > 0 ? parts.join(' ') : 'As prescribed';
                }
            }
            
            return {
                medicationName: med.name,
                dosage: dosageString,
                quantity: quantity,
                unitPrice: 0, // Will be calculated from total
                totalPrice: 0, // Will be calculated from total
                notes: pharmacyResponse.notes || ''
            };
        });

        // Use the pharmacy's total quoted price as the total amount
        const totalAmount = quotedPrice?.total || 0;

        // Distribute the total amount across items for unit price calculation
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQuantity > 0 && totalAmount > 0) {
            items.forEach(item => {
                const itemRatio = item.quantity / totalQuantity;
                item.totalPrice = Math.round(totalAmount * itemRatio * 100) / 100; // Round to 2 decimal places
                item.unitPrice = item.quantity > 0 ? Math.round((item.totalPrice / item.quantity) * 100) / 100 : 0;
            });
        }

        // Validate and set delivery method - handle 'either' case
        let deliveryMethod = prescriptionRequest.preferences?.deliveryMethod;
        
        // If deliveryMethod is 'either' or invalid, default to 'pickup'
        const validDeliveryMethods = ['delivery', 'pickup'];
        if (!validDeliveryMethods.includes(deliveryMethod)) {
            deliveryMethod = 'pickup'; // Default to 'pickup'
        }

        // Build orderType and delivery/pickup info
        const orderType = deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
        const deliveryInfo = orderType === 'delivery' ? {
            address: prescriptionRequest.preferences?.deliveryAddress || {},
            deliveryFee: 5.99,
            estimatedDeliveryTime: pharmacyResponse.estimatedFulfillmentTime ? new Date(Date.now() + pharmacyResponse.estimatedFulfillmentTime * 60000) : undefined
        } : undefined;
        const pickupInfo = orderType === 'pickup' ? {
            estimatedPickupTime: pharmacyResponse.estimatedFulfillmentTime ? new Date(Date.now() + pharmacyResponse.estimatedFulfillmentTime * 60000) : undefined
        } : undefined;

        // Generate order number
        const orderNumber = `ORD-${Date.now()}`;

        // Create the order
        const orderData = {
            prescriptionId: prescriptionRequestId,
            patientId: userId,
            pharmacyId: selectedPharmacyId,
            orderType,
            items,
            totalAmount,
            deliveryInfo,
            pickupInfo,
            status: 'placed',
            pharmacyNotes: pharmacyResponse.notes || '',
            patientNotes: notes || '',
            placedAt: new Date(),
            isUrgent: false,
            prescriptionVerified: true,
            orderNumber,
            paymentInfo: { method: 'card' } // Use a valid enum value
        };

        const order = new Order(orderData);
        await order.save();

        // Update prescription request status and selected pharmacy using updateOne to avoid validation issues
        await PrescriptionRequest.updateOne(
            { _id: prescriptionRequestId },
            { 
                $set: { 
                    status: 'accepted',
                    selectedPharmacy: selectedPharmacyId
                }
            }
        );

        console.log('✅ Order created successfully:', order.orderNumber);

        // Send comprehensive notifications for order creation
        try {
          const patient = await User.findById(userId);
          const pharmacyUser = await User.findById(pharmacy.owner);
          
          // Send order placed notifications to both patient and pharmacy
          await UserNotificationService.sendOrderPlaced(
            order._id,
            userId,
            patient?.name || 'Patient',
            pharmacy.owner,
            pharmacy.name,
            totalAmount
          );
          
          console.log('✅ Enhanced order creation notifications sent');
        } catch (notificationError) {
          console.error('⚠️ Failed to send order notifications:', notificationError.message);
        }

        // Auto-create conversation for the new order
        try {
    await this.conversationController.autoCreateOrderConversation(order._id, pharmacy.owner, userId);
    console.log('✅ Order conversation created');
  } catch (convError) {
    console.error('⚠️ Failed to create order conversation:', convError.message);
  }

        // Populate the order for response
        const populatedOrder = await Order.findById(order._id)
            .populate('pharmacyId', 'name address phone')
            .populate('patientId', 'profile contact')
            .populate('prescriptionId', 'medications');

        return res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: populatedOrder
        });

    } catch (error) {
        console.error('❌ Error creating order from prescription:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
  }

  /**
   * GET /api/v1/orders/:orderId
   * Get order details
   */
  async getOrderDetails(req, res) {
    console.log('🚀 === GET ORDER DETAILS START ===');
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      console.log('🔍 Getting order details:', orderId, 'for user:', userId);

      let query = { _id: orderId };

      // Add access control based on user role
      if (userRole === 'patient') {
        query.patientId = userId;
      } else if (userRole === 'pharmacy') {
        const pharmacy = await Pharmacy.findOne({ user: userId });
        if (!pharmacy) {
          return res.status(404).json({
            success: false,
            message: 'Pharmacy not found for this user'
          });
        }
        query.pharmacyId = pharmacy._id;
      }

      const order = await Order.findOne(query)
        .populate('pharmacyId', 'name address phone')
        .populate('patientId', 'profile contact')
        .populate('prescriptionId', 'medications');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      console.log('✅ Order details retrieved:', order.orderNumber);

      return res.status(200).json({
        success: true,
        message: 'Order details retrieved successfully',
        data: order
      });

    } catch (error) {
      console.error('❌ Error getting order details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve order details',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/v1/orders/:orderId/status
   * Update order status
   */
  async updateOrderStatus(req, res) {
    console.log('🚀 === UPDATE ORDER STATUS START ===');
    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      console.log('🔍 Updating order status:', orderId, 'to:', status);

      let query = { _id: orderId };

      // Add access control based on user role
      if (userRole === 'patient') {
        query.patientId = userId;
        // Patients can only cancel orders
        if (!['cancelled'].includes(status)) {
          return res.status(403).json({
            success: false,
            message: 'Patients can only cancel orders'
          });
        }
      } else if (userRole === 'pharmacy') {
        const pharmacy = await Pharmacy.findOne({ user: userId });
        if (!pharmacy) {
          return res.status(404).json({
            success: false,
            message: 'Pharmacy not found for this user'
          });
        }
        query.pharmacyId = pharmacy._id;
      }

      const order = await Order.findOne(query);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if status change is valid
      if (status === 'cancelled' && !order.canBeCancelled()) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled in its current status'
        });
      }

      await order.updateStatus(status, notes, userId);

      // Auto-create order conversation when order is confirmed
      if (status === 'confirmed' && userRole === 'pharmacy') {
        try {
          await this.conversationController.autoCreateOrderConversation(order._id, userId);
          console.log('✅ Order conversation created for:', order.orderNumber);
        } catch (convError) {
          console.error('⚠️ Failed to create order conversation:', convError.message);
        }
      }

      console.log('✅ Order status updated:', order.orderNumber, 'to:', status);

      // Send notifications for status update
      try {
        const pharmacy = await Pharmacy.findById(order.pharmacyId);
        const pharmacyUser = pharmacy ? await User.findById(pharmacy.owner) : null;
        
        // Send order status update notifications
        await UserNotificationService.sendOrderStatusUpdate(
          order._id,
          order.patientId,
          pharmacyUser?._id,
          status,
          notes || `Your order status has been updated to ${status}.`
        );
        
        // Send specific delivery notification if delivered
        if (status === 'delivered') {
          await UserNotificationService.sendOrderDelivered(
            order._id,
            order.patientId,
            pharmacyUser?._id
          );
        }
        
        console.log('✅ Order status update notifications sent');
      } catch (notificationError) {
        console.error('⚠️ Failed to send order status notifications:', notificationError.message);
      }


      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          updatedAt: order.updatedAt
        }
      });
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/orders/pharmacy/orders
   * Get orders for pharmacy (used by pharmacy OrderManagement component)
   */
  async getPharmacyOrders(req, res) {
    console.log('🚀 === GET PHARMACY ORDERS START ===');
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

      console.log('🔍 Getting pharmacy orders for user:', userId);
      console.log('🔍 Query params:', { status, dateRange, search, sortBy, sortOrder });

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

      console.log('🏥 Found pharmacy:', pharmacy.name, pharmacy._id);

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
          { orderNumber: { $regex: search, $options: 'i' } }
        ];
      }

      console.log('🔍 Final query:', query);

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

      console.log('✅ Found orders:', orders.length);

      // Transform orders to match frontend expectations
      const transformedOrders = orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        patient: {
          profile: order.patientId?.profile || {},
          contact: order.patientId?.contact || {}
        },
        prescriptionRequest: {
          medications: order.prescriptionId?.medications || order.items?.map(item => ({
            name: item.medicationName,
            quantity: item.quantity,
            instructions: item.notes || 'Take as prescribed'
          })) || []
        },
        status: order.status,
        totalAmount: order.totalAmount,
        deliveryMethod: order.orderType,
        deliveryAddress: order.deliveryInfo?.address ? 
          `${order.deliveryInfo.address.street || ''}, ${order.deliveryInfo.address.city || ''}, ${order.deliveryInfo.address.state || ''} ${order.deliveryInfo.address.zipCode || ''}`.trim() : 
          'Pickup at pharmacy',
        estimatedReadyTime: order.pickupInfo?.estimatedPickupTime || order.deliveryInfo?.estimatedDeliveryTime,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        notes: order.pharmacyNotes || order.patientNotes || ''
      }));

      return res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: transformedOrders
      });

    } catch (error) {
      console.error('❌ Error getting pharmacy orders:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * GET /api/v1/orders/my-orders
   * Get orders for patient (used by patient OrderManagement component)
   */
  async getPatientOrders(req, res) {
    console.log('🚀 === GET PATIENT ORDERS START ===');
    try {
      const userId = req.user.id;
      const {
        status,
        dateRange,
        search,
        limit = 50,
        skip = 0
      } = req.query;

      console.log('🔍 Getting patient orders for user:', userId);
      console.log('🔍 Query params:', { status, dateRange, search });

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
          { orderNumber: { $regex: search, $options: 'i' } }
        ];
      }

      console.log('🔍 Final query:', query);

      const orders = await Order.find(query)
        .populate('patientId', 'profile contact')
        .populate('pharmacyId', 'name address phone rating')
        .populate('prescriptionId', 'medications')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      console.log('✅ Found orders:', orders.length);

      // Transform orders to match frontend expectations
      const transformedOrders = orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        pharmacy: {
          name: order.pharmacyId?.name || 'Unknown Pharmacy',
          address: order.pharmacyId?.address || 'Address not available',
          phone: order.pharmacyId?.phone || 'Phone not available',
          rating: order.pharmacyId?.rating || 4.5
        },
        prescriptionRequest: {
          medications: order.prescriptionId?.medications || order.items?.map(item => ({
            name: item.medicationName,
            quantity: item.quantity,
            instructions: item.notes || 'Take as prescribed'
          })) || []
        },
        status: this.mapOrderStatus(order.status), // Map to frontend expected status
        totalAmount: order.totalAmount,
        deliveryMethod: order.orderType,
        deliveryAddress: order.deliveryInfo?.address ? 
          `${order.deliveryInfo.address.street || ''}, ${order.deliveryInfo.address.city || ''}, ${order.deliveryInfo.address.state || ''} ${order.deliveryInfo.address.zipCode || ''}`.trim() : 
          'Pickup at pharmacy',
        estimatedReadyTime: order.pickupInfo?.estimatedPickupTime || order.deliveryInfo?.estimatedDeliveryTime,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deliveredAt: order.deliveredAt,
        trackingNumber: `TRK${order.orderNumber.slice(-6)}`,
        canCancel: ['placed', 'confirmed'].includes(order.status),
        canRate: order.status === 'delivered' && !order.rating,
        rating: order.rating || 0,
        review: order.review || ''
      }));

      return res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: transformedOrders
      });

    } catch (error) {
      console.error('❌ Error getting patient orders:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve orders',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/v1/orders/:orderId/cancel
   * Cancel order (used by patient OrderManagement component)
   */
  async cancelOrder(req, res) {
    console.log('🚀 === CANCEL ORDER START ===');
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      console.log('🔍 Cancelling order:', orderId, 'for user:', userId);

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
      ) && ['placed', 'confirmed'].includes(order.status);

      if (!canCancel) {
        return res.status(403).json({
          success: false,
          message: 'Cannot cancel this order'
        });
      }

      // Update order status to cancelled
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.updatedAt = new Date();

      // Add to status history
      if (!order.statusHistory) {
        order.statusHistory = [];
      }

      order.statusHistory.push({
        status: 'cancelled',
        updatedBy: userId,
        timestamp: new Date(),
        notes: reason || 'Order cancelled by user'
      });

      await order.save();

      console.log('✅ Order cancelled:', order.orderNumber);

      // Send notification to the other party
      const notificationRecipient = req.user.role === 'patient' ? order.pharmacyId.owner : order.patientId._id;
      const notificationMessage = req.user.role === 'patient' 
        ? `Order ${order.orderNumber} has been cancelled by the patient`
        : `Order ${order.orderNumber} has been cancelled by the pharmacy`;

      try {
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
      } catch (notificationError) {
        console.error('⚠️ Failed to send notification:', notificationError.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          cancelledAt: order.cancelledAt
        }
      });

    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * POST /api/v1/orders/:orderId/rate
   * Rate order (used by patient OrderManagement component)
   */
  async rateOrder(req, res) {
    console.log('🚀 === RATE ORDER START ===');
    try {
      const { orderId } = req.params;
      const { rating, review } = req.body;
      const userId = req.user.id;

      console.log('🔍 Rating order:', orderId, 'with rating:', rating);

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

      console.log('✅ Order rated:', order.orderNumber, 'with', rating, 'stars');

      // Update pharmacy's overall rating
      await this.updatePharmacyRating(order.pharmacyId._id);

      // Send notification to pharmacy
      try {
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
      } catch (notificationError) {
        console.error('⚠️ Failed to send notification:', notificationError.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Order rated successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          rating: order.rating,
          review: order.review,
          ratedAt: order.ratedAt
        }
      });

    } catch (error) {
      console.error('❌ Error rating order:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to rate order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Map backend order status to frontend expected status
   * @param {string} backendStatus - Backend order status
   * @returns {string} - Frontend expected status
   */
  mapOrderStatus(backendStatus) {
    const statusMap = {
      'placed': 'pending',
      'confirmed': 'confirmed',
      'preparing': 'preparing',
      'ready': 'ready',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'completed': 'delivered',
      'cancelled': 'cancelled',
      'on_hold': 'pending'
    };

    return statusMap[backendStatus] || backendStatus;
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

      console.log('✅ Updated pharmacy rating:', averageRating, 'from', orders.length, 'reviews');

    } catch (error) {
      console.error('❌ Error updating pharmacy rating:', error);
    }
  }
}

export default OrderController;