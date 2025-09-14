import { GoogleGenerativeAI } from '@google/generative-ai';
import Medicine from '../../models/Medicine.js';
import fs from 'fs';
import path from 'path';

class MedicineImageRecognitionService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    
    this.confidenceThreshold = 0.7;
    this.maxRetries = 3;
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
  }

  /**
   * Analyze medicine image using Gemini AI for comprehensive identification
   * @param {string} imageData - Base64 encoded image data or image buffer
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Recognition results with confidence scores
   */
  async analyzeMedicineImage(imageData, options = {}) {
    try {
      await this.rateLimitRequest();
      
      const {
        includeComposition = true,
        includeTherapeutic = true,
        includeManufacturer = true,
        includePricing = false,
        enhancedOCR = true,
        visualFeatureAnalysis = true
      } = options;

      // Prepare the image data for Gemini
      const imagePart = this.prepareImageData(imageData);
      
      // Create comprehensive prompt for medicine analysis
      const prompt = this.generateAnalysisPrompt({
        includeComposition,
        includeTherapeutic,
        includeManufacturer,
        includePricing,
        enhancedOCR,
        visualFeatureAnalysis
      });

      // Analyze with Gemini AI
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse and structure the AI response
      const analysisResult = await this.parseAIResponse(text);
      
      // Enhance with database matching
      const enhancedResult = await this.enhanceWithDatabaseMatching(analysisResult);
      
      // Calculate confidence scores
      const confidenceMetrics = this.calculateConfidenceMetrics(enhancedResult);
      
      // Log analysis for improvement
      await this.logAnalysis(imageData, enhancedResult, confidenceMetrics);

      return {
        success: true,
        confidence: confidenceMetrics.overallConfidence,
        analysis: enhancedResult,
        metrics: confidenceMetrics,
        timestamp: new Date().toISOString(),
        version: '2.0'
      };

    } catch (error) {
      console.error('Medicine image analysis failed:', error);
      return {
        success: false,
        error: error.message,
        fallbackSuggestions: await this.generateFallbackSuggestions(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Batch analyze multiple medicine images
   * @param {Array} imageDataArray - Array of image data
   * @param {object} options - Analysis options
   * @returns {Promise<Array>} Array of recognition results
   */
  async batchAnalyze(imageDataArray, options = {}) {
    const results = [];
    const { batchSize = 3, delayBetweenBatches = 2000 } = options;
    
    for (let i = 0; i < imageDataArray.length; i += batchSize) {
      const batch = imageDataArray.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (imageData, index) => {
        try {
          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, index * 500));
          return await this.analyzeMedicineImage(imageData, options);
        } catch (error) {
          return {
            success: false,
            error: error.message,
            index: i + index
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay between batches
      if (i + batchSize < imageDataArray.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return results;
  }

  /**
   * Compare medicine image with database images for visual similarity
   * @param {string} queryImageData - Image to search for
   * @param {object} options - Search options
   * @returns {Promise<Array>} Array of similar medicines with similarity scores
   */
  async findVisualSimilarMedicines(queryImageData, options = {}) {
    try {
      const { limit = 10, minSimilarity = 0.6 } = options;
      
      // First, analyze the query image
      const queryAnalysis = await this.analyzeMedicineImage(queryImageData, {
        visualFeatureAnalysis: true,
        enhancedOCR: true
      });

      if (!queryAnalysis.success) {
        throw new Error('Failed to analyze query image');
      }

      // Get visual features from analysis
      const queryFeatures = queryAnalysis.analysis.visualFeatures;
      
      // Find medicines with similar visual characteristics
      const candidates = await Medicine.find({
        status: 'active',
        verificationStatus: 'verified',
        'imageData.aiRecognitionData.aiConfidence': { $gte: 0.5 }
      }).limit(50);

      // Calculate similarity scores
      const similarities = await Promise.all(
        candidates.map(async (medicine) => {
          const similarity = this.calculateVisualSimilarity(
            queryFeatures, 
            medicine.imageData.aiRecognitionData.visualFeatures
          );
          
          return {
            medicine,
            similarityScore: similarity,
            matchedFeatures: this.getMatchedFeatures(queryFeatures, medicine.imageData.aiRecognitionData.visualFeatures)
          };
        })
      );

      // Filter and sort by similarity
      const results = similarities
        .filter(item => item.similarityScore >= minSimilarity)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

      return {
        success: true,
        queryAnalysis: queryAnalysis.analysis,
        results,
        totalFound: results.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Visual similarity search failed:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Extract text from medicine package/label using enhanced OCR
   * @param {string} imageData - Image data
   * @returns {Promise<object>} Extracted text with structure
   */
  async extractMedicineText(imageData) {
    try {
      await this.rateLimitRequest();
      
      const imagePart = this.prepareImageData(imageData);
      
      const prompt = `
        Analyze this medicine package/label image and extract ALL visible text with the following structure:
        
        1. MEDICINE NAME: (Main brand/product name, usually in large text)
        2. GENERIC NAME: (Scientific/generic name, often in smaller text)
        3. STRENGTH/DOSAGE: (e.g., 500mg, 5ml, etc.)
        4. MANUFACTURER: (Company name)
        5. BATCH/LOT NUMBER: (Batch or lot information)
        6. EXPIRY DATE: (Manufacturing/expiry dates)
        7. COMPOSITION: (Active ingredients list)
        8. OTHER TEXT: (Any other visible text)
        
        Provide response in JSON format:
        {
          "medicineName": "extracted name",
          "genericName": "extracted generic name",
          "strength": "extracted strength",
          "manufacturer": "extracted manufacturer",
          "batchNumber": "extracted batch number",
          "expiryDate": "extracted expiry date",
          "composition": ["ingredient1", "ingredient2"],
          "otherText": ["other text items"],
          "confidence": 0.85,
          "extractionNotes": "any special observations"
        }
        
        Be very careful with medicine names and dosages as accuracy is critical for patient safety.
      `;

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const extractedData = this.parseJSONResponse(text);
      
      // Validate and enhance extracted data
      const validatedData = await this.validateExtractedText(extractedData);
      
      return {
        success: true,
        extractedText: validatedData,
        rawResponse: text,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Text extraction failed:', error);
      return {
        success: false,
        error: error.message,
        extractedText: null
      };
    }
  }

  /**
   * Generate comprehensive analysis prompt for Gemini AI
   */
  generateAnalysisPrompt(options) {
    const basePrompt = `
      You are an expert pharmaceutical AI assistant. Analyze this medicine image comprehensively and provide detailed information.
      
      CRITICAL SAFETY NOTE: This analysis is for informational purposes only. Always consult healthcare professionals for medical advice.
      
      Analyze the image and provide information in the following JSON structure:
      {
        "medicineName": "identified medicine name",
        "brandName": "commercial brand name",
        "genericName": "generic/scientific name",
        "alternativeNames": ["alternative names if any"],
    `;

    if (options.includeComposition) {
      basePrompt += `
        "composition": [
          {
            "activeIngredient": "ingredient name",
            "strength": {
              "value": numeric_value,
              "unit": "mg/ml/g/etc"
            },
            "role": "active/inactive"
          }
        ],
      `;
    }

    if (options.includeTherapeutic) {
      basePrompt += `
        "therapeutic": {
          "therapeuticClass": "therapeutic classification",
          "pharmacologicalClass": "pharmacological class",
          "indication": {
            "primary": ["primary uses"],
            "secondary": ["secondary uses"]
          },
          "contraindications": ["contraindications"],
          "commonSideEffects": ["common side effects"]
        },
      `;
    }

    if (options.includeManufacturer) {
      basePrompt += `
        "manufacturer": {
          "name": "manufacturer name",
          "country": "country of manufacture"
        },
      `;
    }

    if (options.visualFeatureAnalysis) {
      basePrompt += `
        "visualFeatures": {
          "color": "dominant color",
          "shape": "tablet/capsule/liquid shape",
          "size": "estimated size",
          "markings": ["visible markings/imprints"],
          "texture": "smooth/rough/coated",
          "packaging": "strip/bottle/box/tube"
        },
      `;
    }

    if (options.enhancedOCR) {
      basePrompt += `
        "extractedText": {
          "packageText": ["all visible text on package"],
          "dosageInstructions": "dosage instructions if visible",
          "warnings": ["warning text if visible"],
          "batchInfo": "batch/lot information if visible"
        },
      `;
    }

    const closingPrompt = `
        "confidence": {
          "overall": 0.85,
          "nameIdentification": 0.90,
          "compositionAccuracy": 0.80,
          "visualAnalysis": 0.85
        },
        "identificationMethod": "visual_analysis/text_recognition/package_design",
        "safetyWarnings": ["important safety considerations"],
        "recommendedActions": ["suggested next steps for user"],
        "analysisNotes": "additional observations or uncertainties"
      }
      
      IMPORTANT GUIDELINES:
      1. Only provide information you can confidently identify from the image
      2. If uncertain about any detail, indicate lower confidence scores
      3. Never guess critical information like dosages or active ingredients
      4. Include appropriate safety warnings
      5. Be very precise with medicine names as they are critical for patient safety
      6. If the image quality is poor, indicate this in analysisNotes
    `;

    return basePrompt + closingPrompt;
  }

  /**
   * Prepare image data for Gemini AI analysis
   */
  prepareImageData(imageData) {
    let mimeType = 'image/jpeg';
    let data = imageData;

    // Handle different input formats
    if (typeof imageData === 'string') {
      // Check if it's a base64 string
      if (imageData.startsWith('data:image/')) {
        const [header, base64Data] = imageData.split(',');
        mimeType = header.split(':')[1].split(';')[0];
        data = base64Data;
      } else if (imageData.startsWith('/') || imageData.includes('\\')) {
        // File path - read file
        const fileBuffer = fs.readFileSync(imageData);
        data = fileBuffer.toString('base64');
        
        const ext = path.extname(imageData).toLowerCase();
        switch (ext) {
          case '.png': mimeType = 'image/png'; break;
          case '.jpg':
          case '.jpeg': mimeType = 'image/jpeg'; break;
          case '.webp': mimeType = 'image/webp'; break;
          default: mimeType = 'image/jpeg';
        }
      }
    } else if (Buffer.isBuffer(imageData)) {
      data = imageData.toString('base64');
    }

    return {
      inlineData: {
        data: data,
        mimeType: mimeType
      }
    };
  }

  /**
   * Parse AI response into structured format
   */
  async parseAIResponse(response) {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      const requiredFields = ['medicineName', 'confidence'];
      for (const field of requiredFields) {
        if (!parsedData[field]) {
          console.warn(`Missing required field: ${field}`);
        }
      }

      return parsedData;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      // Return a fallback structure
      return {
        medicineName: 'Unknown',
        confidence: { overall: 0.1 },
        analysisNotes: 'Failed to parse AI response properly',
        error: error.message
      };
    }
  }

  /**
   * Enhance AI results with database matching
   */
  async enhanceWithDatabaseMatching(analysisResult) {
    try {
      const { medicineName, brandName, genericName, composition } = analysisResult;
      
      // Search for exact matches in database
      const searchTerms = [medicineName, brandName, genericName].filter(Boolean);
      const exactMatches = await Medicine.find({
        $or: [
          { name: { $in: searchTerms } },
          { brandName: { $in: searchTerms } },
          { genericName: { $in: searchTerms } }
        ],
        status: 'active',
        verificationStatus: 'verified'
      }).limit(5);

      // Search by composition if available
      let compositionMatches = [];
      if (composition && composition.length > 0) {
        const activeIngredients = composition
          .filter(comp => comp.role === 'active')
          .map(comp => comp.activeIngredient);
        
        if (activeIngredients.length > 0) {
          compositionMatches = await Medicine.find({
            'composition.activeIngredient': { $in: activeIngredients },
            status: 'active',
            verificationStatus: 'verified'
          }).limit(5);
        }
      }

      // Merge and rank matches
      const allMatches = [...exactMatches, ...compositionMatches];
      const uniqueMatches = allMatches.filter((medicine, index, self) => 
        index === self.findIndex(m => m._id.toString() === medicine._id.toString())
      );

      // Calculate match scores
      const rankedMatches = uniqueMatches.map(medicine => {
        const score = this.calculateMatchScore(analysisResult, medicine);
        return { medicine, matchScore: score };
      }).sort((a, b) => b.matchScore - a.matchScore);

      return {
        ...analysisResult,
        databaseMatches: rankedMatches.slice(0, 3),
        enhancementConfidence: rankedMatches.length > 0 ? 0.8 : 0.2
      };

    } catch (error) {
      console.error('Database enhancement failed:', error);
      return {
        ...analysisResult,
        databaseMatches: [],
        enhancementError: error.message
      };
    }
  }

  /**
   * Calculate confidence metrics for the analysis
   */
  calculateConfidenceMetrics(analysisResult) {
    const { confidence, databaseMatches = [] } = analysisResult;
    
    const baseConfidence = confidence?.overall || 0.5;
    const nameConfidence = confidence?.nameIdentification || baseConfidence;
    const visualConfidence = confidence?.visualAnalysis || baseConfidence;
    
    // Boost confidence if we have good database matches
    const dbMatchBoost = databaseMatches.length > 0 ? 
      Math.min(0.2, databaseMatches[0].matchScore * 0.2) : 0;
    
    const overallConfidence = Math.min(0.95, 
      (baseConfidence + dbMatchBoost + 
       (nameConfidence * 0.3) + 
       (visualConfidence * 0.2)) / 1.5
    );

    return {
      overallConfidence,
      componentConfidence: {
        aiAnalysis: baseConfidence,
        nameIdentification: nameConfidence,
        visualAnalysis: visualConfidence,
        databaseMatching: dbMatchBoost > 0 ? 0.8 : 0.2
      },
      reliabilityScore: this.calculateReliabilityScore(analysisResult),
      recommendedAction: this.getRecommendedAction(overallConfidence)
    };
  }

  /**
   * Calculate reliability score based on multiple factors
   */
  calculateReliabilityScore(analysisResult) {
    let score = 0;
    
    // Image quality indicators
    if (analysisResult.visualFeatures) score += 0.2;
    if (analysisResult.extractedText?.packageText?.length > 0) score += 0.2;
    if (analysisResult.databaseMatches?.length > 0) score += 0.3;
    if (analysisResult.confidence?.overall > 0.7) score += 0.2;
    if (analysisResult.composition?.length > 0) score += 0.1;
    
    return Math.min(1.0, score);
  }

  /**
   * Get recommended action based on confidence level
   */
  getRecommendedAction(confidence) {
    if (confidence >= 0.8) {
      return 'high_confidence_proceed';
    } else if (confidence >= 0.6) {
      return 'moderate_confidence_verify';
    } else if (confidence >= 0.4) {
      return 'low_confidence_manual_check';
    } else {
      return 'very_low_confidence_reject';
    }
  }

  /**
   * Calculate visual similarity between two sets of visual features
   */
  calculateVisualSimilarity(features1, features2) {
    if (!features1 || !features2) return 0;
    
    let similarity = 0;
    let comparisons = 0;
    
    // Color similarity
    if (features1.color && features2.color) {
      similarity += features1.color.toLowerCase() === features2.color.toLowerCase() ? 1 : 0;
      comparisons++;
    }
    
    // Shape similarity
    if (features1.shape && features2.shape) {
      similarity += features1.shape.toLowerCase() === features2.shape.toLowerCase() ? 1 : 0;
      comparisons++;
    }
    
    // Markings similarity
    if (features1.markings && features2.markings) {
      const commonMarkings = features1.markings.filter(marking => 
        features2.markings.some(m => m.toLowerCase().includes(marking.toLowerCase()))
      );
      similarity += commonMarkings.length / Math.max(features1.markings.length, features2.markings.length);
      comparisons++;
    }
    
    return comparisons > 0 ? similarity / comparisons : 0;
  }

  /**
   * Calculate match score between AI analysis and database medicine
   */
  calculateMatchScore(analysisResult, medicine) {
    let score = 0;
    
    // Name matching
    const names = [medicine.name, medicine.brandName, medicine.genericName].map(n => n.toLowerCase());
    const analysisNames = [
      analysisResult.medicineName,
      analysisResult.brandName,
      analysisResult.genericName
    ].filter(Boolean).map(n => n.toLowerCase());
    
    const nameMatches = analysisNames.some(aName => 
      names.some(dbName => dbName.includes(aName) || aName.includes(dbName))
    );
    
    if (nameMatches) score += 0.5;
    
    // Composition matching
    if (analysisResult.composition && medicine.composition) {
      const analysisIngredients = analysisResult.composition
        .map(c => c.activeIngredient?.toLowerCase())
        .filter(Boolean);
      
      const dbIngredients = medicine.composition
        .map(c => c.activeIngredient?.toLowerCase())
        .filter(Boolean);
      
      const ingredientMatches = analysisIngredients.filter(ai => 
        dbIngredients.some(di => di.includes(ai) || ai.includes(di))
      );
      
      if (ingredientMatches.length > 0) {
        score += (ingredientMatches.length / Math.max(analysisIngredients.length, dbIngredients.length)) * 0.3;
      }
    }
    
    // Visual features matching
    if (analysisResult.visualFeatures && medicine.imageData?.aiRecognitionData?.visualFeatures) {
      const visualSimilarity = this.calculateVisualSimilarity(
        analysisResult.visualFeatures,
        medicine.imageData.aiRecognitionData.visualFeatures
      );
      score += visualSimilarity * 0.2;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Rate limiting for API requests
   */
  async rateLimitRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Parse JSON response with error handling
   */
  parseJSONResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (error) {
      console.error('JSON parsing failed:', error);
      return {};
    }
  }

  /**
   * Validate extracted text data
   */
  async validateExtractedText(extractedData) {
    // Add validation logic here
    // Check for common medicine name patterns, dosage formats, etc.
    
    const validated = { ...extractedData };
    
    // Validate strength/dosage format
    if (validated.strength) {
      const strengthPattern = /(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|iu|units|%)/i;
      if (!strengthPattern.test(validated.strength)) {
        validated.strengthValidation = 'Format may be incorrect';
      }
    }
    
    // Validate expiry date
    if (validated.expiryDate) {
      const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
      if (!datePattern.test(validated.expiryDate)) {
        validated.expiryValidation = 'Date format may be incorrect';
      }
    }
    
    return validated;
  }

  /**
   * Log analysis for model improvement
   */
  async logAnalysis(imageData, analysisResult, confidenceMetrics) {
    try {
      // This could be expanded to log to a dedicated analytics service
      console.log(`Medicine analysis completed:`, {
        confidence: confidenceMetrics.overallConfidence,
        medicineIdentified: analysisResult.medicineName,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }

  /**
   * Generate fallback suggestions when analysis fails
   */
  async generateFallbackSuggestions() {
    return [
      'Try taking a clearer photo with better lighting',
      'Ensure the medicine package/label is fully visible',
      'Clean the camera lens and try again',
      'Use the text search feature instead',
      'Consult a pharmacist for medicine identification'
    ];
  }

  /**
   * Get matched features between two visual feature sets
   */
  getMatchedFeatures(features1, features2) {
    const matched = [];
    
    if (features1.color === features2.color) matched.push('color');
    if (features1.shape === features2.shape) matched.push('shape');
    if (features1.size === features2.size) matched.push('size');
    
    return matched;
  }
}

export default MedicineImageRecognitionService;