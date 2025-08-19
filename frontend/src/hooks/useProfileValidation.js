import { useState, useCallback, useMemo } from 'react';

const useProfileValidation = () => {
  const [validationErrors, setValidationErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  // Clear validation errors
  const clearErrors = useCallback((fields = null) => {
    if (fields) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        if (Array.isArray(fields)) {
          fields.forEach(field => delete newErrors[field]);
        } else {
          delete newErrors[fields];
        }
        return newErrors;
      });
    } else {
      setValidationErrors({});
    }
  }, []);

  // Clear validation warnings
  const clearWarnings = useCallback((fields = null) => {
    if (fields) {
      setValidationWarnings(prev => {
        const newWarnings = { ...prev };
        if (Array.isArray(fields)) {
          fields.forEach(field => delete newWarnings[field]);
        } else {
          delete newWarnings[fields];
        }
        return newWarnings;
      });
    } else {
      setValidationWarnings({});
    }
  }, []);

  // Set validation error for a field
  const setError = useCallback((field, error) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, []);

  // Set validation warning for a field
  const setWarning = useCallback((field, warning) => {
    setValidationWarnings(prev => ({
      ...prev,
      [field]: warning
    }));
  }, []);

  // Get validation status for a field
  const getFieldStatus = useCallback((field) => {
    if (validationErrors[field]) {
      return { type: 'error', message: validationErrors[field] };
    }
    if (validationWarnings[field]) {
      return { type: 'warning', message: validationWarnings[field] };
    }
    return { type: 'success', message: null };
  }, [validationErrors, validationWarnings]);

  // Real-time field validation
  const validateField = useCallback((field, value, section = null) => {
    setIsValidating(true);
    
    try {
      let isValid = true;
      let error = null;
      let warning = null;

      // Clear existing errors/warnings for this field
      clearErrors(field);
      clearWarnings(field);

      // Field-specific validation logic
      switch (field) {
        case 'firstName':
        case 'lastName':
          if (!value || value.trim() === '') {
            error = `${field === 'firstName' ? 'First' : 'Last'} name is required`;
            isValid = false;
          } else if (value.trim().length < 2) {
            error = `${field === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters long`;
            isValid = false;
          } else if (value.trim().length > 50) {
            error = `${field === 'firstName' ? 'First' : 'Last'} name must be less than 50 characters`;
            isValid = false;
          } else if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) {
            error = `${field === 'firstName' ? 'First' : 'Last'} name can only contain letters, spaces, hyphens, and apostrophes`;
            isValid = false;
          }
          break;

        case 'email':
          if (!value || value.trim() === '') {
            error = 'Email is required';
            isValid = false;
          } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              error = 'Please enter a valid email address';
              isValid = false;
            } else if (value.length > 254) {
              error = 'Email address is too long';
              isValid = false;
            }
          }
          break;

        case 'phone':
          if (!value || value.trim() === '') {
            error = 'Phone number is required';
            isValid = false;
          } else {
            const cleanPhone = value.replace(/[\s\-\(\)\+]/g, '');
            if (cleanPhone.length < 10 || cleanPhone.length > 15) {
              error = 'Phone number must be between 10-15 digits';
              isValid = false;
            } else {
              const phoneRegex = /^[\+]?[1-9][\d]{9,14}$/;
              if (!phoneRegex.test(cleanPhone)) {
                error = 'Please enter a valid phone number';
                isValid = false;
              }
            }
          }
          break;

        case 'licenseNumber':
          if (!value || value.trim() === '') {
            error = 'License number is required';
            isValid = false;
          } else if (value.trim().length < 5) {
            error = 'License number must be at least 5 characters long';
            isValid = false;
          } else if (value.trim().length > 50) {
            error = 'License number is too long';
            isValid = false;
          }
          break;

        case 'issuingAuthority':
          if (!value || value.trim() === '') {
            error = 'Issuing authority is required';
            isValid = false;
          } else if (value.trim().length < 3) {
            error = 'Issuing authority must be at least 3 characters long';
            isValid = false;
          }
          break;

        case 'issueDate':
          if (!value) {
            error = 'Issue date is required';
            isValid = false;
          } else {
            const issueDate = new Date(value);
            const currentDate = new Date();
            if (issueDate > currentDate) {
              error = 'Issue date cannot be in the future';
              isValid = false;
            } else if (issueDate < new Date('1950-01-01')) {
              error = 'Issue date seems too old';
              isValid = false;
            }
          }
          break;

        case 'expiryDate':
          if (!value) {
            error = 'Expiry date is required';
            isValid = false;
          } else {
            const expiryDate = new Date(value);
            const currentDate = new Date();
            const threeMonthsFromNow = new Date();
            threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
            
            if (expiryDate <= currentDate) {
              error = 'License has expired. Please renew your license';
              isValid = false;
            } else if (expiryDate <= threeMonthsFromNow) {
              warning = 'License expires soon. Consider renewing';
            }
          }
          break;

        case 'bio':
          if (value && value.length > 1000) {
            error = 'Bio must be less than 1000 characters';
            isValid = false;
          } else if (value && value.trim().length < 10) {
            warning = 'Bio should be at least 10 characters for better patient engagement';
          }
          break;

        case 'experienceYears':
          if (value === undefined || value === null || value === '') {
            error = 'Experience years is required';
            isValid = false;
          } else {
            const years = parseInt(value);
            if (isNaN(years) || years < 0) {
              error = 'Experience years must be a positive number';
              isValid = false;
            } else if (years > 60) {
              error = 'Experience years cannot exceed 60';
              isValid = false;
            } else if (years > 50) {
              warning = 'Please verify experience years - this seems unusually high';
            }
          }
          break;

        default:
          // Generic validation for other fields
          if (typeof value === 'string' && value.length > 500) {
            error = 'Field value is too long';
            isValid = false;
          }
          break;
      }

      // Set error or warning
      if (error) {
        setError(field, error);
      } else if (warning) {
        setWarning(field, warning);
      }

      return { isValid, error, warning };
    } finally {
      setIsValidating(false);
    }
  }, [clearErrors, clearWarnings, setError, setWarning]);

  // Business rule validations
  const validateBusinessRules = useCallback((profileData) => {
    const businessErrors = {};
    const businessWarnings = {};

    // License expiry business rule
    if (profileData.medicalLicense?.expiryDate) {
      const expiryDate = new Date(profileData.medicalLicense.expiryDate);
      const currentDate = new Date();
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      if (expiryDate <= currentDate) {
        businessErrors.licenseExpired = 'Medical license has expired. Profile cannot be activated until renewed.';
      } else if (expiryDate <= sixMonthsFromNow) {
        businessWarnings.licenseExpiringSoon = 'Medical license expires within 6 months. Consider renewing soon.';
      }
    }

    // Specialization limits business rule
    if (profileData.specializations?.length > 10) {
      businessErrors.tooManySpecializations = 'Maximum 10 specializations allowed for optimal patient matching.';
    } else if (profileData.specializations?.length > 5) {
      businessWarnings.manySpecializations = 'Consider limiting specializations to 5 or fewer for better focus.';
    }

    // Consultation fee business rules
    if (profileData.consultationModes) {
      Object.entries(profileData.consultationModes).forEach(([mode, config]) => {
        if (config?.available && config?.fee) {
          if (config.fee < 10) {
            businessWarnings[`${mode}FeeLow`] = `${mode} consultation fee seems low. Consider market rates.`;
          } else if (config.fee > 1000) {
            businessWarnings[`${mode}FeeHigh`] = `${mode} consultation fee is very high. This may limit bookings.`;
          }
        }
      });
    }

    // Working hours business rules
    if (profileData.workingHours) {
      const availableDays = Object.keys(profileData.workingHours).filter(
        day => profileData.workingHours[day]?.available
      );
      
      if (availableDays.length < 3) {
        businessWarnings.limitedAvailability = 'Consider being available more days for better patient access.';
      }

      // Check for excessive working hours
      availableDays.forEach(day => {
        const schedule = profileData.workingHours[day];
        if (schedule.start && schedule.end) {
          const startTime = new Date(`2000-01-01T${schedule.start}:00`);
          const endTime = new Date(`2000-01-01T${schedule.end}:00`);
          const diffHours = (endTime - startTime) / (1000 * 60 * 60);
          
          if (diffHours > 12) {
            businessWarnings[`${day}LongHours`] = `${day} working hours exceed 12 hours. Consider work-life balance.`;
          }
        }
      });
    }

    // Profile completion business rules
    const requiredSections = ['personalInfo', 'medicalLicense', 'specializations', 'qualifications'];
    const missingSections = requiredSections.filter(section => !profileData[section]);
    
    if (missingSections.length > 0) {
      businessErrors.incompleteProfile = `Profile missing required sections: ${missingSections.join(', ')}`;
    }

    return { businessErrors, businessWarnings };
  }, []);

  // Get user-friendly guidance messages
  const getGuidanceMessage = useCallback((field, error) => {
    const guidanceMap = {
      firstName: 'Enter your legal first name as it appears on your medical license.',
      lastName: 'Enter your legal last name as it appears on your medical license.',
      email: 'Use a professional email address that you check regularly.',
      phone: 'Provide a phone number where patients can reach you if needed.',
      licenseNumber: 'Enter your medical license number exactly as issued by the authority.',
      issuingAuthority: 'Select or enter the medical board that issued your license.',
      issueDate: 'Enter the date when your medical license was first issued.',
      expiryDate: 'Enter the expiration date of your current medical license.',
      specializations: 'Select your primary areas of medical expertise (maximum 10).',
      qualifications: 'Add your medical degrees and certifications.',
      bio: 'Write a professional summary that helps patients understand your expertise.',
      experienceYears: 'Enter your total years of medical practice experience.',
      consultationModes: 'Configure the types of consultations you offer and their fees.',
      workingHours: 'Set your availability for patient consultations.',
      languages: 'List languages you can communicate in with patients.'
    };

    return guidanceMap[field] || 'Please ensure this field meets the requirements.';
  }, []);

  // Enhanced validation summary
  const validationSummary = useMemo(() => {
    const errorCount = Object.keys(validationErrors).length;
    const warningCount = Object.keys(validationWarnings).length;
    
    return {
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,
      errorCount,
      warningCount,
      isValid: errorCount === 0,
      canSave: errorCount === 0, // Can save even with warnings
      summary: errorCount > 0 
        ? `${errorCount} error${errorCount > 1 ? 's' : ''} need${errorCount === 1 ? 's' : ''} to be fixed`
        : warningCount > 0 
        ? `${warningCount} warning${warningCount > 1 ? 's' : ''} to review`
        : 'All validations passed'
    };
  }, [validationErrors, validationWarnings]);

  // Personal information validation
  const validatePersonalInfo = useCallback((data) => {
    const errors = {};

    // First name validation
    if (!data.firstName || data.firstName.trim() === '') {
      errors.firstName = 'First name is required';
    } else if (data.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters long';
    } else if (data.firstName.trim().length > 50) {
      errors.firstName = 'First name must be less than 50 characters';
    }

    // Last name validation
    if (!data.lastName || data.lastName.trim() === '') {
      errors.lastName = 'Last name is required';
    } else if (data.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters long';
    } else if (data.lastName.trim().length > 50) {
      errors.lastName = 'Last name must be less than 50 characters';
    }

    // Email validation
    if (!data.email || data.email.trim() === '') {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    // Phone validation
    if (!data.phone || data.phone.trim() === '') {
      errors.phone = 'Phone number is required';
    } else {
      const cleanPhone = data.phone.replace(/[\s\-\(\)\+]/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        errors.phone = 'Phone number must be between 10-15 digits';
      } else {
        const phoneRegex = /^[\+]?[1-9][\d]{9,14}$/;
        if (!phoneRegex.test(cleanPhone)) {
          errors.phone = 'Please enter a valid phone number';
        }
      }
    }

    // Address validation (optional but if provided, should be reasonable)
    if (data.address && data.address.trim().length > 500) {
      errors.address = 'Address must be less than 500 characters';
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, []);

  // Medical license validation
  const validateMedicalLicense = useCallback((data) => {
    const errors = {};

    // License number validation
    if (!data.licenseNumber || data.licenseNumber.trim() === '') {
      errors.licenseNumber = 'License number is required';
    } else if (data.licenseNumber.trim().length < 5) {
      errors.licenseNumber = 'License number must be at least 5 characters long';
    }

    // Issuing authority validation
    if (!data.issuingAuthority || data.issuingAuthority.trim() === '') {
      errors.issuingAuthority = 'Issuing authority is required';
    }

    // Issue date validation
    if (!data.issueDate) {
      errors.issueDate = 'Issue date is required';
    } else {
      const issueDate = new Date(data.issueDate);
      const currentDate = new Date();
      if (issueDate > currentDate) {
        errors.issueDate = 'Issue date cannot be in the future';
      }
    }

    // Expiry date validation
    if (!data.expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    } else {
      const expiryDate = new Date(data.expiryDate);
      const currentDate = new Date();
      const issueDate = new Date(data.issueDate);
      
      if (expiryDate <= currentDate) {
        errors.expiryDate = 'License has expired. Please renew your license';
      } else if (data.issueDate && expiryDate <= issueDate) {
        errors.expiryDate = 'Expiry date must be after issue date';
      }
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, []);

  // Specializations validation
  const validateSpecializations = useCallback((specializations) => {
    const errors = {};

    if (!specializations || specializations.length === 0) {
      errors.specializations = 'At least one specialization is required';
    } else if (specializations.length > 10) {
      errors.specializations = 'Maximum 10 specializations allowed';
    } else {
      // Check for duplicates
      const uniqueSpecs = new Set(specializations.map(spec => spec.toLowerCase()));
      if (uniqueSpecs.size !== specializations.length) {
        errors.specializations = 'Duplicate specializations are not allowed';
      }
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, []);

  // Qualifications validation
  const validateQualifications = useCallback((qualifications) => {
    const errors = {};

    if (!qualifications || qualifications.length === 0) {
      errors.qualifications = 'At least one qualification is required';
    } else {
      qualifications.forEach((qual, index) => {
        const qualErrors = {};

        if (!qual.degree || qual.degree.trim() === '') {
          qualErrors.degree = 'Degree is required';
        }

        if (!qual.institution || qual.institution.trim() === '') {
          qualErrors.institution = 'Institution is required';
        }

        if (!qual.year) {
          qualErrors.year = 'Year is required';
        } else {
          const currentYear = new Date().getFullYear();
          const year = parseInt(qual.year);
          if (year < 1950 || year > currentYear) {
            qualErrors.year = `Year must be between 1950 and ${currentYear}`;
          }
        }

        if (Object.keys(qualErrors).length > 0) {
          errors[`qualification_${index}`] = qualErrors;
        }
      });
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, []);

  // Experience validation
  const validateExperience = useCallback((data) => {
    const errors = {};

    // Experience years validation
    if (data.experienceYears === undefined || data.experienceYears === null) {
      errors.experienceYears = 'Experience years is required';
    } else {
      const years = parseInt(data.experienceYears);
      if (isNaN(years) || years < 0 || years > 60) {
        errors.experienceYears = 'Experience years must be between 0 and 60';
      }
    }

    // Current position validation
    if (!data.currentPosition || data.currentPosition.trim() === '') {
      errors.currentPosition = 'Current position is required';
    } else if (data.currentPosition.trim().length > 100) {
      errors.currentPosition = 'Current position must be less than 100 characters';
    }

    // Bio validation
    if (data.bio && data.bio.length > 1000) {
      errors.bio = 'Bio must be less than 1000 characters';
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, []);

  // Consultation modes validation
  const validateConsultationModes = useCallback((modes) => {
    const errors = {};

    if (!modes || modes.length === 0) {
      errors.consultationModes = 'At least one consultation mode must be configured';
    } else {
      const activeModes = modes.filter(mode => mode.isActive);
      if (activeModes.length === 0) {
        errors.consultationModes = 'At least one consultation mode must be active';
      }

      modes.forEach((mode, index) => {
        const modeErrors = {};

        if (mode.isActive) {
          if (!mode.fee || mode.fee <= 0) {
            modeErrors.fee = 'Fee must be greater than 0 for active modes';
          } else if (mode.fee > 10000) {
            modeErrors.fee = 'Fee cannot exceed $10,000';
          }

          if (!mode.duration || mode.duration <= 0) {
            modeErrors.duration = 'Duration must be greater than 0 for active modes';
          } else if (mode.duration > 480) {
            modeErrors.duration = 'Duration cannot exceed 8 hours (480 minutes)';
          }
        }

        if (Object.keys(modeErrors).length > 0) {
          errors[`mode_${index}`] = modeErrors;
        }
      });
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, []);

  // Working hours validation
  const validateWorkingHours = useCallback((workingHours) => {
    const errors = {};

    if (!workingHours) {
      errors.workingHours = 'Working hours configuration is required';
      setValidationErrors(prev => ({ ...prev, ...errors }));
      return false;
    }

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const availableDays = daysOfWeek.filter(day => workingHours[day]?.available);

    if (availableDays.length === 0) {
      errors.workingHours = 'At least one day must be available for consultations';
    } else {
      availableDays.forEach(day => {
        const daySchedule = workingHours[day];
        const dayErrors = {};

        if (!daySchedule.start || !daySchedule.end) {
          dayErrors.time = 'Start and end times are required for available days';
        } else {
          const startTime = new Date(`2000-01-01T${daySchedule.start}:00`);
          const endTime = new Date(`2000-01-01T${daySchedule.end}:00`);

          if (startTime >= endTime) {
            dayErrors.time = 'End time must be after start time';
          }

          // Check for reasonable working hours (not more than 16 hours a day)
          const diffHours = (endTime - startTime) / (1000 * 60 * 60);
          if (diffHours > 16) {
            dayErrors.time = 'Working hours cannot exceed 16 hours per day';
          }
        }

        if (Object.keys(dayErrors).length > 0) {
          errors[`${day}_schedule`] = dayErrors;
        }
      });
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, []);

  // Languages validation
  const validateLanguages = useCallback((languages) => {
    const errors = {};

    if (!languages || languages.length === 0) {
      errors.languages = 'At least one language is required';
    } else if (languages.length > 20) {
      errors.languages = 'Maximum 20 languages allowed';
    } else {
      // Check for duplicates
      const uniqueLangs = new Set(languages.map(lang => lang.toLowerCase()));
      if (uniqueLangs.size !== languages.length) {
        errors.languages = 'Duplicate languages are not allowed';
      }
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, []);

  // File validation for document uploads
  const validateFile = useCallback((file, options = {}) => {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
      required = false
    } = options;

    const errors = [];

    if (required && !file) {
      errors.push('File is required');
      return errors;
    }

    if (!file) return errors;

    // File size validation
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    // File type validation
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push('File name is too long (maximum 255 characters)');
    }

    return errors;
  }, []);

  // Comprehensive profile validation
  const validateCompleteProfile = useCallback((profileData) => {
    const allErrors = {};

    // Validate each section
    if (profileData.personalInfo) {
      const personalValid = validatePersonalInfo(profileData.personalInfo);
      if (!personalValid) {
        allErrors.personalInfo = 'Personal information has validation errors';
      }
    }

    if (profileData.medicalLicense) {
      const licenseValid = validateMedicalLicense(profileData.medicalLicense);
      if (!licenseValid) {
        allErrors.medicalLicense = 'Medical license has validation errors';
      }
    }

    if (profileData.specializations) {
      const specsValid = validateSpecializations(profileData.specializations);
      if (!specsValid) {
        allErrors.specializations = 'Specializations have validation errors';
      }
    }

    if (profileData.qualifications) {
      const qualsValid = validateQualifications(profileData.qualifications);
      if (!qualsValid) {
        allErrors.qualifications = 'Qualifications have validation errors';
      }
    }

    if (profileData.experience) {
      const expValid = validateExperience(profileData.experience);
      if (!expValid) {
        allErrors.experience = 'Experience information has validation errors';
      }
    }

    if (profileData.consultationModes) {
      const modesValid = validateConsultationModes(profileData.consultationModes);
      if (!modesValid) {
        allErrors.consultationModes = 'Consultation modes have validation errors';
      }
    }

    if (profileData.workingHours) {
      const hoursValid = validateWorkingHours(profileData.workingHours);
      if (!hoursValid) {
        allErrors.workingHours = 'Working hours have validation errors';
      }
    }

    if (profileData.languages) {
      const langsValid = validateLanguages(profileData.languages);
      if (!langsValid) {
        allErrors.languages = 'Languages have validation errors';
      }
    }

    return {
      isValid: Object.keys(allErrors).length === 0,
      errors: allErrors,
      fieldErrors: validationErrors
    };
  }, [
    validatePersonalInfo,
    validateMedicalLicense,
    validateSpecializations,
    validateQualifications,
    validateExperience,
    validateConsultationModes,
    validateWorkingHours,
    validateLanguages,
    validationErrors
  ]);

  return {
    validationErrors,
    validationWarnings,
    isValidating,
    clearErrors,
    clearWarnings,
    setError,
    setWarning,
    getFieldStatus,
    validateField,
    validateBusinessRules,
    getGuidanceMessage,
    validationSummary,
    validatePersonalInfo,
    validateMedicalLicense,
    validateSpecializations,
    validateQualifications,
    validateExperience,
    validateConsultationModes,
    validateWorkingHours,
    validateLanguages,
    validateFile,
    validateCompleteProfile,
    hasErrors: Object.keys(validationErrors).length > 0,
    hasWarnings: Object.keys(validationWarnings).length > 0
  };
};

export default useProfileValidation;