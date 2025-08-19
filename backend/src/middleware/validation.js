import { validationResult } from 'express-validator';

/**
 * Validation middleware that handles express-validator results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  console.log('🔍 VALIDATION: Checking request validation...');
  console.log('🔍 VALIDATION: Request URL:', req.originalUrl);
  console.log('🔍 VALIDATION: Query params:', req.query);
  console.log('🔍 VALIDATION: Body:', req.body);
  console.log('🔍 VALIDATION: Errors found:', errors.isEmpty() ? 'None' : errors.array().length);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    console.log('❌ VALIDATION: Validation failed with errors:', formattedErrors);

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors,
      code: 'VALIDATION_ERROR'
    });
  }

  console.log('✅ VALIDATION: Validation passed');
  next();
};

/**
 * Async validation middleware wrapper
 * @param {Function} validationFn - Async validation function
 * @returns {Function} - Express middleware
 */
export const asyncValidation = (validationFn) => {
  return async (req, res, next) => {
    try {
      await validationFn(req, res, next);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message,
        code: 'ASYNC_VALIDATION_ERROR'
      });
    }
  };
};

/**
 * Custom validation function for file uploads
 * @param {string} fieldName - Name of the file field
 * @param {Object} options - Validation options
 * @returns {Function} - Express middleware
 */
export const validateFileUpload = (fieldName, options = {}) => {
  const {
    required = true,
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'application/pdf'],
    maxFiles = 1
  } = options;

  return (req, res, next) => {
    const file = req.file;
    const files = req.files;

    // Check if file is required
    if (required && !file && (!files || files.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'File upload is required',
        code: 'FILE_REQUIRED'
      });
    }

    // Validate single file
    if (file) {
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
          code: 'FILE_TOO_LARGE'
        });
      }

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `File type ${file.mimetype} is not allowed`,
          code: 'INVALID_FILE_TYPE'
        });
      }
    }

    // Validate multiple files
    if (files && Array.isArray(files)) {
      if (files.length > maxFiles) {
        return res.status(400).json({
          success: false,
          error: `Too many files. Maximum allowed: ${maxFiles}`,
          code: 'TOO_MANY_FILES'
        });
      }

      for (const file of files) {
        if (file.size > maxSize) {
          return res.status(400).json({
            success: false,
            error: `File ${file.originalname} exceeds size limit of ${maxSize / (1024 * 1024)}MB`,
            code: 'FILE_TOO_LARGE'
          });
        }

        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            error: `File type ${file.mimetype} is not allowed for ${file.originalname}`,
            code: 'INVALID_FILE_TYPE'
          });
        }
      }
    }

    next();
  };
};

/**
 * Validate JSON body structure
 * @param {Object} schema - Expected schema structure
 * @returns {Function} - Express middleware
 */
export const validateJSONSchema = (schema) => {
  return (req, res, next) => {
    try {
      const errors = validateObjectSchema(req.body, schema);
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Schema validation failed',
          details: errors,
          code: 'SCHEMA_VALIDATION_ERROR'
        });
      }

      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Schema validation error',
        details: error.message,
        code: 'SCHEMA_ERROR'
      });
    }
  };
};

/**
 * Helper function to validate object against schema
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Schema to validate against
 * @param {string} path - Current path in object (for nested validation)
 * @returns {Array} - Array of validation errors
 */
const validateObjectSchema = (obj, schema, path = '') => {
  const errors = [];

  for (const [key, rules] of Object.entries(schema)) {
    const currentPath = path ? `${path}.${key}` : key;
    const value = obj[key];

    // Required field check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: currentPath,
        message: `${key} is required`,
        code: 'REQUIRED_FIELD'
      });
      continue;
    }

    // Skip further validation if field is not present and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push({
          field: currentPath,
          message: `${key} must be of type ${rules.type}`,
          code: 'INVALID_TYPE'
        });
        continue;
      }
    }

    // String validations
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field: currentPath,
          message: `${key} must be at least ${rules.minLength} characters long`,
          code: 'MIN_LENGTH'
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field: currentPath,
          message: `${key} must be no more than ${rules.maxLength} characters long`,
          code: 'MAX_LENGTH'
        });
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({
          field: currentPath,
          message: `${key} format is invalid`,
          code: 'INVALID_FORMAT'
        });
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field: currentPath,
          message: `${key} must be one of: ${rules.enum.join(', ')}`,
          code: 'INVALID_ENUM'
        });
      }
    }

    // Number validations
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field: currentPath,
          message: `${key} must be at least ${rules.min}`,
          code: 'MIN_VALUE'
        });
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field: currentPath,
          message: `${key} must be no more than ${rules.max}`,
          code: 'MAX_VALUE'
        });
      }

      if (rules.integer && !Number.isInteger(value)) {
        errors.push({
          field: currentPath,
          message: `${key} must be an integer`,
          code: 'INVALID_INTEGER'
        });
      }
    }

    // Array validations
    if (rules.type === 'array') {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push({
          field: currentPath,
          message: `${key} must have at least ${rules.minItems} items`,
          code: 'MIN_ITEMS'
        });
      }

      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push({
          field: currentPath,
          message: `${key} must have no more than ${rules.maxItems} items`,
          code: 'MAX_ITEMS'
        });
      }

      if (rules.itemType) {
        value.forEach((item, index) => {
          const itemType = Array.isArray(item) ? 'array' : typeof item;
          if (itemType !== rules.itemType) {
            errors.push({
              field: `${currentPath}[${index}]`,
              message: `All items in ${key} must be of type ${rules.itemType}`,
              code: 'INVALID_ITEM_TYPE'
            });
          }
        });
      }
    }

    // Object validations (nested schema)
    if (rules.type === 'object' && rules.schema) {
      const nestedErrors = validateObjectSchema(value, rules.schema, currentPath);
      errors.push(...nestedErrors);
    }

    // Custom validation function
    if (rules.custom && typeof rules.custom === 'function') {
      try {
        const customResult = rules.custom(value, obj);
        if (customResult !== true) {
          errors.push({
            field: currentPath,
            message: customResult || `${key} failed custom validation`,
            code: 'CUSTOM_VALIDATION'
          });
        }
      } catch (error) {
        errors.push({
          field: currentPath,
          message: `Custom validation error for ${key}: ${error.message}`,
          code: 'CUSTOM_VALIDATION_ERROR'
        });
      }
    }
  }

  return errors;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Validation result
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Validation result
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with strength details
 */
export const validatePasswordStrength = (password) => {
  const result = {
    valid: true,
    score: 0,
    requirements: {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    },
    suggestions: []
  };

  // Calculate score
  Object.values(result.requirements).forEach(met => {
    if (met) result.score++;
  });

  // Add suggestions for unmet requirements
  if (!result.requirements.length) {
    result.suggestions.push('Password must be at least 8 characters long');
  }
  if (!result.requirements.uppercase) {
    result.suggestions.push('Include at least one uppercase letter');
  }
  if (!result.requirements.lowercase) {
    result.suggestions.push('Include at least one lowercase letter');
  }
  if (!result.requirements.numbers) {
    result.suggestions.push('Include at least one number');
  }
  if (!result.requirements.special) {
    result.suggestions.push('Include at least one special character');
  }

  // Determine validity (require at least 4 out of 5 requirements)
  result.valid = result.score >= 4;

  return result;
};

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

/**
 * Validate and sanitize user input
 * @param {Object} data - Data object to validate and sanitize
 * @param {Array} allowedFields - Array of allowed field names
 * @returns {Object} - Sanitized data object
 */
export const sanitizeInput = (data, allowedFields = []) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Only include allowed fields if specified
    if (allowedFields.length > 0 && !allowedFields.includes(key)) {
      continue;
    }
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeInput(value, allowedFields);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

export default {
  validateRequest,
  asyncValidation,
  validateFileUpload,
  validateJSONSchema,
  isValidEmail,
  isValidPhone,
  validatePasswordStrength,
  sanitizeString,
  sanitizeInput
};
