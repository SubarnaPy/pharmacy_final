import AdvancedOCRService from './ocr/AdvancedOCRService.js';
import AdvancedAIService from './ai/AdvancedAIService.js';
import AdvancedImageProcessingService from './imageProcessing/AdvancedImageProcessingService.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Unified Prescription Processing Service
 * Orchestrates the complete prescription processing pipeline
 */
class PrescriptionProcessingService {
  constructor() {
    this.ocrService = new AdvancedOCRService();
    this.aiService = new AdvancedAIService();
    this.imageProcessingService = new AdvancedImageProcessingService();
    
    // Processing statistics
    this.stats = {
      totalProcessed: 0,
      successfulProcessings: 0,
      averageProcessingTime: 0,
      averageConfidenceScore: 0
    };

    console.log('✅ Unified Prescription Processing Service initialized');
  }

  /**
   * Main prescription processing pipeline
   * @param {string} imagePath - Path to prescription image
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Complete processing results
   */
  async processPrescription(imagePath, options = {}) {
    const startTime = Date.now();
    const processingId = this.generateProcessingId();
    
    try {
      console.log(`🚀 Starting prescription processing [${processingId}]`);
      
      const {
        skipImageProcessing = false,
        useMultipleOCREngines = true,
        validateMedications = true,
        checkInteractions = true,
        detectAnomalies = true,
        generateReport = true,
        confidenceThreshold = 0.7
      } = options;

      // Step 1: Image preprocessing
      let imageProcessingResult = null;
      let processedImagePath = imagePath;
      
      if (!skipImageProcessing) {
        console.log('📷 Step 1: Image preprocessing...');
        imageProcessingResult = await this.imageProcessingService.preprocessForOCR(imagePath, {
          enhanceContrast: true,
          removeNoise: true,
          deskew: true,
          sharpen: true,
          resize: true,
          targetWidth: 1200
        });
        processedImagePath = imageProcessingResult.processedPath;
      }

      // Step 2: OCR text extraction
      console.log('🔤 Step 2: OCR text extraction...');
      const ocrResult = await this.ocrService.extractPrescriptionText(processedImagePath, {
        useMultipleEngines: useMultipleOCREngines,
        minConfidence: confidenceThreshold,
        preprocessImage: false, // Already preprocessed
        enableFallback: true
      });

      // Log OCR results for debugging
      console.log('📄 OCR EXTRACTION RESULTS:');
      console.log('   Engine:', ocrResult.engine);
      console.log('   Confidence:', ocrResult.confidence + '%');
      console.log('   Text Length:', ocrResult.text.length, 'characters');
      console.log('   Words Found:', ocrResult.words?.length || 0);
      console.log('   Lines Found:', ocrResult.lines?.length || 0);
      console.log('📝 EXTRACTED TEXT:');
      console.log('----------------------------------------');
      console.log(ocrResult.text || '[NO TEXT EXTRACTED]');
      console.log('----------------------------------------');

      // Step 3: AI processing and validation
      console.log('🧠 Step 3: AI processing and validation...');
      const aiResult = await this.aiService.processPrescription(ocrResult.text, {
        validateDosages: validateMedications,
        checkInteractions,
        detectAnomalies,
        enhanceText: true
      });

      // Step 4: Quality assessment and confidence scoring
      console.log('📊 Step 4: Quality assessment...');
      const qualityAssessment = await this.assessProcessingQuality({
        imageProcessing: imageProcessingResult,
        ocr: ocrResult,
        ai: aiResult
      });

      // Step 5: Generate comprehensive report
      let report = null;
      if (generateReport) {
        console.log('📋 Step 5: Generating report...');
        report = await this.generateComprehensiveReport({
          processingId,
          imagePath,
          imageProcessing: imageProcessingResult,
          ocr: ocrResult,
          ai: aiResult,
          quality: qualityAssessment,
          processingTime: Date.now() - startTime
        });
      }

      // Step 6: Apply business rules and recommendations
      console.log('🎯 Step 6: Applying business rules...');
      const businessRules = await this.applyBusinessRules({
        ocr: ocrResult,
        ai: aiResult,
        quality: qualityAssessment
      });

      // Step 7: Update statistics
      this.updateProcessingStats(Date.now() - startTime, qualityAssessment.overallConfidence);

      const finalResult = {
        processingId,
        status: 'completed',
        originalImagePath: imagePath,
        processedImagePath,
        imageProcessing: imageProcessingResult,
        ocr: ocrResult,
        ai: aiResult,
        quality: qualityAssessment,
        businessRules,
        report,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Prescription processing completed [${processingId}] in ${finalResult.processingTime}ms`);
      
      // Cleanup temporary files if image was processed
      if (imageProcessingResult && processedImagePath !== imagePath) {
        setTimeout(() => {
          this.cleanupProcessingFiles([processedImagePath]);
        }, 5000); // Cleanup after 5 seconds
      }

      return finalResult;

    } catch (error) {
      console.error(`❌ Prescription processing failed [${processingId}]:`, error.message);
      
      const errorResult = {
        processingId,
        status: 'failed',
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        },
        originalImagePath: imagePath,
        processingTime: Date.now() - startTime
      };

      return errorResult;
    }
  }

  /**
   * Process multiple prescriptions in batch
   * @param {Array} imagePaths - Array of image paths
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} - Array of processing results
   */
  async processBatchPrescriptions(imagePaths, options = {}) {
    try {
      console.log(`📦 Starting batch processing of ${imagePaths.length} prescriptions`);
      
      const {
        concurrency = 3,
        failFast = false
      } = options;

      const results = [];
      const chunks = this.chunkArray(imagePaths, concurrency);

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(imagePath => 
          this.processPrescription(imagePath, options)
        );

        if (failFast) {
          const chunkResults = await Promise.all(chunkPromises);
          results.push(...chunkResults);
        } else {
          const chunkResults = await Promise.allSettled(chunkPromises);
          results.push(...chunkResults.map(result => 
            result.status === 'fulfilled' ? result.value : result.reason
          ));
        }
      }

      console.log(`✅ Batch processing completed. ${results.filter(r => r.status === 'completed').length}/${imagePaths.length} successful`);
      
      return {
        totalProcessed: imagePaths.length,
        successful: results.filter(r => r.status === 'completed').length,
        failed: results.filter(r => r.status === 'failed').length,
        results
      };

    } catch (error) {
      console.error('❌ Batch processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Assess overall processing quality
   * @param {Object} results - All processing results
   * @returns {Promise<Object>} - Quality assessment
   */
  async assessProcessingQuality(results) {
    try {
      const { imageProcessing, ocr, ai } = results;

      // Image quality score
      const imageQuality = imageProcessing ? imageProcessing.finalQuality.score : 0.8;

      // OCR confidence score
      const ocrConfidence = ocr.confidence / 100;

      // AI processing confidence
      const aiConfidence = ai.confidenceScores ? ai.confidenceScores.overallValidation : 0.7;

      // Calculate weighted overall confidence
      const overallConfidence = (
        imageQuality * 0.2 +
        ocrConfidence * 0.5 +
        aiConfidence * 0.3
      );

      // Determine processing quality level
      let qualityLevel = 'low';
      if (overallConfidence >= 0.8) qualityLevel = 'high';
      else if (overallConfidence >= 0.6) qualityLevel = 'medium';

      // Identify quality issues
      const issues = [];
      if (imageQuality < 0.6) issues.push('poor_image_quality');
      if (ocrConfidence < 0.7) issues.push('low_ocr_confidence');
      if (aiConfidence < 0.6) issues.push('ai_validation_concerns');
      if (ai.anomalyDetection?.hasAnomalies) issues.push('anomalies_detected');
      if (ai.interactionCheck?.hasInteractions) issues.push('drug_interactions');

      return {
        overallConfidence,
        qualityLevel,
        imageQuality,
        ocrConfidence,
        aiConfidence,
        issues,
        requiresManualReview: overallConfidence < 0.6 || issues.length > 2,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Quality assessment failed:', error.message);
      return {
        overallConfidence: 0.5,
        qualityLevel: 'unknown',
        issues: ['quality_assessment_failed'],
        requiresManualReview: true,
        error: error.message
      };
    }
  }

  /**
   * Generate comprehensive processing report
   * @param {Object} data - All processing data
   * @returns {Promise<Object>} - Comprehensive report
   */
  async generateComprehensiveReport(data) {
    try {
      const {
        processingId,
        imagePath,
        imageProcessing,
        ocr,
        ai,
        quality,
        processingTime
      } = data;

      const report = {
        reportId: `RPT_${processingId}`,
        summary: {
          processingId,
          originalImage: path.basename(imagePath),
          processingTime: `${processingTime}ms`,
          overallQuality: quality.qualityLevel,
          confidence: `${(quality.overallConfidence * 100).toFixed(1)}%`,
          requiresReview: quality.requiresManualReview
        },
        
        imageAnalysis: {
          originalQuality: imageProcessing?.originalQuality?.score || 'N/A',
          finalQuality: imageProcessing?.finalQuality?.score || 'N/A',
          improvement: imageProcessing?.improvement || 0,
          processingSteps: imageProcessing?.processingSteps || []
        },

        ocrResults: {
          engine: ocr.engine,
          confidence: ocr.confidence,
          textLength: ocr.text.length,
          wordsDetected: ocr.words?.length || 0,
          linesDetected: ocr.lines?.length || 0
        },

        medicationAnalysis: {
          medicationsFound: ai.medications?.totalCount || 0,
          validatedMedications: ai.medications?.validCount || 0,
          unknownMedications: ai.medications?.unknownCount || 0,
          dosagesExtracted: ai.parsed?.dosages?.length || 0,
          frequenciesFound: ai.parsed?.frequencies?.length || 0
        },

        safetyChecks: {
          drugInteractions: ai.interactionCheck?.interactions?.length || 0,
          anomaliesDetected: ai.anomalyDetection?.anomalies?.length || 0,
          highRiskFlags: this.countHighRiskFlags(ai),
          dosageValidation: ai.dosageValidation?.overallStatus || 'not_checked'
        },

        recommendations: ai.recommendations || [],
        
        qualityIssues: quality.issues || [],
        
        extractedText: {
          original: ocr.text.substring(0, 500) + (ocr.text.length > 500 ? '...' : ''),
          enhanced: ai.enhancedText?.substring(0, 500) + (ai.enhancedText?.length > 500 ? '...' : '') || 'N/A'
        },

        metadata: {
          generatedAt: new Date().toISOString(),
          processingVersion: '1.0.0',
          services: {
            ocr: ocr.engine,
            imageProcessing: imageProcessing ? 'enabled' : 'disabled',
            aiValidation: 'enabled'
          }
        }
      };

      return report;

    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
      return {
        reportId: `RPT_ERROR_${Date.now()}`,
        error: 'Report generation failed',
        details: error.message
      };
    }
  }

  /**
   * Apply business rules and generate actionable recommendations
   * @param {Object} results - Processing results
   * @returns {Promise<Object>} - Business rules results
   */
  async applyBusinessRules(results) {
    try {
      const { ocr, ai, quality } = results;
      const rules = [];

      // Rule 1: Low confidence requires manual review
      if (quality.overallConfidence < 0.6) {
        rules.push({
          rule: 'low_confidence_review',
          triggered: true,
          action: 'require_manual_review',
          priority: 'high',
          message: 'Low processing confidence requires pharmacist review'
        });
      }

      // Rule 2: Drug interactions require pharmacist consultation
      if (ai.interactionCheck?.hasInteractions) {
        const majorInteractions = ai.interactionCheck.interactions.filter(i => i.severity === 'major');
        if (majorInteractions.length > 0) {
          rules.push({
            rule: 'major_drug_interactions',
            triggered: true,
            action: 'pharmacist_consultation_required',
            priority: 'critical',
            message: `${majorInteractions.length} major drug interaction(s) detected`
          });
        }
      }

      // Rule 3: Unknown medications require verification
      if (ai.medications?.unknownCount > 0) {
        rules.push({
          rule: 'unknown_medications',
          triggered: true,
          action: 'verify_medications',
          priority: 'medium',
          message: `${ai.medications.unknownCount} unknown medication(s) need verification`
        });
      }

      // Rule 4: Anomalies trigger investigation
      if (ai.anomalyDetection?.hasAnomalies) {
        const highRiskAnomalies = ai.anomalyDetection.anomalies.filter(a => a.severity === 'high');
        if (highRiskAnomalies.length > 0) {
          rules.push({
            rule: 'high_risk_anomalies',
            triggered: true,
            action: 'investigate_anomalies',
            priority: 'high',
            message: `${highRiskAnomalies.length} high-risk anomaly/anomalies detected`
          });
        }
      }

      // Rule 5: Missing prescriber information
      if (!ai.parsed?.prescriberInfo?.names?.length) {
        rules.push({
          rule: 'missing_prescriber',
          triggered: true,
          action: 'verify_prescriber',
          priority: 'high',
          message: 'Prescriber information not detected'
        });
      }

      // Determine overall action required
      const criticalRules = rules.filter(r => r.priority === 'critical');
      const highPriorityRules = rules.filter(r => r.priority === 'high');

      let overallAction = 'approve';
      if (criticalRules.length > 0) {
        overallAction = 'reject';
      } else if (highPriorityRules.length > 0 || quality.requiresManualReview) {
        overallAction = 'review';
      }

      return {
        overallAction,
        rulesTriggered: rules.filter(r => r.triggered),
        totalRules: rules.length,
        criticalCount: criticalRules.length,
        highPriorityCount: highPriorityRules.length,
        processingRecommendation: this.getProcessingRecommendation(overallAction, rules)
      };

    } catch (error) {
      console.error('❌ Business rules application failed:', error.message);
      return {
        overallAction: 'review',
        error: 'Business rules processing failed',
        processingRecommendation: 'Manual review required due to processing error'
      };
    }
  }

  /**
   * Count high-risk flags in AI results
   * @param {Object} aiResults - AI processing results
   * @returns {number} - Count of high-risk flags
   */
  countHighRiskFlags(aiResults) {
    let count = 0;
    
    if (aiResults.interactionCheck?.interactions?.some(i => i.severity === 'major')) count++;
    if (aiResults.anomalyDetection?.anomalies?.some(a => a.severity === 'high')) count++;
    if (aiResults.medications?.unknownCount > 2) count++;
    if (!aiResults.parsed?.prescriberInfo?.names?.length) count++;
    
    return count;
  }

  /**
   * Get processing recommendation based on business rules
   * @param {string} overallAction - Overall action required
   * @param {Array} rules - Triggered rules
   * @returns {string} - Processing recommendation
   */
  getProcessingRecommendation(overallAction, rules) {
    switch (overallAction) {
      case 'approve':
        return 'Prescription can be processed automatically';
      case 'review':
        return `Manual review required: ${rules.filter(r => r.triggered).map(r => r.message).join('; ')}`;
      case 'reject':
        return `Critical issues detected: ${rules.filter(r => r.priority === 'critical').map(r => r.message).join('; ')}`;
      default:
        return 'Unknown processing status';
    }
  }

  /**
   * Generate unique processing ID
   * @returns {string} - Unique processing ID
   */
  generateProcessingId() {
    return `PROC_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Update processing statistics
   * @param {number} processingTime - Processing time in ms
   * @param {number} confidence - Confidence score
   */
  updateProcessingStats(processingTime, confidence) {
    this.stats.totalProcessed++;
    if (confidence > 0.6) {
      this.stats.successfulProcessings++;
    }
    
    // Update rolling averages
    this.stats.averageProcessingTime = (
      (this.stats.averageProcessingTime * (this.stats.totalProcessed - 1)) + processingTime
    ) / this.stats.totalProcessed;
    
    this.stats.averageConfidenceScore = (
      (this.stats.averageConfidenceScore * (this.stats.totalProcessed - 1)) + confidence
    ) / this.stats.totalProcessed;
  }

  /**
   * Get processing statistics
   * @returns {Object} - Processing statistics
   */
  getProcessingStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalProcessed > 0 ? 
        (this.stats.successfulProcessings / this.stats.totalProcessed) * 100 : 0,
      averageProcessingTime: Math.round(this.stats.averageProcessingTime),
      averageConfidenceScore: Math.round(this.stats.averageConfidenceScore * 100) / 100
    };
  }

  /**
   * Chunk array into smaller arrays
   * @param {Array} array - Input array
   * @param {number} chunkSize - Size of each chunk
   * @returns {Array} - Array of chunks
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Clean up processing files
   * @param {Array} filePaths - Array of file paths to clean up
   */
  async cleanupProcessingFiles(filePaths) {
    try {
      await this.imageProcessingService.cleanupTempFiles(filePaths);
    } catch (error) {
      console.error('❌ Failed to cleanup processing files:', error.message);
    }
  }

  /**
   * Terminate all services and cleanup
   */
  async terminate() {
    try {
      await this.ocrService.terminate();
      await this.imageProcessingService.cleanupOldTempFiles(1); // Cleanup files older than 1 hour
      console.log('✅ Prescription processing service terminated');
    } catch (error) {
      console.error('❌ Error terminating prescription processing service:', error.message);
    }
  }
}

export default PrescriptionProcessingService;
