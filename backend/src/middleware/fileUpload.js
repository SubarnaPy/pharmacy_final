import { createUpload, cloudinaryUtils } from '../config/cloudinary.js';
import AppError from '../utils/AppError.js';

// Generic file upload middleware factory
export const createUploadMiddleware = (uploadType, fileField = 'file', maxFiles = 1) => {
  const upload = createUpload(uploadType, 'all', maxFiles);
  
  return (req, res, next) => {
    const uploadHandler = maxFiles === 1 ? upload.single(fileField) : upload.array(fileField, maxFiles);
    
    uploadHandler(req, res, (error) => {
      if (error) {
        // Handle multer errors
        if (error.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('File too large. Please upload a smaller file.', 400));
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return next(new AppError(`Too many files. Maximum allowed: ${maxFiles}`, 400));
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new AppError(`Unexpected field name: ${error.field}`, 400));
        }
        if (error.message.includes('Invalid file type')) {
          return next(new AppError(error.message, 400));
        }
        
        console.error('Upload error:', error);
        return next(new AppError('File upload failed. Please try again.', 500));
      }
      
      // Add file information to request object
      if (req.file) {
        req.fileInfo = {
          publicId: req.file.filename,
          url: req.file.path,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          uploadType: uploadType
        };
      } else if (req.files && req.files.length > 0) {
        req.filesInfo = req.files.map(file => ({
          publicId: file.filename,
          url: file.path,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          uploadType: uploadType
        }));
      }
      
      next();
    });
  };
};

// Specific upload middlewares
export const uploadPrescription = createUploadMiddleware('prescription', 'prescription');
export const uploadMultiplePrescriptions = createUploadMiddleware('prescription', 'prescriptions', 5);
export const uploadLicense = createUploadMiddleware('license', 'license');
export const uploadAvatar = createUploadMiddleware('avatar', 'avatar');
export const uploadDocument = createUploadMiddleware('document', 'document');
export const uploadMultipleDocuments = createUploadMiddleware('document', 'documents', 10);

// File validation middleware
export const validateFileUpload = (requiredFields = [], optionalFields = []) => {
  return (req, res, next) => {
    const errors = [];
    
    // Check required file fields
    for (const field of requiredFields) {
      if (!req.file && !req.files?.[field] && !req.fileInfo && !req.filesInfo) {
        errors.push(`${field} file is required`);
      }
    }
    
    // Validate file properties if files exist
    if (req.fileInfo || req.filesInfo) {
      const files = req.filesInfo || [req.fileInfo];
      
      for (const file of files) {
        // Validate file size
        if (file.size > 15 * 1024 * 1024) { // 15MB max
          errors.push(`File ${file.originalName} is too large`);
        }
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.mimetype)) {
          errors.push(`File ${file.originalName} has invalid type: ${file.mimetype}`);
        }
      }
    }
    
    if (errors.length > 0) {
      return next(new AppError(errors.join(', '), 400));
    }
    
    next();
  };
};

// Middleware to generate signed upload URLs for client-side uploads
export const generateSignedUploadUrl = (folder) => {
  return async (req, res, next) => {
    try {
      const { transformation, ...options } = req.body;
      
      const signedData = cloudinaryUtils.generateSignedUpload(folder, {
        transformation: transformation || [
          { quality: 'auto' },
          { format: 'auto' }
        ],
        ...options
      });
      
      req.signedUploadData = signedData;
      next();
    } catch (error) {
      console.error('Error generating signed upload URL:', error);
      next(new AppError('Failed to generate upload URL', 500));
    }
  };
};

// Middleware to handle file cleanup on error
export const cleanupOnError = (req, res, next) => {
  const originalNext = next;
  
  next = (error) => {
    if (error) {
      // Cleanup uploaded files if there was an error
      const cleanup = async () => {
        try {
          if (req.fileInfo?.publicId) {
            await cloudinaryUtils.deleteFile(req.fileInfo.publicId);
          }
          if (req.filesInfo?.length > 0) {
            const publicIds = req.filesInfo.map(file => file.publicId);
            await cloudinaryUtils.deleteFiles(publicIds);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up files:', cleanupError);
        }
      };
      
      cleanup();
    }
    
    originalNext(error);
  };
  
  next();
};

// Middleware to validate and process uploaded file URLs
export const processUploadedFiles = (req, res, next) => {
  try {
    // Process single file
    if (req.fileInfo) {
      req.fileInfo.optimizedUrl = cloudinaryUtils.getOptimizedUrl(req.fileInfo.publicId);
      req.fileInfo.thumbnailUrl = cloudinaryUtils.getOptimizedUrl(req.fileInfo.publicId, {
        width: 200,
        height: 200,
        crop: 'fill',
        quality: 'auto'
      });
    }
    
    // Process multiple files
    if (req.filesInfo?.length > 0) {
      req.filesInfo = req.filesInfo.map(file => ({
        ...file,
        optimizedUrl: cloudinaryUtils.getOptimizedUrl(file.publicId),
        thumbnailUrl: cloudinaryUtils.getOptimizedUrl(file.publicId, {
          width: 200,
          height: 200,
          crop: 'fill',
          quality: 'auto'
        })
      }));
    }
    
    next();
  } catch (error) {
    console.error('Error processing uploaded files:', error);
    next(new AppError('Error processing uploaded files', 500));
  }
};

// Middleware to validate file ownership
export const validateFileOwnership = (fileField = 'fileId') => {
  return async (req, res, next) => {
    try {
      const fileId = req.params[fileField] || req.body[fileField];
      
      if (!fileId) {
        return next(new AppError('File ID is required', 400));
      }
      
      // Here you would typically check if the file belongs to the authenticated user
      // This would involve querying your database to verify ownership
      // For now, we'll just validate that the file exists in Cloudinary
      
      try {
        await cloudinaryUtils.getFileInfo(fileId);
        req.validatedFileId = fileId;
        next();
      } catch (error) {
        if (error.http_code === 404) {
          return next(new AppError('File not found', 404));
        }
        throw error;
      }
    } catch (error) {
      console.error('Error validating file ownership:', error);
      next(new AppError('Error validating file access', 500));
    }
  };
};

// Middleware to extract file metadata
export const extractFileMetadata = (req, res, next) => {
  if (req.fileInfo) {
    req.fileInfo.metadata = {
      uploadedAt: new Date(),
      uploadedBy: req.user?.id,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      fileHash: req.fileInfo.publicId // Using public ID as a simple hash
    };
  }
  
  if (req.filesInfo?.length > 0) {
    req.filesInfo = req.filesInfo.map(file => ({
      ...file,
      metadata: {
        uploadedAt: new Date(),
        uploadedBy: req.user?.id,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        fileHash: file.publicId
      }
    }));
  }
  
  next();
};

// Rate limiting for file uploads
export const uploadRateLimit = (maxUploads = 10, windowMs = 15 * 60 * 1000) => {
  const uploadCounts = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    for (const [key, timestamps] of uploadCounts.entries()) {
      uploadCounts.set(key, timestamps.filter(timestamp => timestamp > windowStart));
      if (uploadCounts.get(key).length === 0) {
        uploadCounts.delete(key);
      }
    }
    
    // Check current user's upload count
    const userUploads = uploadCounts.get(userId) || [];
    
    if (userUploads.length >= maxUploads) {
      return next(new AppError('Too many uploads. Please try again later.', 429));
    }
    
    // Add current upload to count
    userUploads.push(now);
    uploadCounts.set(userId, userUploads);
    
    next();
  };
};
