import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../utils/ApiError.js';
import CloudinaryService from './CloudinaryService.js';

/**
 * DocumentUploadService - Handles document uploads for medical licenses and certificates
 */
class DocumentUploadService {
  constructor() {
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
      'image/webp'
    ];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    this.cloudinaryService = new CloudinaryService();
  }

  /**
   * Configure multer for file uploads
   * @returns {multer.Multer} - Configured multer instance
   */
  getMulterConfig() {
    const storage = multer.memoryStorage();

    return multer({
      storage,
      limits: {
        fileSize: this.maxFileSize,
        files: 5 // Maximum 5 files per request
      },
      fileFilter: (req, file, cb) => {
        if (this.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new ApiError(400, `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`), false);
        }
      }
    });
  }

  /**
   * Validate uploaded file
   * @param {Object} file - Uploaded file object
   * @returns {Object} - Validation result
   */
  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    // Check file name
    if (!file.originalname || file.originalname.length > 255) {
      errors.push('Invalid file name');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Upload document to cloud storage
   * @param {Object} file - File object from multer
   * @param {string} documentType - Type of document (license, certificate, etc.)
   * @param {string} doctorId - Doctor's ID
   * @returns {Promise<Object>} - Upload result with file URL and metadata
   */
  async uploadDocument(file, documentType, doctorId) {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new ApiError(400, validation.errors.join(', '));
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${doctorId}_${documentType}_${uuidv4()}${fileExtension}`;

      // Upload to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        {
          folder: `doctors/${doctorId}/documents`,
          public_id: uniqueFilename.replace(fileExtension, ''),
          resource_type: 'auto',
          format: fileExtension.slice(1),
          access_mode: 'public', // Make documents publicly accessible
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        }
      );

      return {
        fileName: file.originalname,
        fileUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        fileSize: file.size,
        mimeType: file.mimetype,
        documentType,
        uploadedAt: new Date(),
        cloudinaryData: {
          assetId: uploadResult.asset_id,
          versionId: uploadResult.version_id,
          signature: uploadResult.signature
        }
      };
    } catch (error) {
      throw new ApiError(500, `Document upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple documents
   * @param {Array} files - Array of file objects
   * @param {string} documentType - Type of documents
   * @param {string} doctorId - Doctor's ID
   * @returns {Promise<Array>} - Array of upload results
   */
  async uploadMultipleDocuments(files, documentType, doctorId) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new ApiError(400, 'No files provided');
    }

    if (files.length > 5) {
      throw new ApiError(400, 'Maximum 5 files allowed per upload');
    }

    const uploadPromises = files.map(file =>
      this.uploadDocument(file, documentType, doctorId)
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new ApiError(500, `Multiple document upload failed: ${error.message}`);
    }
  }

  /**
   * Delete document from cloud storage
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteDocument(publicId) {
    try {
      const result = await this.cloudinaryService.deleteFile(publicId);
      return {
        success: result.result === 'ok',
        publicId,
        deletedAt: new Date()
      };
    } catch (error) {
      throw new ApiError(500, `Document deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple documents
   * @param {Array} publicIds - Array of Cloudinary public IDs
   * @returns {Promise<Array>} - Array of deletion results
   */
  async deleteMultipleDocuments(publicIds) {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      throw new ApiError(400, 'No document IDs provided');
    }

    const deletePromises = publicIds.map(publicId =>
      this.deleteDocument(publicId)
    );

    try {
      return await Promise.all(deletePromises);
    } catch (error) {
      throw new ApiError(500, `Multiple document deletion failed: ${error.message}`);
    }
  }

  /**
   * Get document metadata
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} - Document metadata
   */
  async getDocumentMetadata(publicId) {
    try {
      const result = await this.cloudinaryService.getResourceDetails(publicId);
      return {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        createdAt: result.created_at,
        version: result.version
      };
    } catch (error) {
      throw new ApiError(500, `Failed to get document metadata: ${error.message}`);
    }
  }

  /**
   * Generate secure download URL with expiration
   * @param {string} publicId - Cloudinary public ID
   * @param {number} expirationMinutes - URL expiration in minutes (default: 60)
   * @returns {string} - Secure download URL
   */
  generateSecureDownloadUrl(publicId, expirationMinutes = 60) {
    try {
      const expirationTimestamp = Math.floor(Date.now() / 1000) + (expirationMinutes * 60);

      return this.cloudinaryService.generateSignedUrl(publicId, {
        type: 'authenticated',
        expires_at: expirationTimestamp,
        resource_type: 'auto'
      });
    } catch (error) {
      throw new ApiError(500, `Failed to generate secure URL: ${error.message}`);
    }
  }

  /**
   * Scan document for viruses (placeholder for future implementation)
   * @param {Buffer} fileBuffer - File buffer
   * @returns {Promise<Object>} - Scan result
   */
  async scanForViruses(fileBuffer) {
    // Placeholder for virus scanning implementation
    // In production, integrate with services like ClamAV, VirusTotal, etc.
    return {
      isClean: true,
      scanDate: new Date(),
      scanner: 'placeholder'
    };
  }

  /**
   * Extract text from document using OCR (placeholder for future implementation)
   * @param {string} fileUrl - Document URL
   * @returns {Promise<string>} - Extracted text
   */
  async extractTextFromDocument(fileUrl) {
    // Placeholder for OCR implementation
    // In production, integrate with services like Google Vision API, AWS Textract, etc.
    return '';
  }

  /**
   * Validate document authenticity (placeholder for future implementation)
   * @param {Object} documentData - Document data
   * @returns {Promise<Object>} - Validation result
   */
  async validateDocumentAuthenticity(documentData) {
    // Placeholder for document authenticity validation
    // In production, integrate with relevant medical board APIs
    return {
      isAuthentic: null,
      verificationDate: new Date(),
      verificationMethod: 'manual_review_required'
    };
  }
}

export default DocumentUploadService;