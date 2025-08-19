import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import AuditLogService from './AuditLogService.js';
import NotificationService from './realtime/NotificationService.js';

/**
 * ProfileIntegrationService - Handles integration of profile changes with platform features
 * Ensures profile updates are reflected across booking system, search functionality, and other platform features
 */
class ProfileIntegrationService {
  /**
   * Sync profile changes across all platform features
   * @param {string} doctorId - Doctor's ID
   * @param {string} section - Profile section that was updated
   * @param {Object} changes - Changes made to the profile
   * @param {string} userId - ID of user making changes
   * @returns {Promise<Object>} - Sync results
   */
  static async syncProfileChanges(doctorId, section, changes, userId) {
    try {
      const syncResults = {
        searchIndex: false,
        bookingSystem: false,
        notifications: false,
        patientNotifications: false,
        errors: []
      };

      // Get doctor profile
      const doctor = await Doctor.findById(doctorId).populate('user');
      if (!doctor) {
        throw new ApiError(404, 'Doctor profile not found');
      }

      // Update search index if relevant sections changed
      if (this.shouldUpdateSearchIndex(section)) {
        try {
          await this.updateSearchIndex(doctor, changes);
          syncResults.searchIndex = true;
        } catch (error) {
          syncResults.errors.push(`Search index update failed: ${error.message}`);
        }
      }

      // Update booking system if availability or consultation modes changed
      if (this.shouldUpdateBookingSystem(section)) {
        try {
          await this.updateBookingSystem(doctor, changes);
          syncResults.bookingSystem = true;
        } catch (error) {
          syncResults.errors.push(`Booking system update failed: ${error.message}`);
        }
      }

      // Send notifications for critical changes
      if (this.shouldNotifyPatients(section, changes)) {
        try {
          await this.notifyPatientsOfChanges(doctor, section, changes);
          syncResults.patientNotifications = true;
        } catch (error) {
          syncResults.errors.push(`Patient notification failed: ${error.message}`);
        }
      }

      // Log the sync operation
      await AuditLogService.logProfileSync(doctorId, section, syncResults, userId);

      return syncResults;
    } catch (error) {
      console.error('Profile sync error:', error);
      throw error;
    }
  }

  /**
   * Update search index with new profile information
   * @param {Object} doctor - Doctor document
   * @param {Object} changes - Profile changes
   */
  static async updateSearchIndex(doctor, changes) {
    // Update search cache in doctor document
    const searchCache = {
      specializations: doctor.specializations || [],
      qualificationDegrees: doctor.qualifications?.map(q => q.degree) || [],
      qualificationInstitutions: doctor.qualifications?.map(q => q.institution) || [],
      consultationModes: Object.keys(doctor.consultationModes || {}).filter(
        mode => doctor.consultationModes[mode]?.available
      ),
      lastUpdated: new Date()
    };

    await Doctor.findByIdAndUpdate(doctor._id, { searchCache });

    // In a real implementation, you would also update external search services
    // like Elasticsearch, Algolia, etc.
    console.log(`Search index updated for doctor ${doctor._id}`);
  }

  /**
   * Update booking system with availability changes
   * @param {Object} doctor - Doctor document
   * @param {Object} changes - Profile changes
   */
  static async updateBookingSystem(doctor, changes) {
    // Update availability status
    const isAvailable = doctor.isAvailable && 
      doctor.status === 'verified' &&
      Object.values(doctor.consultationModes || {}).some(mode => mode.available);

    await Doctor.findByIdAndUpdate(doctor._id, { 
      isAvailable,
      lastActiveAt: new Date()
    });

    // In a real implementation, you would also:
    // - Update appointment scheduling system
    // - Refresh available time slots
    // - Update calendar integrations
    console.log(`Booking system updated for doctor ${doctor._id}`);
  }

  /**
   * Notify patients of critical profile changes
   * @param {Object} doctor - Doctor document
   * @param {string} section - Profile section
   * @param {Object} changes - Profile changes
   */
  static async notifyPatientsOfChanges(doctor, section, changes) {
    // Get patients who have upcoming appointments or recent consultations
    const affectedPatients = await this.getAffectedPatients(doctor._id);

    const notificationData = {
      type: 'doctor_profile_update',
      doctorId: doctor._id,
      doctorName: doctor.user.profile?.firstName && doctor.user.profile?.lastName 
        ? `Dr. ${doctor.user.profile.firstName} ${doctor.user.profile.lastName}`
        : 'Your doctor',
      section,
      changes: this.formatChangesForPatients(section, changes),
      timestamp: new Date()
    };

    // Send notifications to affected patients
    for (const patientId of affectedPatients) {
      try {
        await NotificationService.sendNotification(patientId, {
          title: 'Doctor Profile Updated',
          message: `${notificationData.doctorName} has updated their ${section} information.`,
          data: notificationData,
          type: 'profile_update'
        });
      } catch (error) {
        console.error(`Failed to notify patient ${patientId}:`, error);
      }
    }

    console.log(`Notified ${affectedPatients.length} patients of profile changes`);
  }

  /**
   * Get patients affected by doctor profile changes
   * @param {string} doctorId - Doctor's ID
   * @returns {Promise<Array>} - Array of patient IDs
   */
  static async getAffectedPatients(doctorId) {
    // In a real implementation, you would query appointments and consultations
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Format profile changes for patient notifications
   * @param {string} section - Profile section
   * @param {Object} changes - Profile changes
   * @returns {Object} - Formatted changes
   */
  static formatChangesForPatients(section, changes) {
    const patientFriendlyChanges = {};

    switch (section) {
      case 'availability':
        if (changes.workingHours) {
          patientFriendlyChanges.message = 'Working hours have been updated';
        }
        if (changes.consultationModes) {
          patientFriendlyChanges.message = 'Available consultation types have been updated';
        }
        break;
      case 'consultation':
        patientFriendlyChanges.message = 'Consultation fees or availability have been updated';
        break;
      case 'personal':
        patientFriendlyChanges.message = 'Contact information has been updated';
        break;
      default:
        patientFriendlyChanges.message = 'Profile information has been updated';
    }

    return patientFriendlyChanges;
  }

  /**
   * Check if search index should be updated for this section
   * @param {string} section - Profile section
   * @returns {boolean}
   */
  static shouldUpdateSearchIndex(section) {
    const searchRelevantSections = [
      'specializations',
      'qualifications',
      'experience',
      'personal',
      'consultation'
    ];
    return searchRelevantSections.includes(section);
  }

  /**
   * Check if booking system should be updated for this section
   * @param {string} section - Profile section
   * @returns {boolean}
   */
  static shouldUpdateBookingSystem(section) {
    const bookingRelevantSections = [
      'availability',
      'consultation',
      'license'
    ];
    return bookingRelevantSections.includes(section);
  }

  /**
   * Check if patients should be notified of changes in this section
   * @param {string} section - Profile section
   * @param {Object} changes - Profile changes
   * @returns {boolean}
   */
  static shouldNotifyPatients(section, changes) {
    const criticalSections = ['availability', 'consultation', 'personal'];
    
    if (!criticalSections.includes(section)) {
      return false;
    }

    // Check for significant changes that would affect patients
    if (section === 'availability') {
      return changes.workingHours || changes.consultationModes;
    }

    if (section === 'consultation') {
      return changes.consultationModes || changes.fees;
    }

    if (section === 'personal') {
      return changes.phone || changes.email;
    }

    return false;
  }

  /**
   * Get profile completion status and onboarding guidance
   * @param {string} doctorId - Doctor's ID
   * @returns {Promise<Object>} - Completion status and guidance
   */
  static async getProfileCompletionStatus(doctorId) {
    try {
      const doctor = await Doctor.findById(doctorId).populate('user');
      if (!doctor) {
        throw new ApiError(404, 'Doctor profile not found');
      }

      const completionStatus = {
        isComplete: false,
        completionPercentage: 0,
        missingFields: [],
        recommendations: [],
        nextSteps: []
      };

      // Check required sections
      const requiredSections = {
        personalInfo: this.checkPersonalInfoCompletion(doctor),
        medicalLicense: this.checkMedicalLicenseCompletion(doctor),
        specializations: this.checkSpecializationsCompletion(doctor),
        qualifications: this.checkQualificationsCompletion(doctor),
        consultationModes: this.checkConsultationModesCompletion(doctor),
        availability: this.checkAvailabilityCompletion(doctor)
      };

      // Calculate completion
      const completedSections = Object.values(requiredSections).filter(Boolean).length;
      const totalSections = Object.keys(requiredSections).length;
      completionStatus.completionPercentage = Math.round((completedSections / totalSections) * 100);
      completionStatus.isComplete = completionStatus.completionPercentage === 100;

      // Identify missing fields
      Object.entries(requiredSections).forEach(([section, isComplete]) => {
        if (!isComplete) {
          completionStatus.missingFields.push(section);
        }
      });

      // Generate recommendations
      completionStatus.recommendations = this.generateOnboardingRecommendations(
        completionStatus.missingFields,
        doctor
      );

      // Generate next steps
      completionStatus.nextSteps = this.generateNextSteps(
        completionStatus.missingFields,
        completionStatus.completionPercentage
      );

      return completionStatus;
    } catch (error) {
      console.error('Error getting profile completion status:', error);
      throw error;
    }
  }

  /**
   * Check personal info completion
   * @param {Object} doctor - Doctor document
   * @returns {boolean}
   */
  static checkPersonalInfoCompletion(doctor) {
    const user = doctor.user;
    return !!(
      user?.profile?.firstName &&
      user?.profile?.lastName &&
      user?.email &&
      user?.profile?.phone
    );
  }

  /**
   * Check medical license completion
   * @param {Object} doctor - Doctor document
   * @returns {boolean}
   */
  static checkMedicalLicenseCompletion(doctor) {
    const license = doctor.medicalLicense;
    return !!(
      license?.licenseNumber &&
      license?.issuingAuthority &&
      license?.issueDate &&
      license?.expiryDate
    );
  }

  /**
   * Check specializations completion
   * @param {Object} doctor - Doctor document
   * @returns {boolean}
   */
  static checkSpecializationsCompletion(doctor) {
    return doctor.specializations && doctor.specializations.length > 0;
  }

  /**
   * Check qualifications completion
   * @param {Object} doctor - Doctor document
   * @returns {boolean}
   */
  static checkQualificationsCompletion(doctor) {
    return doctor.qualifications && doctor.qualifications.length > 0;
  }

  /**
   * Check consultation modes completion
   * @param {Object} doctor - Doctor document
   * @returns {boolean}
   */
  static checkConsultationModesCompletion(doctor) {
    const modes = doctor.consultationModes;
    return modes && Object.values(modes).some(mode => mode.available && mode.fee > 0);
  }

  /**
   * Check availability completion
   * @param {Object} doctor - Doctor document
   * @returns {boolean}
   */
  static checkAvailabilityCompletion(doctor) {
    const hours = doctor.workingHours;
    return hours && Object.values(hours).some(day => day.available && day.start && day.end);
  }

  /**
   * Generate onboarding recommendations
   * @param {Array} missingFields - Missing profile fields
   * @param {Object} doctor - Doctor document
   * @returns {Array} - Recommendations
   */
  static generateOnboardingRecommendations(missingFields, doctor) {
    const recommendations = [];

    if (missingFields.includes('personalInfo')) {
      recommendations.push({
        priority: 'high',
        title: 'Complete Personal Information',
        description: 'Add your contact details to help patients reach you',
        action: 'Update personal info section'
      });
    }

    if (missingFields.includes('medicalLicense')) {
      recommendations.push({
        priority: 'critical',
        title: 'Verify Medical License',
        description: 'Upload and verify your medical license to start accepting patients',
        action: 'Complete license verification'
      });
    }

    if (missingFields.includes('specializations')) {
      recommendations.push({
        priority: 'high',
        title: 'Add Specializations',
        description: 'Help patients find you by adding your medical specializations',
        action: 'Add specializations'
      });
    }

    if (missingFields.includes('consultationModes')) {
      recommendations.push({
        priority: 'high',
        title: 'Set Consultation Options',
        description: 'Configure your consultation types and fees',
        action: 'Set up consultation modes'
      });
    }

    if (missingFields.includes('availability')) {
      recommendations.push({
        priority: 'medium',
        title: 'Set Working Hours',
        description: 'Define your availability for patient bookings',
        action: 'Configure availability'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate next steps for profile completion
   * @param {Array} missingFields - Missing profile fields
   * @param {number} completionPercentage - Current completion percentage
   * @returns {Array} - Next steps
   */
  static generateNextSteps(missingFields, completionPercentage) {
    const nextSteps = [];

    if (completionPercentage < 25) {
      nextSteps.push('Start with personal information and medical license verification');
    } else if (completionPercentage < 50) {
      nextSteps.push('Add your specializations and qualifications');
    } else if (completionPercentage < 75) {
      nextSteps.push('Configure consultation modes and availability');
    } else if (completionPercentage < 100) {
      nextSteps.push('Complete remaining sections to activate your profile');
    } else {
      nextSteps.push('Your profile is complete! Consider adding more details to stand out');
    }

    return nextSteps;
  }

  /**
   * Track profile completion progress for analytics
   * @param {string} doctorId - Doctor's ID
   * @param {Object} completionData - Completion status data
   */
  static async trackProfileProgress(doctorId, completionData) {
    try {
      // Log completion progress for analytics
      await AuditLogService.logProfileProgress(doctorId, completionData);
      
      // In a real implementation, you might also:
      // - Send data to analytics service
      // - Update completion metrics
      // - Trigger onboarding emails
      
      console.log(`Profile progress tracked for doctor ${doctorId}: ${completionData.completionPercentage}%`);
    } catch (error) {
      console.error('Error tracking profile progress:', error);
    }
  }
}

export default ProfileIntegrationService;