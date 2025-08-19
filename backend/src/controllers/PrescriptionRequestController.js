import PrescriptionRequestService from '../services/PrescriptionRequestService.js';
import PrescriptionRequest from '../models/PrescriptionRequest.js';
import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import UserNotificationService from '../services/UserNotificationService.js';
import { validationResult } from 'express-validator';
import SafeNotificationServiceFactory from '../services/SafeNotificationServiceFactory.js';

/**
 * Prescription Request Controller
 * Handles HTTP endpoints for prescription request management
 */
class PrescriptionRequestController {
  constructor() {
    this.prescriptionRequestService = new PrescriptionRequestService();
    this.notificationService = null; // Will be initialized when needed
    console.log('✅ Prescription Request Controller initialized');
  }

  /**
   * Get notification service instance safely
   */
  async getNotificationService() {
    if (!this.notificationService) {
      this.notificationService = await SafeNotificationServiceFactory.getService('PrescriptionRequestController');
    }
    return this.notificationService;
  }

  /**
   * Create a new prescription request
   * POST /api/v1/prescription-requests
   */
  async createRequest(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const patientId = req.user.id;
      const requestData = req.body;

      const prescriptionRequest = await this.prescriptionRequestService.createPrescriptionRequest(
        requestData,
        patientId
      );

      console.log('✅ Prescription request created:', {
        id: prescriptionRequest._id,
        requestNumber: prescriptionRequest.requestNumber,
        status: prescriptionRequest.status,
        targetPharmacies: prescriptionRequest.targetPharmacies?.length || 0,
        hasGeoLocation: !!prescriptionRequest.metadata?.geoLocation,
        medicationCount: prescriptionRequest.medications?.length || 0
      });

      // Send notifications for prescription request creation
      try {
        const patient = await User.findById(patientId);
        
        // Notify patient about successful upload
        await UserNotificationService.sendPrescriptionUploaded(
          prescriptionRequest._id,
          patientId,
          patient?.name || 'Patient'
        );
        
        // Notify target pharmacies about new prescription request
        if (prescriptionRequest.targetPharmacies && prescriptionRequest.targetPharmacies.length > 0) {
          await UserNotificationService.sendPrescriptionToPharmacies(
            prescriptionRequest._id,
            prescriptionRequest.targetPharmacies,
            patient?.name || 'Patient'
          );
        }
        
        console.log('✅ Enhanced prescription creation notifications sent');
      } catch (notificationError) {
        console.error('⚠️ Failed to send prescription creation notifications:', notificationError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Prescription request created successfully',
        data: {
          prescriptionRequest
        }
      });

    } catch (error) {
      console.error('❌ Failed to create prescription request:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to create prescription request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Submit prescription request to pharmacies
   * POST /api/v1/prescription-requests/:requestId/submit
   */
  async submitRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { pharmacyIds } = req.body;
      const userId = req.user.id;

      // Verify user owns the request
      const request = await PrescriptionRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Prescription request not found'
        });
      }

      if (request.patient.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to submit this request'
        });
      }

      const result = await this.prescriptionRequestService.submitPrescriptionRequest(
        requestId,
        pharmacyIds
      );

      res.status(200).json({
        success: true,
        message: 'Prescription request submitted successfully',
        data: result
      });

    } catch (error) {
      console.error('❌ Failed to submit prescription request:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to submit prescription request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Pharmacy accepts or declines a prescription request
   * POST /api/v1/prescription-requests/:requestId/respond
   */
  async respondToRequest(req, res) {
    console.log('🚀 === RESPOND TO REQUEST START ===');
    console.log('📋 Request ID:', req.params.requestId);
    console.log('👤 User ID:', req.user.id);
    console.log('📝 Action:', req.body.action);
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { requestId } = req.params;
      const { 
        action, 
        estimatedFulfillmentTime, 
        quotedPrice, 
        notes, 
        substitutions,
        detailedBill,
        pharmacyMessage,
        pharmacyInfo
      } = req.body;
      const userId = req.user.id;

      console.log('📊 Request data:', {
        requestId,
        action,
        estimatedFulfillmentTime,
        quotedPrice: typeof quotedPrice === 'object' ? quotedPrice.total : quotedPrice,
        hasDetailedBill: !!detailedBill,
        hasPharmacyMessage: !!pharmacyMessage
      });

      // Get pharmacy ID for this user
      console.log('🔍 Finding pharmacy for user:', userId);
      const user = await User.findById(userId);
      let pharmacy = null;

      if (user && user.pharmacy) {
        console.log('📋 User has pharmacy reference:', user.pharmacy);
        pharmacy = await Pharmacy.findById(user.pharmacy);
      } else {
        console.log('🔍 Looking for pharmacy by owner');
        pharmacy = await Pharmacy.findOne({ owner: userId });
        if (pharmacy && user) {
          console.log('✅ Found pharmacy, updating user reference');
          await User.findByIdAndUpdate(userId, { pharmacy: pharmacy._id });
        }
      }

      if (!pharmacy) {
        console.log('❌ No pharmacy found for user');
        return res.status(403).json({
          success: false,
          message: 'User is not associated with a pharmacy'
        });
      }

      console.log('🏥 Pharmacy found:', {
        id: pharmacy._id,
        name: pharmacy.name,
        isActive: pharmacy.isActive
      });

      const responseData = {
        estimatedFulfillmentTime,
        quotedPrice,
        pharmacistNotes: notes,
        substitutions: substitutions || [],
        // Enhanced response data
        detailedBill: detailedBill || null,
        pharmacyMessage: pharmacyMessage || null,
        pharmacyInfo: pharmacyInfo || {}
      };

      console.log('📤 Calling handlePharmacyResponse with:', {
        requestId,
        pharmacyId: pharmacy._id,
        action,
        hasEnhancedData: !!(detailedBill || pharmacyMessage)
      });

      const updatedRequest = await this.prescriptionRequestService.handlePharmacyResponse(
        requestId,
        pharmacy._id,
        action,
        responseData
      );

      console.log('✅ Response handled successfully');

      // Send notifications for pharmacy response
      if (updatedRequest && action === 'accept') {
        try {
          const patient = await User.findById(updatedRequest.patient);
          const pharmacyUser = await User.findById(userId);
          
          // Notify patient about pharmacy response
          await UserNotificationService.sendPrescriptionResponse(
            requestId,
            updatedRequest.patient,
            pharmacy.name,
            'accepted'
          );
          
          // Notify pharmacy that response was submitted
          await UserNotificationService.sendPharmacyResponseSubmitted(
            requestId,
            userId,
            pharmacy.name,
            patient?.name || 'Patient'
          );
          
          console.log('✅ Enhanced pharmacy response notifications sent');
        } catch (notificationError) {
          console.error('⚠️ Failed to send pharmacy response notifications:', notificationError.message);
        }
      }

      // Safely construct response data
      const apiResponse = {
        success: true,
        message: `Prescription request ${action}ed successfully`,
        data: {
          prescriptionRequest: updatedRequest || null
        }
      };

      // Safely add pharmacy response if available
      try {
        if (updatedRequest && updatedRequest.pharmacyResponses && Array.isArray(updatedRequest.pharmacyResponses) && pharmacy && pharmacy._id) {
          const pharmacyResponse = updatedRequest.pharmacyResponses.find(r => {
            if (!r || !r.pharmacyId) return false;
            try {
              return r.pharmacyId.toString() === pharmacy._id.toString();
            } catch (e) {
              console.log('⚠️ Error comparing pharmacy IDs:', e.message);
              return false;
            }
          });
          apiResponse.data.pharmacyResponse = pharmacyResponse || null;
        } else {
          apiResponse.data.pharmacyResponse = null;
        }
      } catch (error) {
        console.log('⚠️ Error finding pharmacy response:', error.message);
        apiResponse.data.pharmacyResponse = null;
      }

      res.status(200).json(apiResponse);

    } catch (error) {
      console.error('❌ Failed to respond to prescription request:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to respond to prescription request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Patient selects a pharmacy from accepted responses
   * POST /api/v1/prescription-requests/:requestId/select-pharmacy
   */
  async selectPharmacy(req, res) {
    try {
      const { requestId } = req.params;
      const { pharmacyId, reason } = req.body;
      const userId = req.user.id;

      // Verify user owns the request
      const request = await PrescriptionRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Prescription request not found'
        });
      }

      if (request.patient.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to select pharmacy for this request'
        });
      }

      const updatedRequest = await this.prescriptionRequestService.selectPharmacy(
        requestId,
        pharmacyId,
        reason
      );

      // Send notification to selected pharmacy about being chosen
      try {
        const notificationService = await this.getNotificationService();
        await notificationService.sendNotification(
          pharmacyId,
          'order_confirmed', // Using valid enum value
          {
            requestId: requestId,
            patientId: userId,
            requestNumber: updatedRequest.requestNumber || requestId,
            reason: reason
          },
          {
            priority: 'high',
            category: 'medical' // Using valid enum value
          }
        );
      } catch (notificationError) {
        console.error('⚠️ Failed to send pharmacy selection notification:', notificationError.message);
      }

      res.status(200).json({
        success: true,
        message: 'Pharmacy selected successfully',
        data: {
          prescriptionRequest: updatedRequest
        }
      });

    } catch (error) {
      console.error('❌ Failed to select pharmacy:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to select pharmacy',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get prescription requests for current user
   * GET /api/v1/prescription-requests
   */
  async getUserRequests(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const {
        status,
        limit = 20,
        skip = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      let requests;
      const options = {
        status,
        limit: parseInt(limit),
        skip: parseInt(skip),
        sortBy,
        sortOrder: sortOrder === 'desc' ? -1 : 1
      };

      if (userRole === 'patient') {
        requests = await this.prescriptionRequestService.getPatientRequests(userId, options);
      } else if (userRole === 'pharmacy') {
        // Get pharmacy ID for this user
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
        requests = await this.prescriptionRequestService.getPharmacyQueue(pharmacy._id, options);
      } else {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Prescription requests retrieved successfully',
        data: {
          requests,
          pagination: {
            limit: parseInt(limit),
            skip: parseInt(skip),
            total: requests.length
          }
        }
      });

    } catch (error) {
      console.error('❌ Failed to get user requests:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve prescription requests',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get pharmacy queue (pharmacy-specific endpoint)
   * GET /api/v1/prescription-requests/my-requests
   * Get prescription requests for the authenticated patient
   */
  async getMyRequests(req, res) {
    console.log('🚀 === GET MY PRESCRIPTION REQUESTS START ===');
    try {
      const userId = req.user.id;
      console.log('🔍 Getting requests for user:', userId);

      const requests = await PrescriptionRequest.find({ 
        'patient': userId,
        isActive: true 
      })
      .populate('patient', 'profile contact')
      .populate('pharmacyResponses.pharmacyId', 'name address phone rating')
      .sort({ createdAt: -1 });

      console.log('✅ Found requests:', requests.length);

      return res.status(200).json({
        success: true,
        message: 'Prescription requests retrieved successfully',
        data: requests
      });
    } catch (error) {
      console.error('❌ Error getting my requests:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve prescription requests',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/prescription-requests/:id/responses
   * Get pharmacy responses for a specific prescription request
   */
  async getRequestResponses(req, res) {
    console.log('🚀 === GET REQUEST RESPONSES START ===');
    try {
      const { requestId } = req.params;
      const userId = req.user.id;
      console.log('🔍 Getting responses for request:', requestId, 'user:', userId);

      const request = await PrescriptionRequest.findOne({
        _id: requestId,
        'patient': userId,
        isActive: true
      }).populate('pharmacyResponses.pharmacyId', 'name address phone rating reviewCount');

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Prescription request not found'
        });
      }

      // Filter only accepted responses
      const acceptedResponses = request.pharmacyResponses.filter(
        response => response.status === 'accepted'
      );

      console.log('✅ Found accepted responses:', acceptedResponses.length);

      return res.status(200).json({
        success: true,
        message: 'Pharmacy responses retrieved successfully',
        data: acceptedResponses
      });
    } catch (error) {
      console.error('❌ Error getting request responses:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve pharmacy responses',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/prescription-requests/pharmacy/queue
   */
  async getPharmacyQueue(req, res) {
    console.log('🚀 === PHARMACY QUEUE REQUEST START ===');
    console.log('🔍 Request URL:', req.originalUrl);
    console.log('🔍 Request method:', req.method);
    console.log('🔍 Request headers:', req.headers);

    try {
      const userId = req.user.id;
      console.log('🔍 Getting pharmacy queue for user:', userId);
      console.log('🔍 User object:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      });

      const {
        status = ['draft', 'pending', 'submitted'],
        limit = 50,
        skip = 0,
        sortBy = 'urgency_priority'
      } = req.query;

      console.log('📋 Query params received:', req.query);
      console.log('📋 Parsed query params:', { status, limit, skip, sortBy });

      // Get pharmacy ID for this user
      console.log('🔍 Step 1: Finding user in database...');
      const user = await User.findById(userId);
      console.log('👤 User found:', !!user);
      if (user) {
        console.log('👤 User details:', {
          id: user._id,
          email: user.email,
          role: user.role,
          pharmacy: user.pharmacy,
          hasPharmacyRef: !!user.pharmacy
        });
      } else {
        console.log('❌ User not found in database!');
      }

      console.log('🔍 Step 2: Looking for pharmacy...');
      let pharmacy = null;

      if (user && user.pharmacy) {
        console.log('🔍 Step 2a: User has pharmacy reference, looking up pharmacy...');
        pharmacy = await Pharmacy.findById(user.pharmacy);
        console.log('🏥 Pharmacy found by user.pharmacy:', !!pharmacy);
        if (pharmacy) {
          console.log('🏥 Pharmacy details:', {
            id: pharmacy._id,
            name: pharmacy.name,
            owner: pharmacy.owner,
            status: pharmacy.registrationStatus,
            isActive: pharmacy.isActive
          });
        }
      } else {
        console.log('🔍 Step 2b: No pharmacy reference, searching by owner...');
        pharmacy = await Pharmacy.findOne({ owner: userId });
        console.log('🏥 Pharmacy found by owner:', !!pharmacy);

        if (pharmacy) {
          console.log('🏥 Pharmacy details:', {
            id: pharmacy._id,
            name: pharmacy.name,
            owner: pharmacy.owner,
            status: pharmacy.registrationStatus,
            isActive: pharmacy.isActive
          });

          if (user) {
            console.log('🔍 Step 2c: Updating user with pharmacy reference...');
            await User.findByIdAndUpdate(userId, { pharmacy: pharmacy._id });
            console.log('✅ Updated user with pharmacy reference');
          }
        } else {
          console.log('❌ No pharmacy found by owner either');

          // Let's check if there are any pharmacies at all
          const allPharmacies = await Pharmacy.find({}).limit(5);
          console.log('📋 Total pharmacies in database:', allPharmacies.length);
          if (allPharmacies.length > 0) {
            console.log('📋 Sample pharmacies:');
            allPharmacies.forEach((p, idx) => {
              console.log(`  ${idx + 1}. ${p.name} (Owner: ${p.owner}, Status: ${p.registrationStatus})`);
            });
          }
        }
      }

      if (!pharmacy) {
        console.log('❌ FINAL RESULT: No pharmacy found for user');
        console.log('❌ Returning 400 error response');

        const errorResponse = {
          success: false,
          message: 'User is not associated with a pharmacy. Please register your pharmacy first.',
          debug: {
            userId,
            userEmail: user?.email,
            hasPharmacyRef: !!user?.pharmacy,
            pharmacySearched: true,
            timestamp: new Date().toISOString()
          }
        };

        console.log('❌ Error response:', errorResponse);
        console.log('🚀 === PHARMACY QUEUE REQUEST END (ERROR) ===');
        return res.status(400).json(errorResponse);
      }

      // Handle empty status parameter
      let statusFilter = status;
      if (status === '' || status === null || status === undefined) {
        statusFilter = ['draft', 'pending', 'submitted']; // Default statuses including draft
      }

      const options = {
        status: Array.isArray(statusFilter) ? statusFilter : [statusFilter],
        limit: parseInt(limit),
        skip: parseInt(skip),
        sortBy
      };

      console.log('🔍 Final options after processing:', options);

      console.log('🔍 Step 3: Pharmacy found! Calling service...');
      console.log('🔍 Calling service with pharmacy ID:', pharmacy._id, 'and options:', options);

      const queue = await this.prescriptionRequestService.getPharmacyQueue(pharmacy._id, options);
      console.log('✅ Queue retrieved:---------------------------------------------------------------------------', queue.length, 'items', pharmacy._id);

      const successResponse = {
        success: true,
        message: 'Pharmacy queue retrieved successfully',
        data: {
          pharmacyId: pharmacy._id,
          pharmacyName: pharmacy.name,
          queue,
          queueSize: queue.length,
          pagination: {
            limit: parseInt(limit),
            skip: parseInt(skip)
          }
        }
      };

      console.log('✅ Success response:', {
        ...successResponse,
        data: { ...successResponse.data, queue: `[${queue.length} items]` }
      });
      console.log('🚀 === PHARMACY QUEUE REQUEST END (SUCCESS) ===');

      res.status(200).json(successResponse);

    } catch (error) {
      console.error('❌ EXCEPTION in getPharmacyQueue:', error.message);
      console.error('❌ Full error object:', error);
      console.error('❌ Error stack:', error.stack);

      const errorResponse = {
        success: false,
        message: 'Failed to retrieve pharmacy queue',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        debug: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          userId: req.user?.id,
          userEmail: req.user?.email,
          timestamp: new Date().toISOString()
        } : undefined
      };

      console.error('❌ Exception response:', errorResponse);
      console.log('🚀 === PHARMACY QUEUE REQUEST END (EXCEPTION) ===');

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get detailed prescription request information
   * GET /api/v1/prescription-requests/:requestId
   */
  async getRequestDetails(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;

      const request = await this.prescriptionRequestService.getRequestDetails(requestId, userId);

      res.status(200).json({
        success: true,
        message: 'Prescription request details retrieved successfully',
        data: {
          prescriptionRequest: request
        }
      });

    } catch (error) {
      console.error('❌ Failed to get request details:', error.message);

      if (error.message === 'Prescription request not found') {
        return res.status(404).json({
          success: false,
          message: 'Prescription request not found'
        });
      }

      if (error.message === 'Unauthorized to view this request') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this request'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve prescription request details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Update prescription request status
   * PUT /api/v1/prescription-requests/:requestId/status
   */
  async updateRequestStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { requestId } = req.params;
      const { status, notes } = req.body;
      const userId = req.user.id;

      const request = await PrescriptionRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Prescription request not found'
        });
      }

      // Authorization check based on status change
      let authorized = false;

      if (req.user.role === 'patient' && request.patient.toString() === userId) {
        // Patients can cancel their own requests
        authorized = ['cancelled'].includes(status);
      } else if (req.user.role === 'pharmacy') {
        // Pharmacies can update fulfillment-related statuses
        const pharmacy = await Pharmacy.findOne({ owner: userId });
        if (pharmacy && request.selectedPharmacy?.pharmacyId?.toString() === pharmacy._id.toString()) {
          authorized = ['in_preparation', 'ready', 'fulfilled'].includes(status);
        }
      } else if (req.user.role === 'admin') {
        // Admins can update any status
        authorized = true;
      }

      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to update this request status'
        });
      }

      await request.addStatusHistoryEntry(status, userId, 'Manual update', notes);

      res.status(200).json({
        success: true,
        message: 'Prescription request status updated successfully',
        data: {
          prescriptionRequest: request
        }
      });

    } catch (error) {
      console.error('❌ Failed to update request status:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to update prescription request status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get prescription request statistics
   * GET /api/v1/prescription-requests/stats
   */
  async getStatistics(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      let stats;

      if (userRole === 'admin') {
        // Admin gets system-wide statistics
        stats = await this.prescriptionRequestService.getStatistics();
      } else if (userRole === 'pharmacy') {
        // Pharmacy gets their specific statistics
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

        stats = await this.getPharmacyStatistics(pharmacy._id);
      } else if (userRole === 'patient') {
        // Patient gets their personal statistics
        stats = await this.getPatientStatistics(userId);
      } else {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('❌ Failed to get statistics:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Cancel a prescription request
   * DELETE /api/v1/prescription-requests/:requestId
   */
  async cancelRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const request = await PrescriptionRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Prescription request not found'
        });
      }

      // Only patient or admin can cancel
      if (request.patient.toString() !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to cancel this request'
        });
      }

      // Can't cancel if already fulfilled
      if (['fulfilled', 'cancelled'].includes(request.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel request in current status'
        });
      }

      await request.addStatusHistoryEntry('cancelled', userId, reason || 'Cancelled by user');

      // Send notification about cancellation to relevant pharmacies
      try {
        if (request.targetPharmacies && request.targetPharmacies.length > 0) {
          const notificationService = await this.getNotificationService();
          const pharmacyIds = request.targetPharmacies.map(tp => tp.pharmacyId);
          await notificationService.sendBulkNotification(
            pharmacyIds.map(pharmacyId => ({ userId: pharmacyId, userRole: 'pharmacy' })),
            'order_cancelled', // Using valid enum value
            {
              requestId: requestId,
              requestNumber: request.requestNumber,
              patientId: request.patient,
              reason: reason || 'Cancelled by user',
              cancelledBy: req.user.role
            },
            {
              priority: 'medium',
              category: 'medical' // Using valid enum value
            }
          );
        }
      } catch (notificationError) {
        console.error('⚠️ Failed to send cancellation notification:', notificationError.message);
      }

      res.status(200).json({
        success: true,
        message: 'Prescription request cancelled successfully',
        data: {
          prescriptionRequest: request
        }
      });

    } catch (error) {
      console.error('❌ Failed to cancel request:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel prescription request',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get pharmacy-specific statistics
   * @param {string} pharmacyId - Pharmacy ID
   * @returns {Object} Pharmacy statistics
   */
  async getPharmacyStatistics(pharmacyId) {
    try {
      const totalRequests = await PrescriptionRequest.countDocuments({
        'targetPharmacies.pharmacyId': pharmacyId
      });

      const acceptedRequests = await PrescriptionRequest.countDocuments({
        'pharmacyResponses.pharmacyId': pharmacyId,
        'pharmacyResponses.status': 'accepted'
      });

      const fulfilledRequests = await PrescriptionRequest.countDocuments({
        'selectedPharmacy.pharmacyId': pharmacyId,
        status: 'fulfilled'
      });

      const currentQueue = await PrescriptionRequest.countDocuments({
        'targetPharmacies.pharmacyId': pharmacyId,
        status: { $in: ['draft', 'pending', 'submitted'] }
      });

      const averageResponseTime = await PrescriptionRequest.aggregate([
        {
          $match: {
            'pharmacyResponses.pharmacyId': pharmacyId,
            'pharmacyResponses.respondedAt': { $exists: true }
          }
        },
        {
          $unwind: '$pharmacyResponses'
        },
        {
          $match: {
            'pharmacyResponses.pharmacyId': pharmacyId
          }
        },
        {
          $project: {
            responseTime: {
              $subtract: ['$pharmacyResponses.respondedAt', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            averageResponseTime: { $avg: '$responseTime' }
          }
        }
      ]);

      return {
        totalRequests,
        acceptedRequests,
        fulfilledRequests,
        currentQueue,
        acceptanceRate: totalRequests > 0 ? (acceptedRequests / totalRequests * 100).toFixed(2) : 0,
        fulfillmentRate: acceptedRequests > 0 ? (fulfilledRequests / acceptedRequests * 100).toFixed(2) : 0,
        averageResponseTime: averageResponseTime[0]?.averageResponseTime
          ? Math.round(averageResponseTime[0].averageResponseTime / (1000 * 60)) // Convert to minutes
          : 0
      };

    } catch (error) {
      console.error('❌ Failed to get pharmacy statistics:', error.message);
      throw error;
    }
  }

  /**
   * Get patient-specific statistics
   * @param {string} patientId - Patient ID
   * @returns {Object} Patient statistics
   */
  async getPatientStatistics(patientId) {
    try {
      const totalRequests = await PrescriptionRequest.countDocuments({
        patient: patientId
      });

      const fulfilledRequests = await PrescriptionRequest.countDocuments({
        patient: patientId,
        status: 'fulfilled'
      });

      const activeRequests = await PrescriptionRequest.countDocuments({
        patient: patientId,
        status: { $in: ['draft', 'submitted', 'pending', 'accepted', 'in_preparation', 'ready'] }
      });

      const recentRequests = await PrescriptionRequest.find({
        patient: patientId
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('requestNumber status createdAt');

      return {
        totalRequests,
        fulfilledRequests,
        activeRequests,
        fulfillmentRate: totalRequests > 0 ? (fulfilledRequests / totalRequests * 100).toFixed(2) : 0,
        recentRequests
      };

    } catch (error) {
      console.error('❌ Failed to get patient statistics:', error.message);
      throw error;
    }
  }
}

export default PrescriptionRequestController;
