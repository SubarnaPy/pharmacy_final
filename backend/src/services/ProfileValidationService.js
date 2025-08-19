import { validationUtils } from '../utils/authUtils.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * ProfileValidationService - Comprehensive validation for doctor profile data
 */
class ProfileValidationService {
  /**
   * Validate personal information section
   * @param {Object} personalInfo - Personal information data
   * @returns {Object} - Validation result with errors array
   */
  static validatePersonalInfo(personalInfo) {
    const errors = [];
    
    if (!personalInfo) {
      errors.push({ field: 'personalInfo', message: 'Personal information is required' });
      return { isValid: false, errors };
    }

    // Validate email format
    if (personalInfo.email && !validationUtils.isValidEmail(personalInfo.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    // Validate phone number
    if (personalInfo.phone && !validationUtils.isValidPhone(personalInfo.phone)) {
      errors.push({ field: 'phone', message: 'Invalid phone number format' });
    }

    // Validate name fields
    if (personalInfo.firstName && personalInfo.firstName.trim().length < 2) {
      errors.push({ field: 'firstName', message: 'First name must be at least 2 characters long' });
    }

    if (personalInfo.lastName && personalInfo.lastName.trim().length < 2) {
      errors.push({ field: 'lastName', message: 'Last name must be at least 2 characters long' });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate medical license information
   * @param {Object} medicalLicense - Medical license data
   * @returns {Object} - Validation result with errors array
   */
  static validateMedicalLicense(medicalLicense) {
    const errors = [];
    
    if (!medicalLicense) {
      errors.push({ field: 'medicalLicense', message: 'Medical license information is required' });
      return { isValid: false, errors };
    }

    // Validate license number
    if (!medicalLicense.licenseNumber || medicalLicense.licenseNumber.trim().length < 5) {
      errors.push({ field: 'licenseNumber', message: 'License number must be at least 5 characters long' });
    }

    // Validate issuing authority
    if (!medicalLicense.issuingAuthority || medicalLicense.issuingAuthority.trim().length < 3) {
      errors.push({ field: 'issuingAuthority', message: 'Issuing authority is required' });
    }

    // Validate dates
    if (!medicalLicense.issueDate) {
      errors.push({ field: 'issueDate', message: 'Issue date is required' });
    }

    if (!medicalLicense.expiryDate) {
      errors.push({ field: 'expiryDate', message: 'Expiry date is required' });
    }

    // Check if expiry date is in the future
    if (medicalLicense.expiryDate && new Date(medicalLicense.expiryDate) <= new Date()) {
      errors.push({ field: 'expiryDate', message: 'License expiry date must be in the future' });
    }

    // Check if issue date is before expiry date
    if (medicalLicense.issueDate && medicalLicense.expiryDate) {
      if (new Date(medicalLicense.issueDate) >= new Date(medicalLicense.expiryDate)) {
        errors.push({ field: 'issueDate', message: 'Issue date must be before expiry date' });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate specializations array
   * @param {Array} specializations - Array of specializations
   * @returns {Object} - Validation result with errors array
   */
  static validateSpecializations(specializations) {
    const errors = [];
    const validSpecializations = [
      'General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
      'Gynecology', 'Dermatology', 'Psychiatry', 'Ophthalmology', 'ENT',
      'Radiology', 'Pathology', 'Anesthesiology', 'Emergency Medicine',
      'Internal Medicine', 'Surgery', 'Oncology', 'Endocrinology',
      'Gastroenterology', 'Nephrology', 'Pulmonology', 'Rheumatology',
      'Infectious Disease', 'Allergy & Immunology', 'Sports Medicine',
      'Pain Management', 'Rehabilitation', 'Preventive Medicine', 'Other'
    ];

    if (!Array.isArray(specializations)) {
      errors.push({ field: 'specializations', message: 'Specializations must be an array' });
      return { isValid: false, errors };
    }

    if (specializations.length === 0) {
      errors.push({ field: 'specializations', message: 'At least one specialization is required' });
    }

    if (specializations.length > 5) {
      errors.push({ field: 'specializations', message: 'Maximum 5 specializations allowed' });
    }

    // Check for duplicates (case-insensitive)
    const lowerCaseSpecs = specializations.map(spec => spec.toLowerCase());
    const uniqueSpecs = [...new Set(lowerCaseSpecs)];
    if (uniqueSpecs.length !== specializations.length) {
      errors.push({ field: 'specializations', message: 'Duplicate specializations are not allowed' });
    }

    // Validate each specialization
    specializations.forEach((spec, index) => {
      if (typeof spec !== 'string' || spec.trim() === '') {
        errors.push({ 
          field: `specializations[${index}]`, 
          message: 'Specialization cannot be empty' 
        });
      } else if (!validSpecializations.includes(spec)) {
        errors.push({ 
          field: `specializations[${index}]`, 
          message: `Invalid specialization: ${spec}. Must be one of the predefined options.` 
        });
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate qualifications array
   * @param {Array} qualifications - Array of qualification objects
   * @returns {Object} - Validation result with errors array
   */
  static validateQualifications(qualifications) {
    const errors = [];

    if (!Array.isArray(qualifications)) {
      errors.push({ field: 'qualifications', message: 'Qualifications must be an array' });
      return { isValid: false, errors };
    }

    if (qualifications.length === 0) {
      errors.push({ field: 'qualifications', message: 'At least one qualification is required' });
    }

    if (qualifications.length > 20) {
      errors.push({ field: 'qualifications', message: 'Maximum 20 qualifications allowed' });
    }

    // Check for duplicate qualifications (same degree from same institution in same year)
    const qualificationKeys = qualifications.map(qual => 
      `${qual.degree?.toLowerCase()}-${qual.institution?.toLowerCase()}-${qual.year}`
    );
    const uniqueKeys = [...new Set(qualificationKeys)];
    if (uniqueKeys.length !== qualifications.length) {
      errors.push({ field: 'qualifications', message: 'Duplicate qualifications are not allowed' });
    }

    qualifications.forEach((qual, index) => {
      // Validate degree (required field)
      if (!qual.degree || typeof qual.degree !== 'string' || qual.degree.trim().length < 2) {
        errors.push({ 
          field: `qualifications[${index}].degree`, 
          message: 'Degree is required and must be at least 2 characters' 
        });
      } else if (qual.degree.trim().length > 100) {
        errors.push({ 
          field: `qualifications[${index}].degree`, 
          message: 'Degree must be less than 100 characters' 
        });
      }

      // Validate institution (required field)
      if (!qual.institution || typeof qual.institution !== 'string' || qual.institution.trim().length < 3) {
        errors.push({ 
          field: `qualifications[${index}].institution`, 
          message: 'Institution is required and must be at least 3 characters' 
        });
      } else if (qual.institution.trim().length > 200) {
        errors.push({ 
          field: `qualifications[${index}].institution`, 
          message: 'Institution name must be less than 200 characters' 
        });
      }

      // Validate year (required field)
      if (!qual.year || typeof qual.year !== 'number') {
        errors.push({ 
          field: `qualifications[${index}].year`, 
          message: 'Valid graduation year is required' 
        });
      } else {
        const currentYear = new Date().getFullYear();
        if (qual.year < 1950 || qual.year > currentYear) {
          errors.push({ 
            field: `qualifications[${index}].year`, 
            message: `Graduation year must be between 1950 and ${currentYear}` 
          });
        }
      }

      // Validate specialization (optional field)
      if (qual.specialization && typeof qual.specialization === 'string') {
        if (qual.specialization.trim().length > 100) {
          errors.push({ 
            field: `qualifications[${index}].specialization`, 
            message: 'Specialization must be less than 100 characters' 
          });
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate consultation modes configuration
   * @param {Object} consultationModes - Consultation modes object
   * @returns {Object} - Validation result with errors array
   */
  static validateConsultationModes(consultationModes) {
    const errors = [];
    const validModes = ['chat', 'phone', 'email', 'video'];

    if (!consultationModes || typeof consultationModes !== 'object') {
      errors.push({ field: 'consultationModes', message: 'Consultation modes configuration is required' });
      return { isValid: false, errors };
    }

    // Check if at least one mode is available
    const hasAvailableMode = Object.values(consultationModes).some(mode => mode?.available === true);
    if (!hasAvailableMode) {
      errors.push({ field: 'consultationModes', message: 'At least one consultation mode must be available' });
    }

    validModes.forEach(mode => {
      const modeConfig = consultationModes[mode];
      if (modeConfig && modeConfig.available) {
        // Validate fee
        if (typeof modeConfig.fee !== 'number' || modeConfig.fee < 0) {
          errors.push({ 
            field: `consultationModes.${mode}.fee`, 
            message: 'Fee must be a non-negative number' 
          });
        }

        // Validate duration for non-email modes
        if (mode !== 'email') {
          if (typeof modeConfig.duration !== 'number' || modeConfig.duration < 15 || modeConfig.duration > 180) {
            errors.push({ 
              field: `consultationModes.${mode}.duration`, 
              message: 'Duration must be between 15 and 180 minutes' 
            });
          }
        } else {
          // Validate response time for email mode
          if (typeof modeConfig.responseTime !== 'number' || modeConfig.responseTime < 1 || modeConfig.responseTime > 72) {
            errors.push({ 
              field: `consultationModes.${mode}.responseTime`, 
              message: 'Response time must be between 1 and 72 hours' 
            });
          }
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate availability configuration (working hours + settings)
   * @param {Object} availability - Availability object with workingHours and settings
   * @returns {Object} - Validation result with errors array
   */
  static validateAvailability(availability) {
    const errors = [];
    
    console.log('Validating availability data:', availability);

    if (!availability || typeof availability !== 'object') {
      errors.push({ field: 'availability', message: 'Availability configuration is required' });
      return { isValid: false, errors };
    }

    // Validate working hours if provided
    if (availability.workingHours) {
      try {
        const workingHoursValidation = this.validateWorkingHours(availability.workingHours);
        errors.push(...workingHoursValidation.errors);
      } catch (error) {
        console.error('Working hours validation error:', error);
        errors.push({ field: 'workingHours', message: 'Invalid working hours format' });
      }
    }

    // Validate time slot duration
    if (availability.timeSlotDuration !== undefined) {
      if (typeof availability.timeSlotDuration !== 'number' || availability.timeSlotDuration < 15 || availability.timeSlotDuration > 120) {
        errors.push({ 
          field: 'timeSlotDuration', 
          message: 'Time slot duration must be between 15 and 120 minutes' 
        });
      }
    }

    // Validate break between slots
    if (availability.breakBetweenSlots !== undefined) {
      if (typeof availability.breakBetweenSlots !== 'number' || availability.breakBetweenSlots < 0 || availability.breakBetweenSlots > 60) {
        errors.push({ 
          field: 'breakBetweenSlots', 
          message: 'Break between slots must be between 0 and 60 minutes' 
        });
      }
    }

    // Validate max advance booking days
    if (availability.maxAdvanceBookingDays !== undefined) {
      if (typeof availability.maxAdvanceBookingDays !== 'number' || availability.maxAdvanceBookingDays < 1 || availability.maxAdvanceBookingDays > 365) {
        errors.push({ 
          field: 'maxAdvanceBookingDays', 
          message: 'Max advance booking days must be between 1 and 365' 
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate working hours configuration
   * @param {Object} workingHours - Working hours object
   * @returns {Object} - Validation result with errors array
   */
  static validateWorkingHours(workingHours) {
    const errors = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!workingHours || typeof workingHours !== 'object') {
      errors.push({ field: 'workingHours', message: 'Working hours configuration is required' });
      return { isValid: false, errors };
    }

    days.forEach(day => {
      const dayConfig = workingHours[day];
      if (dayConfig && dayConfig.available) {
        // Handle both simple format (start/end) and complex format (slots)
        if (dayConfig.slots && Array.isArray(dayConfig.slots)) {
          // Complex format with slots
          if (dayConfig.slots.length === 0) {
            errors.push({ 
              field: `workingHours.${day}.slots`, 
              message: 'At least one time slot is required when day is available' 
            });
          } else {
            dayConfig.slots.forEach((slot, index) => {
              if (!slot.start || !timeRegex.test(slot.start)) {
                errors.push({ 
                  field: `workingHours.${day}.slots[${index}].start`, 
                  message: 'Start time must be in HH:MM format' 
                });
              }
              if (!slot.end || !timeRegex.test(slot.end)) {
                errors.push({ 
                  field: `workingHours.${day}.slots[${index}].end`, 
                  message: 'End time must be in HH:MM format' 
                });
              }
              if (slot.start && slot.end && timeRegex.test(slot.start) && timeRegex.test(slot.end)) {
                const startMinutes = this.timeToMinutes(slot.start);
                const endMinutes = this.timeToMinutes(slot.end);
                if (endMinutes <= startMinutes) {
                  errors.push({ 
                    field: `workingHours.${day}.slots[${index}]`, 
                    message: 'End time must be after start time' 
                  });
                }
              }
            });
          }
        } else {
          // Simple format with start/end
          if (!dayConfig.start || !timeRegex.test(dayConfig.start)) {
            errors.push({ 
              field: `workingHours.${day}.start`, 
              message: 'Start time must be in HH:MM format' 
            });
          }
          if (!dayConfig.end || !timeRegex.test(dayConfig.end)) {
            errors.push({ 
              field: `workingHours.${day}.end`, 
              message: 'End time must be in HH:MM format' 
            });
          }
          if (dayConfig.start && dayConfig.end && timeRegex.test(dayConfig.start) && timeRegex.test(dayConfig.end)) {
            const startMinutes = this.timeToMinutes(dayConfig.start);
            const endMinutes = this.timeToMinutes(dayConfig.end);
            if (endMinutes <= startMinutes) {
              errors.push({ 
                field: `workingHours.${day}`, 
                message: 'End time must be after start time' 
              });
            }
          }
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate experience information
   * @param {Object} experience - Experience object
   * @returns {Object} - Validation result with errors array
   */
  static validateExperience(experience) {
    const errors = [];

    if (!experience || typeof experience !== 'object') {
      errors.push({ field: 'experience', message: 'Experience information is required' });
      return { isValid: false, errors };
    }

    // Validate total years
    if (typeof experience.totalYears !== 'number' || experience.totalYears < 0 || experience.totalYears > 60) {
      errors.push({ field: 'totalYears', message: 'Total years must be between 0 and 60' });
    }

    // Validate workplace entries
    if (experience.workplace && Array.isArray(experience.workplace)) {
      experience.workplace.forEach((work, index) => {
        if (!work.hospitalName || work.hospitalName.trim().length < 2) {
          errors.push({ 
            field: `workplace[${index}].hospitalName`, 
            message: 'Hospital/workplace name is required' 
          });
        }

        if (!work.position || work.position.trim().length < 2) {
          errors.push({ 
            field: `workplace[${index}].position`, 
            message: 'Position is required' 
          });
        }

        if (work.startDate && work.endDate && new Date(work.startDate) >= new Date(work.endDate)) {
          errors.push({ 
            field: `workplace[${index}]`, 
            message: 'Start date must be before end date' 
          });
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate bio text
   * @param {string} bio - Bio text
   * @returns {Object} - Validation result with errors array
   */
  static validateBio(bio) {
    const errors = [];

    if (bio && typeof bio !== 'string') {
      errors.push({ field: 'bio', message: 'Bio must be a string' });
      return { isValid: false, errors };
    }

    if (bio && bio.length > 1000) {
      errors.push({ field: 'bio', message: 'Bio must not exceed 1000 characters' });
    }

    if (bio && bio.trim().length < 10) {
      errors.push({ field: 'bio', message: 'Bio must be at least 10 characters long' });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate languages array
   * @param {Array} languages - Array of language strings
   * @returns {Object} - Validation result with errors array
   */
  static validateLanguages(languages) {
    const errors = [];

    if (!Array.isArray(languages)) {
      errors.push({ field: 'languages', message: 'Languages must be an array' });
      return { isValid: false, errors };
    }

    if (languages.length === 0) {
      errors.push({ field: 'languages', message: 'At least one language is required' });
    }

    // Check for duplicates
    const uniqueLangs = [...new Set(languages)];
    if (uniqueLangs.length !== languages.length) {
      errors.push({ field: 'languages', message: 'Duplicate languages are not allowed' });
    }

    // Validate each language
    languages.forEach((lang, index) => {
      if (!lang || typeof lang !== 'string' || lang.trim().length < 2) {
        errors.push({ 
          field: `languages[${index}]`, 
          message: 'Language name must be at least 2 characters long' 
        });
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate notification preferences
   * @param {Object} notifications - Notification preferences object
   * @returns {Object} - Validation result with errors array
   */
  static validateNotifications(notifications) {
    const errors = [];
    const validNotificationTypes = [
      'email', 'sms', 'push', 'appointmentReminders', 'newBookings', 'payments'
    ];

    if (!notifications || typeof notifications !== 'object') {
      errors.push({ field: 'notifications', message: 'Notification preferences are required' });
      return { isValid: false, errors };
    }

    validNotificationTypes.forEach(type => {
      if (notifications.hasOwnProperty(type) && typeof notifications[type] !== 'boolean') {
        errors.push({ 
          field: `notifications.${type}`, 
          message: 'Notification preference must be a boolean value' 
        });
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate complete profile data with business rules
   * @param {Object} profileData - Complete profile data object
   * @returns {Object} - Validation result with errors, warnings, and business rules
   */
  static validateCompleteProfile(profileData) {
    const allErrors = [];
    const allWarnings = [];
    const businessRuleErrors = [];
    const businessRuleWarnings = [];

    // Validate each section
    if (profileData.personalInfo) {
      const personalValidation = this.validatePersonalInfo(profileData.personalInfo);
      allErrors.push(...personalValidation.errors);
    }

    if (profileData.medicalLicense) {
      const licenseValidation = this.validateMedicalLicense(profileData.medicalLicense);
      allErrors.push(...licenseValidation.errors);
    }

    if (profileData.specializations) {
      const specsValidation = this.validateSpecializations(profileData.specializations);
      allErrors.push(...specsValidation.errors);
    }

    if (profileData.qualifications) {
      const qualsValidation = this.validateQualifications(profileData.qualifications);
      allErrors.push(...qualsValidation.errors);
    }

    if (profileData.consultationModes) {
      const modesValidation = this.validateConsultationModes(profileData.consultationModes);
      allErrors.push(...modesValidation.errors);
    }

    if (profileData.workingHours) {
      const hoursValidation = this.validateWorkingHours(profileData.workingHours);
      allErrors.push(...hoursValidation.errors);
    }

    if (profileData.experience) {
      const expValidation = this.validateExperience(profileData.experience);
      allErrors.push(...expValidation.errors);
    }

    if (profileData.bio) {
      const bioValidation = this.validateBio(profileData.bio);
      allErrors.push(...bioValidation.errors);
    }

    if (profileData.languages) {
      const langValidation = this.validateLanguages(profileData.languages);
      allErrors.push(...langValidation.errors);
    }

    if (profileData.notifications) {
      const notifValidation = this.validateNotifications(profileData.notifications);
      allErrors.push(...notifValidation.errors);
    }

    // Apply business rules validation
    const businessRules = this.validateBusinessRules(profileData);
    businessRuleErrors.push(...businessRules.errors);
    businessRuleWarnings.push(...businessRules.warnings);

    return { 
      isValid: allErrors.length === 0 && businessRuleErrors.length === 0, 
      errors: allErrors,
      warnings: allWarnings,
      businessRuleErrors,
      businessRuleWarnings,
      canActivateProfile: allErrors.length === 0 && businessRuleErrors.length === 0
    };
  }

  /**
   * Validate business rules for doctor profile
   * @param {Object} profileData - Complete profile data
   * @returns {Object} - Business rule validation results
   */
  static validateBusinessRules(profileData) {
    const errors = [];
    const warnings = [];

    // Business Rule 1: License expiry validation
    if (profileData.medicalLicense?.expiryDate) {
      const expiryDate = new Date(profileData.medicalLicense.expiryDate);
      const currentDate = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      if (expiryDate <= currentDate) {
        errors.push({
          field: 'medicalLicense.expiryDate',
          message: 'Medical license has expired. Profile cannot be activated until license is renewed.',
          code: 'LICENSE_EXPIRED',
          severity: 'critical'
        });
      } else if (expiryDate <= threeMonthsFromNow) {
        errors.push({
          field: 'medicalLicense.expiryDate',
          message: 'Medical license expires within 3 months. Please renew immediately to avoid service interruption.',
          code: 'LICENSE_EXPIRING_CRITICAL',
          severity: 'high'
        });
      } else if (expiryDate <= sixMonthsFromNow) {
        warnings.push({
          field: 'medicalLicense.expiryDate',
          message: 'Medical license expires within 6 months. Consider renewing soon.',
          code: 'LICENSE_EXPIRING_SOON',
          severity: 'medium'
        });
      }
    }

    // Business Rule 2: Specialization limits
    if (profileData.specializations) {
      if (profileData.specializations.length > 10) {
        errors.push({
          field: 'specializations',
          message: 'Maximum 10 specializations allowed for optimal patient matching and search performance.',
          code: 'TOO_MANY_SPECIALIZATIONS',
          severity: 'medium'
        });
      } else if (profileData.specializations.length > 5) {
        warnings.push({
          field: 'specializations',
          message: 'Consider limiting specializations to 5 or fewer for better patient focus and search ranking.',
          code: 'MANY_SPECIALIZATIONS',
          severity: 'low'
        });
      } else if (profileData.specializations.length === 0) {
        errors.push({
          field: 'specializations',
          message: 'At least one specialization is required for profile activation.',
          code: 'NO_SPECIALIZATIONS',
          severity: 'critical'
        });
      }
    }

    // Business Rule 3: Consultation fee validation
    if (profileData.consultationModes) {
      Object.entries(profileData.consultationModes).forEach(([mode, config]) => {
        if (config?.available && config?.fee !== undefined) {
          if (config.fee < 10) {
            warnings.push({
              field: `consultationModes.${mode}.fee`,
              message: `${mode} consultation fee (${config.fee}) is below market average. Consider reviewing pricing.`,
              code: 'FEE_BELOW_MARKET',
              severity: 'low'
            });
          } else if (config.fee > 1000) {
            warnings.push({
              field: `consultationModes.${mode}.fee`,
              message: `${mode} consultation fee (${config.fee}) is significantly above market average. This may limit patient bookings.`,
              code: 'FEE_ABOVE_MARKET',
              severity: 'medium'
            });
          }
        }
      });
    }

    // Business Rule 4: Working hours validation
    if (profileData.workingHours) {
      const availableDays = Object.keys(profileData.workingHours).filter(
        day => profileData.workingHours[day]?.available
      );
      
      if (availableDays.length === 0) {
        errors.push({
          field: 'workingHours',
          message: 'At least one day must be available for consultations to activate profile.',
          code: 'NO_AVAILABLE_DAYS',
          severity: 'critical'
        });
      } else if (availableDays.length < 3) {
        warnings.push({
          field: 'workingHours',
          message: 'Consider being available more days per week for better patient access and higher booking rates.',
          code: 'LIMITED_AVAILABILITY',
          severity: 'medium'
        });
      }

      // Check for excessive working hours
      availableDays.forEach(day => {
        const schedule = profileData.workingHours[day];
        if (schedule.start && schedule.end) {
          const startTime = new Date(`2000-01-01T${schedule.start}:00`);
          const endTime = new Date(`2000-01-01T${schedule.end}:00`);
          const diffHours = (endTime - startTime) / (1000 * 60 * 60);
          
          if (diffHours > 16) {
            errors.push({
              field: `workingHours.${day}`,
              message: `${day} working hours (${diffHours} hours) exceed platform maximum of 16 hours per day.`,
              code: 'EXCESSIVE_WORKING_HOURS',
              severity: 'high'
            });
          } else if (diffHours > 12) {
            warnings.push({
              field: `workingHours.${day}`,
              message: `${day} working hours (${diffHours} hours) are quite long. Consider work-life balance.`,
              code: 'LONG_WORKING_HOURS',
              severity: 'low'
            });
          }
        }
      });
    }

    // Business Rule 5: Profile completion requirements
    const requiredSections = ['personalInfo', 'medicalLicense', 'specializations', 'qualifications'];
    const missingSections = requiredSections.filter(section => !profileData[section]);
    
    if (missingSections.length > 0) {
      errors.push({
        field: 'profile',
        message: `Profile missing required sections for activation: ${missingSections.join(', ')}`,
        code: 'INCOMPLETE_PROFILE',
        severity: 'critical'
      });
    }

    // Business Rule 6: Experience validation
    if (profileData.experience?.totalYears !== undefined) {
      const currentYear = new Date().getFullYear();
      const qualificationYears = profileData.qualifications?.map(q => q.year) || [];
      const earliestQualification = Math.min(...qualificationYears);
      
      if (earliestQualification && profileData.experience.totalYears > (currentYear - earliestQualification)) {
        warnings.push({
          field: 'experience.totalYears',
          message: 'Experience years seem inconsistent with qualification dates. Please verify.',
          code: 'EXPERIENCE_QUALIFICATION_MISMATCH',
          severity: 'medium'
        });
      }

      if (profileData.experience.totalYears > 50) {
        warnings.push({
          field: 'experience.totalYears',
          message: 'Experience years seem unusually high. Please verify accuracy.',
          code: 'UNUSUAL_EXPERIENCE',
          severity: 'low'
        });
      }
    }

    // Business Rule 7: Bio completeness
    if (!profileData.bio || profileData.bio.trim().length < 50) {
      warnings.push({
        field: 'bio',
        message: 'A detailed bio (at least 50 characters) helps patients understand your expertise and improves booking rates.',
        code: 'SHORT_BIO',
        severity: 'low'
      });
    }

    // Business Rule 8: Language requirements
    if (!profileData.languages || profileData.languages.length === 0) {
      warnings.push({
        field: 'languages',
        message: 'Adding supported languages helps patients find you and improves accessibility.',
        code: 'NO_LANGUAGES',
        severity: 'low'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate profile section data based on section type
   * @param {string} section - Profile section name
   * @param {Object} data - Section data to validate
   * @returns {Object} - Validation result
   */
  static validateSectionData(section, data) {
    switch (section) {
      case 'personalInfo':
        return this.validatePersonalInfo(data);
      case 'medicalLicense':
        return this.validateMedicalLicense(data);
      case 'specializations':
        return this.validateSpecializations(data);
      case 'qualifications':
        return this.validateQualifications(data);
      case 'experience':
        return this.validateExperience(data);
      case 'consultationModes':
        return this.validateConsultationModes(data);
      case 'workingHours':
        return this.validateWorkingHours(data);
      case 'availability':
        return this.validateAvailability(data);
      case 'bio':
        return this.validateBio(data);
      case 'languages':
        return this.validateLanguages(data);
      case 'notifications':
        return this.validateNotifications(data);
      default:
        return { 
          isValid: false, 
          errors: [{ field: 'section', message: 'Invalid profile section' }] 
        };
    }
  }

  /**
   * Helper method to convert time string to minutes
   * @param {string} timeStr - Time string in HH:MM format
   * @returns {number} - Minutes since midnight
   */
  static timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

export default ProfileValidationService;