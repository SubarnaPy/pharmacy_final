import apiClient from '../api/apiClient';

/**
 * ValidationService - Handles server-side validation communication
 */
class ValidationService {
  /**
   * Validate a profile section on the server
   * @param {string} doctorId - Doctor ID
   * @param {string} section - Profile section name
   * @param {Object} data - Section data to validate
   * @returns {Promise<Object>} - Validation result
   */
  static async validateSection(doctorId, section, data) {
    try {
      const response = await apiClient.post(`/doctors/${doctorId}/profile/validate-section`, {
        section,
        data
      });
      
      return {
        isValid: true,
        errors: [],
        warnings: [],
        ...response.data
      };
    } catch (error) {
      if (error.response?.status === 400) {
        // Validation failed
        return {
          isValid: false,
          errors: error.response.data.errors || [],
          warnings: error.response.data.warnings || [],
          message: error.response.data.message
        };
      }
      
      // Server error
      throw new Error(`Validation service error: ${error.message}`);
    }
  }

  /**
   * Validate complete profile on the server
   * @param {string} doctorId - Doctor ID
   * @returns {Promise<Object>} - Complete validation result
   */
  static async validateCompleteProfile(doctorId) {
    try {
      const response = await apiClient.get(`/doctors/${doctorId}/profile/validate`);
      
      return {
        isValid: response.data.isValid,
        canActivateProfile: response.data.canActivateProfile,
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
        businessRuleErrors: response.data.businessRuleErrors || [],
        businessRuleWarnings: response.data.businessRuleWarnings || [],
        completionPercentage: response.data.completionPercentage || 0,
        missingSections: response.data.missingSections || [],
        validatedAt: response.data.validatedAt
      };
    } catch (error) {
      if (error.response?.status === 400) {
        return {
          isValid: false,
          canActivateProfile: false,
          errors: error.response.data.errors || [],
          warnings: error.response.data.warnings || [],
          businessRuleErrors: error.response.data.businessRuleErrors || [],
          businessRuleWarnings: error.response.data.businessRuleWarnings || [],
          message: error.response.data.message
        };
      }
      
      throw new Error(`Profile validation service error: ${error.message}`);
    }
  }

  /**
   * Validate file upload before sending to server
   * @param {File} file - File to validate
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  static validateFile(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
      required = false
    } = options;

    const errors = [];

    if (required && !file) {
      errors.push({
        field: 'file',
        message: 'File is required',
        code: 'FILE_REQUIRED'
      });
      return { isValid: false, errors };
    }

    if (!file) return { isValid: true, errors: [] };

    // File size validation
    if (file.size > maxSize) {
      errors.push({
        field: 'file',
        message: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`,
        code: 'FILE_TOO_LARGE'
      });
    }

    // File type validation
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push({
        field: 'file',
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        code: 'INVALID_FILE_TYPE'
      });
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push({
        field: 'file',
        message: 'File name is too long (maximum 255 characters)',
        code: 'FILENAME_TOO_LONG'
      });
    }

    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (dangerousExtensions.includes(fileExtension)) {
      errors.push({
        field: 'file',
        message: 'File type is not allowed for security reasons',
        code: 'DANGEROUS_FILE_TYPE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get validation guidance for a specific field
   * @param {string} field - Field name
   * @param {string} section - Profile section
   * @returns {string} - Guidance message
   */
  static getFieldGuidance(field, section = null) {
    const guidanceMap = {
      // Personal Info
      firstName: 'Enter your legal first name as it appears on your medical license.',
      lastName: 'Enter your legal last name as it appears on your medical license.',
      email: 'Use a professional email address that you check regularly.',
      phone: 'Provide a phone number where patients can reach you if needed.',
      address: 'Enter your practice address or preferred contact address.',

      // Medical License
      licenseNumber: 'Enter your medical license number exactly as issued by the authority.',
      issuingAuthority: 'Select or enter the medical board that issued your license.',
      issueDate: 'Enter the date when your medical license was first issued.',
      expiryDate: 'Enter the expiration date of your current medical license.',

      // Specializations & Qualifications
      specializations: 'Select your primary areas of medical expertise (maximum 10).',
      qualifications: 'Add your medical degrees and certifications with complete details.',
      degree: 'Enter the full name of your medical degree (e.g., MBBS, MD, DO).',
      institution: 'Enter the name of the institution where you obtained this qualification.',
      year: 'Enter the year you graduated or obtained this qualification.',

      // Experience
      experienceYears: 'Enter your total years of medical practice experience.',
      currentPosition: 'Enter your current job title or position.',
      bio: 'Write a professional summary that helps patients understand your expertise.',

      // Consultation & Availability
      consultationModes: 'Configure the types of consultations you offer and their fees.',
      workingHours: 'Set your availability for patient consultations.',
      fee: 'Set a competitive fee for this consultation type.',
      duration: 'Set the duration for this type of consultation.',

      // Other
      languages: 'List languages you can communicate in with patients.',
      notifications: 'Configure how you want to receive platform notifications.'
    };

    const sectionSpecificGuidance = {
      personalInfo: {
        ...guidanceMap,
        email: 'This email will be used for patient communications and platform notifications.',
        phone: 'This number may be shared with patients for urgent consultations.'
      },
      medicalLicense: {
        ...guidanceMap,
        licenseNumber: 'This will be verified with the medical board. Enter exactly as shown on your license.',
        expiryDate: 'We will send renewal reminders before your license expires.'
      }
    };

    if (section && sectionSpecificGuidance[section] && sectionSpecificGuidance[section][field]) {
      return sectionSpecificGuidance[section][field];
    }

    return guidanceMap[field] || 'Please ensure this field meets the requirements.';
  }

  /**
   * Format validation errors for display
   * @param {Array} errors - Array of error objects
   * @returns {Object} - Formatted errors by field
   */
  static formatErrors(errors) {
    const formattedErrors = {};
    
    errors.forEach(error => {
      const field = error.field || 'general';
      if (!formattedErrors[field]) {
        formattedErrors[field] = [];
      }
      formattedErrors[field].push({
        message: error.message,
        code: error.code,
        severity: error.severity || 'medium'
      });
    });

    return formattedErrors;
  }

  /**
   * Check if profile meets minimum requirements for activation
   * @param {Object} profileData - Complete profile data
   * @returns {Object} - Activation readiness result
   */
  static checkActivationReadiness(profileData) {
    const requiredSections = [
      'personalInfo',
      'medicalLicense', 
      'specializations',
      'qualifications'
    ];

    const requiredFields = {
      personalInfo: ['firstName', 'lastName', 'email', 'phone'],
      medicalLicense: ['licenseNumber', 'issuingAuthority', 'issueDate', 'expiryDate'],
      specializations: [], // Array should not be empty
      qualifications: [] // Array should not be empty
    };

    const missing = [];
    const warnings = [];

    // Check required sections
    requiredSections.forEach(section => {
      if (!profileData[section]) {
        missing.push(`${section} section is missing`);
        return;
      }

      // Check required fields within sections
      if (requiredFields[section]) {
        requiredFields[section].forEach(field => {
          if (!profileData[section][field] || profileData[section][field] === '') {
            missing.push(`${section}.${field} is required`);
          }
        });
      }

      // Check array fields
      if (section === 'specializations' && (!profileData[section] || profileData[section].length === 0)) {
        missing.push('At least one specialization is required');
      }

      if (section === 'qualifications' && (!profileData[section] || profileData[section].length === 0)) {
        missing.push('At least one qualification is required');
      }
    });

    // Check for warnings
    if (!profileData.bio || profileData.bio.length < 50) {
      warnings.push('A detailed bio helps patients understand your expertise');
    }

    if (!profileData.consultationModes || Object.keys(profileData.consultationModes).length === 0) {
      warnings.push('Configure consultation modes to start receiving bookings');
    }

    if (!profileData.workingHours) {
      warnings.push('Set your working hours to allow patient bookings');
    }

    const canActivate = missing.length === 0;
    const completionPercentage = Math.round(
      ((requiredSections.length - missing.length) / requiredSections.length) * 100
    );

    return {
      canActivate,
      completionPercentage,
      missing,
      warnings,
      readinessScore: canActivate ? 100 : completionPercentage
    };
  }
}

export default ValidationService;