import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import ProfileValidationService from './ProfileValidationService.js';
import DocumentUploadService from './DocumentUploadService.js';
import AuditLogService from './AuditLogService.js';
import ProfileSyncService from './ProfileSyncService.js';
import ProfileIntegrationService from './ProfileIntegrationService.js';

/**
 * DoctorProfileService - Centralized service for doctor profile operations
 */
class DoctorProfileService {
  /**
   * Get complete doctor profile with populated user data
   * @param {string} doctorId - Doctor's ID
   * @param {boolean} includeStats - Whether to include statistics
   * @returns {Promise<Object>} - Complete doctor profile
   */
  async getFullProfile(doctorId, includeStats = false) {
    try {
      let query = Doctor.findById(doctorId).populate('user', 'name email profilePicture isActive createdAt');
      
      const doctor = await query.exec();
      
      if (!doctor) {
        throw new ApiError(404, 'Doctor profile not found');
      }

      const profileData = doctor.toObject();

      // Add computed fields
      profileData.isFullySetup = doctor.isFullySetup;
      profileData.profileCompletionPercentage = this.calculateProfileCompletion(doctor);

      // Include statistics if requested
      if (includeStats) {
        profileData.statistics = await this.getDoctorStatistics(doctorId);
      }

      return profileData;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, `Failed to retrieve doctor profile: ${error.message}`);
    }
  }

  /**
   * Update specific profile section with optimistic updates and sync
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Profile section to update
   * @param {Object} data - Section data
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} - Updated profile section with sync info
   */
  async updateProfileSection(doctorId, section, data, userId) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new ApiError(404, 'Doctor profile not found');
      }

      // Validate the section data
      const validation = await this.validateSectionData(section, data);
      if (!validation.isValid) {
        throw new ApiError(400, 'Validation failed', validation.errors);
      }

      // Use ProfileSyncService for optimistic updates with rollback capability
      const syncResult = await ProfileSyncService.performOptimisticUpdate(
        doctorId,
        section,
        data,
        userId
      );

      // Sync profile changes with platform features
      const integrationResult = await ProfileIntegrationService.syncProfileChanges(
        doctorId,
        section,
        data,
        userId
      );

      return {
        ...syncResult.updatedData,
        syncInfo: {
          operationId: syncResult.operationId,
          rollbackAvailable: syncResult.rollbackAvailable,
          success: syncResult.success
        },
        integrationInfo: integrationResult
      };

    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, `Failed to update profile section: ${error.message}`);
    }
  }

  /**
   * Legacy update method for backward compatibility
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Profile section to update
   * @param {Object} data - Section data
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} - Updated profile section
   */
  async updateProfileSectionLegacy(doctorId, section, data, userId) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new ApiError(404, 'Doctor profile not found');
      }

      // Validate the section data
      const validation = await this.validateSectionData(section, data);
      if (!validation.isValid) {
        throw new ApiError(400, 'Validation failed', validation.errors);
      }

      // Store previous values for audit log
      const previousValues = this.extractSectionData(doctor, section);

      // Update the specific section
      this.updateDoctorSection(doctor, section, data);

      // Save the updated doctor profile
      const updatedDoctor = await doctor.save();

      // Log the change
      await AuditLogService.logProfileChange({
        doctorId,
        section,
        changes: data,
        previousValues,
        userId,
        timestamp: new Date()
      });

      // Trigger any necessary side effects
      await this.handleSectionUpdateSideEffects(doctorId, section, data);

      return this.extractSectionData(updatedDoctor, section);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, `Failed to update profile section: ${error.message}`);
    }
  }

  /**
   * Validate profile section data
   * @param {string} section - Profile section name
   * @param {Object} data - Section data to validate
   * @returns {Object} - Validation result
   */
  async validateSectionData(section, data) {
    switch (section) {
      case 'personalInfo':
        return ProfileValidationService.validatePersonalInfo(data);
      case 'medicalLicense':
        return ProfileValidationService.validateMedicalLicense(data);
      case 'specializations':
        return ProfileValidationService.validateSpecializations(data);
      case 'qualifications':
        return ProfileValidationService.validateQualifications(data);
      case 'experience':
        return ProfileValidationService.validateExperience(data);
      case 'consultationModes':
        return ProfileValidationService.validateConsultationModes(data);
      case 'workingHours':
        return ProfileValidationService.validateWorkingHours(data);
      case 'availability':
        return ProfileValidationService.validateAvailability(data);
      case 'bio':
        return ProfileValidationService.validateBio(data);
      case 'languages':
        return ProfileValidationService.validateLanguages(data);
      case 'notifications':
      case 'notificationPreferences':
        return ProfileValidationService.validateNotifications(data);
      default:
        return { isValid: false, errors: [{ field: 'section', message: 'Invalid profile section' }] };
    }
  }

  /**
   * Update doctor profile section
   * @param {Object} doctor - Doctor document
   * @param {string} section - Section to update
   * @param {Object} data - New data
   */
  updateDoctorSection(doctor, section, data) {
    switch (section) {
      case 'personalInfo':
        // Personal info is stored in the User model, handle separately
        break;
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
      default:
        throw new ApiError(400, 'Invalid profile section');
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
      case 'personalInfo':
        return {
          firstName: doctor.user?.name?.split(' ')[0] || '',
          lastName: doctor.user?.name?.split(' ').slice(1).join(' ') || '',
          email: doctor.user?.email || '',
          profileImage: doctor.profileImage
        };
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
      default:
        throw new ApiError(400, 'Invalid profile section');
    }
  }

  /**
   * Handle side effects of profile section updates
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Updated section
   * @param {Object} data - New data
   */
  async handleSectionUpdateSideEffects(doctorId, section, data) {
    try {
      switch (section) {
        case 'specializations':
          // Update search index when specializations change
          await this.updateSearchIndex(doctorId);
          break;
        case 'consultationModes':
          // Update booking system when consultation modes change
          await this.updateBookingSystem(doctorId, data);
          break;
        case 'workingHours':
          // Update availability when working hours change
          await this.updateAvailabilitySystem(doctorId, data);
          break;
        case 'availability':
          // Update availability system when availability settings change
          await this.updateAvailabilitySystem(doctorId, data);
          break;
        case 'medicalLicense':
          // Trigger re-verification if license info changes
          if (data.licenseNumber || data.expiryDate) {
            await this.triggerLicenseReVerification(doctorId);
          }
          break;
      }
    } catch (error) {
      // Log side effect errors but don't fail the main operation
      console.error(`Side effect error for section ${section}:`, error);
    }
  }

  /**
   * Calculate profile completion percentage
   * @param {Object} doctor - Doctor document
   * @returns {number} - Completion percentage (0-100)
   */
  calculateProfileCompletion(doctor) {
    const sections = {
      medicalLicense: doctor.medicalLicense?.licenseNumber ? 15 : 0,
      specializations: doctor.specializations?.length > 0 ? 15 : 0,
      qualifications: doctor.qualifications?.length > 0 ? 15 : 0,
      experience: doctor.experience?.totalYears >= 0 ? 10 : 0,
      bio: doctor.bio?.length > 10 ? 10 : 0,
      consultationModes: Object.values(doctor.consultationModes || {}).some(mode => mode?.available) ? 15 : 0,
      workingHours: Object.values(doctor.workingHours || {}).some(day => day?.available) ? 10 : 0,
      languages: doctor.languages?.length > 0 ? 5 : 0,
      profileImage: doctor.profileImage ? 5 : 0
    };

    return Object.values(sections).reduce((total, score) => total + score, 0);
  }

  /**
   * Get doctor statistics
   * @param {string} doctorId - Doctor's ID
   * @returns {Promise<Object>} - Doctor statistics
   */
  async getDoctorStatistics(doctorId) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new ApiError(404, 'Doctor not found');
      }

      return {
        totalConsultations: doctor.stats.totalConsultations,
        completedConsultations: doctor.stats.completedConsultations,
        cancelledConsultations: doctor.stats.cancelledConsultations,
        averageRating: doctor.ratings.average,
        totalReviews: doctor.ratings.totalReviews,
        responseTime: doctor.stats.responseTime,
        patientsSeen: doctor.stats.patientsSeen,
        earnings: {
          total: doctor.earnings.totalEarnings,
          thisMonth: doctor.earnings.thisMonth,
          lastMonth: doctor.earnings.lastMonth
        }
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, `Failed to get doctor statistics: ${error.message}`);
    }
  }

  /**
   * Sync profile changes across platform
   * @param {string} doctorId - Doctor's ID
   * @param {Object} changes - Profile changes
   */
  async syncProfileChanges(doctorId, changes) {
    try {
      // Update search index
      await this.updateSearchIndex(doctorId);

      // Update booking system
      await this.updateBookingSystem(doctorId, changes);

      // Notify patients of critical changes
      if (this.isCriticalChange(changes)) {
        await this.notifyPatientsOfChanges(doctorId, changes);
      }

      // Update cache
      await this.updateProfileCache(doctorId);
    } catch (error) {
      console.error('Profile sync error:', error);
      // Don't throw error to avoid failing the main operation
    }
  }

  /**
   * Check if profile change is critical (requires patient notification)
   * @param {Object} changes - Profile changes
   * @returns {boolean} - Whether change is critical
   */
  isCriticalChange(changes) {
    const criticalSections = ['consultationModes', 'workingHours', 'specializations'];
    return Object.keys(changes).some(section => criticalSections.includes(section));
  }

  /**
   * Update search index when specializations change
   * @param {string} doctorId - Doctor's ID
   */
  async updateSearchIndex(doctorId) {
    try {
      const doctor = await Doctor.findById(doctorId).populate('user', 'name email');
      if (!doctor) {
        console.error(`Doctor ${doctorId} not found for search index update`);
        return;
      }

      // Create search document with specializations and other searchable fields
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
        isAvailable: doctor.isAvailable,
        status: doctor.status,
        lastUpdated: new Date()
      };

      // Log the search index update (in a real implementation, this would call a search service)
      console.log(`Updating search index for doctor ${doctorId}:`, {
        specializations: searchDocument.specializations,
        qualifications: searchDocument.qualifications.length,
        consultationModes: searchDocument.consultationModes
      });

      // In a real implementation, you would:
      // 1. Send this data to Elasticsearch, Algolia, or similar search service
      // 2. Update database indexes for faster queries
      // 3. Invalidate relevant caches
      
      // For now, we'll update a simple search cache in the database
      await this.updateDoctorSearchCache(doctorId, searchDocument);

    } catch (error) {
      console.error(`Failed to update search index for doctor ${doctorId}:`, error);
      // Don't throw error to avoid failing the main operation
    }
  }

  /**
   * Update doctor search cache in database
   * @param {string} doctorId - Doctor's ID
   * @param {Object} searchDocument - Search document data
   */
  async updateDoctorSearchCache(doctorId, searchDocument) {
    try {
      // Update the doctor document with search-optimized fields
      await Doctor.findByIdAndUpdate(doctorId, {
        $set: {
          'searchCache.specializations': searchDocument.specializations,
          'searchCache.qualificationDegrees': searchDocument.qualifications.map(q => q.degree),
          'searchCache.qualificationInstitutions': searchDocument.qualifications.map(q => q.institution),
          'searchCache.consultationModes': searchDocument.consultationModes,
          'searchCache.lastUpdated': searchDocument.lastUpdated
        }
      });

      console.log(`Search cache updated for doctor ${doctorId}`);
    } catch (error) {
      console.error(`Failed to update search cache for doctor ${doctorId}:`, error);
    }
  }

  /**
   * Update booking system (placeholder for booking service integration)
   * @param {string} doctorId - Doctor's ID
   * @param {Object} changes - Profile changes
   */
  async updateBookingSystem(doctorId, changes) {
    // Placeholder for booking system integration
    console.log(`Updating booking system for doctor ${doctorId}`, changes);
  }

  /**
   * Update availability system (placeholder for availability service integration)
   * @param {string} doctorId - Doctor's ID
   * @param {Object} workingHours - New working hours
   */
  async updateAvailabilitySystem(doctorId, workingHours) {
    // Placeholder for availability system integration
    console.log(`Updating availability for doctor ${doctorId}`, workingHours);
  }

  /**
   * Trigger license re-verification (placeholder for verification service)
   * @param {string} doctorId - Doctor's ID
   */
  async triggerLicenseReVerification(doctorId) {
    // Placeholder for license verification service
    console.log(`Triggering license re-verification for doctor ${doctorId}`);
  }

  /**
   * Notify patients of profile changes (placeholder for notification service)
   * @param {string} doctorId - Doctor's ID
   * @param {Object} changes - Profile changes
   */
  async notifyPatientsOfChanges(doctorId, changes) {
    // Placeholder for patient notification service
    console.log(`Notifying patients of changes for doctor ${doctorId}`, changes);
  }

  /**
   * Update profile cache (placeholder for cache service)
   * @param {string} doctorId - Doctor's ID
   */
  async updateProfileCache(doctorId) {
    // Placeholder for cache service integration
    console.log(`Updating profile cache for doctor ${doctorId}`);
  }

  /**
   * Validate complete profile for verification
   * @param {string} doctorId - Doctor's ID
   * @returns {Promise<Object>} - Validation result
   */
  async validateCompleteProfile(doctorId) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new ApiError(404, 'Doctor profile not found');
      }

      const profileData = doctor.toObject();
      const validation = ProfileValidationService.validateCompleteProfile(profileData);

      return {
        ...validation,
        completionPercentage: this.calculateProfileCompletion(doctor),
        isFullySetup: doctor.isFullySetup,
        missingRequiredFields: this.getMissingRequiredFields(doctor)
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, `Failed to validate complete profile: ${error.message}`);
    }
  }

  /**
   * Get missing required fields for profile completion
   * @param {Object} doctor - Doctor document
   * @returns {Array} - Array of missing required fields
   */
  getMissingRequiredFields(doctor) {
    const missing = [];

    if (!doctor.medicalLicense?.licenseNumber) missing.push('medicalLicense.licenseNumber');
    if (!doctor.medicalLicense?.issuingAuthority) missing.push('medicalLicense.issuingAuthority');
    if (!doctor.specializations?.length) missing.push('specializations');
    if (!doctor.qualifications?.length) missing.push('qualifications');
    if (!doctor.bio || doctor.bio.length < 10) missing.push('bio');
    if (!Object.values(doctor.consultationModes || {}).some(mode => mode?.available)) {
      missing.push('consultationModes');
    }

    return missing;
  }

  /**
   * Get profile completion status with onboarding guidance
   * @param {string} doctorId - Doctor's ID
   * @returns {Promise<Object>} - Profile completion status and guidance
   */
  async getProfileCompletionStatus(doctorId) {
    try {
      return await ProfileIntegrationService.getProfileCompletionStatus(doctorId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, `Failed to get profile completion status: ${error.message}`);
    }
  }

  /**
   * Track profile completion progress
   * @param {string} doctorId - Doctor's ID
   * @returns {Promise<void>}
   */
  async trackProfileProgress(doctorId) {
    try {
      const completionStatus = await this.getProfileCompletionStatus(doctorId);
      await ProfileIntegrationService.trackProfileProgress(doctorId, completionStatus);
    } catch (error) {
      console.error('Error tracking profile progress:', error);
      // Don't throw error to avoid failing main operations
    }
  }
}

export default new DoctorProfileService();