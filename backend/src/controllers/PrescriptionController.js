

import PrescriptionProcessingService from '../services/PrescriptionProcessingService.js';
import CloudinaryService from '../services/CloudinaryService.js';
import PDFProcessingService from '../services/PDFProcessingService.js';
import PrescriptionRequestMatchingService from '../services/PrescriptionRequestMatchingService.js';
import Prescription from '../models/Prescription.js';
import PrescriptionRequest from '../models/PrescriptionRequest.js';
import UserNotificationService from '../services/UserNotificationService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import SafeNotificationServiceFactory from '../services/SafeNotificationServiceFactory.js';

/**
 * Advanced Prescription Controller
 * Handles all prescription-related operations with advanced OCR and AI processing
 */
class PrescriptionController {
  constructor() {
    this.processingService = new PrescriptionProcessingService();
    this.cloudinaryService = new CloudinaryService();
    this.pdfProcessingService = new PDFProcessingService();
    this.prescriptionRequestMatchingService = new PrescriptionRequestMatchingService();
    this.notificationService = null; // Will be initialized when needed
    
    // Configure multer for file uploads
    this.upload = multer({
      dest: 'uploads/prescriptions/',
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit (increased for PDFs)
        files: 5 // Maximum 5 files
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  /**
   * Get notification service instance safely
   */
  async getNotificationService() {
    if (!this.notificationService) {
      this.notificationService = await SafeNotificationServiceFactory.getService('PrescriptionController');
    }
    return this.notificationService;
  }

  /**
   * File filter for multer
   * @param {Object} req - Express request
   * @param {Object} file - Uploaded file
   * @param {Function} cb - Callback function
   */
  fileFilter(req, file, cb) {
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'image/tiff', 
      'image/bmp', 
      'image/webp',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, TIFF, BMP, WEBP, and PDF files are allowed.'), false);
    }
  }

  /**
   * Process a single prescription image or PDF
   * POST /api/prescriptions/process
   */
  async processSinglePrescription(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          code: 'NO_FILE'
        });
      }

      const options = {
        skipImageProcessing: req.body.skipImageProcessing === 'true',
        useMultipleOCREngines: req.body.useMultipleOCREngines !== 'false',
        validateMedications: req.body.validateMedications !== 'false',
        checkInteractions: req.body.checkInteractions !== 'false',
        detectAnomalies: req.body.detectAnomalies !== 'false',
        generateReport: req.body.generateReport !== 'false',
        confidenceThreshold: parseFloat(req.body.confidenceThreshold) || 0.7,
        uploadToCloudinary: req.body.uploadToCloudinary !== 'false'
      };

      let processedFilePath = req.file.path;
      let pdfProcessingResult = null;
      let cloudinaryResult = null;

      // Handle PDF files
      if (req.file.mimetype === 'application/pdf') {
        // Validate PDF
        const pdfValidation = await this.pdfProcessingService.validatePDF(req.file.path);
        if (!pdfValidation.isValid) {
          await this.cleanupFile(req.file.path);
          return res.status(400).json({
            success: false,
            error: 'Invalid PDF file',
            details: pdfValidation.error,
            code: 'INVALID_PDF'
          });
        }

        // Process PDF
        pdfProcessingResult = await this.pdfProcessingService.processPrescriptionPDF(req.file.path, {
          extractText: true,
          convertToImages: true,
          maxPages: 5,
          preferTextExtraction: true
        });

        // Use the first converted image for OCR processing if available
        if (pdfProcessingResult.imageConversion && 
            pdfProcessingResult.imageConversion.pages && 
            pdfProcessingResult.imageConversion.pages.length > 0) {
          processedFilePath = pdfProcessingResult.imageConversion.pages[0].imagePath;
        }
      }

      // Upload original file to Cloudinary
      if (options.uploadToCloudinary && this.cloudinaryService.isConfiguredProperly()) {
        try {
          cloudinaryResult = await this.cloudinaryService.uploadPrescription(req.file.path, {
            userId: req.user?.id,
            prescriptionId: `${Date.now()}_${req.file.originalname}`,
            isPublic: false
          });
        } catch (cloudinaryError) {
          // Continue processing even if Cloudinary fails
        }
      }

      // Process the prescription (image or converted PDF)
      const result = await this.processingService.processPrescription(processedFilePath, options);

      // Add PDF and Cloudinary results to the main result
      result.pdfProcessing = pdfProcessingResult;
      result.cloudinaryUpload = cloudinaryResult;
      result.originalFile = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      };

      // Store processing result in database (if needed)
      if (req.body.saveToDatabase !== 'false') {
        await this.savePrescriptionProcessing(req.user?.id, result);
      }

      // Clean up temporary files
      setTimeout(async () => {
        await this.cleanupFile(req.file.path);
        
        // Clean up PDF processing files if any
        if (pdfProcessingResult?.imageConversion?.outputDirectory) {
          await this.pdfProcessingService.cleanupPDFFiles(
            pdfProcessingResult.imageConversion.outputDirectory
          );
        }
      }, 5000);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Prescription processed successfully'
      });

    } catch (error) {
      // Clean up uploaded file on error
      if (req.file?.path) {
        await this.cleanupFile(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: 'Prescription processing failed',
        details: error.message,
        code: 'PROCESSING_ERROR'
      });
    }
  }

  /**
   * Process prescription and create prescription request for pharmacy matching
   * POST /api/prescriptions/process-and-request
   */
  async processPrescriptionAndCreateRequest(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          code: 'NO_FILE'
        });
      }

      // Get patient location from request body
      const { latitude, longitude } = req.body;
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Patient location (latitude, longitude) is required',
          code: 'LOCATION_REQUIRED'
        });
      }

      const patientLocation = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };

      // First, process the prescription using existing logic
      const options = {
        skipImageProcessing: req.body.skipImageProcessing === 'true',
        useMultipleOCREngines: req.body.useMultipleOCREngines !== 'false',
        validateMedications: req.body.validateMedications !== 'false',
        checkInteractions: req.body.checkInteractions !== 'false',
        detectAnomalies: req.body.detectAnomalies !== 'false',
        generateReport: req.body.generateReport !== 'false',
        confidenceThreshold: parseFloat(req.body.confidenceThreshold) || 0.7,
        saveToDatabase: true // Always save for prescription requests
      };

      let result = {};
      let pdfProcessingResult = null;

      // Handle PDF files
      if (req.file.mimetype === 'application/pdf') {
        pdfProcessingResult = await this.pdfProcessingService.processPDF(req.file.path, options);
        result = pdfProcessingResult.geminiProcessingResult;
      } else {
        // Process image directly
        result = await this.processingService.processPrescription(req.file.path, options);
      }

      // Save prescription processing result
      const savedPrescription = await this.savePrescriptionProcessing(req.user?.id, result);
      
      // Create a comprehensive prescription object for request creation
      const prescriptionForRequest = savedPrescription || {
        _id: `temp_${Date.now()}`,
        medications: result.ai?.geminiResults?.analysis?.medications || 
                    result.ai?.medications?.medications || // From legacy processing
                    result.ai?.parsed?.medications || // Alternative structure
                    result.geminiResults?.analysis?.medications || // Direct gemini access
                    [],
        doctor: result.ai?.geminiResults?.analysis?.prescriberInfo || result.geminiResults?.analysis?.prescriberInfo || {},
        patientInfo: result.ai?.geminiResults?.analysis?.patientInfo || result.geminiResults?.analysis?.patientInfo || {},
        
        // File information
        prescriptionImage: result.cloudinaryUpload?.secure_url || '',
        cloudinaryId: result.cloudinaryUpload?.public_id || '',
        originalFilename: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        
        // AI processing results
        aiProcessing: {
          medicationsFound: result.ai?.geminiResults?.analysis?.medications?.length || 0,
          validMedications: result.ai?.geminiResults?.analysis?.medications?.filter(m => m.confidence > 0.7)?.length || 0,
          unknownMedications: result.ai?.geminiResults?.analysis?.medications?.filter(m => m.confidence <= 0.7)?.length || 0,
          hasInteractions: result.ai?.geminiResults?.interactions?.interactions?.length > 0 || false,
          hasAnomalies: false,
          overallConfidence: result.ai?.geminiResults?.overallMetrics?.overallConfidence || result.confidence || 0,
          qualityLevel: result.ai?.geminiResults?.overallMetrics?.processingQuality > 0.8 ? 'high' : 
                       result.ai?.geminiResults?.overallMetrics?.processingQuality > 0.6 ? 'medium' : 'low',
          geminiResults: result.ai?.geminiResults || {},
          processingMethod: 'gemini_2.5_flash_enhanced'
        },
        
        // Drug interactions
        drugInteractions: result.ai?.geminiResults?.interactions?.interactions || [],
        
        // Risk assessment
        riskAssessment: result.ai?.geminiResults?.riskAssessment?.riskAssessment || {
          riskLevel: 'moderate',
          riskFactors: [],
          warnings: [],
          recommendations: []
        },
        
        // OCR data
        ocrData: {
          engine: result.ocrResults?.engine || 'tesseract',
          confidence: result.ocrResults?.confidence || 0,
          rawText: result.ocrResults?.text || '',
          textLength: result.ocrResults?.text?.length || 0,
          wordsFound: result.ocrResults?.words?.length || 0,
          linesFound: result.ocrResults?.lines?.length || 0
        },
        
        // Processing metadata
        processingId: result.processingId || `PROC_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        processingTime: result.processingTime || 0,
        processingStatus: 'completed'
      };

      // Create prescription request and find matching pharmacies
      const prescriptionRequestResult = await this.prescriptionRequestMatchingService
        .createPrescriptionRequestFromUpload(
          prescriptionForRequest,
          req.user.id,
          patientLocation
        );

      // Ensure prescriptionRequestResult has the expected structure
      const safeResult = {
        prescriptionRequest: prescriptionRequestResult?.prescriptionRequest || null,
        matchingPharmacies: prescriptionRequestResult?.matchingPharmacies || [],
        totalPharmaciesFound: prescriptionRequestResult?.totalPharmaciesFound || 0
      };

      // Send notifications about prescription creation
      if (safeResult.prescriptionRequest) {
        try {
          // Notify patient about successful prescription processing
          await UserNotificationService.sendPrescriptionUploaded(
            safeResult.prescriptionRequest._id,
            req.user.id
          );

          // Notify matching pharmacies about new prescription request
          if (safeResult.matchingPharmacies && safeResult.matchingPharmacies.length > 0) {
            for (const pharmacy of safeResult.matchingPharmacies) {
              await UserNotificationService.sendNewPrescriptionToPharmacy(
                safeResult.prescriptionRequest._id,
                pharmacy.owner, // Use pharmacy.owner which is the User ObjectId
                req.user.name || 'Patient'
              );
            }
          }
        } catch (notificationError) {
          // Silently fail notification sending
        }
      }

      // Clean up temporary files
      setTimeout(async () => {
        await this.cleanupFile(req.file.path);
        if (pdfProcessingResult?.imageConversion?.outputDirectory) {
          await this.pdfProcessingService.cleanupPDFFiles(
            pdfProcessingResult.imageConversion.outputDirectory
          );
        }
      }, 5000);

      res.status(200).json({
        success: true,
        message: 'Prescription processed and request created successfully',
        data: {
          processingResult: {
            ...result,
            originalFile: {
              filename: req.file.filename,
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size
            }
          },
          prescriptionRequest: safeResult.prescriptionRequest,
          matchingPharmacies: safeResult.matchingPharmacies,
          totalPharmaciesFound: safeResult.totalPharmaciesFound,
          canProceedToSubmit: safeResult.matchingPharmacies.length > 0
        }
      });

    } catch (error) {
      // Clean up uploaded file on error
      if (req.file?.path) {
        await this.cleanupFile(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process prescription and create request',
        details: error.message,
        code: 'PROCESSING_REQUEST_ERROR'
      });
    }
  }

  /**
   * Submit prescription request to matching pharmacies
   * POST /api/prescriptions/requests/:requestId/submit
   */
  async submitPrescriptionRequest(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;

      // Verify the user owns this prescription request
      const prescriptionRequest = await PrescriptionRequest.findById(requestId);
      if (!prescriptionRequest) {
        return res.status(404).json({
          success: false,
          error: 'Prescription request not found',
          code: 'REQUEST_NOT_FOUND'
        });
      }

      if (prescriptionRequest.patient.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to submit this prescription request',
          code: 'UNAUTHORIZED'
        });
      }

      // Submit to pharmacies
      const submissionResult = await this.prescriptionRequestMatchingService
        .submitToPharmacies(requestId);

      res.status(200).json({
        success: true,
        message: `Prescription request submitted to ${submissionResult.successCount} pharmacies`,
        data: {
          prescriptionRequest: submissionResult.prescriptionRequest,
          notificationResults: submissionResult.notificationResults,
          successCount: submissionResult.successCount,
          failureCount: submissionResult.failureCount
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to submit prescription request',
        details: error.message,
        code: 'SUBMISSION_ERROR'
      });
    }
  }

  /**
   * Process multiple prescription images in batch
   * POST /api/prescriptions/process-batch
   */
  async processBatchPrescriptions(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
          code: 'NO_FILES'
        });
      }

      const options = {
        skipImageProcessing: req.body.skipImageProcessing === 'true',
        useMultipleOCREngines: req.body.useMultipleOCREngines !== 'false',
        validateMedications: req.body.validateMedications !== 'false',
        checkInteractions: req.body.checkInteractions !== 'false',
        detectAnomalies: req.body.detectAnomalies !== 'false',
        generateReport: req.body.generateReport !== 'false',
        confidenceThreshold: parseFloat(req.body.confidenceThreshold) || 0.7,
        concurrency: parseInt(req.body.concurrency) || 3,
        failFast: req.body.failFast === 'true'
      };

      const imagePaths = req.files.map(file => file.path);
      const result = await this.processingService.processBatchPrescriptions(imagePaths, options);

      // Store batch processing result in database (if needed)
      if (req.body.saveToDatabase !== 'false') {
        await this.saveBatchProcessing(req.user?.id, result);
      }

      // Clean up uploaded files
      setTimeout(async () => {
        for (const filePath of imagePaths) {
          try {
            await fs.unlink(filePath);
          } catch (error) {
            // Silently fail
          }
        }
      }, 10000);

      res.status(200).json({
        success: true,
        data: result,
        message: `Batch processing completed. ${result.successful}/${result.totalProcessed} successful`
      });

    } catch (error) {
      // Clean up uploaded files on error
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (cleanupError) {
            // Silently fail
          }
        }
      }

      res.status(500).json({
        success: false,
        error: 'Batch prescription processing failed',
        details: error.message,
        code: 'BATCH_PROCESSING_ERROR'
      });
    }
  }

  /**
   * Get prescription processing history
   * GET /api/prescriptions/history
   */
  async getProcessingHistory(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const userId = req.user?.id;

      // Build query filters
      const filters = {};
      if (userId) filters.userId = userId;
      if (status) filters.status = status;
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      // This would typically query a database
      // For now, returning mock data structure
      const history = {
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: 0,
        data: []
      };

      res.status(200).json({
        success: true,
        data: history,
        message: 'Processing history retrieved successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve processing history',
        details: error.message,
        code: 'HISTORY_ERROR'
      });
    }
  }

  /**
   * Get specific prescription processing result
   * GET /api/prescriptions/:processingId
   */
  async getProcessingResult(req, res) {
    try {
      const { processingId } = req.params;
      
      if (!processingId) {
        return res.status(400).json({
          success: false,
          error: 'Processing ID is required',
          code: 'MISSING_PROCESSING_ID'
        });
      }

      // This would typically query a database
      // For now, returning mock response
      const result = null;

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Processing result not found',
          code: 'RESULT_NOT_FOUND'
        });
      }

      res.status(200).json({
        success: true,
        data: result,
        message: 'Processing result retrieved successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve processing result',
        details: error.message,
        code: 'RESULT_ERROR'
      });
    }
  }

  /**
   * Reprocess a prescription with different options
   * POST /api/prescriptions/:processingId/reprocess
   */
  async reprocessPrescription(req, res) {
    try {
      const { processingId } = req.params;
      
      // This would typically get the original image from database
      // and reprocess it with new options
      
      res.status(501).json({
        success: false,
        error: 'Reprocessing functionality not yet implemented',
        code: 'NOT_IMPLEMENTED'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to reprocess prescription',
        details: error.message,
        code: 'REPROCESS_ERROR'
      });
    }
  }

  /**
   * Get processing statistics
   * GET /api/prescriptions/stats
   */
  async getProcessingStats(req, res) {
    try {
      const stats = this.processingService.getProcessingStats();
      
      // Add additional statistics if needed
      const enhancedStats = {
        ...stats,
        systemStatus: 'operational',
        lastProcessingAt: new Date().toISOString(),
        servicesStatus: {
          ocr: 'operational',
          ai: 'operational',
          imageProcessing: 'operational'
        }
      };

      res.status(200).json({
        success: true,
        data: enhancedStats,
        message: 'Processing statistics retrieved successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve processing statistics',
        details: error.message,
        code: 'STATS_ERROR'
      });
    }
  }

  /**
   * Validate prescription data manually
   * POST /api/prescriptions/:processingId/validate
   */
  async validatePrescription(req, res) {
    try {
      const { processingId } = req.params;
      const { validation, comments } = req.body;
      
      if (!validation || !['approved', 'rejected', 'needs_review'].includes(validation)) {
        return res.status(400).json({
          success: false,
          error: 'Valid validation status is required (approved, rejected, needs_review)',
          code: 'INVALID_VALIDATION'
        });
      }

      // This would typically update the database record
      const result = {
        processingId,
        validation,
        comments,
        validatedBy: req.user?.id,
        validatedAt: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: result,
        message: 'Prescription validation updated successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to validate prescription',
        details: error.message,
        code: 'VALIDATION_ERROR'
      });
    }
  }


  /**
   * Clean up a file safely
   * @param {string} filePath - Path to file to clean up
   */
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Save prescription processing result to database
   * @param {string} userId - User ID  
   * @param {Object} result - Processing result from Gemini AI
   */
  async savePrescriptionProcessing(userId, result) {
    try {
      // Extract medication information from Gemini AI results
      const medications = [];
      let doctorInfo = {};
      let patientInfo = {};
      let drugInteractions = [];
      let dosageValidations = [];
      let riskAssessment = {};
      
      // Extract from Gemini AI results if available
      if (result.ai) {
        const geminiData = result.ai;
        
        // Extract medications from the CORRECT path based on actual data structure
        let extractedMedications = [];
        
        // Try new structure first: geminiData.medications.medications
        if (geminiData.medications?.medications && Array.isArray(geminiData.medications.medications)) {
          extractedMedications = geminiData.medications.medications;
        }
        // Try parsed structure: geminiData.parsed.medications
        else if (geminiData.parsed?.medications && Array.isArray(geminiData.parsed.medications)) {
          extractedMedications = geminiData.parsed.medications;
        }
        // Fallback to old structure: geminiData.geminiResults.analysis.medications
        else if (geminiData.geminiResults?.analysis?.medications && Array.isArray(geminiData.geminiResults.analysis.medications)) {
          extractedMedications = geminiData.geminiResults.analysis.medications;
        }
        
        if (extractedMedications.length > 0) {
          medications.push(...extractedMedications.map(med => ({
            name: med.name || med.genericName || med.medication || 'Unknown',
            genericName: med.genericName || med.generic || '',
            brandName: med.brandName || med.brand || '',
            dosage: med.dosage || med.dose || '',
            strength: med.strength || '',
            frequency: med.frequency || '',
            route: med.route || 'Oral',
            duration: med.duration || '',
            instructions: med.instructions || med.direction || '',
            indication: med.indication || '',
            confidence: med.confidence || 0
          })));
        } else {
          // Check if medications are in enhancedAnalysis.geminiAnalysis.medications
          if (geminiData.enhancedAnalysis?.geminiAnalysis?.medications && geminiData.enhancedAnalysis.geminiAnalysis.medications.length > 0) {
            medications.push(...geminiData.enhancedAnalysis.geminiAnalysis.medications.map(med => ({
              name: med.name || med.genericName || 'Unknown',
              genericName: med.genericName || '',
              brandName: med.brandName || '',
              dosage: med.dosage || '',
              strength: med.strength || '',
              frequency: med.frequency || '',
              route: med.route || 'Oral',
              duration: med.duration || '',
              instructions: med.instructions || '',
              indication: med.indication || '',
              confidence: med.confidence || 0
            })));
          }
          // Check if medications are at root level
          else if (geminiData.medications && geminiData.medications.length > 0) {
            medications.push(...geminiData.medications.map(med => ({
              name: med.name || med.genericName || 'Unknown',
              genericName: med.genericName || '',
              brandName: med.brandName || '',
              dosage: med.dosage || '',
              strength: med.strength || '',
              frequency: med.frequency || '',
              route: med.route || 'Oral',
              duration: med.duration || '',
              instructions: med.instructions || '',
              indication: med.indication || '',
              confidence: med.confidence || 0
            })));
          }
        }
        
        // Extract doctor info from analysis - correct path
        if (geminiData.geminiResults?.analysis?.prescriberInfo) {
          const prescriber = geminiData.geminiResults.analysis.prescriberInfo;
          doctorInfo = {
            name: prescriber.name || '',
            title: prescriber.title || '',
            license: prescriber.license || '',
            hospital: prescriber.hospital || '',
            contact: prescriber.contact || '',
            registrationNumber: prescriber.license || '',
            signature: prescriber.signature || false
          };
        }
        // Check alternative path for doctor info
        else if (geminiData.enhancedAnalysis?.geminiAnalysis?.prescriberInfo) {
          const prescriber = geminiData.enhancedAnalysis.geminiAnalysis.prescriberInfo;
          doctorInfo = {
            name: prescriber.name || '',
            title: prescriber.title || '',
            license: prescriber.license || '',
            hospital: prescriber.hospital || '',
            contact: prescriber.contact || '',
            registrationNumber: prescriber.license || '',
            signature: prescriber.signature || false
          };
        }
        
        // Extract patient info from analysis - correct path
        if (geminiData.geminiResults?.analysis?.patientInfo) {
          const patient = geminiData.geminiResults.analysis.patientInfo;
          patientInfo = {
            name: patient.name || '',
            age: patient.age || '',
            gender: patient.gender || '',
            weight: patient.weight || '',
            allergies: patient.allergies || [],
            medicalHistory: patient.medicalHistory || []
          };
        }
        // Check alternative path for patient info
        else if (geminiData.enhancedAnalysis?.geminiAnalysis?.patientInfo) {
          const patient = geminiData.enhancedAnalysis.geminiAnalysis.patientInfo;
          patientInfo = {
            name: patient.name || '',
            age: patient.age || '',
            gender: patient.gender || '',
            weight: patient.weight || '',
            allergies: patient.allergies || [],
            medicalHistory: patient.medicalHistory || []
          };
        }
        
        // Extract drug interactions - correct path
        if (geminiData.geminiResults?.interactions?.interactions) {
          drugInteractions = geminiData.geminiResults.interactions.interactions.map(interaction => ({
            medications: interaction.medications || [],
            severity: interaction.severity || 'unknown',
            clinicalEffect: interaction.clinicalEffect || '',
            management: interaction.management || '',
            confidence: interaction.confidence || 0
          }));
        }
        
        // Extract dosage validations - correct path
        if (geminiData.geminiResults?.dosageValidation?.validations) {
          dosageValidations = geminiData.geminiResults.dosageValidation.validations.map(validation => ({
            medication: validation.medication || '',
            isAppropriate: validation.isAppropriate || false,
            warnings: validation.warnings || [],
            adjustmentNeeded: validation.adjustmentNeeded || false,
            confidence: validation.confidence || 0
          }));
        }
        
        // Extract risk assessment - correct path
        if (geminiData.geminiResults?.riskAssessment?.riskAssessment) {
          const riskData = geminiData.geminiResults.riskAssessment.riskAssessment;
          riskAssessment = {
            riskLevel: this.normalizeRiskLevel(riskData.riskLevel),
            riskFactors: this.extractRiskFactorStrings(riskData.riskFactors),
            warnings: this.extractWarningStrings(riskData.warnings),
            recommendations: this.extractRecommendationStrings(riskData.recommendations)
          };
        }
        // Check alternative path for risk assessment
        else if (geminiData.geminiResults?.analysis?.riskAssessment) {
          const riskData = geminiData.geminiResults.analysis.riskAssessment;
          riskAssessment = {
            riskLevel: this.normalizeRiskLevel(riskData.riskLevel),
            riskFactors: this.extractRiskFactorStrings(riskData.riskFactors),
            warnings: this.extractWarningStrings(riskData.warnings),
            recommendations: this.extractRecommendationStrings(riskData.recommendations)
          };
        }
        // Default risk assessment if not found
        else {
          riskAssessment = {
            riskLevel: 'moderate',
            riskFactors: [],
            warnings: [],
            recommendations: []
          };
        }
      }

      // Prepare prescription data for database
      const prescriptionData = {
        user: userId,
        medicine: medications.length > 0 ? medications[0].name : 'Unknown',
        medications: medications, // Store all medications
        patientInfo: patientInfo,
        pharmacy: '',
        status: 'active',
        
        // Doctor information
        doctor: doctorInfo,
        
        // Processing details 
        dosage: medications.length > 0 ? medications[0].dosage : '',
        notes: result.ai?.geminiResults?.recommendations ? 
          JSON.stringify(result.ai.geminiResults.recommendations).substring(0, 500) : '',
        
        // File information
        prescriptionImage: result.cloudinaryUpload?.secure_url || '',
        cloudinaryId: result.cloudinaryUpload?.public_id || '',
        originalFilename: result.originalFile?.originalname || '',
        fileType: result.originalFile?.mimetype || '',
        fileSize: result.originalFile?.size || 0,
        
        // OCR data
        ocrData: {
          engine: result.ocrResults?.engine || 'tesseract',
          confidence: result.ocrResults?.confidence || 0,
          rawText: result.ocrResults?.text || '',
          textLength: result.ocrResults?.text?.length || 0,
          wordsFound: result.ocrResults?.words?.length || 0,
          linesFound: result.ocrResults?.lines?.length || 0
        },
        
        // Enhanced AI processing results
        aiProcessing: {
          medicationsFound: medications.length,
          validMedications: medications.filter(m => m.confidence > 0.7).length,
          unknownMedications: medications.filter(m => m.confidence <= 0.7).length,
          hasInteractions: drugInteractions.length > 0,
          hasAnomalies: riskAssessment.riskLevel === 'high' || riskAssessment.riskLevel === 'critical',
          overallConfidence: result.ai?.geminiResults?.overallMetrics?.overallConfidence || result.confidence || 0,
          qualityLevel: result.ai?.geminiResults?.overallMetrics?.processingQuality > 0.8 ? 'high' : 
                       result.ai?.geminiResults?.overallMetrics?.processingQuality > 0.6 ? 'medium' : 'low',
          
          // Complete Gemini AI data storage
          geminiResults: result.ai?.geminiResults || {},
          geminiRawResponse: result.ai?.rawResponse || result.ai || {},
          
          // Processing metadata
          processingMethod: result.processingMethod || 'gemini_2.5_flash_enhanced',
          processingSteps: result.processingSteps || ['ocr', 'gemini_analysis', 'data_extraction'],
          enhancementApplied: result.textEnhanced || false,
          
          // Complete structured extraction results
          extractedStructuredData: {
            // Complete medication analysis
            medications: medications.map(med => ({
              name: med.name,
              genericName: med.genericName,
              brandName: med.brandName,
              dosage: med.dosage,
              strength: med.strength,
              frequency: med.frequency,
              route: med.route,
              duration: med.duration,
              instructions: med.instructions,
              indication: med.indication,
              confidence: med.confidence,
              alternatives: med.alternatives || [],
              contraindications: med.contraindications || []
            })),
            
            // Complete prescriber information
            prescriberInfo: {
              name: doctorInfo.name || '',
              title: doctorInfo.title || '',
              qualifications: doctorInfo.qualifications || (doctorInfo.title ? [doctorInfo.title] : []),
              registrationNumber: doctorInfo.registrationNumber || '',
              license: doctorInfo.license || '',
              contact: doctorInfo.contact || '',
              email: doctorInfo.email || '',
              hospital: doctorInfo.hospital || '',
              address: doctorInfo.address || '',
              signature: doctorInfo.signature || false,
              signatureImage: doctorInfo.signatureImage || ''
            },
            
            // Complete patient information
            patientInfo: {
              name: patientInfo.name || '',
              age: patientInfo.age || '',
              gender: patientInfo.gender || '',
              weight: patientInfo.weight || '',
              height: patientInfo.height || '',
              allergies: patientInfo.allergies || [],
              medicalHistory: patientInfo.medicalHistory || [],
              currentConditions: patientInfo.currentConditions || [],
              emergencyContact: patientInfo.emergencyContact || '',
              insuranceInfo: patientInfo.insuranceInfo || ''
            },
            
            // Quality and validation metrics from Gemini
            qualityMetrics: {
              clarity: result.ai?.geminiResults?.analysis?.qualityMetrics?.clarity || 0,
              completeness: result.ai?.geminiResults?.analysis?.qualityMetrics?.completeness || 0,
              legibility: result.ai?.geminiResults?.analysis?.qualityMetrics?.legibility || 0,
              overallQuality: result.ai?.geminiResults?.analysis?.qualityMetrics?.overallQuality || 0,
              ambiguousFields: result.ai?.geminiResults?.analysis?.qualityMetrics?.ambiguousFields || [],
              missingFields: result.ai?.geminiResults?.analysis?.qualityMetrics?.missingFields || [],
              warningFlags: result.ai?.geminiResults?.analysis?.qualityMetrics?.warningFlags || []
            }
          },
          
          // Enhanced drug interactions
          drugInteractions: drugInteractions.map(interaction => ({
            medications: interaction.medications || [],
            severity: interaction.severity || 'unknown',
            interactionType: interaction.interactionType || interaction.type || 'unknown',
            clinicalEffect: interaction.clinicalEffect || '',
            mechanism: interaction.mechanism || '',
            management: interaction.management || '',
            monitoring: interaction.monitoring || '',
            confidence: interaction.confidence || 0
          })),
          
          // Enhanced dosage validations
          dosageValidations: dosageValidations.map(validation => ({
            medication: validation.medication || '',
            prescribedDose: validation.prescribedDose || validation.dosage || '',
            standardDose: validation.standardDose || '',
            isAppropriate: validation.isAppropriate || false,
            ageAppropriate: validation.ageAppropriate !== undefined ? validation.ageAppropriate : true,
            weightAppropriate: validation.weightAppropriate !== undefined ? validation.weightAppropriate : true,
            indicationAppropriate: validation.indicationAppropriate !== undefined ? validation.indicationAppropriate : true,
            warnings: validation.warnings || [],
            adjustmentNeeded: validation.adjustmentNeeded || false,
            adjustmentReason: validation.adjustmentReason || '',
            confidence: validation.confidence || 0
          })),
          
          // Enhanced risk assessment with complete Gemini structure
          riskAssessment: {
            overallRiskLevel: this.normalizeRiskLevel(riskAssessment.overallRiskLevel || riskAssessment.riskLevel),
            summary: riskAssessment.summary || '',
            patientSafetyRisks: this.extractRiskArray(riskAssessment.patientSafetyRisks),
            prescriptionQualityRisks: this.extractRiskArray(riskAssessment.prescriptionQualityRisks),
            clinicalRisks: this.extractRiskArray(riskAssessment.clinicalRisks),
            regulatoryLegalRisks: this.extractRiskArray(riskAssessment.regulatoryLegalRisks),
            riskStratification: riskAssessment.riskStratification || riskAssessment.overallRiskLevel || 'moderate',
            recommendations: {
              immediateSafetyInterventions: this.extractRecommendationStrings(riskAssessment.recommendations?.immediateSafetyInterventions),
              enhancedMonitoringProtocols: this.extractRecommendationStrings(riskAssessment.recommendations?.enhancedMonitoringProtocols),
              patientCounselingPriorities: this.extractRecommendationStrings(riskAssessment.recommendations?.patientCounselingPriorities),
              prescriberConsultationsNeeded: this.extractRecommendationStrings(riskAssessment.recommendations?.prescriberConsultationsNeeded),
              alternativeTherapeuticOptions: this.extractRecommendationStrings(riskAssessment.recommendations?.alternativeTherapeuticOptions)
            }
          }
        },
        
        // PDF information
        pdfInfo: {
          wasPDF: result.pdfProcessing?.wasProcessed || false,
          pages: result.pdfProcessing?.pageCount || 0,
          textExtracted: result.pdfProcessing?.textExtraction?.success || false,
          imagesConverted: result.pdfProcessing?.imageConversion?.pages?.length || 0
        },
        
        // Processing metadata
        processingMethod: result.processingMethod || 'gemini_enhanced',
        processingId: result.processingId,
        processingTime: result.processingTime || Date.now() - result.startTime,
        processingStatus: 'completed',
        requiresManualReview: riskAssessment.riskLevel === 'high' || riskAssessment.riskLevel === 'critical',
        
        // Business rules
        businessRulesAction: medications.length === 0 ? 'review' : 'approve',
        isRefillable: medications.some(m => 
          m.name && !['controlled', 'narcotic', 'opioid'].some(term => 
            m.name.toLowerCase().includes(term)
          )
        ),
        expiresAt: null,
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const prescription = new Prescription(prescriptionData);
      const savedPrescription = await prescription.save();
      
      return savedPrescription;
      
    } catch (error) {
      // Don't throw error as this is not critical for the main operation
      return null;
    }
  }

  /**
   * Normalize risk level to valid enum values
   * @param {string} riskLevel - Raw risk level from AI
   * @returns {string} - Normalized risk level
   */
  normalizeRiskLevel(riskLevel) {
    if (!riskLevel || typeof riskLevel !== 'string') {
      return 'moderate';
    }
    
    const normalized = riskLevel.toLowerCase().trim();
    const validLevels = ['low', 'moderate', 'high', 'critical', 'unknown'];
    
    if (validLevels.includes(normalized)) {
      return normalized;
    }
    
    // Map common variations
    if (normalized.includes('unknown') || normalized.includes('unclear')) {
      return 'unknown';
    }
    if (normalized.includes('minor') || normalized.includes('minimal')) {
      return 'low';
    }
    if (normalized.includes('severe') || normalized.includes('serious')) {
      return 'high';
    }
    if (normalized.includes('urgent') || normalized.includes('emergency')) {
      return 'critical';
    }
    
    // Default to moderate if we can't determine
    return 'moderate';
  }

  /**
   * Extract recommendation strings from various formats
   * @param {any} recommendations - Recommendations in various formats
   * @returns {Array<string>} - Array of recommendation strings
   */
  extractRecommendationStrings(recommendations) {
    if (!recommendations) {
      return [];
    }

    // If it's already an array of strings
    if (Array.isArray(recommendations) && recommendations.every(r => typeof r === 'string')) {
      return recommendations;
    }

    // If it's an array of objects with action property
    if (Array.isArray(recommendations)) {
      return recommendations.map(rec => {
        if (typeof rec === 'string') {
          return rec;
        }
        if (rec && typeof rec === 'object') {
          return rec.action || rec.recommendation || rec.text || JSON.stringify(rec).substring(0, 200);
        }
        return String(rec);
      }).filter(rec => rec && rec.length > 0);
    }

    // If it's a single string
    if (typeof recommendations === 'string') {
      return [recommendations];
    }

    // If it's an object with recommendations property
    if (recommendations && typeof recommendations === 'object') {
      if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
        return this.extractRecommendationStrings(recommendations.recommendations);
      }
      // Try to extract meaningful text from object
      const text = recommendations.action || recommendations.recommendation || recommendations.text;
      if (text) {
        return [String(text)];
      }
    }

    // Fallback: convert to string and truncate
    return [JSON.stringify(recommendations).substring(0, 200)];
  }

  /**
   * Extract risk factor strings from various formats
   * @param {any} riskFactors - Risk factors in various formats
   * @returns {Array<string>} - Array of risk factor strings
   */
  extractRiskFactorStrings(riskFactors) {
    if (!riskFactors) {
      return [];
    }

    // If it's already an array of strings
    if (Array.isArray(riskFactors) && riskFactors.every(r => typeof r === 'string')) {
      return riskFactors;
    }

    // If it's an array of objects with category and factors
    if (Array.isArray(riskFactors)) {
      const extractedFactors = [];
      riskFactors.forEach(riskGroup => {
        if (typeof riskGroup === 'string') {
          extractedFactors.push(riskGroup);
        } else if (riskGroup && typeof riskGroup === 'object') {
          const category = riskGroup.category || 'Risk Factor';
          if (Array.isArray(riskGroup.factors)) {
            riskGroup.factors.forEach(factor => {
              if (typeof factor === 'string') {
                extractedFactors.push(`${category}: ${factor}`);
              } else {
                extractedFactors.push(`${category}: ${JSON.stringify(factor).substring(0, 150)}`);
              }
            });
          } else if (riskGroup.factors) {
            extractedFactors.push(`${category}: ${String(riskGroup.factors)}`);
          } else {
            extractedFactors.push(JSON.stringify(riskGroup).substring(0, 200));
          }
        } else {
          extractedFactors.push(String(riskGroup));
        }
      });
      return extractedFactors;
    }

    // If it's a single string
    if (typeof riskFactors === 'string') {
      return [riskFactors];
    }

    // Fallback: convert to string and truncate
    return [JSON.stringify(riskFactors).substring(0, 200)];
  }

  /**
   * Extract warning strings from various formats
   * @param {any} warnings - Warnings in various formats
   * @returns {Array<string>} - Array of warning strings
   */
  extractWarningStrings(warnings) {
    if (!warnings) {
      return [];
    }

    // If it's already an array of strings
    if (Array.isArray(warnings) && warnings.every(w => typeof w === 'string')) {
      return warnings;
    }

    // If it's an array of objects
    if (Array.isArray(warnings)) {
      return warnings.map(warning => {
        if (typeof warning === 'string') {
          return warning;
        }
        if (warning && typeof warning === 'object') {
          return warning.message || warning.warning || warning.text || JSON.stringify(warning).substring(0, 200);
        }
        return String(warning);
      }).filter(w => w && w.length > 0);
    }

    // If it's a single string
    if (typeof warnings === 'string') {
      return [warnings];
    }

    // Fallback: convert to string and truncate
    return [JSON.stringify(warnings).substring(0, 200)];
  }

  /**
   * Save batch processing result to database
   * @param {string} userId - User ID
   * @param {Object} result - Batch processing result
   */
  async saveBatchProcessing(userId, result) {
    try {
      const batchRecord = {
        userId,
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        results: result.results.map(r => ({
          processingId: r.processingId,
          status: r.status,
          confidence: r.quality?.overallConfidence
        })),
        createdAt: new Date()
      };

      // Database save operation would go here
      
    } catch (error) {
      // Don't throw error as this is not critical for the main operation
    }
  }

  /**
   * Extract risk array from various formats used by Gemini
   * @param {any} risks - Risks in various formats
   * @returns {Array<Object>} - Array of risk objects
   */
  extractRiskArray(risks) {
    if (!risks || !Array.isArray(risks)) {
      return [];
    }

    return risks.map(risk => {
      if (typeof risk === 'string') {
        return {
          risk: risk,
          severity: 'moderate',
          details: '',
          mitigation: ''
        };
      }
      
      if (risk && typeof risk === 'object') {
        return {
          risk: risk.risk || risk.title || risk.category || 'Unknown Risk',
          severity: risk.severity || 'moderate',
          details: risk.details || risk.description || risk.explanation || '',
          mitigation: risk.mitigation || risk.recommendation || risk.action || ''
        };
      }
      
      return {
        risk: String(risk),
        severity: 'moderate',
        details: '',
        mitigation: ''
      };
    });
  }

  /**
   * Get multer middleware for single file upload
   */
  getSingleUploadMiddleware() {
    return this.upload.single('prescription');
  }

  /**
   * Get multer middleware for multiple file upload
   */
  getMultipleUploadMiddleware() {
    return this.upload.array('prescriptions', 5);
  }

  /**
   * Terminate controller and cleanup resources
   */
  async terminate() {
    try {
      await this.processingService.terminate();
    } catch (error) {
      // Silently fail
    }
  }
}

export default PrescriptionController;