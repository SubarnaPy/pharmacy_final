import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';

/**
 * Advanced OCR Service with Google Gemini AI
 * Supports multiple Gemini models with fallback capabilities
 */
class AdvancedOCRService {
  constructor() {
    // Initialize Gemini AI client
    this.genAI = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log('✅ Gemini AI client initialized successfully.');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Gemini AI client:', error.message);
      }
    } else {
      console.warn('⚠️ GEMINI_API_KEY not set, Gemini OCR will be disabled');
    }

    // OCR engine configurations
    this.engines = {
      gemini: {
        name: 'Google Gemini AI',
        enabled: !!this.genAI,
        priority: 1,
        models: [
          'gemini-2.0-flash-exp',    // Gemini 2.5 Pro (highest priority)
          'gemini-1.5-pro',          // Gemini 2.5 Flash (second priority)  
          'gemini-1.5-flash',        // Gemini 1.5 Flash
          'gemini-pro',              // Legacy Gemini Pro
          'gemini-pro-vision'        // Legacy Gemini Pro Vision
        ]
      }
    };
  }

  /**
   * Converts a local file to a GoogleGenerativeAI.Part object.
   * @param {string} filePath - The path to the local file.
   * @returns {Promise<{inlineData: {data: string, mimeType: string}}>}
   */
  async fileToGenerativePart(filePath) {
    const data = await fs.readFile(filePath);
    let mimeType = mime.lookup(filePath);
    
    // If MIME type detection fails, try to determine from file content or default to common image types
    if (!mimeType) {
      console.warn(`⚠️ Could not determine MIME type for file: ${filePath}`);
      
      // Check if it's likely an image file by reading the first few bytes
      const header = data.slice(0, 4);
      
      if (header[0] === 0xFF && header[1] === 0xD8) {
        mimeType = 'image/jpeg';
        console.log('🔍 Detected JPEG from file header');
      } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        mimeType = 'image/png';
        console.log('🔍 Detected PNG from file header');
      } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
        mimeType = 'image/gif';
        console.log('🔍 Detected GIF from file header');
      } else if (header[0] === 0x42 && header[1] === 0x4D) {
        mimeType = 'image/bmp';
        console.log('🔍 Detected BMP from file header');
      } else if (header.toString().includes('WEBP')) {
        mimeType = 'image/webp';
        console.log('🔍 Detected WebP from file header');
      } else {
        // Default to JPEG for unknown image files (most common prescription format)
        mimeType = 'image/jpeg';
        console.log('🔍 Defaulting to JPEG MIME type for processed image');
      }
    }
    
    console.log(`📄 File: ${path.basename(filePath)} | MIME Type: ${mimeType} | Size: ${data.length} bytes`);
    
    return {
      inlineData: {
        data: data.toString('base64'),
        mimeType,
      },
    };
  }

  /**
   * Wait for initialization to complete (placeholder for compatibility)
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} - True if initialized, false if timeout
   */
  async waitForInitialization(timeout = 30000) {
    // Gemini doesn't need initialization waiting like Tesseract
    return true;
  }

  /**
   * Extract text from prescription image using Gemini AI
   * @param {string} imagePath - Path to the prescription image
   * @param {Object} options - OCR options
   * @returns {Promise<Object>} - OCR results with confidence scores
   */
  async extractPrescriptionText(imagePath, options = {}) {
    try {
      const {
        useMultipleModels = true,
        preprocessImage = false,
        enableFallback = true,
        primaryModel = this.engines.gemini.models[0], // Use first model (2.5 Pro) as default
        fallbackModel = this.engines.gemini.models[1]  // Use second model (2.5 Flash) as fallback
      } = options;

      console.log(`🔍 Starting Gemini OCR extraction for: ${imagePath}`);
      console.log(`🎯 Primary model: ${primaryModel}, Fallback: ${fallbackModel}`);
      
      if (!this.engines.gemini.enabled) {
        throw new Error('Gemini AI not available. Please check GEMINI_API_KEY configuration.');
      }

      // Preprocess image if enabled
      let processedImagePath = imagePath;
      if (preprocessImage) {
        processedImagePath = await this.preprocessImage(imagePath);
      }

      let finalResult;

      try {
        // Try primary model first (Gemini 2.5 Pro)
        console.log(`🧠 Using primary model: ${primaryModel}`);
        finalResult = await this.runGeminiOCR(processedImagePath, primaryModel);
        
        // If using multiple models, try additional models in priority order for validation
        if (useMultipleModels && this.engines.gemini.models.length > 1) {
          const additionalResults = [];
          
          // Try next 2 models in priority order for comparison
          const modelsToTry = this.engines.gemini.models.slice(1, 3); // Get 2.5 Flash and 1.5 Flash
          
          for (const model of modelsToTry) {
            try {
              console.log(`🔄 Running additional model for validation: ${model}`);
              const additionalResult = await this.runGeminiOCR(processedImagePath, model);
              additionalResults.push(additionalResult);
            } catch (error) {
              console.warn(`⚠️ Additional model ${model} failed:`, error.message);
            }
          }

          if (additionalResults.length > 0) {
            console.log(`🔀 Combining results from ${additionalResults.length + 1} models`);
            finalResult = await this.combineGeminiResults([finalResult, ...additionalResults]);
          }
        }

      } catch (primaryError) {
        console.warn(`⚠️ Primary model ${primaryModel} failed:`, primaryError.message);
        
        if (enableFallback) {
          // Try models in priority order as fallback
          for (let i = 1; i < this.engines.gemini.models.length; i++) {
            const fallbackModelToTry = this.engines.gemini.models[i];
            console.log(`🔄 Trying fallback model: ${fallbackModelToTry}`);
            
            try {
              finalResult = await this.runGeminiOCR(processedImagePath, fallbackModelToTry);
              finalResult.fallbackApplied = true;
              finalResult.originalError = primaryError.message;
              finalResult.fallbackModel = fallbackModelToTry;
              console.log(`✅ Fallback model ${fallbackModelToTry} succeeded`);
              break;
            } catch (fallbackError) {
              console.warn(`⚠️ Fallback model ${fallbackModelToTry} failed:`, fallbackError.message);
              if (i === this.engines.gemini.models.length - 1) {
                // All models failed
                throw new Error(`All Gemini models failed. Last error: ${fallbackError.message}`);
              }
            }
          }
        } else {
          throw primaryError;
        }
      }

      // Clean up preprocessed image if different from original
      if (processedImagePath !== imagePath) {
        await this.cleanupTempFile(processedImagePath);
      }

      return finalResult;

    } catch (error) {
      console.error('❌ OCR extraction failed:', error.message);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Run Google Gemini OCR engine
   * @param {string} imagePath - Path to image
   * @param {string} modelName - The Gemini model to use
   * @returns {Promise<Object>} - OCR result
   */
  async runGeminiOCR(imagePath, modelName = 'gemini-2.0-flash-exp') {
    const startTime = Date.now();
    try {
      console.log(`🧠 Running Gemini OCR with model: ${modelName}...`);
      console.log('   📁 Image path:', imagePath);
      
      if (!this.genAI) {
        throw new Error('Gemini AI client not initialized');
      }

      // Check if file exists and validate
      try {
        await fs.access(imagePath);
      } catch (error) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Get file stats for validation
      const stats = await fs.stat(imagePath);
      console.log(`   📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      if (stats.size === 0) {
        throw new Error('Image file is empty');
      }
      
      if (stats.size > 20 * 1024 * 1024) { // 20MB limit for Gemini
        throw new Error('Image file too large (max 20MB)');
      }
      
      const model = this.genAI.getGenerativeModel({ model: modelName });
      const imagePart = await this.fileToGenerativePart(imagePath);
      
      const prompt = `
        Perform OCR on the provided medical prescription image.
        Extract all text accurately, preserving the original line breaks, spacing, and structure as much as possible.
        Focus on medical prescription content including:
        - Patient name and details
        - Doctor name and credentials  
        - Medication names and dosages
        - Instructions and frequency
        - Date and signature information
        - Hospital/clinic information
        - Any warnings or special instructions
        
        Return only the extracted text without any additional commentary or interpretation.
        Preserve the original formatting and structure of the text as it appears in the image.
      `;

      console.log('   ⚙️ Starting Gemini recognition...');
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [imagePart, { text: prompt }] }],
      });
      
      const response = result.response;
      const extractedText = response.text();
      const processingTime = Date.now() - startTime;

      console.log(`   ✅ Gemini OCR completed in ${processingTime}ms`);
      console.log('   📊 OCR Result Summary:');
      console.log('      - Extracted text length:', extractedText.length);
      console.log('      - Processing time:', processingTime + 'ms');
      console.log('      - Model used:', modelName);
      if (extractedText.length > 0) {
        console.log('      - Text preview:', extractedText.substring(0, 100) + (extractedText.length > 100 ? '...' : ''));
      } else {
        console.log('      - ⚠️ No text extracted from image');
      }
      
      return {
        engine: `gemini-${modelName.split('-').slice(-2).join('-')}`,
        text: extractedText,
        confidence: null, // Gemini doesn't provide confidence scores but generally has high accuracy
        words: [], // Not provided by Gemini's standard text response
        lines: extractedText.split('\n').map((line, index) => ({
          text: line,
          confidence: null,
          lineNumber: index + 1
        })),
        processingTime,
        modelUsed: modelName,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Gemini OCR failed for model ${modelName}:`, error.message);
      throw error;
    }
  }

  /**
   * Combine results from multiple Gemini models
   * @param {Array} results - Array of OCR results from different Gemini models
   * @returns {Promise<Object>} - Combined result
   */
  async combineGeminiResults(results) {
    if (results.length === 0) {
      throw new Error('No OCR results to combine');
    }

    if (results.length === 1) {
      return {
        ...results[0],
        combinedResult: true,
        models: [results[0].modelUsed]
      };
    }

    console.log('🔀 Combining results from multiple Gemini models...');

    // Use the result with the longest text (usually more comprehensive)
    const bestResult = results.reduce((best, current) => 
      current.text.length > best.text.length ? current : best
    );

    // Calculate average processing time
    const avgProcessingTime = results.reduce((sum, result) => 
      sum + result.processingTime, 0) / results.length;

    console.log('✅ Using result with most comprehensive text extraction');
    return {
      ...bestResult,
      combinedResult: true,
      models: results.map(r => r.modelUsed),
      modelResults: results,
      averageProcessingTime: avgProcessingTime,
      primaryModel: bestResult.modelUsed
    };
  }

  /**
   * Apply fallback strategies using different Gemini models
   * @param {string} imagePath - Original image path
   * @param {Object} currentResult - Current OCR result
   * @param {Object} options - Original options
   * @returns {Promise<Object>} - Improved result
   */
  async applyFallbackStrategies(imagePath, currentResult, options = {}) {
    try {
      console.log('🔧 Applying Gemini fallback strategies...');

      const availableModels = this.engines.gemini.models.filter(
        model => model !== currentResult.modelUsed
      );

      for (const fallbackModel of availableModels) {
        try {
          console.log(`🧠 Trying ${fallbackModel} as fallback strategy...`);
          const geminiResult = await this.runGeminiOCR(imagePath, fallbackModel);
          
          // Consider it an improvement if we get more text or different content
          if (geminiResult.text.length > currentResult.text.length || 
              geminiResult.text !== currentResult.text) {
            console.log('✅ Fallback strategy provided different/better results');
            return {
              ...geminiResult,
              fallbackApplied: true,
              originalResult: currentResult,
              improvementReason: geminiResult.text.length > currentResult.text.length ? 
                'More comprehensive text extraction' : 'Different text extraction approach'
            };
          }
        } catch (error) {
          console.log(`⚠️ Fallback model ${fallbackModel} failed:`, error.message);
        }
      }

      return {
        ...currentResult,
        fallbackAttempted: true,
        fallbackApplied: false,
        message: 'No significant improvement found with alternative models'
      };

    } catch (error) {
      console.error('❌ Fallback strategies failed:', error.message);
      return currentResult;
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   * @param {string} imagePath - Original image path
   * @returns {Promise<string>} - Processed image path
   */
  async preprocessImage(imagePath) {
    try {
      console.log('🖼️ Preprocessing image for OCR...');
      
      const processedPath = path.join(
        path.dirname(imagePath),
        `processed_${Date.now()}_${path.basename(imagePath)}`
      );

      // Note: This is a placeholder for image preprocessing
      // In a real implementation, you would use libraries like Sharp or Jimp
      // to apply noise reduction, contrast enhancement, deskewing, etc.
      // For Gemini, preprocessing is often less critical but can still help with very noisy images.
      
      // For now, we'll copy the original file
      const imageBuffer = await fs.readFile(imagePath);
      await fs.writeFile(processedPath, imageBuffer);
      
      console.log('✅ Image preprocessing completed');
      return processedPath;
      
    } catch (error) {
      console.error('❌ Image preprocessing failed:', error.message);
      return imagePath; // Return original path if preprocessing fails
    }
  }

  /**
   * Combine text using consensus approach (simplified for Gemini-only)
   * @param {Array} results - OCR results
   * @returns {string} - Combined text
   */
  combineTextWithConsensus(results) {
    // Use the result with the longest text (most comprehensive)
    const bestResult = results.reduce((best, current) => 
      current.text.length > best.text.length ? current : best
    );
    
    return bestResult.text;
  }

  /**
   * Clean up temporary files
   * @param {string} filePath - File to clean up
   */
  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ Cleaned up temporary file: ${filePath}`);
    } catch (error) {
      console.error('⚠️ Failed to cleanup temp file:', error.message);
    }
  }

  /**
   * Terminate OCR service and cleanup resources
   */
  async terminate() {
    try {
      // Gemini doesn't need cleanup like Tesseract workers
      console.log('✅ OCR service terminated successfully');
    } catch (error) {
      console.error('❌ Error terminating OCR service:', error.message);
    }
  }
}

export default AdvancedOCRService;
