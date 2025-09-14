import MedicalDocument from '../models/MedicalDocument.js';
import DocumentUploadService from '../services/DocumentUploadService.js';
import AdvancedOCRService from '../services/ocr/AdvancedOCRService.js';
import AdvancedImageProcessingService from '../services/imageProcessing/AdvancedImageProcessingService.js';
import AppError from '../utils/AppError.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * @desc    Upload medical document
 * @route   POST /api/v1/medical-documents/upload
 * @access  Private
 */
export const uploadMedicalDocument = asyncHandler(async (req, res, next) => {
  const { documentType, title, description, tags, isPrivate = true } = req.body;

  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  if (!documentType || !title) {
    return next(new AppError('Document type and title are required', 400));
  }

  const userId = req.user._id;
  
  try {
    // Initialize services
    const uploadService = new DocumentUploadService();
    const ocrService = new AdvancedOCRService();
    const imageService = new AdvancedImageProcessingService();

    // Upload file to cloud storage first
    console.log('📤 Uploading document to cloud storage...');
    const uploadResult = await uploadService.uploadDocument(
      req.file,
      documentType,
      userId.toString()
    );

    // Create document record with upload details
    const document = new MedicalDocument({
      userId,
      documentType,
      title,
      description,
      originalFileName: req.file.originalname,
      fileUrl: uploadResult.fileUrl,
      publicId: uploadResult.publicId,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isPrivate,
      status: 'processing'
    });

    await document.save();

    // Start OCR processing in background
    processDocumentOCR(document._id, uploadResult.fileUrl, ocrService, imageService)
      .catch(error => {
        console.error(`❌ OCR processing failed for document ${document._id}:`, error);
        updateDocumentStatus(document._id, 'failed', error.message);
      });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully. Text extraction is in progress.',
      data: document
    });

  } catch (error) {
    console.error('❌ Document upload failed:', error);
    return next(new AppError(`Document upload failed: ${error.message}`, 500));
  }
});

/**
 * @desc    Get user's medical documents
 * @route   GET /api/v1/medical-documents
 * @access  Private
 */
export const getUserMedicalDocuments = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { 
    documentType, 
    tags, 
    status, 
    limit = 50, 
    page = 1,
    search,
    startDate,
    endDate,
    includeArchived = false
  } = req.query;

  try {
    let query = { userId };
    
    if (!includeArchived) {
      query.isArchived = false;
    }

    if (documentType) {
      query.documentType = documentType;
    }

    if (status) {
      query.status = status;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Date range filter
    if (startDate || endDate) {
      const dateQuery = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);
      
      query.$or = [
        { 'metadata.dateOfDocument': dateQuery },
        { createdAt: dateQuery }
      ];
    }

    let documents;

    if (search) {
      // Use text search
      documents = await MedicalDocument.searchDocuments(userId, search, {
        documentType,
        limit: parseInt(limit)
      });
    } else {
      // Regular query with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      documents = await MedicalDocument.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate('shareableWith.userId', 'email profile.firstName profile.lastName');
    }

    // Update last accessed for returned documents
    const documentIds = documents.map(doc => doc._id);
    await MedicalDocument.updateMany(
      { _id: { $in: documentIds } },
      { 
        $inc: { accessCount: 1 },
        $set: { lastAccessedAt: new Date() }
      }
    );

    // Get total count for pagination
    const totalCount = await MedicalDocument.countDocuments(query);

    res.status(200).json({
      success: true,
      count: documents.length,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      data: documents
    });

  } catch (error) {
    console.error('❌ Failed to fetch documents:', error);
    return next(new AppError('Failed to fetch documents', 500));
  }
});

/**
 * @desc    Get single medical document
 * @route   GET /api/v1/medical-documents/:id
 * @access  Private
 */
export const getMedicalDocument = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const document = await MedicalDocument.findOne({
      _id: id,
      $or: [
        { userId },
        { 'shareableWith.userId': userId }
      ]
    }).populate('shareableWith.userId', 'email profile.firstName profile.lastName');

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Update access tracking
    await document.updateLastAccessed();

    res.status(200).json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('❌ Failed to fetch document:', error);
    return next(new AppError('Failed to fetch document', 500));
  }
});

/**
 * @desc    Update medical document
 * @route   PUT /api/v1/medical-documents/:id
 * @access  Private
 */
export const updateMedicalDocument = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { title, description, tags, documentType, isPrivate, metadata } = req.body;

  try {
    const document = await MedicalDocument.findOne({ _id: id, userId });

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Update allowed fields
    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (documentType) document.documentType = documentType;
    if (isPrivate !== undefined) document.isPrivate = isPrivate;
    
    if (tags) {
      document.tags = tags.split(',').map(tag => tag.trim());
    }

    if (metadata) {
      document.metadata = { ...document.metadata, ...metadata };
    }

    await document.save();

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: document
    });

  } catch (error) {
    console.error('❌ Failed to update document:', error);
    return next(new AppError('Failed to update document', 500));
  }
});

/**
 * @desc    Delete medical document
 * @route   DELETE /api/v1/medical-documents/:id
 * @access  Private
 */
export const deleteMedicalDocument = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const document = await MedicalDocument.findOne({ _id: id, userId });

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Delete file from cloud storage
    const uploadService = new DocumentUploadService();
    try {
      await uploadService.deleteDocument(document.publicId);
    } catch (error) {
      console.warn('⚠️ Failed to delete file from cloud storage:', error.message);
      // Continue with database deletion even if cloud deletion fails
    }

    // Delete from database
    await MedicalDocument.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('❌ Failed to delete document:', error);
    return next(new AppError('Failed to delete document', 500));
  }
});

/**
 * @desc    Share medical document
 * @route   POST /api/v1/medical-documents/:id/share
 * @access  Private
 */
export const shareMedicalDocument = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { shareWithUserId, role, expiresAt } = req.body;

  if (!shareWithUserId || !role) {
    return next(new AppError('User ID and role are required for sharing', 400));
  }

  try {
    const document = await MedicalDocument.findOne({ _id: id, userId });

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Share the document
    await document.shareWith(shareWithUserId, role, expiresAt ? new Date(expiresAt) : null);

    res.status(200).json({
      success: true,
      message: 'Document shared successfully',
      data: document
    });

  } catch (error) {
    console.error('❌ Failed to share document:', error);
    return next(new AppError('Failed to share document', 500));
  }
});

/**
 * @desc    Revoke document sharing
 * @route   DELETE /api/v1/medical-documents/:id/share/:shareUserId
 * @access  Private
 */
export const revokeDocumentSharing = asyncHandler(async (req, res, next) => {
  const { id, shareUserId } = req.params;
  const userId = req.user._id;

  try {
    const document = await MedicalDocument.findOne({ _id: id, userId });

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    await document.revokeShare(shareUserId);

    res.status(200).json({
      success: true,
      message: 'Document sharing revoked successfully'
    });

  } catch (error) {
    console.error('❌ Failed to revoke sharing:', error);
    return next(new AppError('Failed to revoke sharing', 500));
  }
});

/**
 * @desc    Archive/Unarchive medical document
 * @route   PATCH /api/v1/medical-documents/:id/archive
 * @access  Private
 */
export const toggleDocumentArchive = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { archive } = req.body;

  try {
    const document = await MedicalDocument.findOne({ _id: id, userId });

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    if (archive) {
      await document.archive();
    } else {
      await document.unarchive();
    }

    res.status(200).json({
      success: true,
      message: `Document ${archive ? 'archived' : 'unarchived'} successfully`,
      data: document
    });

  } catch (error) {
    console.error('❌ Failed to toggle archive:', error);
    return next(new AppError('Failed to toggle archive status', 500));
  }
});

/**
 * @desc    Get user document statistics
 * @route   GET /api/v1/medical-documents/stats
 * @access  Private
 */
export const getUserDocumentStats = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  try {
    const stats = await MedicalDocument.getUserStats(userId);
    
    // Get document type breakdown
    const typeBreakdown = await MedicalDocument.aggregate([
      { $match: { userId, isArchived: false } },
      { $group: { _id: '$documentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: stats[0] || {
          totalDocuments: 0,
          archivedDocuments: 0,
          activeDocuments: 0,
          totalFileSize: 0,
          documentTypes: [],
          averageAccessCount: 0,
          lastUpload: null
        },
        typeBreakdown
      }
    });

  } catch (error) {
    console.error('❌ Failed to get document stats:', error);
    return next(new AppError('Failed to get document statistics', 500));
  }
});

/**
 * @desc    Re-extract text from document
 * @route   POST /api/v1/medical-documents/:id/re-extract
 * @access  Private
 */
export const reExtractDocumentText = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const document = await MedicalDocument.findOne({ _id: id, userId });

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Reset OCR status
    document.status = 'processing';
    document.extractedText = '';
    document.ocrMetadata = {};
    await document.save();

    // Start OCR processing
    const ocrService = new AdvancedOCRService();
    const imageService = new AdvancedImageProcessingService();

    processDocumentOCR(document._id, document.fileUrl, ocrService, imageService)
      .catch(error => {
        console.error(`❌ Re-extraction failed for document ${document._id}:`, error);
        updateDocumentStatus(document._id, 'failed', error.message);
      });

    res.status(200).json({
      success: true,
      message: 'Text re-extraction started. Please check back in a few moments.',
      data: document
    });

  } catch (error) {
    console.error('❌ Failed to start re-extraction:', error);
    return next(new AppError('Failed to start text re-extraction', 500));
  }
});

// Helper function to process OCR in background
async function processDocumentOCR(documentId, fileUrl, ocrService, imageService) {
  try {
    console.log(`🔍 Starting OCR processing for document ${documentId}...`);
    
    // Create a temporary file path for processing
    const tempDir = process.env.TEMP_DIR || './temp';
    const tempFileName = `temp_${documentId}_${Date.now()}.jpg`;
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
      // Download file to temporary location for processing
      // Note: This is a simplified approach. In production, you might want to
      // use a more robust file handling method
      console.log(`📥 Processing file for OCR: ${fileUrl}`);

      // For images and PDFs, extract text using OCR
      const ocrResult = await ocrService.extractPrescriptionText(fileUrl, {
        useMultipleModels: true,
        preprocessImage: true,
        enableFallback: true
      });

      console.log(`✅ OCR completed for document ${documentId}`);

      // Update document with extracted text
      await MedicalDocument.findByIdAndUpdate(documentId, {
        extractedText: ocrResult.text || '',
        status: 'completed',
        ocrMetadata: {
          engine: ocrResult.engine || 'gemini',
          confidence: ocrResult.confidence || 0,
          processingTime: ocrResult.processingTime || 0,
          model: ocrResult.modelUsed || ocrResult.primaryModel,
          extractionDate: new Date(),
          wordCount: ocrResult.text ? ocrResult.text.split(/\s+/).length : 0,
          language: 'en' // Default language
        }
      });

      console.log(`💾 Document ${documentId} updated with OCR results`);

    } catch (ocrError) {
      console.error(`❌ OCR processing failed for document ${documentId}:`, ocrError);
      await updateDocumentStatus(documentId, 'failed', `OCR failed: ${ocrError.message}`);
    }

  } catch (error) {
    console.error(`❌ Document processing failed for ${documentId}:`, error);
    await updateDocumentStatus(documentId, 'failed', error.message);
  }
}

// Helper function to update document status
async function updateDocumentStatus(documentId, status, errorMessage = null) {
  try {
    const updateData = { status };
    
    if (errorMessage) {
      updateData.$push = {
        processingErrors: {
          stage: 'ocr',
          error: errorMessage,
          timestamp: new Date()
        }
      };
    }

    await MedicalDocument.findByIdAndUpdate(documentId, updateData);
  } catch (error) {
    console.error(`Failed to update document status for ${documentId}:`, error);
  }
}
