import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Attachment Handler
 * Handles attachment processing, validation, and management for email notifications
 */
class EmailAttachmentHandler {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.maxTotalSize = options.maxTotalSize || 25 * 1024 * 1024; // 25MB total
    this.allowedTypes = options.allowedTypes || [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    this.tempDir = options.tempDir || path.join(__dirname, '../../temp/attachments');
    this.securityScanEnabled = options.securityScanEnabled !== false;
    
    console.log('✅ Email Attachment Handler initialized');
  }

  /**
   * Process attachments for email notification
   * @param {Array} attachments - Array of attachment objects
   * @param {Object} context - Email context (user, notification type, etc.)
   * @returns {Array} Processed attachments ready for email
   */
  async processAttachments(attachments = [], context = {}) {
    const processedAttachments = [];
    let totalSize = 0;

    try {
      // Ensure temp directory exists
      await this.ensureTempDirectory();

      for (const attachment of attachments) {
        try {
          const processed = await this.processAttachment(attachment, context);
          
          if (processed) {
            // Check total size limit
            totalSize += processed.size || 0;
            if (totalSize > this.maxTotalSize) {
              console.warn(`Total attachment size exceeds limit: ${totalSize} bytes`);
              break;
            }
            
            processedAttachments.push(processed);
          }
        } catch (error) {
          console.error('Error processing attachment:', error);
          // Continue with other attachments
        }
      }

      return processedAttachments;
    } catch (error) {
      console.error('Error processing attachments:', error);
      return [];
    }
  }

  /**
   * Process individual attachment
   * @param {Object} attachment - Attachment object
   * @param {Object} context - Processing context
   * @returns {Object} Processed attachment
   */
  async processAttachment(attachment, context) {
    try {
      // Validate attachment structure
      if (!this.validateAttachmentStructure(attachment)) {
        throw new Error('Invalid attachment structure');
      }

      // Validate file type
      if (!this.validateFileType(attachment)) {
        throw new Error(`Unsupported file type: ${attachment.contentType}`);
      }

      // Validate file size
      if (!this.validateFileSize(attachment)) {
        throw new Error(`File size exceeds limit: ${attachment.size} bytes`);
      }

      // Security scan
      if (this.securityScanEnabled) {
        await this.performSecurityScan(attachment);
      }

      // Process based on attachment type
      let processedAttachment;
      
      if (attachment.type === 'prescription') {
        processedAttachment = await this.processPrescriptionAttachment(attachment, context);
      } else if (attachment.type === 'document') {
        processedAttachment = await this.processDocumentAttachment(attachment, context);
      } else if (attachment.type === 'receipt') {
        processedAttachment = await this.processReceiptAttachment(attachment, context);
      } else if (attachment.type === 'image') {
        processedAttachment = await this.processImageAttachment(attachment, context);
      } else {
        processedAttachment = await this.processGenericAttachment(attachment, context);
      }

      // Add metadata
      processedAttachment.processedAt = new Date().toISOString();
      processedAttachment.processedBy = 'EmailAttachmentHandler';
      processedAttachment.context = {
        userId: context.userId,
        notificationType: context.notificationType
      };

      return processedAttachment;
    } catch (error) {
      console.error('Error processing individual attachment:', error);
      return null;
    }
  }

  /**
   * Process prescription attachment
   * @param {Object} attachment - Prescription attachment
   * @param {Object} context - Processing context
   * @returns {Object} Processed prescription attachment
   */
  async processPrescriptionAttachment(attachment, context) {
    const processed = {
      filename: this.sanitizeFilename(attachment.filename || `prescription_${Date.now()}.pdf`),
      content: attachment.content,
      contentType: attachment.contentType || 'application/pdf',
      encoding: attachment.encoding || 'base64',
      size: this.calculateSize(attachment.content),
      type: 'prescription',
      metadata: {
        prescriptionId: attachment.prescriptionId,
        doctorId: attachment.doctorId,
        patientId: attachment.patientId,
        createdAt: attachment.createdAt,
        isConfidential: true,
        requiresSecureHandling: true
      }
    };

    // Add watermark for prescriptions if needed
    if (context.addWatermark) {
      processed.content = await this.addWatermark(processed.content, 'PRESCRIPTION - CONFIDENTIAL');
    }

    // Add digital signature verification if available
    if (attachment.digitalSignature) {
      processed.metadata.digitalSignature = {
        verified: await this.verifyDigitalSignature(attachment.digitalSignature),
        signedBy: attachment.digitalSignature.signedBy,
        signedAt: attachment.digitalSignature.signedAt
      };
    }

    return processed;
  }

  /**
   * Process document attachment
   * @param {Object} attachment - Document attachment
   * @param {Object} context - Processing context
   * @returns {Object} Processed document attachment
   */
  async processDocumentAttachment(attachment, context) {
    const processed = {
      filename: this.sanitizeFilename(attachment.filename),
      content: attachment.content,
      contentType: attachment.contentType,
      encoding: attachment.encoding || 'base64',
      size: this.calculateSize(attachment.content),
      type: 'document',
      metadata: {
        documentType: attachment.documentType,
        version: attachment.version || '1.0',
        isConfidential: attachment.isConfidential || false
      }
    };

    // Convert to PDF if needed for better compatibility
    if (this.shouldConvertToPDF(attachment.contentType)) {
      processed = await this.convertToPDF(processed);
    }

    return processed;
  }

  /**
   * Process receipt attachment
   * @param {Object} attachment - Receipt attachment
   * @param {Object} context - Processing context
   * @returns {Object} Processed receipt attachment
   */
  async processReceiptAttachment(attachment, context) {
    const processed = {
      filename: this.sanitizeFilename(attachment.filename || `receipt_${Date.now()}.pdf`),
      content: attachment.content,
      contentType: attachment.contentType || 'application/pdf',
      encoding: attachment.encoding || 'base64',
      size: this.calculateSize(attachment.content),
      type: 'receipt',
      metadata: {
        orderId: attachment.orderId,
        transactionId: attachment.transactionId,
        amount: attachment.amount,
        currency: attachment.currency || 'USD',
        isOfficial: true
      }
    };

    return processed;
  }

  /**
   * Process image attachment
   * @param {Object} attachment - Image attachment
   * @param {Object} context - Processing context
   * @returns {Object} Processed image attachment
   */
  async processImageAttachment(attachment, context) {
    const processed = {
      filename: this.sanitizeFilename(attachment.filename),
      content: attachment.content,
      contentType: attachment.contentType,
      encoding: attachment.encoding || 'base64',
      size: this.calculateSize(attachment.content),
      type: 'image',
      cid: attachment.cid || this.generateCID(), // For inline images
      metadata: {
        width: attachment.width,
        height: attachment.height,
        isInline: attachment.isInline || false
      }
    };

    // Optimize image if needed
    if (context.optimizeImages && processed.size > 1024 * 1024) { // 1MB
      processed.content = await this.optimizeImage(processed.content, processed.contentType);
      processed.size = this.calculateSize(processed.content);
      processed.metadata.optimized = true;
    }

    return processed;
  }

  /**
   * Process generic attachment
   * @param {Object} attachment - Generic attachment
   * @param {Object} context - Processing context
   * @returns {Object} Processed generic attachment
   */
  async processGenericAttachment(attachment, context) {
    return {
      filename: this.sanitizeFilename(attachment.filename),
      content: attachment.content,
      contentType: attachment.contentType,
      encoding: attachment.encoding || 'base64',
      size: this.calculateSize(attachment.content),
      type: 'generic',
      metadata: {
        originalType: attachment.type
      }
    };
  }

  /**
   * Validate attachment structure
   * @param {Object} attachment - Attachment to validate
   * @returns {boolean} Whether attachment is valid
   */
  validateAttachmentStructure(attachment) {
    if (!attachment || typeof attachment !== 'object') {
      return false;
    }

    // Required fields
    if (!attachment.filename && !attachment.content) {
      return false;
    }

    // Content validation
    if (!attachment.content || attachment.content.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Validate file type
   * @param {Object} attachment - Attachment to validate
   * @returns {boolean} Whether file type is allowed
   */
  validateFileType(attachment) {
    if (!attachment.contentType) {
      // Try to determine from filename
      const ext = path.extname(attachment.filename || '').toLowerCase();
      const typeMap = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
      attachment.contentType = typeMap[ext];
    }

    return this.allowedTypes.includes(attachment.contentType);
  }

  /**
   * Validate file size
   * @param {Object} attachment - Attachment to validate
   * @returns {boolean} Whether file size is acceptable
   */
  validateFileSize(attachment) {
    const size = this.calculateSize(attachment.content);
    return size <= this.maxFileSize;
  }

  /**
   * Perform security scan on attachment
   * @param {Object} attachment - Attachment to scan
   * @returns {boolean} Whether attachment passed security scan
   */
  async performSecurityScan(attachment) {
    try {
      // Basic security checks
      const content = attachment.content;
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
        /%3Cscript/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          throw new Error('Suspicious content detected in attachment');
        }
      }

      // Check file headers for PDF files
      if (attachment.contentType === 'application/pdf') {
        const buffer = Buffer.from(content, 'base64');
        if (!buffer.toString('ascii', 0, 4).includes('%PDF')) {
          throw new Error('Invalid PDF file header');
        }
      }

      // Check file headers for images
      if (attachment.contentType.startsWith('image/')) {
        const buffer = Buffer.from(content, 'base64');
        if (!this.validateImageHeader(buffer, attachment.contentType)) {
          throw new Error('Invalid image file header');
        }
      }

      return true;
    } catch (error) {
      console.error('Security scan failed:', error);
      throw error;
    }
  }

  /**
   * Validate image file header
   * @param {Buffer} buffer - File buffer
   * @param {string} contentType - Expected content type
   * @returns {boolean} Whether header is valid
   */
  validateImageHeader(buffer, contentType) {
    const headers = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46]
    };

    const expectedHeader = headers[contentType];
    if (!expectedHeader) return true; // Unknown type, skip validation

    for (let i = 0; i < expectedHeader.length; i++) {
      if (buffer[i] !== expectedHeader[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize filename
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    if (!filename) return `attachment_${Date.now()}`;
    
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100); // Limit length
  }

  /**
   * Calculate content size
   * @param {string} content - Base64 content
   * @returns {number} Size in bytes
   */
  calculateSize(content) {
    if (!content) return 0;
    
    // For base64, actual size is approximately 3/4 of the string length
    return Math.floor(content.length * 0.75);
  }

  /**
   * Generate Content-ID for inline images
   * @returns {string} Unique CID
   */
  generateCID() {
    return crypto.randomBytes(16).toString('hex') + '@healthcare.com';
  }

  /**
   * Check if file should be converted to PDF
   * @param {string} contentType - File content type
   * @returns {boolean} Whether conversion is needed
   */
  shouldConvertToPDF(contentType) {
    const convertibleTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    return convertibleTypes.includes(contentType);
  }

  /**
   * Convert document to PDF (placeholder implementation)
   * @param {Object} attachment - Attachment to convert
   * @returns {Object} Converted attachment
   */
  async convertToPDF(attachment) {
    // This would integrate with a PDF conversion service
    // For now, return as-is with a note
    console.log(`PDF conversion requested for ${attachment.filename}`);
    
    attachment.metadata = attachment.metadata || {};
    attachment.metadata.conversionRequested = true;
    attachment.metadata.originalContentType = attachment.contentType;
    
    return attachment;
  }

  /**
   * Add watermark to PDF (placeholder implementation)
   * @param {string} content - PDF content
   * @param {string} watermarkText - Watermark text
   * @returns {string} Watermarked content
   */
  async addWatermark(content, watermarkText) {
    // This would integrate with a PDF manipulation library
    console.log(`Watermark requested: ${watermarkText}`);
    return content;
  }

  /**
   * Verify digital signature (placeholder implementation)
   * @param {Object} signature - Digital signature object
   * @returns {boolean} Whether signature is valid
   */
  async verifyDigitalSignature(signature) {
    // This would integrate with a digital signature verification service
    console.log('Digital signature verification requested');
    return true;
  }

  /**
   * Optimize image (placeholder implementation)
   * @param {string} content - Image content
   * @param {string} contentType - Image content type
   * @returns {string} Optimized image content
   */
  async optimizeImage(content, contentType) {
    // This would integrate with an image optimization service
    console.log(`Image optimization requested for ${contentType}`);
    return content;
  }

  /**
   * Ensure temp directory exists
   */
  async ensureTempDirectory() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Clean up temporary files
   * @param {number} maxAge - Maximum age in milliseconds
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  /**
   * Get attachment statistics
   * @param {Array} attachments - Processed attachments
   * @returns {Object} Statistics
   */
  getAttachmentStats(attachments) {
    const stats = {
      totalCount: attachments.length,
      totalSize: 0,
      typeBreakdown: {},
      largestFile: null,
      hasConfidential: false
    };

    for (const attachment of attachments) {
      stats.totalSize += attachment.size || 0;
      
      const type = attachment.type || 'unknown';
      stats.typeBreakdown[type] = (stats.typeBreakdown[type] || 0) + 1;
      
      if (!stats.largestFile || attachment.size > stats.largestFile.size) {
        stats.largestFile = {
          filename: attachment.filename,
          size: attachment.size,
          type: attachment.type
        };
      }
      
      if (attachment.metadata?.isConfidential) {
        stats.hasConfidential = true;
      }
    }

    return stats;
  }
}

export { EmailAttachmentHandler };
export default EmailAttachmentHandler;