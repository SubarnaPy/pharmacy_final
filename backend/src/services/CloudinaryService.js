import { v2 as cloudinary } from 'cloudinary';

/**
 * Cloudinary Service for managing file uploads
 * Handles images and PDFs with secure uploads and transformations
 */
class CloudinaryService {
  constructor() {
    // Configure Cloudinary
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    //   api_key: process.env.CLOUDINARY_API_KEY,
    //   api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    this.isConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (this.isConfigured) {
      console.log('✅ Cloudinary Service initialized');
    } else {
      console.warn('⚠️ Cloudinary not configured - file uploads will be stored locally');
    }
  }

  /**
   * Upload prescription image or PDF to Cloudinary
   * @param {string} filePath - Local file path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   */
  async uploadPrescription(filePath, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      console.log('☁️ Uploading prescription to Cloudinary...');

      const {
        userId,
        prescriptionId,
        isPublic = false
      } = options;

      // Generate unique public ID
      const timestamp = Date.now();
      const publicId = `prescriptions/${userId || 'anonymous'}/${prescriptionId || timestamp}`;

      // Determine resource type based on file extension
      const fileExtension = filePath.split('.').pop().toLowerCase();
      const resourceType = fileExtension === 'pdf' ? 'raw' : 'image';

      const uploadOptions = {
        public_id: publicId,
        resource_type: resourceType,
        folder: 'pharmacy-system/prescriptions',
        access_mode: isPublic ? 'public' : 'authenticated',
        tags: ['prescription', 'pharmacy-system'],
        context: {
          uploaded_by: userId || 'system',
          upload_timestamp: new Date().toISOString(),
          prescription_id: prescriptionId || 'unknown'
        }
      };

      // Add image-specific transformations
      if (resourceType === 'image') {
        uploadOptions.transformation = [
          {
            quality: 'auto:good',
            fetch_format: 'auto'
          },
          {
            width: 2000,
            height: 2000,
            crop: 'limit'
          }
        ];
      }

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      console.log('✅ Prescription uploaded to Cloudinary successfully');
      console.log('   📋 Public ID:', result.public_id);
      console.log('   🔗 Secure URL:', result.secure_url);
      console.log('   📊 File size:', Math.round(result.bytes / 1024), 'KB');

      return {
        success: true,
        cloudinaryId: result.public_id,
        url: result.secure_url,
        secureUrl: result.secure_url,
        resourceType: result.resource_type,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        createdAt: result.created_at,
        etag: result.etag,
        version: result.version,
        metadata: {
          originalFilename: result.original_filename,
          uploadedAt: new Date().toISOString(),
          tags: result.tags,
          context: result.context
        }
      };

    } catch (error) {
      console.error('❌ Cloudinary upload failed:', error.message);
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for secure access
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - URL options
   * @returns {string} - Signed URL
   */
  generateSignedUrl(publicId, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const {
        expiresAt = Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        transformation,
        resourceType = 'image'
      } = options;

      const signedUrl = cloudinary.utils.private_download_url(publicId, resourceType, {
        expires_at: expiresAt,
        transformation
      });

      return signedUrl;

    } catch (error) {
      console.error('❌ Failed to generate signed URL:', error.message);
      throw new Error(`Signed URL generation failed: ${error.message}`);
    }
  }

  /**
   * Delete prescription from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {string} resourceType - Resource type (image or raw)
   * @returns {Promise<Object>} - Deletion result
   */
  async deletePrescription(publicId, resourceType = 'image') {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      console.log('🗑️ Deleting prescription from Cloudinary...');

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });

      console.log('✅ Prescription deleted from Cloudinary');

      return {
        success: result.result === 'ok',
        result: result.result,
        publicId
      };

    } catch (error) {
      console.error('❌ Cloudinary deletion failed:', error.message);
      throw new Error(`Cloudinary deletion failed: ${error.message}`);
    }
  }

  /**
   * Get prescription metadata from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {string} resourceType - Resource type
   * @returns {Promise<Object>} - Resource metadata
   */
  async getPrescriptionMetadata(publicId, resourceType = 'image') {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });

      return {
        success: true,
        metadata: {
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          url: result.secure_url,
          createdAt: result.created_at,
          tags: result.tags,
          context: result.context
        }
      };

    } catch (error) {
      console.error('❌ Failed to get metadata:', error.message);
      throw new Error(`Metadata retrieval failed: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail for images
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - Thumbnail options
   * @returns {string} - Thumbnail URL
   */
  generateThumbnail(publicId, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const {
        width = 300,
        height = 300,
        crop = 'fill',
        quality = 'auto:good'
      } = options;

      return cloudinary.url(publicId, {
        transformation: [
          {
            width,
            height,
            crop,
            quality,
            fetch_format: 'auto'
          }
        ],
        secure: true
      });

    } catch (error) {
      console.error('❌ Failed to generate thumbnail:', error.message);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple prescriptions
   * @param {Array} filePaths - Array of file paths
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} - Array of upload results
   */
  async uploadMultiplePrescriptions(filePaths, options = {}) {
    try {
      console.log(`☁️ Uploading ${filePaths.length} prescriptions to Cloudinary...`);

      const uploadPromises = filePaths.map((filePath, index) => 
        this.uploadPrescription(filePath, {
          ...options,
          prescriptionId: `${options.prescriptionId || 'batch'}_${index + 1}`
        })
      );

      const results = await Promise.allSettled(uploadPromises);

      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

      console.log(`✅ Batch upload completed: ${successful.length}/${filePaths.length} successful`);

      return {
        successful,
        failed,
        totalCount: filePaths.length,
        successCount: successful.length,
        failureCount: failed.length
      };

    } catch (error) {
      console.error('❌ Batch upload failed:', error.message);
      throw new Error(`Batch upload failed: ${error.message}`);
    }
  }

  /**
   * Check if Cloudinary is properly configured
   * @returns {boolean} - Configuration status
   */
  isConfiguredProperly() {
    return this.isConfigured;
  }

  /**
   * Upload buffer to Cloudinary
   * @param {Buffer} buffer - File buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   */
  async uploadBuffer(buffer, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            ...options,
            secure: true
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      throw new Error(`Buffer upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteFile(publicId, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: options.resource_type || 'auto',
        ...options
      });

      return result;
    } catch (error) {
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Get resource details from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Resource details
   */
  async getResourceDetails(publicId, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('Cloudinary not configured');
      }

      const result = await cloudinary.api.resource(publicId, {
        resource_type: options.resource_type || 'auto',
        ...options
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to get resource details: ${error.message}`);
    }
  }

  /**
   * Test Cloudinary connection
   * @returns {Promise<boolean>} - Connection test result
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        return false;
      }

      // Test by getting account details
      await cloudinary.api.ping();
      console.log('✅ Cloudinary connection test successful');
      return true;

    } catch (error) {
      console.error('❌ Cloudinary connection test failed:', error.message);
      return false;
    }
  }
}

export default CloudinaryService;
