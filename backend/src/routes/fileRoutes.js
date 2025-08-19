import express from 'express';
import { authenticate, authorize, patientOnly, pharmacyOnly, adminOnly } from '../middleware/authMiddleware.js';
import {
  uploadPrescription,
  uploadMultiplePrescriptions,
  uploadLicense,
  uploadAvatar,
  uploadDocument,
  uploadMultipleDocuments,
  validateFileUpload,
  generateSignedUploadUrl,
  cleanupOnError,
  processUploadedFiles,
  extractFileMetadata,
  uploadRateLimit,
  validateFileOwnership
} from '../middleware/fileUpload.js';
import {
  uploadFile,
  getSignedUploadUrl,
  getFileInfo,
  deleteFile,
  deleteFiles,
  getOptimizedUrl,
  createArchive,
  uploadPrescription as uploadPrescriptionController,
  uploadLicense as uploadLicenseController,
  uploadAvatar as uploadAvatarController,
  batchUpload,
  getUploadProgress,
  validateUploadedFile,
  cleanupOrphanedFiles,
  cleanupOldFiles
} from '../controllers/fileController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Rate limiting for uploads
router.use(uploadRateLimit(20, 15 * 60 * 1000)); // 20 uploads per 15 minutes

// Generic file upload routes
router.post('/upload',
  uploadDocument,
  validateFileUpload(['document']),
  cleanupOnError,
  processUploadedFiles,
  extractFileMetadata,
  uploadFile
);

router.post('/upload/batch',
  uploadMultipleDocuments,
  validateFileUpload(),
  cleanupOnError,
  processUploadedFiles,
  extractFileMetadata,
  batchUpload
);

// Prescription upload routes
router.post('/prescriptions/upload',
  patientOnly,
  uploadPrescription,
  validateFileUpload(['prescription']),
  cleanupOnError,
  processUploadedFiles,
  extractFileMetadata,
  uploadPrescriptionController
);

router.post('/prescriptions/upload/batch',
  patientOnly,
  uploadMultiplePrescriptions,
  validateFileUpload(),
  cleanupOnError,
  processUploadedFiles,
  extractFileMetadata,
  batchUpload
);

// License document upload routes
router.post('/licenses/upload',
  pharmacyOnly,
  uploadLicense,
  validateFileUpload(['license']),
  cleanupOnError,
  processUploadedFiles,
  extractFileMetadata,
  uploadLicenseController
);

// Avatar upload routes
router.post('/avatars/upload',
  uploadAvatar,
  validateFileUpload(['avatar']),
  cleanupOnError,
  processUploadedFiles,
  extractFileMetadata,
  uploadAvatarController
);

// Signed upload URL generation (for client-side uploads)
router.post('/signed-upload-url', getSignedUploadUrl);

router.post('/signed-upload-url/prescription',
  patientOnly,
  generateSignedUploadUrl('prescriptions'),
  (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {
        signedUploadData: req.signedUploadData,
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`
      }
    });
  }
);

router.post('/signed-upload-url/license',
  pharmacyOnly,
  generateSignedUploadUrl('pharmacy-licenses'),
  (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {
        signedUploadData: req.signedUploadData,
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`
      }
    });
  }
);

router.post('/signed-upload-url/avatar',
  generateSignedUploadUrl('avatars'),
  (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {
        signedUploadData: req.signedUploadData,
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`
      }
    });
  }
);

// File management routes
router.get('/info/:publicId', getFileInfo);

router.get('/optimized-url/:publicId', getOptimizedUrl);

router.get('/validate/:publicId', validateUploadedFile);

router.get('/upload-progress/:uploadId', getUploadProgress);

// File deletion routes
router.delete('/:publicId',
  validateFileOwnership('publicId'),
  deleteFile
);

router.delete('/',
  deleteFiles
);

// Archive creation
router.post('/archive', createArchive);

// Admin-only cleanup routes
router.post('/cleanup/orphaned',
  adminOnly,
  cleanupOrphanedFiles
);

router.post('/cleanup/old',
  adminOnly,
  cleanupOldFiles
);

export default router;
