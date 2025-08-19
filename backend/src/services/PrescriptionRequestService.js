import PrescriptionRequest from '../models/PrescriptionRequest.js';
import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import NotificationService from './realtime/NotificationService.js';
import PharmacyMatchingService from './PharmacyMatchingService.js';
import EventEmitter from 'events';

/**
 * Prescription Request Management Service
 * Handles prescription request lifecycle, pharmacy notifications, and queue management
 */
class PrescriptionRequestService extends EventEmitter {
  constructor(webSocketService = null) {
    super();
    this.notificationService = new NotificationService(webSocketService);
    this.pharmacyMatchingService = new PharmacyMatchingService();
    
    // Set up automated reminder scheduling
    this.setupAutomatedReminders();
    
    console.log('✅ Prescription Request Service initialized');
  }

  /**
   * Create a new prescription request
   * @param {Object} requestData - Prescription request data
   * @param {string} patientId - Patient user ID
   * @returns {Object} Created prescription request
   */
  async createPrescriptionRequest(requestData, patientId) {
    try {
      console.log(`📋 Creating prescription request for patient ${patientId}`);

      // Validate patient exists
      const patient = await User.findById(patientId);
      if (!patient || patient.role !== 'patient') {
        throw new Error('Invalid patient ID');
      }

      // Create the prescription request
      const prescriptionRequest = new PrescriptionRequest({
        ...requestData,
        patient: patientId,
        status: 'draft',
        metadata: {
          ...requestData.metadata,
          geoLocation: requestData.geoLocation || requestData.metadata?.geoLocation,
          source: 'web'
        }
      });

      await prescriptionRequest.save();

      console.log('📋 Prescription request created with data:', {
        id: prescriptionRequest._id,
        requestNumber: prescriptionRequest.requestNumber,
        hasGeoLocation: !!prescriptionRequest.metadata?.geoLocation,
        geoLocation: prescriptionRequest.metadata?.geoLocation,
        medicationCount: prescriptionRequest.medications?.length
      });

      // Emit event for analytics
      this.emit('request_created', {
        requestId: prescriptionRequest._id,
        patientId,
        medicationCount: prescriptionRequest.medications.length,
        urgency: prescriptionRequest.preferences.urgency
      });

      console.log(`✅ Created prescription request ${prescriptionRequest.requestNumber}`);
      return prescriptionRequest;

    } catch (error) {
      console.error('❌ Failed to create prescription request:', error.message);
      throw error;
    }
  }

  /**
   * Submit prescription request to pharmacies
   * @param {string} requestId - Prescription request ID
   * @param {Array} pharmacyIds - Array of pharmacy IDs to notify (optional)
   * @returns {Object} Submission result with notification details
   */
  async submitPrescriptionRequest(requestId, pharmacyIds = null) {
    try {
      console.log(`📤 Submitting prescription request ${requestId}`);

      const request = await PrescriptionRequest.findById(requestId)
        .populate('patient', 'profile contact');

      if (!request) {
        throw new Error('Prescription request not found');
      }

      if (request.status === 'submitted') {
        // Request already submitted, return current state instead of throwing error
        console.log(`ℹ️ Prescription request ${requestId} is already submitted`);
        
        // Get current pharmacies
        const targetPharmacyIds = request.targetPharmacies?.map(tp => tp.pharmacyId) || [];
        const pharmacies = await Pharmacy.find({
          _id: { $in: targetPharmacyIds },
          isActive: true
        });

        return {
          success: true,
          request,
          notifiedPharmacies: pharmacies.length,
          message: 'Prescription request was already submitted',
          alreadySubmitted: true
        };
      }

      if (request.status !== 'draft') {
        throw new Error('Can only submit draft prescription requests');
      }

      // Find suitable pharmacies if not specified
      if (!pharmacyIds || pharmacyIds.length === 0) {
        const patientLocation = request.metadata?.geoLocation;
        if (!patientLocation) {
          throw new Error('Patient location required for pharmacy matching');
        }

        const matchingResult = await this.pharmacyMatchingService.findMatchingPharmacies({
          location: {
            coordinates: patientLocation
          },
          medications: request.medications.map(med => med.name),
          preferences: request.preferences,
          urgency: request.preferences.urgency
        });

        pharmacyIds = matchingResult.pharmacies.slice(0, 10).map(p => p._id); // Top 10 matches
      }

      // Validate pharmacies exist and are active
      const pharmacies = await Pharmacy.find({
        _id: { $in: pharmacyIds },
        isActive: true,
        registrationStatus: 'approved'
      });

      if (pharmacies.length === 0) {
        throw new Error('No active pharmacies found for notification');
      }

      // Update request with target pharmacies
      request.targetPharmacies = pharmacies.map((pharmacy, index) => ({
        pharmacyId: pharmacy._id,
        notifiedAt: new Date(),
        priority: index + 1
      }));

      request.status = 'submitted';
      await request.save();

      // Send notifications to pharmacies
      const notificationResults = await this.notifyPharmacies(request, pharmacies);

      // Schedule follow-up reminders
      await this.scheduleFollowUpReminders(request);

      // Emit event
      this.emit('request_submitted', {
        requestId: request._id,
        patientId: request.patient._id,
        pharmacyCount: pharmacies.length,
        urgency: request.preferences.urgency
      });

      console.log(`✅ Submitted prescription request to ${pharmacies.length} pharmacies`);

      return {
        success: true,
        request,
        notifiedPharmacies: pharmacies.length,
        notificationResults
      };

    } catch (error) {
      console.error('❌ Failed to submit prescription request:', error.message);
      throw error;
    }
  }

  /**
   * Notify pharmacies about a new prescription request
   * @param {Object} request - Prescription request
   * @param {Array} pharmacies - Array of pharmacy objects
   * @returns {Array} Notification results
   */
  async notifyPharmacies(request, pharmacies) {
    try {
      const notificationPromises = pharmacies.map(async (pharmacy) => {
        try {
          // Create notification for pharmacy
          const notification = await this.notificationService.createNotification({
            type: 'prescription_request',
            recipient: pharmacy.owner, // Pharmacy owner user ID
            recipientType: 'pharmacist',
            title: 'New Prescription Request',
            message: `New prescription request from ${request.patient.profile.firstName} ${request.patient.profile.lastName}`,
            data: {
              prescriptionRequestId: request._id,
              requestNumber: request.requestNumber,
              patientId: request.patient._id,
              patientName: `${request.patient.profile.firstName} ${request.patient.profile.lastName}`,
              medicationCount: request.medications.length,
              urgency: request.preferences.urgency,
              estimatedValue: this.calculateEstimatedValue(request.medications),
              deliveryMethod: request.preferences.deliveryMethod,
              expiresAt: request.expiresAt
            },
            priority: request.preferences.urgency === 'emergency' ? 'high' : 'medium'
          });

          // Send real-time notification via Socket.io if pharmacy is online
          await this.notificationService.sendRealTimeNotification(
            `pharmacy_${pharmacy._id}`,
            'prescription_request',
            {
              notification,
              request: {
                id: request._id,
                requestNumber: request.requestNumber,
                patient: {
                  name: `${request.patient.profile.firstName} ${request.patient.profile.lastName}`,
                  contact: request.patient.contact
                },
                medications: request.medications,
                urgency: request.preferences.urgency,
                expiresAt: request.expiresAt
              }
            }
          );

          return {
            pharmacyId: pharmacy._id,
            pharmacyName: pharmacy.name,
            status: 'sent',
            notificationId: notification._id
          };

        } catch (error) {
          console.error(`Failed to notify pharmacy ${pharmacy.name}:`, error.message);
          return {
            pharmacyId: pharmacy._id,
            pharmacyName: pharmacy.name,
            status: 'failed',
            error: error.message
          };
        }
      });

      return await Promise.all(notificationPromises);

    } catch (error) {
      console.error('❌ Failed to notify pharmacies:', error.message);
      throw error;
    }
  }

  /**
   * Pharmacy accepts or declines a prescription request
   * @param {string} requestId - Prescription request ID
   * @param {string} pharmacyId - Pharmacy ID
   * @param {string} action - 'accept' or 'decline'
   * @param {Object} responseData - Additional response data
   * @returns {Object} Updated prescription request
   */
  async handlePharmacyResponse(requestId, pharmacyId, action, responseData = {}) {
    try {
      console.log(`🏥 Pharmacy ${pharmacyId} ${action}ing request ${requestId}`);
      console.log('📋 Response data keys:', Object.keys(responseData));

      const request = await PrescriptionRequest.findById(requestId)
        .populate('patient', 'profile contact');

      if (!request) {
        throw new Error('Prescription request not found');
      }

      // Allow responses for requests that are still active and not yet completed
      const allowedStatuses = ['draft', 'pending', 'submitted', 'active'];
      const blockedStatuses = ['completed', 'cancelled', 'expired', 'fulfilled', 'declined_all'];
      
      if (blockedStatuses.includes(request.status)) {
        throw new Error('Request is no longer accepting responses');
      }
      
      // If status is not in allowed list and not in blocked list, allow it (for flexibility)
      console.log(`📋 Request status: ${request.status} - allowing response`);

      // Validate pharmacy is in target list
      const isTargetPharmacy = request.targetPharmacies.some(
        tp => tp.pharmacyId.toString() === pharmacyId.toString()
      );

      if (!isTargetPharmacy) {
        throw new Error('Pharmacy not authorized to respond to this request');
      }

      // Prepare response data
      const response = {
        status: action === 'accept' ? 'accepted' : 'declined',
        ...responseData
      };

      // Add pharmacy response
      const existingResponse = request.pharmacyResponses.find(
        r => r.pharmacyId.toString() === pharmacyId.toString()
      );

      if (existingResponse) {
        console.log('📝 Updating existing response from pharmacy:', pharmacyId);
        // Update existing response
        Object.assign(existingResponse, response);
        existingResponse.respondedAt = new Date();
      } else {
        console.log('➕ Adding new response from pharmacy:', pharmacyId);
        // Add new response
        request.pharmacyResponses.push({
          pharmacyId,
          ...response,
          respondedAt: new Date()
        });
      }

      console.log('📊 Total responses after update:', request.pharmacyResponses.length);

      // Update request status based on responses
      const responses = request.pharmacyResponses;
      const acceptedResponses = responses.filter(r => r.status === 'accepted');
      const declinedResponses = responses.filter(r => r.status === 'declined');
      const pendingResponses = responses.filter(r => r.status === 'pending');

      // Update status if we have accepted responses and request is still open
      if (acceptedResponses.length > 0 && !['completed', 'cancelled', 'expired', 'fulfilled'].includes(request.status)) {
        request.status = 'accepted';
        console.log(`✅ Request status updated to 'accepted' - ${acceptedResponses.length} pharmacy(ies) accepted`);
      } 
      // If all pharmacies declined and no pending responses
      else if (declinedResponses.length === request.targetPharmacies.length && pendingResponses.length === 0) {
        request.status = 'declined_all';
        console.log(`❌ Request status updated to 'declined_all' - all pharmacies declined`);
      }
      // If this is the first response, update from draft/submitted to pending
      else if (['draft', 'submitted'].includes(request.status) && responses.length > 0) {
        request.status = 'pending';
        console.log(`📋 Request status updated to 'pending' - first pharmacy response received`);
      }

      console.log('💾 Saving prescription request...');
      await request.save();
      console.log('✅ Prescription request saved successfully');

      // Get pharmacy details for notifications
      const pharmacy = await Pharmacy.findById(pharmacyId);

      // Notify patient of response
      await this.notifyPatientOfResponse(request, pharmacy, action, responseData);

      // If accepted, update request status and notify other pharmacies
      if (action === 'accept') {
        await this.handleAcceptedRequest(request, pharmacyId);
      }

      // Emit event
      this.emit('pharmacy_response', {
        requestId: request._id,
        pharmacyId,
        action,
        patientId: request.patient._id
      });

      console.log(`✅ Processed ${action} response from pharmacy ${pharmacy.name}`);
      return request;

    } catch (error) {
      console.error('❌ Failed to handle pharmacy response:', error.message);
      throw error;
    }
  }

  /**
   * Handle when a pharmacy accepts a request
   * @param {Object} request - Prescription request
   * @param {string} acceptingPharmacyId - ID of accepting pharmacy
   */
  async handleAcceptedRequest(request, acceptingPharmacyId) {
    try {
      // If this is the first acceptance, update status
      const acceptedResponses = request.pharmacyResponses.filter(r => r.status === 'accepted');
      
      if (acceptedResponses.length === 1) {
        request.status = 'accepted';
        await request.save();
      }

      // Optionally notify other pharmacies that request is no longer needed
      // (This depends on business logic - whether to allow multiple acceptances)
      
    } catch (error) {
      console.error('❌ Failed to handle accepted request:', error.message);
    }
  }

  /**
   * Patient selects a pharmacy from accepted responses
   * @param {string} requestId - Prescription request ID
   * @param {string} selectedPharmacyId - Selected pharmacy ID
   * @param {string} selectionReason - Reason for selection
   * @returns {Object} Updated prescription request
   */
  async selectPharmacy(requestId, selectedPharmacyId, selectionReason = '') {
    try {
      console.log(`👤 Patient selecting pharmacy ${selectedPharmacyId} for request ${requestId}`);

      const request = await PrescriptionRequest.findById(requestId);
      if (!request) {
        throw new Error('Prescription request not found');
      }

      // Select pharmacy logic
      const response = request.pharmacyResponses.find(
        r => r.pharmacyId.toString() === selectedPharmacyId.toString() && r.status === 'accepted'
      );

      if (!response) {
        throw new Error('Cannot select pharmacy that has not accepted the request');
      }

      request.selectedPharmacy = {
        pharmacyId: selectedPharmacyId,
        selectedAt: new Date(),
        selectionReason
      };

      request.status = 'in_preparation';
      await request.save();

      // Notify selected pharmacy
      const pharmacy = await Pharmacy.findById(selectedPharmacyId);
      await this.notificationService.createNotification({
        type: 'prescription_selected',
        recipient: pharmacy.owner,
        recipientType: 'pharmacist',
        title: 'Prescription Request Selected',
        message: `Your pharmacy has been selected for prescription ${request.requestNumber}`,
        data: {
          prescriptionRequestId: request._id,
          requestNumber: request.requestNumber,
          patientName: `${request.patient.profile?.firstName} ${request.patient.profile?.lastName}`
        },
        priority: 'medium'
      });

      // Notify other pharmacies that weren't selected
      await this.notifyUnselectedPharmacies(request, selectedPharmacyId);

      this.emit('pharmacy_selected', {
        requestId: request._id,
        selectedPharmacyId,
        patientId: request.patient
      });

      console.log(`✅ Pharmacy ${pharmacy.name} selected for request ${request.requestNumber}`);
      return request;

    } catch (error) {
      console.error('❌ Failed to select pharmacy:', error.message);
      throw error;
    }
  }

  /**
   * Get prescription request queue for a pharmacy
   * @param {string} pharmacyId - Pharmacy ID
   * @param {Object} options - Query options
   * @returns {Array} Queue of prescription requests
   */
  async getPharmacyQueue(pharmacyId, options = {}) {
    try {
      console.log(`🔍 SERVICE: Getting pharmacy queue for pharmacy: ${pharmacyId}`);
      console.log(`📋 SERVICE: Options:`, options);
      
      const {
        status = ['draft', 'pending', 'submitted'],
        limit = 50,
        skip = 0,
        sortBy = 'urgency_priority'
      } = options;

      // Build query
      const query = {
        'targetPharmacies.pharmacyId': pharmacyId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      };

      // Handle status filtering
      if (Array.isArray(status)) {
        // Filter out empty strings and only add status filter if there are valid statuses
        const validStatuses = status.filter(s => s && s.trim() !== '');
        if (validStatuses.length > 0) {
          query.status = { $in: validStatuses };
        }
      } else if (status && status.trim() !== '') {
        query.status = status;
      }
      
      console.log('🔍 SERVICE: Final query:', JSON.stringify(query, null, 2));

      // First, let's check if there are ANY requests for this pharmacy (for debugging)
      const allRequestsForPharmacy = await PrescriptionRequest.find({
        'targetPharmacies.pharmacyId': pharmacyId
      }).lean();
      
      console.log(`🔍 SERVICE: Total requests for pharmacy ${pharmacyId}:`, allRequestsForPharmacy.length);
      if (allRequestsForPharmacy.length > 0) {
        console.log('🔍 SERVICE: Sample request statuses:', allRequestsForPharmacy.map(r => ({
          id: r._id,
          status: r.status,
          isActive: r.isActive,
          expiresAt: r.expiresAt,
          requestNumber: r.requestNumber
        })));
      }

      // Build sort criteria
      let sortCriteria = {};
      if (sortBy === 'urgency_priority') {
        // Custom sort: emergency first, then urgent, then routine, then by creation date
        sortCriteria = {
          'preferences.urgency': -1,
          'createdAt': 1
        };
      } else if (sortBy === 'newest') {
        sortCriteria = { 'createdAt': -1 };
      } else if (sortBy === 'oldest') {
        sortCriteria = { 'createdAt': 1 };
      } else {
        sortCriteria[sortBy] = 1;
      }

      console.log('🔍 SERVICE: Sort criteria:', sortCriteria);

      const requests = await PrescriptionRequest.find(query)
        .populate('patient', 'profile.firstName profile.lastName contact')
        .sort(sortCriteria)
        .limit(limit)
        .skip(skip)
        .lean();

      console.log(`📊 SERVICE: Found ${requests.length} prescription requests in queue`);
      
      if (requests.length > 0) {
        console.log(`📋 SERVICE: Sample requests:`)
        requests.slice(0, 3).forEach((req, idx) => {
          console.log(`  ${idx + 1}. ${req.requestNumber} - ${req.medications?.length || 0} meds (${req.preferences?.urgency || 'unknown'})`);
        });
      } else {
        console.log(`📋 SERVICE: No requests found in queue`);
        console.log(`📋 SERVICE: Query used:`, {
          'targetPharmacies.pharmacyId': pharmacyId,
          isActive: true,
          expiresAt: { $gt: new Date() },
          status: Array.isArray(options.status) ? { $in: options.status } : options.status
        });
      }

      console.log(`✅ SERVICE: Returning ${requests.length} requests`);
      return requests;

    } catch (error) {
      console.error('❌ SERVICE: Failed to get pharmacy queue:', error.message);
      console.error('❌ SERVICE: Full error:', error);
      throw error;
    }
  }

  /**
   * Get prescription requests for a patient
   * @param {string} patientId - Patient ID
   * @param {Object} options - Query options
   * @returns {Array} Patient's prescription requests
   */
  async getPatientRequests(patientId, options = {}) {
    try {
      return await PrescriptionRequest.findByPatient(patientId, options);
    } catch (error) {
      console.error('❌ Failed to get patient requests:', error.message);
      throw error;
    }
  }

  /**
   * Get detailed request information
   * @param {string} requestId - Request ID
   * @param {string} requesterId - ID of user requesting info
   * @returns {Object} Detailed request information
   */
  async getRequestDetails(requestId, requesterId) {
    try {
      const request = await PrescriptionRequest.findById(requestId)
        .populate('patient', 'profile contact')
        .populate('targetPharmacies.pharmacyId', 'name address contact rating owner')
        .populate('selectedPharmacy.pharmacyId', 'name address contact owner')
        .populate('pharmacyResponses.pharmacyId', 'name address contact owner');

      if (!request) {
        throw new Error('Prescription request not found');
      }

      // Check authorization (patient, pharmacy owner, or admin)
      const requester = await User.findById(requesterId);
      const isPatient = request.patient._id.toString() === requesterId;
      const isPharmacy = request.targetPharmacies.some(
        tp => tp.pharmacyId.owner?.toString() === requesterId
      );
      const isAdmin = requester?.role === 'admin';

      if (!isPatient && !isPharmacy && !isAdmin) {
        throw new Error('Unauthorized to view this request');
      }

      return request;

    } catch (error) {
      console.error('❌ Failed to get request details:', error.message);
      throw error;
    }
  }

  /**
   * Schedule automated follow-up reminders
   * @param {Object} request - Prescription request
   */
  async scheduleFollowUpReminders(request) {
    try {
      const urgency = request.preferences.urgency;
      const now = new Date();

      // Response reminder schedule based on urgency
      const responseReminderDelays = {
        'emergency': [15, 30], // 15 and 30 minutes
        'urgent': [60, 120],   // 1 and 2 hours
        'routine': [360, 720]  // 6 and 12 hours
      };

      const delays = responseReminderDelays[urgency] || responseReminderDelays['routine'];

      // Schedule response reminders
      for (const delayMinutes of delays) {
        const reminderTime = new Date(now.getTime() + delayMinutes * 60 * 1000);
        
        await request.scheduleFollowUpReminder(
          'response_reminder',
          reminderTime,
          'push',
          `Reminder: Your ${urgency} prescription request is still waiting for pharmacy responses.`
        );
      }

      // Schedule pickup reminder (if needed after acceptance)
      const pickupReminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      await request.scheduleFollowUpReminder(
        'pickup_reminder',
        pickupReminderTime,
        'sms',
        'Your prescription is ready for pickup!'
      );

    } catch (error) {
      console.error('❌ Failed to schedule follow-up reminders:', error.message);
    }
  }

  /**
   * Set up automated reminder processing
   */
  setupAutomatedReminders() {
    // Process reminders every 5 minutes
    setInterval(async () => {
      try {
        await this.processScheduledReminders();
      } catch (error) {
        console.error('❌ Failed to process scheduled reminders:', error.message);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Process scheduled reminders that are due
   */
  async processScheduledReminders() {
    try {
      // Check if mongoose connection is ready
      const mongoose = await import('mongoose');
      if (mongoose.default.connection.readyState !== 1) {
        console.log('⚠️ Database not connected, skipping scheduled reminders');
        return;
      }

      const now = new Date();
      
      const requestsWithDueReminders = await PrescriptionRequest.find({
        'followUpReminders': {
          $elemMatch: {
            scheduledAt: { $lte: now },
            status: 'scheduled'
          }
        },
        isActive: true
      }).populate('patient', 'profile contact');

      for (const request of requestsWithDueReminders) {
        const dueReminders = request.followUpReminders.filter(
          r => r.scheduledAt <= now && r.status === 'scheduled'
        );

        for (const reminder of dueReminders) {
          try {
            await this.sendReminder(request, reminder);
            reminder.status = 'sent';
            reminder.sentAt = new Date();
          } catch (error) {
            console.error(`Failed to send reminder ${reminder._id}:`, error.message);
            reminder.status = 'failed';
          }
        }

        await request.save();
      }

    } catch (error) {
      console.error('❌ Failed to process scheduled reminders:', error.message);
    }
  }

  /**
   * Send a specific reminder
   * @param {Object} request - Prescription request
   * @param {Object} reminder - Reminder object
   */
  async sendReminder(request, reminder) {
    const message = reminder.message || this.getDefaultReminderMessage(reminder.type);
    
    await this.notificationService.createNotification({
      type: reminder.type,
      recipient: request.patient._id,
      recipientType: 'patient',
      title: this.getReminderTitle(reminder.type),
      message,
      data: {
        prescriptionRequestId: request._id,
        requestNumber: request.requestNumber,
        reminderType: reminder.type
      },
      priority: 'medium'
    });
  }

  /**
   * Notify patient of pharmacy response
   * @param {Object} request - Prescription request
   * @param {Object} pharmacy - Pharmacy object
   * @param {string} action - 'accept' or 'decline'
   * @param {Object} responseData - Response data
   */
  async notifyPatientOfResponse(request, pharmacy, action, responseData) {
    const title = action === 'accept' ? 'Prescription Accepted' : 'Prescription Declined';
    const message = action === 'accept' 
      ? `${pharmacy.name} has accepted your prescription request.`
      : `${pharmacy.name} has declined your prescription request.`;

    await this.notificationService.createNotification({
      type: `prescription_${action}ed`,
      recipient: request.patient._id,
      recipientType: 'patient',
      title,
      message,
      data: {
        prescriptionRequestId: request._id,
        requestNumber: request.requestNumber,
        pharmacyId: pharmacy._id,
        pharmacyName: pharmacy.name,
        estimatedFulfillmentTime: responseData.estimatedFulfillmentTime,
        quotedPrice: responseData.quotedPrice
      },
      priority: 'medium'
    });
  }

  /**
   * Notify pharmacies that weren't selected
   * @param {Object} request - Prescription request
   * @param {string} selectedPharmacyId - ID of selected pharmacy
   */
  async notifyUnselectedPharmacies(request, selectedPharmacyId) {
    const unselectedResponses = request.pharmacyResponses.filter(
      r => r.status === 'accepted' && r.pharmacyId.toString() !== selectedPharmacyId.toString()
    );

    for (const response of unselectedResponses) {
      const pharmacy = await Pharmacy.findById(response.pharmacyId);
      
      await this.notificationService.createNotification({
        type: 'prescription_not_selected',
        recipient: pharmacy.owner,
        recipientType: 'pharmacist',
        title: 'Prescription Request Not Selected',
        message: `The patient has selected another pharmacy for prescription ${request.requestNumber}`,
        data: {
          prescriptionRequestId: request._id,
          requestNumber: request.requestNumber
        },
        priority: 'low'
      });
    }
  }

  /**
   * Calculate estimated value of medications
   * @param {Array} medications - Array of medication objects
   * @returns {number} Estimated total value
   */
  calculateEstimatedValue(medications) {
    // This would integrate with pricing database
    // For now, return a mock estimate
    return medications.length * 25; // $25 per medication estimate
  }

  /**
   * Get default reminder message
   * @param {string} type - Reminder type
   * @returns {string} Default message
   */
  getDefaultReminderMessage(type) {
    const messages = {
      'response_reminder': 'Your prescription request is still waiting for pharmacy responses.',
      'pickup_reminder': 'Your prescription is ready for pickup!',
      'refill_reminder': 'It\'s time to refill your prescription.',
      'consultation_reminder': 'Don\'t forget your upcoming consultation.'
    };

    return messages[type] || 'You have a prescription reminder.';
  }

  /**
   * Get reminder title
   * @param {string} type - Reminder type
   * @returns {string} Reminder title
   */
  getReminderTitle(type) {
    const titles = {
      'response_reminder': 'Prescription Status Update',
      'pickup_reminder': 'Prescription Ready',
      'refill_reminder': 'Refill Reminder',
      'consultation_reminder': 'Consultation Reminder'
    };

    return titles[type] || 'Prescription Reminder';
  }

  /**
   * Clean up expired requests
   */
  async cleanupExpiredRequests() {
    try {
      const expiredRequests = await PrescriptionRequest.getExpiredRequests();
      
      for (const request of expiredRequests) {
        request.status = 'expired';
        await request.save();

        // Notify patient
        await this.notificationService.createNotification({
          type: 'prescription_expired',
          recipient: request.patient,
          recipientType: 'patient',
          title: 'Prescription Request Expired',
          message: `Your prescription request ${request.requestNumber} has expired due to no pharmacy responses.`,
          data: {
            prescriptionRequestId: request._id,
            requestNumber: request.requestNumber
          },
          priority: 'medium'
        });
      }

      if (expiredRequests.length > 0) {
        console.log(`🧹 Cleaned up ${expiredRequests.length} expired prescription requests`);
      }

    } catch (error) {
      console.error('❌ Failed to cleanup expired requests:', error.message);
    }
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  async getStatistics() {
    try {
      const stats = await PrescriptionRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            averageResponseTime: { $avg: '$responseTime' }
          }
        }
      ]);

      const totalRequests = await PrescriptionRequest.countDocuments();
      const activeRequests = await PrescriptionRequest.countDocuments({ isActive: true });

      return {
        totalRequests,
        activeRequests,
        statusBreakdown: stats,
        queueHealth: activeRequests < 1000 ? 'good' : 'high'
      };

    } catch (error) {
      console.error('❌ Failed to get statistics:', error.message);
      throw error;
    }
  }
}

export default PrescriptionRequestService;
