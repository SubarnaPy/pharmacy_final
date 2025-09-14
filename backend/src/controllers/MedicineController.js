import Medicine from '../models/Medicine.js';
import Payment from '../models/Payment.js';
import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import { Order } from '../models/Order.js';
import PrescriptionRequest from '../models/PrescriptionRequest.js';
import MedicineSearchService from '../services/MedicineSearchService.js';
import MedicineImageRecognitionService from '../services/ai/MedicineImageRecognitionService.js';
import Stripe from 'stripe';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

class MedicineController {
  constructor() {
    this.medicineSearchService = new MedicineSearchService();
    this.imageRecognitionService = new MedicineImageRecognitionService();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Configure multer for image uploads
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      }
    });
  }

  /**
   * Search medicines with various search modes
   */
  async searchMedicines(req, res) {
    try {
      const {
        query,
        searchType = 'text',
        location,
        filters = {},
        pagination = {},
        sortBy = 'relevance',
        includeAvailability = true,
        pharmacyPreferences = {}
      } = req.body;

      // Validate required parameters
      if (!query && searchType !== 'image') {
        return res.status(400).json({
          success: false,
          message: 'Search query is required for non-image searches'
        });
      }

      // Parse location if provided as string
      let parsedLocation = location;
      if (typeof location === 'string') {
        try {
          parsedLocation = JSON.parse(location);
        } catch (error) {
          console.warn('Failed to parse location string:', error);
          parsedLocation = null;
        }
      }

      const searchParams = {
        query,
        searchType,
        location: parsedLocation,
        filters: typeof filters === 'string' ? JSON.parse(filters) : filters,
        pagination: typeof pagination === 'string' ? JSON.parse(pagination) : pagination,
        sortBy,
        includeAvailability,
        pharmacyPreferences: typeof pharmacyPreferences === 'string' ? 
          JSON.parse(pharmacyPreferences) : pharmacyPreferences
      };

      const results = await this.medicineSearchService.searchMedicines(searchParams);
      

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Medicine search failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search medicines',
        error: error.message
      });
    }
  }

  /**
   * Search medicines by uploaded image
   */
  async searchByImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Image file is required'
        });
      }

      // Convert image buffer to base64
      const imageBase64 = req.file.buffer.toString('base64');
      const imageData = `data:${req.file.mimetype};base64,${imageBase64}`;

      const {
        location,
        filters = {},
        pagination = { page: 1, limit: 20 },
        includeAvailability = true,
        pharmacyPreferences = {}
      } = req.body;

      const searchParams = {
        imageData,
        searchType: 'image',
        location: typeof location === 'string' ? JSON.parse(location) : location,
        filters: typeof filters === 'string' ? JSON.parse(filters) : filters,
        pagination: typeof pagination === 'string' ? JSON.parse(pagination) : pagination,
        includeAvailability,
        pharmacyPreferences: typeof pharmacyPreferences === 'string' ? 
          JSON.parse(pharmacyPreferences) : pharmacyPreferences
      };

      const results = await this.medicineSearchService.searchMedicines(searchParams);

      res.json({
        success: true,
        data: results,
        imageAnalysis: results.imageAnalysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Image search failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search by image',
        error: error.message
      });
    }
  }

  /**
   * Analyze medicine image for identification
   */
  async analyzeMedicineImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Image file is required'
        });
      }

      const imageBase64 = req.file.buffer.toString('base64');
      const imageData = `data:${req.file.mimetype};base64,${imageBase64}`;

      const {
        includeComposition = true,
        includeTherapeutic = true,
        includeManufacturer = true,
        includePricing = false,
        enhancedOCR = true,
        visualFeatureAnalysis = true
      } = req.body;

      const options = {
        includeComposition,
        includeTherapeutic,
        includeManufacturer,
        includePricing,
        enhancedOCR,
        visualFeatureAnalysis
      };

      const analysis = await this.imageRecognitionService.analyzeMedicineImage(
        imageData, 
        options
      );

      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Image analysis failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze image',
        error: error.message
      });
    }
  }

  /**
   * Get medicine details by ID
   */
  async getMedicineById(req, res) {
    try {
      const { id } = req.params;
      const { includeAvailability = false, location } = req.query;

      const medicine = await Medicine.findById(id);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found'
        });
      }

      let response = {
        success: true,
        data: medicine
      };

      // Include availability if requested
      if (includeAvailability && location) {
        try {
          const locationData = JSON.parse(location);
          const availability = await medicine.checkAvailability();
          response.data = {
            ...medicine.toObject(),
            availability
          };
        } catch (error) {
          console.warn('Failed to get availability:', error);
        }
      }

      // Update view analytics
      await medicine.updateAnalytics('view');

      res.json(response);

    } catch (error) {
      console.error('Failed to get medicine:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get medicine details',
        error: error.message
      });
    }
  }

  /**
   * Get medicine suggestions and alternatives
   */
  async getMedicineSuggestions(req, res) {
    try {
      const { id } = req.params;
      const {
        includeAlternatives = true,
        includeGeneric = true,
        includeSimilar = true,
        limit = 10
      } = req.query;

      const options = {
        includeAlternatives: includeAlternatives === 'true',
        includeGeneric: includeGeneric === 'true',
        includeSimilar: includeSimilar === 'true',
        limit: parseInt(limit)
      };

      const suggestions = await this.medicineSearchService.getMedicineSuggestions(id, options);

      res.json({
        success: true,
        data: suggestions,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to get suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get medicine suggestions',
        error: error.message
      });
    }
  }

  /**
   * Get popular medicines
   */
  async getPopularMedicines(req, res) {
    try {
      const { limit = 10, category } = req.query;

      const popular = await Medicine.getPopularMedicines(
        parseInt(limit),
        category
      );

      res.json({
        success: true,
        data: popular,
        total: popular.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to get popular medicines:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get popular medicines',
        error: error.message
      });
    }
  }

  /**
   * Search medicines by barcode
   */
  async searchByBarcode(req, res) {
    try {
      const { barcode } = req.params;
      const { includeAvailability = false, location } = req.query;

      if (!barcode) {
        return res.status(400).json({
          success: false,
          message: 'Barcode is required'
        });
      }

      const medicine = await Medicine.findByBarcode(barcode);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'No medicine found with this barcode'
        });
      }

      let response = { medicine };

      // Include availability if requested
      if (includeAvailability && location) {
        try {
          const locationData = JSON.parse(location);
          const availability = await medicine.checkAvailability();
          response.availability = availability;
        } catch (error) {
          console.warn('Failed to get availability:', error);
        }
      }

      // Update search analytics
      await medicine.updateAnalytics('search');

      res.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Barcode search failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search by barcode',
        error: error.message
      });
    }
  }

  /**
   * Create medicine purchase order with automatic pharmacy selection
   */
  async createPurchaseOrder(req, res) {
    try {
      const userId = req.user.id;
      const {
        medicines, // Array of {medicineId, quantity}
        deliveryMethod = 'pickup', // 'pickup' or 'delivery'
        deliveryAddress = null,
        paymentMethod = 'cod',
        prescriptionFile = null,
        patientNotes = '',
        isUrgent = false,
        patientLocation = null
      } = req.body;

      console.log('🔍 Creating medicine purchase order for user:', userId);

      // Validate required fields
      if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Medicines array is required and cannot be empty'
        });
      }

      // Get patient details
      const patient = await User.findById(userId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Process each medicine and group by pharmacy
      const pharmacyOrders = new Map();
      let totalOrderAmount = 0;

      for (const item of medicines) {
        const { medicineId, quantity } = item;

        // Get medicine details
        const medicine = await Medicine.findById(medicineId);
        if (!medicine) {
          return res.status(404).json({
            success: false,
            message: `Medicine with ID ${medicineId} not found`
          });
        }

        // Find pharmacy that has this medicine
        const pharmacy = await Pharmacy.findById(medicine.pharmacyId).populate('owner');
        if (!pharmacy) {
          return res.status(404).json({
            success: false,
            message: `Pharmacy not found for medicine ${medicine.name}`
          });
        }

        // Calculate distance if patient location is provided
        let distance = null;
        if (patientLocation && pharmacy.address && pharmacy.address.coordinates) {
          distance = this.calculateDistance(
            patientLocation.lat,
            patientLocation.lng,
            pharmacy.address.coordinates[1], // latitude
            pharmacy.address.coordinates[0]  // longitude
          );
        }

        // Calculate item total
        const unitPrice = medicine.currentPrice || medicine.pricing?.sellingPrice || 0;
        const itemTotal = unitPrice * quantity;
        totalOrderAmount += itemTotal;

        console.log('💰 Price calculation for', medicine.name, ':', {
          currentPrice: medicine.currentPrice,
          sellingPrice: medicine.pricing?.sellingPrice,
          unitPrice: unitPrice,
          quantity: quantity,
          itemTotal: itemTotal
        });

        // Group by pharmacy
        const pharmacyId = pharmacy._id.toString();
        if (!pharmacyOrders.has(pharmacyId)) {
          pharmacyOrders.set(pharmacyId, {
            pharmacy: pharmacy,
            distance: distance,
            items: [],
            subtotal: 0
          });
        }

        const pharmacyOrder = pharmacyOrders.get(pharmacyId);
        pharmacyOrder.items.push({
          medicine: medicine,
          quantity: quantity,
          unitPrice: unitPrice,
          itemTotal: itemTotal,
          requiresPrescription: medicine.regulatory?.scheduleClass !== 'OTC'
        });
        pharmacyOrder.subtotal += itemTotal;
      }

      // Create orders for each pharmacy
      const createdOrders = [];

      for (const [pharmacyId, pharmacyOrderData] of pharmacyOrders) {
        const { pharmacy, distance, items, subtotal } = pharmacyOrderData;

        // Calculate fees
        const gst = Math.round(subtotal * 0.12);
        const deliveryFee = deliveryMethod === 'pickup' ? 0 : 
                           this.calculateStandardDeliveryFee(distance || 5, deliveryMethod);
        const platformFee = Math.round(subtotal * 0.025);
        const totalAmount = subtotal + gst + deliveryFee + platformFee;

        console.log('💰 Fee calculations for pharmacy', pharmacy.name, ':', {
          subtotal: subtotal,
          gst: gst,
          deliveryFee: deliveryFee,
          platformFee: platformFee,
          totalAmount: totalAmount
        });

        // Check if prescription is required
        const requiresPrescription = items.some(item => item.requiresPrescription);
        
        // Create prescription request only if prescription is uploaded or required
        let prescriptionRequest = null;
        if (prescriptionFile || requiresPrescription) {
          prescriptionRequest = new PrescriptionRequest({
            patient: userId, // Use 'patient' field as per model schema
            requestType: prescriptionFile ? 'prescription-upload' : 'medicine-order',
            status: prescriptionFile ? 'pending' : 'fulfilled', // Pending if uploaded, fulfilled for direct purchase
            medications: items.map(item => ({
              name: item.medicine.name,
              quantity: item.quantity,
              dosage: item.medicine.dosageForm || 'N/A',
              unit: item.medicine.dosageForm || 'tablet',
              prescribed: item.quantity,
              instructions: 'As directed',
              form: item.medicine.dosageForm || 'tablet'
            })),
            urgency: isUrgent ? 'urgent' : 'normal',
            deliveryPreference: deliveryMethod,
            notes: patientNotes || (prescriptionFile ? 'Prescription uploaded by patient' : 'Direct medicine purchase'),
            prescriptionFile: prescriptionFile,
            isDigitalPrescription: !!prescriptionFile
          });

          await prescriptionRequest.save();
          console.log('✅ Created prescription request:', prescriptionRequest._id);
        } else {
          console.log('ℹ️ No prescription required for direct medicine purchase');
        }

        // Generate order number
        const orderNumber = `MED-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Create order - conditionally include prescriptionId
        const orderData = {
          orderNumber: orderNumber,
          patientId: userId,
          pharmacyId: pharmacy._id,
          orderType: deliveryMethod === 'pickup' ? 'pickup' : 'delivery', // Use actual delivery method
          status: 'placed', // Use valid enum value
          
          // Add items array for the Order schema
          items: items.map(item => ({
            medicationName: item.medicine.name,
            dosage: item.medicine.dosageForm || 'N/A',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.itemTotal,
            notes: item.medicine.description || ''
          })),

          // Medicine-specific details
          medicineOrderDetails: {
            items: items.map(item => ({
              medicineId: item.medicine._id,
              medicineName: item.medicine.name,
              manufacturer: item.medicine.manufacturer?.name || '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              itemTotal: item.itemTotal,
              requiresPrescription: item.requiresPrescription
            })),
            deliveryMethod: deliveryMethod,
            requiresPrescription: requiresPrescription,
            prescriptionFile: prescriptionFile,
            estimatedDeliveryTime: this.calculateEstimatedDeliveryTime(deliveryMethod)
          },

          // Pricing
          totalAmount: totalAmount,
          pricing: {
            subtotal: subtotal,
            gst: gst,
            deliveryFee: deliveryFee,
            platformFee: platformFee,
            discount: 0
          },

          // Delivery info
          deliveryInfo: deliveryMethod === 'delivery' ? {
            address: deliveryAddress,
            estimatedDeliveryTime: this.calculateEstimatedDeliveryTime(deliveryMethod),
            deliveryFee: deliveryFee,
            distance: distance
          } : null,

          // Pickup info
          pickupInfo: deliveryMethod === 'pickup' ? {
            pharmacyAddress: {
              street: pharmacy.address.street,
              city: pharmacy.address.city,
              state: pharmacy.address.state,
              zipCode: pharmacy.address.zipCode,
              coordinates: pharmacy.address.coordinates
            },
            distance: distance,
            estimatedPreparationTime: '30 minutes'
          } : null,

          // Payment info
          paymentInfo: {
            method: paymentMethod === 'cod' ? 'cash' : paymentMethod, // Map 'cod' to 'cash'
            status: 'pending',
            amount: totalAmount
          },

          // Additional info
          patientNotes: patientNotes,
          isUrgent: isUrgent,
          placedAt: new Date(),

          // Status history
          statusHistory: [{
            status: 'placed', // Use valid enum value
            timestamp: new Date(),
            updatedBy: userId, // Add required updatedBy field
            notes: 'Order placed successfully'
          }]
        };

        // Add prescriptionId only if prescription request was created
        if (prescriptionRequest) {
          orderData.prescriptionId = prescriptionRequest._id;
        }

        const order = new Order(orderData);

        console.log('💾 Order data before saving:', {
          orderNumber: orderData.orderNumber,
          totalAmount: orderData.totalAmount,
          pricing: orderData.pricing,
          deliveryInfo: orderData.deliveryInfo,
          items: orderData.items?.length
        });

        await order.save();
        console.log('✅ Created medicine order:', orderNumber);

        // Populate order for response
        await order.populate([
          { path: 'patientId', select: 'name email profile' },
          { path: 'pharmacyId', select: 'name contact address' }
        ]);

        createdOrders.push({
          order: order,
          pharmacy: {
            _id: pharmacy._id,
            name: pharmacy.name,
            contact: pharmacy.contact,
            address: pharmacy.address,
            distance: distance
          },
          estimatedTotal: totalAmount
        });
      }

      // Response with auto-selected pharmacies
      res.status(201).json({
        success: true,
        message: 'Medicine orders created successfully',
        data: {
          orders: createdOrders,
          totalOrders: createdOrders.length,
          autoSelectedPharmacies: createdOrders.map(order => ({
            pharmacyId: order.pharmacy._id,
            pharmacyName: order.pharmacy.name,
            distance: order.pharmacy.distance,
            orderNumber: order.order.orderNumber,
            estimatedTotal: order.estimatedTotal
          })),
          summary: {
            totalAmount: createdOrders.reduce((sum, order) => sum + order.estimatedTotal, 0),
            requiresPrescription: createdOrders.some(order => 
              order.order.medicineOrderDetails?.requiresPrescription || false
            )
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Medicine purchase order creation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create medicine purchase order',
        error: error.message
      });
    }
  }

  /**
   * Confirm payment and process order
   */
  async confirmPayment(req, res) {
    try {
      const { paymentId, paymentIntentId } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required'
        });
      }

      const payment = await Payment.findById(paymentId)
        .populate('medicineOrderDetails.items.medicine')
        .populate('pharmacy');

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      if (payment.payer.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to payment'
        });
      }

      // Confirm Stripe payment if applicable
      if (payment.paymentMethod === 'stripe' && paymentIntentId) {
        const confirmed = await payment.confirmStripePayment(paymentIntentId, this.stripe);
        if (!confirmed) {
          return res.status(400).json({
            success: false,
            message: 'Payment confirmation failed'
          });
        }
      } else if (payment.paymentMethod === 'cod') {
        // For COD, mark as completed but settlement pending
        payment.status = 'completed';
        payment.completedAt = new Date();
        await payment.save();
      }

      // Update medicine analytics
      for (const item of payment.medicineOrderDetails.items) {
        await item.medicine.updateAnalytics('purchase');
      }

      res.json({
        success: true,
        data: {
          paymentId: payment._id,
          status: payment.status,
          amount: payment.amount,
          transactionId: payment.transactionId,
          estimatedDeliveryTime: payment.medicineOrderDetails.estimatedDeliveryTime
        },
        message: 'Payment confirmed successfully'
      });

    } catch (error) {
      console.error('Payment confirmation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment',
        error: error.message
      });
    }
  }

  /**
   * Get user's medicine orders
   */
  async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const query = {
        payer: userId,
        paymentType: 'medicine_purchase'
      };

      if (status) {
        query.status = status;
      }

      const orders = await Payment.find(query)
        .populate('medicineOrderDetails.items.medicine', 'name brandName imageData')
        .populate('pharmacy', 'name contact address')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Payment.countDocuments(query);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Failed to get user orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get orders',
        error: error.message
      });
    }
  }

  /**
   * Helper method to calculate distance between two coordinates
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Helper method to calculate standard delivery fee
   */
  calculateStandardDeliveryFee(distance, deliveryMethod) {
    let baseFee = 0;
    
    switch (deliveryMethod) {
      case 'express_delivery':
        baseFee = 100;
        break;
      case 'delivery':
        baseFee = 50;
        break;
      default:
        return 0;
    }
    
    if (distance > 5) {
      baseFee += (distance - 5) * 5;
    }
    
    return Math.round(baseFee);
  }

  /**
   * Helper method to calculate estimated delivery time
   */
  calculateEstimatedDeliveryTime(deliveryMethod) {
    switch (deliveryMethod) {
      case 'express_delivery':
        return '1-2 hours';
      case 'delivery':
        return '2-4 hours';
      case 'pickup':
        return '30 minutes';
      default:
        return '2-4 hours';
    }
  }

  /**
   * Get middleware for image upload
   */
  getImageUploadMiddleware() {
    return this.upload.single('image');
  }

  /**
   * Clear search cache
   */
  async clearSearchCache(req, res) {
    try {
      this.medicineSearchService.clearCache();
      
      res.json({
        success: true,
        message: 'Search cache cleared successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        error: error.message
      });
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStats(req, res) {
    try {
      const stats = this.medicineSearchService.getCacheStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get search statistics',
        error: error.message
      });
    }
  }

  /**
   * Get order by ID for tracking
   */
  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id; // Use 'id' field as set by auth middleware

      console.log('🔍 Getting order details for:', orderId, 'by user:', userId);

      const order = await Order.findOne({
        $or: [
          { _id: orderId },
          { orderNumber: orderId }
        ],
        patientId: userId
      }).populate([
        { path: 'patientId', select: 'name email profile' },
        { path: 'pharmacyId', select: 'name contact address' },
        { path: 'prescriptionId', select: 'medications status requestType' }
      ]);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Transform the order data to match frontend expectations
      const transformedOrder = {
        ...order.toObject(),
        // Map order fields to frontend expected format
        amount: order.totalAmount || 0,
        breakdown: {
          medicineTotal: order.pricing?.subtotal || 0,
          deliveryFee: order.pricing?.deliveryFee || order.deliveryInfo?.deliveryFee || 0,
          gst: order.pricing?.gst || 0,
          platformFee: order.pricing?.platformFee || 0,
          discount: order.pricing?.discount || 0
        },
        // Ensure pharmacy information is available
        pharmacy: order.pharmacyId || null,
        patient: order.patientId || null,
        prescription: order.prescriptionId || null,
        
        // Ensure payment method is accessible
        paymentMethod: order.paymentInfo?.method || 'cod',
        paymentStatus: order.paymentInfo?.status || 'pending'
      };
      
      console.log('🔍 Order pricing data:', {
        orderTotalAmount: order.totalAmount,
        pricingObject: order.pricing,
        deliveryInfo: order.deliveryInfo?.deliveryFee,
        transformedBreakdown: transformedOrder.breakdown
      });

      res.json({
        success: true,
        data: transformedOrder
      });

    } catch (error) {
      console.error('❌ Failed to get order details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order details',
        error: error.message
      });
    }
  }
}

export default MedicineController;