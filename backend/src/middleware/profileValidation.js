import { body, param, validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';
import ProfileValidationService from '../services/ProfileValidationService.js';

/**
 * Get user-friendly guidance for validation errors
 */
const getFieldGuidance = (field) => {
  const guidanceMap = {
    'firstName': 'Enter your legal first name as it appears on your medical license.',
    'lastName': 'Enter your legal last name as it appears on your medical license.',
    'email': 'Use a professional email address that you check regularly.',
    'phone': 'Provide a phone number where patients can reach you if needed.',
    'licenseNumber': 'Enter your medical license number exactly as issued by the authority.',
    'issuingAuthority': 'Select or enter the medical board that issued your license.',
    'issueDate': 'Enter the date when your medical license was first issued.',
    'expiryDate': 'Enter the expiration date of your current medical license.',
    'specializations': 'Select your primary areas of medical expertise (maximum 10).',
    'qualifications': 'Add your medical degrees and certifications with complete details.',
    'bio': 'Write a professional summary that helps patients understand your expertise.',
    'experienceYears': 'Enter your total years of medical practice experience.',
    'consultationModes': 'Configure the types of consultations you offer and their fees.',
    'workingHours': 'Set your availability for patient consultations.',
    'languages': 'List languages you can communicate in with patients.',
    'notifications': 'Configure how you want to receive platform notifications.'
  };

  return guidanceMap[field] || 'Please ensure this field meets the requirements.';
};

/**
 * Validation middleware for profile section updates
 */
export const validateProfileSection = [
  // Validate doctor ID parameter
  param('id')
    .isMongoId()
    .withMessage('Invalid doctor ID format'),

  // Validate section in request body
  body('section')
    .isIn(['personalInfo', 'medicalLicense', 'specializations', 'qualifications', 'experience', 'consultationModes', 'workingHours', 'availability', 'bio', 'languages', 'notifications'])
    .withMessage('Invalid profile section'),

  // Validate data field exists and has the correct type per section
  body('data')
    .exists()
    .withMessage('Profile data is required')
    .custom((value, { req }) => {
      const section = req.body.section;
      const arraySections = ['specializations', 'qualifications', 'languages'];
      const stringSections = ['bio'];
      const objectSections = [
        'personalInfo',
        'medicalLicense',
        'experience',
        'consultationModes',
        'workingHours',
        'availability',
        'notifications'
      ];

      if (arraySections.includes(section)) {
        if (!Array.isArray(value)) {
          throw new Error('Profile data must be an array for this section');
        }
        return true;
      }

      if (stringSections.includes(section)) {
        if (typeof value !== 'string') {
          throw new Error('Profile data must be a string for this section');
        }
        return true;
      }

      if (objectSections.includes(section)) {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('Profile data must be an object for this section');
        }
        return true;
      }

      // Fallback: accept objects by default
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Profile data must be a valid payload for this section');
      }
      return true;
    }),

  // Custom validation middleware with detailed error responses
  async (req, res, next) => {
    try {
      console.log('Profile section validation request:', {
        section: req.body.section,
        dataType: typeof req.body.data,
        data: req.body.data
      });
      
      // Check for validation errors from express-validator
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value,
          code: 'VALIDATION_ERROR',
          severity: 'high'
        }));
        
        return next(new ApiError(400, 'Request validation failed', {
          errors: errorMessages,
          validationType: 'request',
          timestamp: new Date().toISOString()
        }));
      }

      // Skip validation for availability section (new time slot structure)
      const { section, data } = req.body;
      if (section !== 'availability') {
        console.log('Calling ProfileValidationService.validateSectionData with:', { section, data });
        const validation = await ProfileValidationService.validateSectionData(section, data);
        console.log('Validation result:', validation);
        
        if (!validation.isValid) {
          // Enhanced error response with detailed information
          const enhancedErrors = validation.errors.map(error => ({
            ...error,
            section,
            timestamp: new Date().toISOString(),
            guidance: getFieldGuidance(error.field)
          }));

          return next(new ApiError(400, 'Profile section validation failed', {
            errors: enhancedErrors,
            section,
            validationType: 'profile_section',
            canProceed: false,
            timestamp: new Date().toISOString()
          }));
        }
      }

      // Add validation metadata to request for downstream use
      req.validationMeta = {
        section,
        validatedAt: new Date().toISOString(),
        validationPassed: true
      };

      next();
    } catch (error) {
      next(new ApiError(500, `Profile validation error: ${error.message}`, {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }));
    }
  }
];

/**
 * Validation middleware for document uploads
 */
export const validateDocumentUpload = [
  // Validate doctor ID parameter
  param('id')
    .isMongoId()
    .withMessage('Invalid doctor ID format'),

  // Validate document type
  body('documentType')
    .isIn(['license', 'certificate', 'qualification', 'identity'])
    .withMessage('Invalid document type'),

  // Custom validation for uploaded files
  (req, res, next) => {
    try {
      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return next(new ApiError(400, 'No documents uploaded'));
      }

      // Validate file count
      if (req.files.length > 5) {
        return next(new ApiError(400, 'Maximum 5 documents allowed per upload'));
      }

      // Validate each file
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png', 
        'image/jpg',
        'application/pdf',
        'image/webp'
      ];
      const maxFileSize = 10 * 1024 * 1024; // 10MB

      for (const file of req.files) {
        // Check file size
        if (file.size > maxFileSize) {
          return next(new ApiError(400, `File ${file.originalname} exceeds maximum size of 10MB`));
        }

        // Check mime type
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return next(new ApiError(400, `Invalid file type for ${file.originalname}. Allowed types: ${allowedMimeTypes.join(', ')}`));
        }

        // Check filename
        if (!file.originalname || file.originalname.length > 255) {
          return next(new ApiError(400, `Invalid filename: ${file.originalname}`));
        }
      }

      next();
    } catch (error) {
      next(new ApiError(500, `Document validation error: ${error.message}`));
    }
  }
];

/**
 * Validation middleware for comprehensive profile validation
 */
export const validateCompleteProfile = [
  param('id')
    .isMongoId()
    .withMessage('Invalid doctor ID format'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value,
          code: 'VALIDATION_ERROR',
          severity: 'high'
        }));
        return next(new ApiError(400, 'Validation failed', errorMessages));
      }

      // Get doctor profile data for comprehensive validation
      const Doctor = (await import('../models/Doctor.js')).default;
      const doctor = await Doctor.findById(req.params.id);
      
      if (!doctor) {
        return next(new ApiError(404, 'Doctor profile not found'));
      }

      // Perform comprehensive profile validation
      const validation = ProfileValidationService.validateCompleteProfile(doctor.toObject());
      
      // Add validation results to request for controller use
      req.profileValidation = {
        ...validation,
        doctorId: req.params.id,
        validatedAt: new Date().toISOString()
      };

      next();
    } catch (error) {
      next(new ApiError(500, `Profile validation error: ${error.message}`));
    }
  }
];

/**
 * Validation middleware for profile completion check (legacy support)
 */
export const validateProfileCompletion = validateCompleteProfile;

/**
 * Sanitize profile data before processing
 */
export const sanitizeProfileData = (req, res, next) => {
  if (req.body.data && typeof req.body.data === 'object') {
    // Remove null, undefined, and empty string values
    Object.keys(req.body.data).forEach(key => {
      if (req.body.data[key] === null || req.body.data[key] === undefined || req.body.data[key] === '') {
        delete req.body.data[key];
      }
      
      // Trim string values
      if (typeof req.body.data[key] === 'string') {
        req.body.data[key] = req.body.data[key].trim();
      }
    });
  }
  next();
};

/**
 * Check authorization for profile operations
 */
export const checkProfileAuthorization = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Admin can access any profile
    if (userRole === 'admin') {
      return next();
    }

    // Doctor can only access their own profile
    if (userRole === 'doctor') {
      // Find the doctor document to check if it belongs to the current user
      const Doctor = (await import('../models/Doctor.js')).default;
      const doctor = await Doctor.findById(doctorId);
      
      if (!doctor) {
        return next(new ApiError(404, 'Doctor profile not found'));
      }

      if (!doctor.user.equals(userId)) {
        return next(new ApiError(403, 'Not authorized to access this profile'));
      }

      return next();
    }

    // Other roles are not authorized
    return next(new ApiError(403, 'Not authorized to access doctor profiles'));
  } catch (error) {
    next(new ApiError(500, `Authorization check failed: ${error.message}`));
  }
};

export default {
  validateProfileSection,
  validateDocumentUpload,
  validateProfileCompletion,
  sanitizeProfileData,
  checkProfileAuthorization
};