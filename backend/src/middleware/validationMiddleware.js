import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

/**
 * Validation middleware to check for validation errors
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  // Debugging logs
  console.log('--- VALIDATION DEBUG ---');
  console.log('Request URL:', req.originalUrl);
  console.log('Request Method:', req.method);
  console.log('Request Body:', req.body);
  console.log('Validation Errors:', errors.array());
  console.log('------------------------');

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    console.log('Validation failed:', errorMessages);
    return next(new AppError('Validation failed', 400, errorMessages));
  }

  next();
};

/**
 * Sanitize request body by removing null, undefined, and empty string values
 */
export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === null || req.body[key] === undefined || req.body[key] === '') {
        delete req.body[key];
      }
    });
  }
  next();
};

/**
 * Trim string values in request body
 */
export const trimStrings = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

/**
 * Validate admin actions - requires reason for sensitive operations
 */
export const validateAdminAction = (req, res, next) => {
  const { method, path } = req;
  const sensitiveActions = ['DELETE', 'suspend', 'reject', 'approve'];
  
  const isSensitiveAction = method === 'DELETE' || 
    sensitiveActions.some(action => path.includes(action));
  
  if (isSensitiveAction) {
    const { reason, notes } = req.body;
    
    if (!reason && !notes) {
      return next(new AppError('Reason is required for this action', 400));
    }
    
    if ((reason && reason.length < 10) || (notes && notes.length < 10)) {
      return next(new AppError('Reason must be at least 10 characters long', 400));
    }
  }
  
  next();
};

/**
 * Convert string boolean values to actual booleans
 */
export const parseBoolean = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === 'true') {
        req.body[key] = true;
      } else if (req.body[key] === 'false') {
        req.body[key] = false;
      }
    });
  }
  next();
};

/**
 * Validate file upload middleware
 */
export const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];
    
    for (const file of files) {
      // Check file size
      if (file.size > maxSize) {
        return next(new AppError(`File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`, 400));
      }

      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return next(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400));
      }
    }

    next();
  };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;

  // Convert to numbers and validate
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return next(new AppError('Page must be a positive integer', 400));
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return next(new AppError('Limit must be between 1 and 100', 400));
  }

  if (!['asc', 'desc'].includes(order.toLowerCase())) {
    return next(new AppError('Order must be either "asc" or "desc"', 400));
  }

  // Add validated values to request
  req.pagination = {
    page: pageNum,
    limit: limitNum,
    sort,
    order: order.toLowerCase(),
    skip: (pageNum - 1) * limitNum
  };

  next();
};

/**
 * Validate search parameters
 */
export const validateSearch = (req, res, next) => {
  const { search } = req.query;

  if (search) {
    // Basic search validation
    if (typeof search !== 'string') {
      return next(new AppError('Search term must be a string', 400));
    }

    if (search.length < 2) {
      return next(new AppError('Search term must be at least 2 characters long', 400));
    }

    if (search.length > 100) {
      return next(new AppError('Search term must be less than 100 characters', 400));
    }

    // Sanitize search term
    req.query.search = search.trim().replace(/[<>]/g, '');
  }

  next();
};

/**
 * Validate date range parameters
 */
export const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return next(new AppError('Start date must be a valid date', 400));
    }
    req.query.startDate = start;
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return next(new AppError('End date must be a valid date', 400));
    }
    req.query.endDate = end;
  }

  if (startDate && endDate && req.query.startDate > req.query.endDate) {
    return next(new AppError('Start date must be before end date', 400));
  }

  next();
};

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return next(new AppError(`${paramName} is required`, 400));
    }

    // Basic MongoDB ObjectId validation (24 character hex string)
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return next(new AppError(`Invalid ${paramName} format`, 400));
    }

    next();
  };
};

/**
 * Validate coordinates for geospatial queries
 */
export const validateCoordinates = (req, res, next) => {
  const { latitude, longitude, radius } = req.query;

  if (latitude !== undefined || longitude !== undefined) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return next(new AppError('Latitude must be a number between -90 and 90', 400));
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return next(new AppError('Longitude must be a number between -180 and 180', 400));
    }

    req.query.coordinates = {
      latitude: lat,
      longitude: lng
    };

    if (radius !== undefined) {
      const radiusNum = parseFloat(radius);
      if (isNaN(radiusNum) || radiusNum <= 0 || radiusNum > 100) {
        return next(new AppError('Radius must be a number between 0 and 100 kilometers', 400));
      }
      req.query.coordinates.radius = radiusNum;
    }
  }

  next();
};

/**
 * Custom validation for specific fields
 */
export const customValidation = (validators) => {
  return async (req, res, next) => {
    try {
      for (const validator of validators) {
        await validator(req, res);
      }
      next();
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  };
};

export default {
  validateRequest,
  sanitizeBody,
  trimStrings,
  parseBoolean,
  validateFileUpload,
  validatePagination,
  validateSearch,
  validateDateRange,
  validateObjectId,
  validateCoordinates,
  customValidation
};
