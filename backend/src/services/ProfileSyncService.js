import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import AuditLogService from './AuditLogService.js';
import NotificationService from './realtime/NotificationService.js';

/**
 * ProfileSyncService - Handles profile synchronization and updates across the platform
 */
class ProfileSyncService {
  constructor() {
    this.syncQueue = new Map(); // doctorId -> sync operations
    this.rollbackCache = new Map(); // operationId -> rollback data
    this.criticalChangeTypes = [
      'consultationModes',
      'workingHours',
      'specializations',
      'medicalLicense',
      'status'
    ];
    this.notificationService = new NotificationService();
    
    // Start background sync processor
    this.startSyncProcessor();
    console.log('✅ ProfileSyncService initialized');
  }

  /**
   * Perform optimistic update with rollback capability
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Profile section
   * @param {Object} updateData - New data
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} - Update result with rollback info
   */
  async performOptimisticUpdate(doctorId, section, updateData, userId) {
    const operationId = this.generateOperationId();
    
    try {
      console.log(`🔄 Starting optimistic update: ${operationId} for doctor ${doctorId}, section ${section}`);

      // 1. Store current state for rollback
      const currentState = await this.captureCurrentState(doctorId, section);
      this.rollbackCache.set(operationId, {
        doctorId,
        section,
        previousState: currentState,
        timestamp: new Date(),
        userId
      });

      // 2. Apply the update optimistically
      const updatedDoctor = await this.applyUpdate(doctorId, section, updateData);

      // 3. Queue synchronization operations
      await this.queueSyncOperations(doctorId, section, updateData, operationId);

      // 4. Log the change
      await AuditLogService.logProfileChange({
        doctorId,
        section,
        changes: updateData,
        previousValues: currentState,
        userId,
        operationId,
        timestamp: new Date()
      });

      console.log(`✅ Optimistic update completed: ${operationId}`);

      return {
        success: true,
        operationId,
        updatedData: this.extractSectionData(updatedDoctor, section),
        rollbackAvailable: true
      };

    } catch (error) {
      console.error(`❌ Optimistic update failed: ${operationId}`, error);
      
      // Attempt rollback
      await this.rollbackUpdate(operationId);
      
      throw new ApiError(500, `Profile update failed: ${error.message}`, {
        operationId,
        section,
        rollbackPerformed: true
      });
    }
  }

  /**
   * Rollback an update operation
   * @param {string} operationId - Operation ID to rollback
   * @returns {Promise<boolean>} - Rollback success
   */
  async rollbackUpdate(operationId) {
    try {
      const rollbackData = this.rollbackCache.get(operationId);
      
      if (!rollbackData) {
        console.warn(`⚠️ No rollback data found for operation: ${operationId}`);
        return false;
      }

      const { doctorId, section, previousState, userId } = rollbackData;
      
      console.log(`🔄 Rolling back update: ${operationId} for doctor ${doctorId}, section ${section}`);

      // Restore previous state
      await this.applyUpdate(doctorId, section, previousState);

      // Log the rollback
      await AuditLogService.logProfileChange({
        doctorId,
        section,
        changes: previousState,
        previousValues: previousState, // Use same data for rollback
        userId,
        operationId,
        isRollback: true,
        timestamp: new Date()
      });

      // Clean up rollback cache
      this.rollbackCache.delete(operationId);

      console.log(`✅ Rollback completed: ${operationId}`);
      return true;

    } catch (error) {
      console.error(`❌ Rollback failed for operation: ${operationId}`, error);
      return false;
    }
  }

  /**
   * Queue synchronization operations
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Updated section
   * @param {Object} updateData - Update data
   * @param {string} operationId - Operation ID
   */
  async queueSyncOperations(doctorId, section, updateData, operationId) {
    try {
      if (!this.syncQueue.has(doctorId)) {
        this.syncQueue.set(doctorId, []);
      }

      const syncOperation = {
        operationId,
        doctorId,
        section,
        updateData,
        timestamp: new Date(),
        status: 'queued',
        retryCount: 0,
        maxRetries: 3
      };

      this.syncQueue.get(doctorId).push(syncOperation);
      
      console.log(`📋 Sync operation queued: ${operationId} for doctor ${doctorId}`);

    } catch (error) {
      console.error(`❌ Failed to queue sync operation: ${operationId}`, error);
      throw error;
    }
  }

  /**
   * Process synchronization queue
   */
  async processSyncQueue() {
    try {
      for (const [doctorId, operations] of this.syncQueue.entries()) {
        if (operations.length > 0) {
          const operation = operations.shift();
          await this.executeSyncOperation(operation);
        }
      }
    } catch (error) {
      console.error('❌ Failed to process sync queue:', error);
    }
  }

  /**
   * Execute a single sync operation
   * @param {Object} operation - Sync operation
   */
  async executeSyncOperation(operation) {
    try {
      const { operationId, doctorId, section, updateData } = operation;
      
      console.log(`🔄 Executing sync operation: ${operationId}`);
      operation.status = 'processing';

      // 1. Update search index
      await this.updateSearchIndex(doctorId, section, updateData);

      // 2. Update booking system
      await this.updateBookingSystem(doctorId, section, updateData);

      // 3. Notify patients if critical change
      if (this.isCriticalChange(section, updateData)) {
        await this.notifyPatientsOfChanges(doctorId, section, updateData);
      }

      // 4. Update cache
      await this.updateProfileCache(doctorId);

      // 5. Trigger external integrations
      await this.triggerExternalIntegrations(doctorId, section, updateData);

      operation.status = 'completed';
      console.log(`✅ Sync operation completed: ${operationId}`);

    } catch (error) {
      console.error(`❌ Sync operation failed: ${operation.operationId}`, error);
      
      operation.retryCount++;
      operation.status = 'failed';
      operation.lastError = error.message;

      // Retry if under max retries
      if (operation.retryCount < operation.maxRetries) {
        operation.status = 'queued';
        this.syncQueue.get(operation.doctorId).push(operation);
        console.log(`🔄 Retrying sync operation: ${operation.operationId} (attempt ${operation.retryCount + 1})`);
      } else {
        console.error(`❌ Max retries exceeded for sync operation: ${operation.operationId}`);
        // Consider rollback if all retries failed
        await this.handleSyncFailure(operation);
      }
    }
  }

  /**
   * Update search index for doctor profile changes
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Updated section
   * @param {Object} updateData - Update data
   */
  async updateSearchIndex(doctorId, section, updateData) {
    try {
      console.log(`🔍 Updating search index for doctor ${doctorId}, section ${section}`);

      const doctor = await Doctor.findById(doctorId).populate('user', 'name email');
      if (!doctor) {
        throw new Error(`Doctor ${doctorId} not found for search index update`);
      }

      // Build search document
      const searchDocument = {
        doctorId: doctor._id,
        name: doctor.user?.name || '',
        email: doctor.user?.email || '',
        specializations: doctor.specializations || [],
        qualifications: doctor.qualifications?.map(q => ({
          degree: q.degree,
          institution: q.institution,
          specialization: q.specialization
        })) || [],
        bio: doctor.bio || '',
        languages: doctor.languages || [],
        ratings: {
          average: doctor.ratings?.average || 0,
          totalReviews: doctor.ratings?.totalReviews || 0
        },
        consultationModes: Object.entries(doctor.consultationModes || {})
          .filter(([mode, config]) => config?.available)
          .map(([mode]) => mode),
        workingHours: this.extractWorkingHoursForSearch(doctor.workingHours),
        isAvailable: doctor.isAvailable,
        status: doctor.status,
        location: doctor.location || {},
        lastUpdated: new Date()
      };

      // Update search cache in database
      await Doctor.findByIdAndUpdate(doctorId, {
        $set: {
          'searchCache': searchDocument
        }
      });

      // In production, also update external search service (Elasticsearch, Algolia, etc.)
      await this.updateExternalSearchService(searchDocument);

      console.log(`✅ Search index updated for doctor ${doctorId}`);

    } catch (error) {
      console.error(`❌ Failed to update search index for doctor ${doctorId}:`, error);
      throw error;
    }
  }

  /**
   * Update booking system with profile changes
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Updated section
   * @param {Object} updateData - Update data
   */
  async updateBookingSystem(doctorId, section, updateData) {
    try {
      console.log(`📅 Updating booking system for doctor ${doctorId}, section ${section}`);

      switch (section) {
        case 'workingHours':
          await this.updateDoctorAvailability(doctorId, updateData);
          break;
        
        case 'consultationModes':
          await this.updateConsultationOptions(doctorId, updateData);
          break;
        
        case 'timeSlotDuration':
        case 'breakBetweenSlots':
        case 'maxAdvanceBookingDays':
          await this.updateBookingConfiguration(doctorId, updateData);
          break;
        
        case 'status':
          if (updateData === 'suspended' || updateData === 'inactive') {
            await this.handleDoctorUnavailability(doctorId);
          }
          break;
      }

      console.log(`✅ Booking system updated for doctor ${doctorId}`);

    } catch (error) {
      console.error(`❌ Failed to update booking system for doctor ${doctorId}:`, error);
      throw error;
    }
  }

  /**
   * Notify patients of critical profile changes
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Updated section
   * @param {Object} updateData - Update data
   */
  async notifyPatientsOfChanges(doctorId, section, updateData) {
    try {
      console.log(`📢 Notifying patients of changes for doctor ${doctorId}, section ${section}`);

      // Get doctor information
      const doctor = await Doctor.findById(doctorId).populate('user', 'name');
      if (!doctor) {
        throw new Error(`Doctor ${doctorId} not found for patient notification`);
      }

      // Get patients who have upcoming appointments or recent consultations
      const affectedPatients = await this.getAffectedPatients(doctorId);

      if (affectedPatients.length === 0) {
        console.log(`ℹ️ No affected patients found for doctor ${doctorId}`);
        return;
      }

      // Determine notification type and content based on section
      const notificationData = this.buildPatientNotificationData(section, updateData, doctor);

      // Send notifications to affected patients
      for (const patientId of affectedPatients) {
        await this.notificationService.sendNotification(
          patientId,
          'doctor_profile_change',
          {
            doctorName: doctor.user?.name || 'Your doctor',
            doctorId,
            changeType: section,
            changeDescription: notificationData.description,
            ...notificationData.data
          },
          {
            title: notificationData.title,
            message: notificationData.message,
            priority: notificationData.priority,
            channels: ['websocket', 'email']
          }
        );
      }

      console.log(`✅ Patient notifications sent for doctor ${doctorId} to ${affectedPatients.length} patients`);

    } catch (error) {
      console.error(`❌ Failed to notify patients for doctor ${doctorId}:`, error);
      throw error;
    }
  }

  /**
   * Get patients affected by doctor profile changes
   * @param {string} doctorId - Doctor's ID
   * @returns {Promise<Array>} - Array of patient IDs
   */
  async getAffectedPatients(doctorId) {
    try {
      // In a real implementation, this would query:
      // 1. Patients with upcoming appointments
      // 2. Patients with recent consultations (last 30 days)
      // 3. Patients who have favorited this doctor
      
      // For now, return empty array as placeholder
      // This would typically involve querying appointment/consultation collections
      
      console.log(`🔍 Finding affected patients for doctor ${doctorId}`);
      
      // Placeholder implementation
      const affectedPatients = [];
      
      // In production, you would:
      // const upcomingAppointments = await Appointment.find({
      //   doctorId,
      //   appointmentDate: { $gte: new Date() },
      //   status: { $in: ['scheduled', 'confirmed'] }
      // }).distinct('patientId');
      
      // const recentConsultations = await Consultation.find({
      //   doctorId,
      //   createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      // }).distinct('patientId');
      
      // const favoritedBy = await User.find({
      //   'preferences.favoriteDoctors': doctorId
      // }).distinct('_id');
      
      // affectedPatients = [...new Set([...upcomingAppointments, ...recentConsultations, ...favoritedBy])];

      return affectedPatients;

    } catch (error) {
      console.error(`❌ Failed to get affected patients for doctor ${doctorId}:`, error);
      return [];
    }
  }

  /**
   * Build patient notification data based on change type
   * @param {string} section - Changed section
   * @param {Object} updateData - Update data
   * @param {Object} doctor - Doctor object
   * @returns {Object} - Notification data
   */
  buildPatientNotificationData(section, updateData, doctor) {
    const doctorName = doctor.user?.name || 'Your doctor';

    switch (section) {
      case 'workingHours':
        return {
          title: 'Doctor Schedule Updated',
          message: `${doctorName} has updated their working hours`,
          description: 'Working hours have been modified',
          priority: 'medium',
          data: {
            newWorkingHours: updateData
          }
        };

      case 'consultationModes':
        const availableModes = Object.entries(updateData)
          .filter(([mode, config]) => config?.available)
          .map(([mode]) => mode);
        
        return {
          title: 'Consultation Options Updated',
          message: `${doctorName} has updated their available consultation methods`,
          description: `Available consultation modes: ${availableModes.join(', ')}`,
          priority: 'medium',
          data: {
            availableModes,
            consultationModes: updateData
          }
        };

      case 'specializations':
        return {
          title: 'Doctor Specializations Updated',
          message: `${doctorName} has updated their medical specializations`,
          description: `New specializations: ${updateData.join(', ')}`,
          priority: 'low',
          data: {
            specializations: updateData
          }
        };

      case 'medicalLicense':
        return {
          title: 'Doctor Credentials Updated',
          message: `${doctorName} has updated their medical license information`,
          description: 'Medical license information has been updated',
          priority: 'high',
          data: {
            licenseInfo: updateData
          }
        };

      case 'status':
        const statusMessages = {
          suspended: 'temporarily unavailable',
          inactive: 'currently inactive',
          verified: 'now verified and available'
        };

        return {
          title: 'Doctor Status Updated',
          message: `${doctorName} is ${statusMessages[updateData] || 'status updated'}`,
          description: `Doctor status changed to: ${updateData}`,
          priority: updateData === 'suspended' || updateData === 'inactive' ? 'high' : 'medium',
          data: {
            newStatus: updateData
          }
        };

      default:
        return {
          title: 'Doctor Profile Updated',
          message: `${doctorName} has updated their profile`,
          description: `Profile section updated: ${section}`,
          priority: 'low',
          data: {
            section,
            updateData
          }
        };
    }
  }

  /**
   * Helper methods for specific sync operations
   */

  /**
   * Capture current state for rollback
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Section to capture
   * @returns {Promise<Object>} - Current state
   */
  async captureCurrentState(doctorId, section) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new Error(`Doctor ${doctorId} not found`);
      }

      return this.extractSectionData(doctor, section);

    } catch (error) {
      console.error(`❌ Failed to capture current state for doctor ${doctorId}, section ${section}:`, error);
      throw error;
    }
  }

  /**
   * Apply update to doctor profile
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Section to update
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} - Updated doctor
   */
  async applyUpdate(doctorId, section, updateData) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new Error(`Doctor ${doctorId} not found`);
      }

      // Apply the update based on section
      this.updateDoctorSection(doctor, section, updateData);

      // Save the updated doctor
      const updatedDoctor = await doctor.save();
      
      return updatedDoctor;

    } catch (error) {
      console.error(`❌ Failed to apply update for doctor ${doctorId}, section ${section}:`, error);
      throw error;
    }
  }

  /**
   * Update doctor profile section (similar to DoctorProfileService)
   * @param {Object} doctor - Doctor document
   * @param {string} section - Section to update
   * @param {Object} data - New data
   */
  updateDoctorSection(doctor, section, data) {
    switch (section) {
      case 'medicalLicense':
        doctor.medicalLicense = { ...doctor.medicalLicense.toObject(), ...data };
        break;
      case 'specializations':
        doctor.specializations = data;
        break;
      case 'qualifications':
        doctor.qualifications = data;
        break;
      case 'experience':
        doctor.experience = { ...doctor.experience.toObject(), ...data };
        break;
      case 'consultationModes':
        doctor.consultationModes = { ...doctor.consultationModes.toObject(), ...data };
        break;
      case 'workingHours':
        doctor.workingHours = { ...doctor.workingHours.toObject(), ...data };
        break;
      case 'availability':
        if (data.workingHours) {
          doctor.workingHours = { ...doctor.workingHours.toObject(), ...data.workingHours };
        }
        if (data.timeSlotDuration !== undefined) {
          doctor.timeSlotDuration = data.timeSlotDuration;
        }
        if (data.breakBetweenSlots !== undefined) {
          doctor.breakBetweenSlots = data.breakBetweenSlots;
        }
        if (data.maxAdvanceBookingDays !== undefined) {
          doctor.maxAdvanceBookingDays = data.maxAdvanceBookingDays;
        }
        break;
      case 'bio':
        doctor.bio = data;
        break;
      case 'languages':
        doctor.languages = data;
        break;
      case 'notifications':
      case 'notificationPreferences':
        doctor.notifications = { ...doctor.notifications.toObject(), ...data };
        break;
      case 'status':
        doctor.status = data;
        break;
      default:
        throw new Error(`Invalid profile section: ${section}`);
    }
  }

  /**
   * Extract section data from doctor profile
   * @param {Object} doctor - Doctor document
   * @param {string} section - Section to extract
   * @returns {Object} - Section data
   */
  extractSectionData(doctor, section) {
    switch (section) {
      case 'medicalLicense':
        return doctor.medicalLicense;
      case 'specializations':
        return doctor.specializations;
      case 'qualifications':
        return doctor.qualifications;
      case 'experience':
        return doctor.experience;
      case 'consultationModes':
        return doctor.consultationModes;
      case 'workingHours':
        return doctor.workingHours;
      case 'availability':
        return {
          workingHours: doctor.workingHours,
          timeSlotDuration: doctor.timeSlotDuration,
          breakBetweenSlots: doctor.breakBetweenSlots,
          maxAdvanceBookingDays: doctor.maxAdvanceBookingDays
        };
      case 'bio':
        return doctor.bio;
      case 'languages':
        return doctor.languages;
      case 'notifications':
      case 'notificationPreferences':
        return doctor.notifications;
      case 'status':
        return doctor.status;
      default:
        throw new Error(`Invalid profile section: ${section}`);
    }
  }

  /**
   * Check if a change is critical (requires patient notification)
   * @param {string} section - Changed section
   * @param {Object} updateData - Update data
   * @returns {boolean} - Whether change is critical
   */
  isCriticalChange(section, updateData) {
    return this.criticalChangeTypes.includes(section);
  }

  /**
   * Start background sync processor
   */
  startSyncProcessor() {
    // Process sync queue every 5 seconds
    setInterval(() => {
      this.processSyncQueue();
    }, 5000);

    // Clean up old rollback cache entries every hour
    setInterval(() => {
      this.cleanupRollbackCache();
    }, 60 * 60 * 1000);

    console.log('🔄 Sync processor started');
  }

  /**
   * Clean up old rollback cache entries
   */
  cleanupRollbackCache() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      for (const [operationId, rollbackData] of this.rollbackCache.entries()) {
        if (rollbackData.timestamp < oneHourAgo) {
          this.rollbackCache.delete(operationId);
        }
      }

      console.log(`🧹 Cleaned up rollback cache, ${this.rollbackCache.size} entries remaining`);

    } catch (error) {
      console.error('❌ Failed to cleanup rollback cache:', error);
    }
  }

  /**
   * Generate unique operation ID
   * @returns {string} - Operation ID
   */
  generateOperationId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Placeholder methods for external integrations
   */

  async updateExternalSearchService(searchDocument) {
    // Placeholder for external search service integration
    console.log(`🔍 External search service updated for doctor ${searchDocument.doctorId}`);
  }

  async updateDoctorAvailability(doctorId, workingHours) {
    // Placeholder for booking system availability update
    console.log(`📅 Doctor availability updated for ${doctorId}`);
  }

  async updateConsultationOptions(doctorId, consultationModes) {
    // Placeholder for booking system consultation options update
    console.log(`💬 Consultation options updated for ${doctorId}`);
  }

  async updateBookingConfiguration(doctorId, config) {
    // Placeholder for booking system configuration update
    console.log(`⚙️ Booking configuration updated for ${doctorId}`);
  }

  async handleDoctorUnavailability(doctorId) {
    // Placeholder for handling doctor unavailability
    console.log(`⚠️ Doctor unavailability handled for ${doctorId}`);
  }

  async updateProfileCache(doctorId) {
    // Placeholder for cache update
    console.log(`💾 Profile cache updated for ${doctorId}`);
  }

  async triggerExternalIntegrations(doctorId, section, updateData) {
    // Placeholder for external integrations
    console.log(`🔗 External integrations triggered for ${doctorId}, section ${section}`);
  }

  async handleSyncFailure(operation) {
    // Placeholder for sync failure handling
    console.error(`❌ Sync failure handled for operation ${operation.operationId}`);
  }

  extractWorkingHoursForSearch(workingHours) {
    if (!workingHours) return {};
    
    return Object.entries(workingHours)
      .filter(([day, hours]) => hours?.available)
      .reduce((acc, [day, hours]) => {
        acc[day] = {
          start: hours.start,
          end: hours.end,
          available: true
        };
        return acc;
      }, {});
  }

  /**
   * Get sync statistics
   * @returns {Object} - Sync statistics
   */
  getSyncStats() {
    const queuedOperations = Array.from(this.syncQueue.values())
      .reduce((total, queue) => total + queue.length, 0);

    return {
      queuedOperations,
      rollbackCacheSize: this.rollbackCache.size,
      criticalChangeTypes: this.criticalChangeTypes,
      timestamp: new Date()
    };
  }
}

export default new ProfileSyncService();