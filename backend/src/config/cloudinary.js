import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Create Cloudinary storage for different file types
const createCloudinaryStorage = (folder, allowedFormats, transformation = null) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const params = {
        folder: `pharmacy-system/${folder}`,
        allowed_formats: allowedFormats,
        public_id: `${folder}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        resource_type: 'auto',
        access_mode: 'public'
      };

      // Add transformation if provided
      if (transformation) {
        params.transformation = transformation;
      }

      return params;
    },
  });
};

// Storage configurations for different file types
export const prescriptionStorage = createCloudinaryStorage(
  'prescriptions',
  ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
  [
    { width: 1200, height: 1600, crop: 'limit', quality: 'auto' },
    { format: 'auto' }
  ]
);

export const licenseStorage = createCloudinaryStorage(
  'pharmacy-licenses',
  ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
  [
    { width: 1200, height: 1600, crop: 'limit', quality: 'auto' },
    { format: 'auto' }
  ]
);

export const avatarStorage = createCloudinaryStorage(
  'avatars',
  ['jpg', 'jpeg', 'png', 'webp'],
  [
    { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' },
    { format: 'auto' }
  ]
);

export const documentStorage = createCloudinaryStorage(
  'documents',
  ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
  [
    { quality: 'auto' },
    { format: 'auto' }
  ]
);

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  prescription: 10 * 1024 * 1024, // 10MB
  license: 10 * 1024 * 1024, // 10MB
  avatar: 5 * 1024 * 1024, // 5MB
  document: 15 * 1024 * 1024 // 15MB
};

// File type validation
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  all: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
};

// Create multer upload configurations
export const createUpload = (storageType, fileType = 'all', maxFiles = 1) => {
  const storageMap = {
    prescription: prescriptionStorage,
    license: licenseStorage,
    avatar: avatarStorage,
    document: documentStorage
  };

  const storage = storageMap[storageType];
  const sizeLimit = FILE_SIZE_LIMITS[storageType] || FILE_SIZE_LIMITS.document;
  const allowedTypes = ALLOWED_MIME_TYPES[fileType] || ALLOWED_MIME_TYPES.all;

  return multer({
    storage: storage,
    limits: {
      fileSize: sizeLimit,
      files: maxFiles
    },
    fileFilter: (req, file, cb) => {
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
      }

      // Additional security checks
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        return cb(new Error(`Invalid file extension: ${fileExtension}`), false);
      }

      cb(null, true);
    }
  });
};

// Utility functions for Cloudinary operations
export const cloudinaryUtils = {
  // Delete file from Cloudinary
  deleteFile: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      throw error;
    }
  },

  // Delete multiple files
  deleteFiles: async (publicIds) => {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return result;
    } catch (error) {
      console.error('Error deleting files from Cloudinary:', error);
      throw error;
    }
  },

  // Get optimized URL with transformations
  getOptimizedUrl: (publicId, options = {}) => {
    const defaultOptions = {
      quality: 'auto',
      format: 'auto',
      fetch_format: 'auto'
    };

    return cloudinary.url(publicId, { ...defaultOptions, ...options });
  },

  // Generate signed upload URL for client-side uploads
  generateSignedUpload: (folder, options = {}) => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = {
      timestamp,
      folder: `pharmacy-system/${folder}`,
      ...options
    };

    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

    return {
      timestamp,
      signature,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      ...params
    };
  },

  // Extract public ID from Cloudinary URL
  extractPublicId: (cloudinaryUrl) => {
    if (!cloudinaryUrl) return null;
    
    try {
      const urlParts = cloudinaryUrl.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      if (uploadIndex === -1) return null;
      
      const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
      const publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.'));
      return publicId;
    } catch (error) {
      console.error('Error extracting public ID:', error);
      return null;
    }
  },

  // Validate Cloudinary URL
  isValidCloudinaryUrl: (url) => {
    if (!url) return false;
    return url.includes('cloudinary.com') && url.includes('image/upload');
  },

  // Get file info from Cloudinary
  getFileInfo: async (publicId) => {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  },

  // Create archive (zip) of multiple files
  createArchive: async (publicIds, options = {}) => {
    try {
      const result = await cloudinary.uploader.create_archive({
        public_ids: publicIds,
        resource_type: 'auto',
        ...options
      });
      return result;
    } catch (error) {
      console.error('Error creating archive:', error);
      throw error;
    }
  }
};

// Cleanup utilities
export const cleanupUtils = {
  // Clean up orphaned files (files not referenced in database)
  cleanupOrphanedFiles: async (activePublicIds) => {
    try {
      const allFiles = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'pharmacy-system/',
        max_results: 500
      });

      const orphanedFiles = allFiles.resources.filter(
        file => !activePublicIds.includes(file.public_id)
      );

      if (orphanedFiles.length > 0) {
        const orphanedIds = orphanedFiles.map(file => file.public_id);
        await cloudinaryUtils.deleteFiles(orphanedIds);
        console.log(`Cleaned up ${orphanedFiles.length} orphaned files`);
      }

      return orphanedFiles.length;
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      throw error;
    }
  },

  // Clean up old files (older than specified days)
  cleanupOldFiles: async (daysOld = 30) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldFiles = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'pharmacy-system/',
        max_results: 500,
        created_at: { lt: cutoffDate.toISOString() }
      });

      if (oldFiles.resources.length > 0) {
        const oldIds = oldFiles.resources.map(file => file.public_id);
        await cloudinaryUtils.deleteFiles(oldIds);
        console.log(`Cleaned up ${oldFiles.resources.length} old files`);
      }

      return oldFiles.resources.length;
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      throw error;
    }
  }
};

export default cloudinary;
