import { cloudinaryUtils } from '../config/cloudinary.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

// Generic file upload controller
export const uploadFile = catchAsync(async (req, res, next) => {
  if (!req.fileInfo && !req.filesInfo) {
    return next(new AppError('No file uploaded', 400));
  }

  const response = {
    message: 'File uploaded successfully',
    file: req.fileInfo || undefined,
    files: req.filesInfo || undefined
  };

  res.status(201).json({
    status: 'success',
    data: response
  });
});

// Generate signed upload URL for client-side uploads
export const getSignedUploadUrl = catchAsync(async (req, res, next) => {
  const { folder, options = {} } = req.body;
  
  if (!folder) {
    return next(new AppError('Folder is required', 400));
  }

  const signedData = cloudinaryUtils.generateSignedUpload(folder, options);

  res.status(200).json({
    status: 'success',
    data: {
      signedUploadData: signedData,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`
    }
  });
});

// Get file information
export const getFileInfo = catchAsync(async (req, res, next) => {
  const { publicId } = req.params;
  
  if (!publicId) {
    return next(new AppError('Public ID is required', 400));
  }

  const fileInfo = await cloudinaryUtils.getFileInfo(publicId);

  res.status(200).json({
    status: 'success',
    data: {
      file: fileInfo
    }
  });
});

// Delete file
export const deleteFile = catchAsync(async (req, res, next) => {
  const { publicId } = req.params;
  
  if (!publicId) {
    return next(new AppError('Public ID is required', 400));
  }

  const result = await cloudinaryUtils.deleteFile(publicId);

  if (result.result !== 'ok') {
    return next(new AppError('Failed to delete file', 500));
  }

  res.status(200).json({
    status: 'success',
    message: 'File deleted successfully'
  });
});

// Delete multiple files
export const deleteFiles = catchAsync(async (req, res, next) => {
  const { publicIds } = req.body;
  
  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
    return next(new AppError('Public IDs array is required', 400));
  }

  const result = await cloudinaryUtils.deleteFiles(publicIds);

  res.status(200).json({
    status: 'success',
    message: 'Files deleted successfully',
    data: {
      deleted: result.deleted,
      deletedCounts: result.deleted_counts
    }
  });
});

// Get optimized file URL
export const getOptimizedUrl = catchAsync(async (req, res, next) => {
  const { publicId } = req.params;
  const { transformation } = req.query;
  
  if (!publicId) {
    return next(new AppError('Public ID is required', 400));
  }

  let transformationOptions = {};
  if (transformation) {
    try {
      transformationOptions = JSON.parse(transformation);
    } catch (error) {
      return next(new AppError('Invalid transformation options', 400));
    }
  }

  const optimizedUrl = cloudinaryUtils.getOptimizedUrl(publicId, transformationOptions);

  res.status(200).json({
    status: 'success',
    data: {
      optimizedUrl,
      publicId,
      transformation: transformationOptions
    }
  });
});

// Create archive of multiple files
export const createArchive = catchAsync(async (req, res, next) => {
  const { publicIds, archiveName, format = 'zip' } = req.body;
  
  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
    return next(new AppError('Public IDs array is required', 400));
  }

  const archiveOptions = {
    type: 'upload',
    target_format: format
  };

  if (archiveName) {
    archiveOptions.public_id = archiveName;
  }

  const result = await cloudinaryUtils.createArchive(publicIds, archiveOptions);

  res.status(200).json({
    status: 'success',
    data: {
      archiveUrl: result.secure_url,
      publicId: result.public_id,
      fileCount: publicIds.length
    }
  });
});

// Prescription-specific upload handler
export const uploadPrescription = catchAsync(async (req, res, next) => {
  if (!req.fileInfo) {
    return next(new AppError('No prescription file uploaded', 400));
  }

  // Add prescription-specific processing here
  const prescriptionData = {
    ...req.fileInfo,
    category: 'prescription',
    patientId: req.user?.id,
    uploadedAt: new Date(),
    status: 'pending_review'
  };

  // Here you would typically save to database
  // const prescription = await Prescription.create(prescriptionData);

  res.status(201).json({
    status: 'success',
    message: 'Prescription uploaded successfully',
    data: {
      prescription: prescriptionData
    }
  });
});

// License document upload handler
export const uploadLicense = catchAsync(async (req, res, next) => {
  if (!req.fileInfo) {
    return next(new AppError('No license file uploaded', 400));
  }

  const licenseData = {
    ...req.fileInfo,
    category: 'license',
    pharmacyId: req.user?.pharmacyId || req.user?.id,
    uploadedAt: new Date(),
    status: 'pending_verification'
  };

  // Here you would typically save to database
  // const license = await PharmacyLicense.create(licenseData);

  res.status(201).json({
    status: 'success',
    message: 'License document uploaded successfully',
    data: {
      license: licenseData
    }
  });
});

// Avatar upload handler
export const uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.fileInfo) {
    return next(new AppError('No avatar file uploaded', 400));
  }

  const avatarData = {
    ...req.fileInfo,
    category: 'avatar',
    userId: req.user?.id,
    uploadedAt: new Date()
  };

  // Here you would typically update user profile in database
  // await User.findByIdAndUpdate(req.user.id, { avatar: avatarData.url });

  res.status(200).json({
    status: 'success',
    message: 'Avatar uploaded successfully',
    data: {
      avatar: avatarData
    }
  });
});

// Batch upload handler for multiple files
export const batchUpload = catchAsync(async (req, res, next) => {
  if (!req.filesInfo || req.filesInfo.length === 0) {
    return next(new AppError('No files uploaded', 400));
  }

  const uploadedFiles = req.filesInfo.map(file => ({
    ...file,
    uploadedAt: new Date(),
    userId: req.user?.id
  }));

  res.status(201).json({
    status: 'success',
    message: `${uploadedFiles.length} files uploaded successfully`,
    data: {
      files: uploadedFiles,
      count: uploadedFiles.length
    }
  });
});

// Get upload progress (for large files)
export const getUploadProgress = catchAsync(async (req, res, next) => {
  const { uploadId } = req.params;
  
  // This would typically query a progress tracking system
  // For now, return a mock response
  res.status(200).json({
    status: 'success',
    data: {
      uploadId,
      progress: 100,
      status: 'completed',
      message: 'Upload completed successfully'
    }
  });
});

// Validate uploaded file
export const validateUploadedFile = catchAsync(async (req, res, next) => {
  const { publicId } = req.params;
  
  if (!publicId) {
    return next(new AppError('Public ID is required', 400));
  }

  try {
    const fileInfo = await cloudinaryUtils.getFileInfo(publicId);
    
    const validation = {
      isValid: true,
      fileExists: true,
      fileSize: fileInfo.bytes,
      format: fileInfo.format,
      width: fileInfo.width,
      height: fileInfo.height,
      resourceType: fileInfo.resource_type
    };

    // Add specific validation rules
    if (fileInfo.bytes > 15 * 1024 * 1024) {
      validation.isValid = false;
      validation.error = 'File size exceeds maximum limit';
    }

    if (!['jpg', 'jpeg', 'png', 'pdf', 'webp'].includes(fileInfo.format?.toLowerCase())) {
      validation.isValid = false;
      validation.error = 'Invalid file format';
    }

    res.status(200).json({
      status: 'success',
      data: {
        validation,
        fileInfo
      }
    });
  } catch (error) {
    if (error.http_code === 404) {
      res.status(200).json({
        status: 'success',
        data: {
          validation: {
            isValid: false,
            fileExists: false,
            error: 'File not found'
          }
        }
      });
    } else {
      throw error;
    }
  }
});

// Cleanup utilities
export const cleanupOrphanedFiles = catchAsync(async (req, res, next) => {
  // This should be an admin-only endpoint
  if (req.user?.role !== 'admin') {
    return next(new AppError('Access denied. Admin privileges required.', 403));
  }

  // Get list of active file public IDs from database
  // const activePublicIds = await getAllActiveFilePublicIds();
  const activePublicIds = []; // Mock empty array for now

  const cleanedCount = await cloudinaryUtils.cleanupOrphanedFiles(activePublicIds);

  res.status(200).json({
    status: 'success',
    message: `Cleaned up ${cleanedCount} orphaned files`,
    data: {
      cleanedCount
    }
  });
});

export const cleanupOldFiles = catchAsync(async (req, res, next) => {
  // This should be an admin-only endpoint
  if (req.user?.role !== 'admin') {
    return next(new AppError('Access denied. Admin privileges required.', 403));
  }

  const { daysOld = 30 } = req.query;
  const cleanedCount = await cloudinaryUtils.cleanupOldFiles(parseInt(daysOld));

  res.status(200).json({
    status: 'success',
    message: `Cleaned up ${cleanedCount} files older than ${daysOld} days`,
    data: {
      cleanedCount,
      daysOld: parseInt(daysOld)
    }
  });
});
