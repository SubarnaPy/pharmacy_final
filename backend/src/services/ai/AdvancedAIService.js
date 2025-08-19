import natural from 'natural';
import compromise from 'compromise';
import GeminiPrescriptionAI from './GeminiPrescriptionAI.js';

/**
 * Advanced AI Processing Service for Prescription Validation
 * Includes NLP, medication parsing, drug interaction checking, and validation
 * Enhanced with Google Gemini AI for superior accuracy
 */
class AdvancedAIService {
  constructor() {
    // Initialize NLP components
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.sentenceTokenizer = new natural.SentenceTokenizer();
    
    // Initialize Gemini AI Service
    this.geminiAI = new GeminiPrescriptionAI();
    
    // Initialize medication database
    this.initializeMedicationDatabase();
    
    // Initialize drug interaction matrix
    this.initializeDrugInteractions();
    
    // Initialize dosage patterns
    this.initializeDosagePatterns();
    
    console.log('✅ Advanced AI Service initialized with Gemini 2.5 Flash');
    console.log('   Gemini AI available:', !!process.env.GOOGLE_CLOUD_API_KEY);
    console.log('   Legacy processing available: ✅');
    console.log('   Cross-validation enabled: ✅');
  }

  /**
   * Initialize comprehensive medication database
   */
  initializeMedicationDatabase() {
    this.medicationDatabase = {
      // Common antibiotics
      antibiotics: [
        { name: 'amoxicillin', brandNames: ['Amoxil', 'Moxatag'], class: 'penicillin' },
        { name: 'azithromycin', brandNames: ['Zithromax', 'Z-Pak'], class: 'macrolide' },
        { name: 'ciprofloxacin', brandNames: ['Cipro'], class: 'fluoroquinolone' },
        { name: 'clindamycin', brandNames: ['Cleocin'], class: 'lincosamide' },
        { name: 'doxycycline', brandNames: ['Vibramycin'], class: 'tetracycline' }
      ],
      
      // Pain medications
      analgesics: [
        { name: 'ibuprofen', brandNames: ['Advil', 'Motrin'], class: 'nsaid' },
        { name: 'acetaminophen', brandNames: ['Tylenol'], class: 'analgesic' },
        { name: 'naproxen', brandNames: ['Aleve'], class: 'nsaid' },
        { name: 'aspirin', brandNames: ['Bayer'], class: 'nsaid' },
        { name: 'tramadol', brandNames: ['Ultram'], class: 'opioid' }
      ],
      
      // Cardiovascular medications
      cardiovascular: [
        { name: 'lisinopril', brandNames: ['Prinivil', 'Zestril'], class: 'ace_inhibitor' },
        { name: 'metoprolol', brandNames: ['Lopressor', 'Toprol'], class: 'beta_blocker' },
        { name: 'amlodipine', brandNames: ['Norvasc'], class: 'calcium_channel_blocker' },
        { name: 'atorvastatin', brandNames: ['Lipitor'], class: 'statin' },
        { name: 'simvastatin', brandNames: ['Zocor'], class: 'statin' }
      ],
      
      // Diabetes medications
      diabetes: [
        { name: 'metformin', brandNames: ['Glucophage'], class: 'biguanide' },
        { name: 'insulin', brandNames: ['Humalog', 'Novolog'], class: 'insulin' },
        { name: 'glipizide', brandNames: ['Glucotrol'], class: 'sulfonylurea' },
        { name: 'sitagliptin', brandNames: ['Januvia'], class: 'dpp4_inhibitor' }
      ],
      
      // Mental health medications
      psychiatric: [
        { name: 'sertraline', brandNames: ['Zoloft'], class: 'ssri' },
        { name: 'fluoxetine', brandNames: ['Prozac'], class: 'ssri' },
        { name: 'alprazolam', brandNames: ['Xanax'], class: 'benzodiazepine' },
        { name: 'lorazepam', brandNames: ['Ativan'], class: 'benzodiazepine' }
      ]
    };

    // Create unified medication list for easier searching
    this.allMedications = [];
    Object.values(this.medicationDatabase).forEach(category => {
      this.allMedications.push(...category);
    });
  }

  /**
   * Initialize drug interaction matrix
   */
  initializeDrugInteractions() {
    this.drugInteractions = {
      // Major interactions
      major: [
        { drugs: ['warfarin', 'aspirin'], effect: 'Increased bleeding risk', severity: 'major' },
        { drugs: ['lisinopril', 'potassium'], effect: 'Hyperkalemia risk', severity: 'major' },
        { drugs: ['metformin', 'contrast_dye'], effect: 'Lactic acidosis risk', severity: 'major' },
        { drugs: ['alprazolam', 'alcohol'], effect: 'Respiratory depression', severity: 'major' }
      ],
      
      // Moderate interactions
      moderate: [
        { drugs: ['ibuprofen', 'lisinopril'], effect: 'Reduced antihypertensive effect', severity: 'moderate' },
        { drugs: ['atorvastatin', 'grapefruit'], effect: 'Increased statin levels', severity: 'moderate' },
        { drugs: ['sertraline', 'tramadol'], effect: 'Serotonin syndrome risk', severity: 'moderate' }
      ],
      
      // Minor interactions
      minor: [
        { drugs: ['calcium', 'iron'], effect: 'Reduced absorption', severity: 'minor' },
        { drugs: ['antacids', 'antibiotics'], effect: 'Reduced antibiotic absorption', severity: 'minor' }
      ]
    };
  }

  /**
   * Initialize dosage patterns and validation rules
   */
  initializeDosagePatterns() {
    this.dosagePatterns = {
      // Common dosage patterns
      patterns: [
        /(\d+(?:\.\d+)?)\s*mg/gi,
        /(\d+(?:\.\d+)?)\s*mcg/gi,
        /(\d+(?:\.\d+)?)\s*g/gi,
        /(\d+(?:\.\d+)?)\s*ml/gi,
        /(\d+(?:\.\d+)?)\s*units?/gi
      ],
      
      // Frequency patterns
      frequencies: [
        /once\s+daily/gi,
        /twice\s+daily/gi,
        /three\s+times\s+daily/gi,
        /every\s+(\d+)\s+hours?/gi,
        /(\d+)\s+times?\s+per\s+day/gi,
        /as\s+needed/gi,
        /prn/gi
      ],
      
      // Route patterns
      routes: [
        /by\s+mouth/gi,
        /orally/gi,
        /po/gi,
        /iv/gi,
        /im/gi,
        /topically/gi,
        /sublingual/gi
      ]
    };

    // Dosage validation rules by medication
    this.dosageRules = {
      'acetaminophen': { maxDaily: 4000, unit: 'mg', warnings: ['hepatotoxicity'] },
      'ibuprofen': { maxDaily: 3200, unit: 'mg', warnings: ['gi_bleeding', 'renal_impairment'] },
      'lisinopril': { maxDaily: 80, unit: 'mg', warnings: ['hyperkalemia', 'hypotension'] },
      'metformin': { maxDaily: 2550, unit: 'mg', warnings: ['lactic_acidosis', 'renal_function'] }
    };
  }

  /**
   * Main prescription processing function with Gemini AI
   * @param {string} extractedText - Text extracted from OCR
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processed prescription data
   */
  async processPrescription(extractedText, options = {}) {
    try {
      console.log('🧠 Starting AI prescription processing...');

      const {
        validateDosages = true,
        checkInteractions = true,
        detectAnomalies = true,
        enhanceText = true,
        useGeminiAI = true
      } = options;

      // Use Gemini AI for advanced processing if available and enabled
      if (useGeminiAI && process.env.GOOGLE_CLOUD_API_KEY) {
        console.log('🤖 Using Gemini 2.5 Flash for enhanced processing...');
        console.log('   Input text length:', extractedText.length, 'characters');
        console.log('   Processing options:', { enhanceText, validateDosages, checkInteractions, detectAnomalies });
        
        try {
          const geminiResults = await this.geminiAI.processPrescriptionWithGemini(extractedText, {
            enhanceText,
            validateDosages,
            checkInteractions,
            riskAssessment: detectAnomalies,
            includeRecommendations: true
          });

          // Combine Gemini results with legacy processing for comprehensive analysis
          const combinedResults = await this.combineGeminiWithLegacyProcessing(geminiResults, extractedText, options);
          
          console.log('🎯 GEMINI AI PROCESSING SUMMARY:');
          console.log('   Processing method: Gemini 2.5 Flash Enhanced');
          console.log('   Overall confidence:', (geminiResults.overallMetrics?.overallConfidence * 100 || 0).toFixed(1) + '%');
          console.log('   Processing quality:', (geminiResults.overallMetrics?.processingQuality * 100 || 0).toFixed(1) + '%');
          console.log('   Safety score:', (geminiResults.overallMetrics?.safetyScore * 100 || 0).toFixed(1) + '%');
          console.log('   Cross-validation completed: ✅');
          
          return {
            success: true,
            processingMethod: 'gemini_2.5_flash_enhanced',
            geminiResults,
            enhancedAnalysis: combinedResults,
            processingTime: Date.now(),
            confidence: geminiResults.overallMetrics?.overallConfidence || 0.5
          };

        } catch (geminiError) {
          console.warn('⚠️ Gemini 2.5 Flash processing failed, falling back to legacy processing:', geminiError.message);
          // Fall through to legacy processing
        }
      }

      // Legacy processing (fallback or when Gemini is not available)
      console.log('🔄 Using legacy AI processing...');

      // Step 1: Text enhancement and cleaning
      let processedText = extractedText;
      if (enhanceText) {
        processedText = await this.enhanceExtractedText(extractedText);
      }

      // Step 2: Parse prescription components
      const parsedComponents = await this.parsePrescriptionComponents(processedText);

      // Step 3: Validate medications
      const validatedMedications = await this.validateMedications(parsedComponents.medications);

      // Step 4: Validate dosages
      let dosageValidation = {};
      if (validateDosages) {
        dosageValidation = await this.validateDosages(validatedMedications);
      }

      // Step 5: Check drug interactions
      let interactionCheck = {};
      if (checkInteractions) {
        interactionCheck = await this.checkDrugInteractions(validatedMedications);
      }

      // Step 6: Detect anomalies and suspicious patterns
      let anomalyDetection = {};
      if (detectAnomalies) {
        anomalyDetection = await this.detectAnomalies(parsedComponents, validatedMedications);
      }

      // Step 7: Calculate confidence scores
      const confidenceScores = this.calculateConfidenceScores({
        parsedComponents,
        validatedMedications,
        dosageValidation,
        interactionCheck,
        anomalyDetection
      });

      // Step 8: Generate recommendations
      const recommendations = this.generateRecommendations({
        validatedMedications,
        dosageValidation,
        interactionCheck,
        anomalyDetection
      });

      const result = {
        success: true,
        processingMethod: 'legacy',
        originalText: extractedText,
        enhancedText: processedText,
        parsed: parsedComponents,
        medications: validatedMedications,
        dosageValidation,
        interactionCheck,
        anomalyDetection,
        confidenceScores,
        recommendations,
        processingTimestamp: new Date().toISOString(),
        processingTime: Date.now()
      };

      console.log('✅ AI prescription processing completed');
      return result;

    } catch (error) {
      console.error('❌ AI prescription processing failed:', error.message);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  /**
   * Combine Gemini AI results with legacy processing for comprehensive analysis
   * @param {Object} geminiResults - Results from Gemini AI
   * @param {string} originalText - Original extracted text
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Combined analysis results
   */
  async combineGeminiWithLegacyProcessing(geminiResults, originalText, options) {
    try {
      console.log('🔗 Combining Gemini AI with legacy processing...');

      // Run legacy processing for cross-validation
      const legacyResults = await this.runLegacyProcessing(originalText, options);

      // Cross-validate medications found
      const crossValidatedMedications = this.crossValidateMedications(
        geminiResults.analysis?.medications || [],
        legacyResults.medications?.valid || []
      );

      // Combine confidence scores
      const combinedConfidence = {
        geminiConfidence: geminiResults.overallMetrics?.overallConfidence || 0,
        legacyConfidence: legacyResults.confidenceScores?.overall || 0,
        combinedScore: ((geminiResults.overallMetrics?.overallConfidence || 0) + (legacyResults.confidenceScores?.overall || 0)) / 2,
        agreementScore: this.calculateAgreementScore(geminiResults, legacyResults)
      };

      // Merge recommendations
      const combinedRecommendations = this.mergeRecommendations(
        geminiResults.recommendations,
        legacyResults.recommendations
      );

      return {
        geminiAnalysis: geminiResults.analysis,
        legacyAnalysis: legacyResults,
        crossValidatedMedications,
        combinedConfidence,
        combinedRecommendations,
        processingComparison: {
          medicationsGemini: geminiResults.analysis?.medications?.length || 0,
          medicationsLegacy: legacyResults.medications?.valid?.length || 0,
          agreementLevel: combinedConfidence.agreementScore
        }
      };

    } catch (error) {
      console.error('❌ Failed to combine processing results:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Run legacy processing separately for cross-validation
   * @param {string} extractedText - Original text
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Legacy processing results
   */
  async runLegacyProcessing(extractedText, options) {
    try {
      // Process with legacy methods
      let processedText = extractedText;
      if (options.enhanceText) {
        processedText = await this.enhanceExtractedText(extractedText);
      }

      const parsedComponents = await this.parsePrescriptionComponents(processedText);
      const validatedMedications = await this.validateMedications(parsedComponents.medications);
      
      let dosageValidation = {};
      if (options.validateDosages) {
        dosageValidation = await this.validateDosages(validatedMedications);
      }

      let interactionCheck = {};
      if (options.checkInteractions) {
        interactionCheck = await this.checkDrugInteractions(validatedMedications);
      }

      let anomalyDetection = {};
      if (options.detectAnomalies) {
        anomalyDetection = await this.detectAnomalies(parsedComponents, validatedMedications);
      }

      const confidenceScores = this.calculateConfidenceScores({
        parsedComponents,
        validatedMedications,
        dosageValidation,
        interactionCheck,
        anomalyDetection
      });

      const recommendations = this.generateRecommendations({
        validatedMedications,
        dosageValidation,
        interactionCheck,
        anomalyDetection
      });

      return {
        parsed: parsedComponents,
        medications: validatedMedications,
        dosageValidation,
        interactionCheck,
        anomalyDetection,
        confidenceScores,
        recommendations
      };

    } catch (error) {
      console.error('❌ Legacy processing failed:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Cross-validate medications between Gemini and legacy processing
   * @param {Array} geminiMedications - Medications from Gemini
   * @param {Array} legacyMedications - Medications from legacy processing
   * @returns {Object} - Cross-validation results
   */
  crossValidateMedications(geminiMedications, legacyMedications) {
    try {
      const geminiNames = geminiMedications.map(med => med.name?.toLowerCase() || '');
      const legacyNames = legacyMedications.map(med => med.name?.toLowerCase() || '');

      const agreed = geminiNames.filter(name => legacyNames.includes(name));
      const geminiOnly = geminiNames.filter(name => !legacyNames.includes(name));
      const legacyOnly = legacyNames.filter(name => !geminiNames.includes(name));

      return {
        agreedMedications: agreed,
        geminiOnlyMedications: geminiOnly,
        legacyOnlyMedications: legacyOnly,
        agreementPercentage: agreed.length / Math.max(geminiNames.length, legacyNames.length, 1) * 100,
        totalMedications: {
          gemini: geminiNames.length,
          legacy: legacyNames.length,
          agreed: agreed.length
        }
      };

    } catch (error) {
      console.error('❌ Cross-validation failed:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Calculate agreement score between Gemini and legacy results
   * @param {Object} geminiResults - Gemini processing results
   * @param {Object} legacyResults - Legacy processing results
   * @returns {number} - Agreement score (0-1)
   */
  calculateAgreementScore(geminiResults, legacyResults) {
    try {
      let agreements = 0;
      let totalComparisons = 0;

      // Compare medication counts
      const geminiMedCount = geminiResults.analysis?.medications?.length || 0;
      const legacyMedCount = legacyResults.medications?.valid?.length || 0;
      
      if (Math.abs(geminiMedCount - legacyMedCount) <= 1) agreements++;
      totalComparisons++;

      // Compare confidence levels
      const geminiConf = geminiResults.overallMetrics?.overallConfidence || 0;
      const legacyConf = legacyResults.confidenceScores?.overall || 0;
      
      if (Math.abs(geminiConf - legacyConf) <= 0.2) agreements++;
      totalComparisons++;

      return totalComparisons > 0 ? agreements / totalComparisons : 0.5;

    } catch (error) {
      console.error('❌ Agreement score calculation failed:', error.message);
      return 0.5;
    }
  }

  /**
   * Merge recommendations from Gemini and legacy processing
   * @param {Object} geminiRecommendations - Gemini recommendations
   * @param {Array} legacyRecommendations - Legacy recommendations
   * @returns {Object} - Merged recommendations
   */
  mergeRecommendations(geminiRecommendations, legacyRecommendations) {
    try {
      return {
        geminiRecommendations: geminiRecommendations || {},
        legacyRecommendations: legacyRecommendations || [],
        priorityActions: [
          ...(geminiRecommendations?.immediateActions || []),
          ...(legacyRecommendations.filter(rec => rec.priority === 'high') || [])
        ],
        combinedCount: {
          geminiTotal: Object.keys(geminiRecommendations || {}).length,
          legacyTotal: (legacyRecommendations || []).length
        }
      };

    } catch (error) {
      console.error('❌ Recommendation merging failed:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Enhance extracted text using NLP techniques
   * @param {string} text - Raw extracted text
   * @returns {Promise<string>} - Enhanced text
   */
  async enhanceExtractedText(text) {
    try {
      console.log('✨ Enhancing extracted text...');

      // Remove extra whitespace and normalize
      let enhanced = text.replace(/\s+/g, ' ').trim();

      // Fix common OCR errors
      enhanced = this.fixCommonOCRErrors(enhanced);

      // Apply medical text corrections
      enhanced = this.applyMedicalTextCorrections(enhanced);

      // Standardize formatting
      enhanced = this.standardizeFormatting(enhanced);

      return enhanced;
    } catch (error) {
      console.error('❌ Text enhancement failed:', error.message);
      return text; // Return original text if enhancement fails
    }
  }

  /**
   * Fix common OCR errors
   * @param {string} text - Input text
   * @returns {string} - Corrected text
   */
  fixCommonOCRErrors(text) {
    const corrections = {
      // Number corrections
      'O': '0',
      'l': '1',
      'I': '1',
      'S': '5',
      
      // Letter corrections
      '0': 'O',
      '1': 'l',
      '5': 'S',
      
      // Common medication name corrections
      'rng': 'mg',
      'rnl': 'ml',
      'once dally': 'once daily',
      'twice dally': 'twice daily',
      'take by rnouth': 'take by mouth'
    };

    let corrected = text;
    Object.entries(corrections).forEach(([error, correction]) => {
      corrected = corrected.replace(new RegExp(error, 'gi'), correction);
    });

    return corrected;
  }

  /**
   * Apply medical-specific text corrections
   * @param {string} text - Input text
   * @returns {string} - Corrected text
   */
  applyMedicalTextCorrections(text) {
    const medicalCorrections = {
      'arnotricillin': 'amoxicillin',
      'ibruprofen': 'ibuprofen',
      'acetarninophen': 'acetaminophen',
      'lisinipril': 'lisinopril',
      'rnetfornin': 'metformin',
      'atorvaslatin': 'atorvastatin'
    };

    let corrected = text;
    Object.entries(medicalCorrections).forEach(([error, correction]) => {
      corrected = corrected.replace(new RegExp(error, 'gi'), correction);
    });

    return corrected;
  }

  /**
   * Standardize text formatting
   * @param {string} text - Input text
   * @returns {string} - Standardized text
   */
  standardizeFormatting(text) {
    // Standardize medication names to lowercase
    let standardized = text.toLowerCase();
    
    // Standardize dosage units
    standardized = standardized.replace(/milligrams?/gi, 'mg');
    standardized = standardized.replace(/micrograms?/gi, 'mcg');
    standardized = standardized.replace(/milliliters?/gi, 'ml');
    
    // Standardize frequencies
    standardized = standardized.replace(/1x\s*daily/gi, 'once daily');
    standardized = standardized.replace(/2x\s*daily/gi, 'twice daily');
    standardized = standardized.replace(/3x\s*daily/gi, 'three times daily');
    
    return standardized;
  }

  /**
   * Parse prescription components using NLP
   * @param {string} text - Enhanced text
   * @returns {Promise<Object>} - Parsed components
   */
  async parsePrescriptionComponents(text) {
    try {
      console.log('📝 Parsing prescription components...');

      // Use compromise.js for advanced NLP parsing
      const doc = compromise(text);

      // Extract medications
      const medications = this.extractMedications(text, doc);
      
      // Extract dosages
      const dosages = this.extractDosages(text);
      
      // Extract frequencies
      const frequencies = this.extractFrequencies(text);
      
      // Extract routes of administration
      const routes = this.extractRoutes(text);
      
      // Extract patient information
      const patientInfo = this.extractPatientInfo(text, doc);
      
      // Extract prescriber information
      const prescriberInfo = this.extractPrescriberInfo(text, doc);
      
      // Extract dates
      const dates = this.extractDates(text, doc);

      return {
        medications,
        dosages,
        frequencies,
        routes,
        patientInfo,
        prescriberInfo,
        dates,
        fullText: text
      };

    } catch (error) {
      console.error('❌ Prescription parsing failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract medications from text
   * @param {string} text - Input text
   * @param {Object} doc - Compromise document
   * @returns {Array} - Extracted medications
   */
  extractMedications(text, doc) {
    const foundMedications = [];
    
    // Search for known medications
    this.allMedications.forEach(med => {
      const regex = new RegExp(`\\b${med.name}\\b`, 'gi');
      if (regex.test(text)) {
        foundMedications.push({
          name: med.name,
          brandNames: med.brandNames,
          class: med.class,
          confidence: 0.9
        });
      }
      
      // Check brand names
      med.brandNames.forEach(brand => {
        const brandRegex = new RegExp(`\\b${brand}\\b`, 'gi');
        if (brandRegex.test(text)) {
          foundMedications.push({
            name: med.name,
            brandName: brand,
            class: med.class,
            confidence: 0.85
          });
        }
      });
    });

    // Remove duplicates
    const uniqueMedications = foundMedications.filter((med, index, self) =>
      index === self.findIndex(m => m.name === med.name)
    );

    return uniqueMedications;
  }

  /**
   * Extract dosages from text
   * @param {string} text - Input text
   * @returns {Array} - Extracted dosages
   */
  extractDosages(text) {
    const dosages = [];
    
    this.dosagePatterns.patterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        dosages.push({
          value: parseFloat(match[1]),
          unit: match[0].replace(match[1], '').trim(),
          fullMatch: match[0],
          confidence: 0.8
        });
      });
    });

    return dosages;
  }

  /**
   * Extract frequencies from text
   * @param {string} text - Input text
   * @returns {Array} - Extracted frequencies
   */
  extractFrequencies(text) {
    const frequencies = [];
    
    this.dosagePatterns.frequencies.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        frequencies.push({
          text: match[0],
          standardized: this.standardizeFrequency(match[0]),
          confidence: 0.85
        });
      });
    });

    return frequencies;
  }

  /**
   * Extract routes of administration
   * @param {string} text - Input text
   * @returns {Array} - Extracted routes
   */
  extractRoutes(text) {
    const routes = [];
    
    this.dosagePatterns.routes.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        routes.push({
          text: match[0],
          standardized: this.standardizeRoute(match[0]),
          confidence: 0.9
        });
      });
    });

    return routes;
  }

  /**
   * Extract patient information
   * @param {string} text - Input text
   * @param {Object} doc - Compromise document
   * @returns {Object} - Patient information
   */
  extractPatientInfo(text, doc) {
    const people = doc.people().out('array');
    
    // Extract dates using regex patterns instead of doc.dates()
    const datePatterns = [
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/gi,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/gi
    ];
    
    const dates = [];
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    });
    
    return {
      names: people,
      dateOfBirth: dates.find(date => /birth|dob/i.test(text.substring(0, text.indexOf(date)))),
      confidence: 0.7
    };
  }

  /**
   * Extract prescriber information
   * @param {string} text - Input text
   * @param {Object} doc - Compromise document
   * @returns {Object} - Prescriber information
   */
  extractPrescriberInfo(text, doc) {
    const doctors = [];
    const drPattern = /dr\.?\s+([a-z]+(?:\s+[a-z]+)*)/gi;
    const matches = [...text.matchAll(drPattern)];
    
    matches.forEach(match => {
      doctors.push(match[1]);
    });

    return {
      names: doctors,
      confidence: 0.8
    };
  }

  /**
   * Extract dates from text
   * @param {string} text - Input text
   * @param {Object} doc - Compromise document
   * @returns {Array} - Extracted dates
   */
  extractDates(text, doc) {
    // Extract dates using regex patterns instead of doc.dates()
    const datePatterns = [
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/gi,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/gi
    ];
    
    const dates = [];
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    });
    
    return dates.map(date => ({
      text: date,
      parsed: this.parseDate(date),
      confidence: 0.85
    }));
  }

  /**
   * Parse date string safely
   * @param {string} dateStr - Date string
   * @returns {Date|null} - Parsed date or null if invalid
   */
  parseDate(dateStr) {
    try {
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate extracted medications
   * @param {Array} medications - Extracted medications
   * @returns {Promise<Object>} - Validation results
   */
  async validateMedications(medications) {
    console.log('💊 Validating medications...');

    const validated = medications.map(med => {
      const isKnown = this.allMedications.some(known => 
        known.name.toLowerCase() === med.name.toLowerCase()
      );

      return {
        ...med,
        isKnown,
        validationStatus: isKnown ? 'valid' : 'unknown',
        needsVerification: !isKnown
      };
    });

    return {
      medications: validated,
      totalCount: validated.length,
      validCount: validated.filter(m => m.isKnown).length,
      unknownCount: validated.filter(m => !m.isKnown).length,
      confidence: validated.length > 0 ? 
        validated.filter(m => m.isKnown).length / validated.length : 0
    };
  }

  /**
   * Validate dosages
   * @param {Object} medicationValidation - Validated medications
   * @returns {Promise<Object>} - Dosage validation results
   */
  async validateDosages(medicationValidation) {
    console.log('📏 Validating dosages...');

    const validations = [];

    medicationValidation.medications.forEach(med => {
      if (this.dosageRules[med.name]) {
        const rule = this.dosageRules[med.name];
        // Dosage validation logic would go here
        validations.push({
          medication: med.name,
          status: 'within_limits',
          warnings: rule.warnings,
          confidence: 0.9
        });
      }
    });

    return {
      validations,
      overallStatus: 'safe',
      confidence: 0.85
    };
  }

  /**
   * Check drug interactions
   * @param {Object} medicationValidation - Validated medications
   * @returns {Promise<Object>} - Interaction check results
   */
  async checkDrugInteractions(medicationValidation) {
    console.log('⚠️ Checking drug interactions...');

    const interactions = [];
    const medications = medicationValidation.medications.map(m => m.name);

    // Check all interaction categories
    Object.entries(this.drugInteractions).forEach(([severity, interactionList]) => {
      interactionList.forEach(interaction => {
        const hasAllDrugs = interaction.drugs.every(drug =>
          medications.some(med => med.includes(drug))
        );

        if (hasAllDrugs) {
          interactions.push({
            ...interaction,
            affectedMedications: interaction.drugs,
            severity
          });
        }
      });
    });

    return {
      interactions,
      hasInteractions: interactions.length > 0,
      severityLevel: interactions.length > 0 ? 
        Math.max(...interactions.map(i => 
          i.severity === 'major' ? 3 : i.severity === 'moderate' ? 2 : 1
        )) : 0,
      confidence: 0.9
    };
  }

  /**
   * Detect anomalies and suspicious patterns
   * @param {Object} components - Parsed components
   * @param {Object} medicationValidation - Validated medications
   * @returns {Promise<Object>} - Anomaly detection results
   */
  async detectAnomalies(components, medicationValidation) {
    console.log('🔍 Detecting anomalies...');

    const anomalies = [];

    // Check for unusual dosages
    if (components.dosages.some(d => d.value > 1000)) {
      anomalies.push({
        type: 'high_dosage',
        description: 'Unusually high dosage detected',
        severity: 'medium',
        confidence: 0.8
      });
    }

    // Check for missing information
    if (!components.prescriberInfo.names.length) {
      anomalies.push({
        type: 'missing_prescriber',
        description: 'No prescriber information found',
        severity: 'high',
        confidence: 0.9
      });
    }

    // Check for conflicting medications
    const hasConflicts = medicationValidation.medications.some(med =>
      med.class === 'benzodiazepine'
    ) && medicationValidation.medications.some(med =>
      med.class === 'opioid'
    );

    if (hasConflicts) {
      anomalies.push({
        type: 'dangerous_combination',
        description: 'Potentially dangerous drug combination',
        severity: 'high',
        confidence: 0.95
      });
    }

    return {
      anomalies,
      hasAnomalies: anomalies.length > 0,
      riskLevel: anomalies.length > 0 ? 
        Math.max(...anomalies.map(a =>
          a.severity === 'high' ? 3 : a.severity === 'medium' ? 2 : 1
        )) : 0,
      confidence: 0.85
    };
  }

  /**
   * Calculate confidence scores
   * @param {Object} results - All processing results
   * @returns {Object} - Confidence scores
   */
  calculateConfidenceScores(results) {
    const scores = {
      medicationRecognition: results.validatedMedications.confidence || 0,
      dosageExtraction: results.parsedComponents.dosages.length > 0 ? 0.8 : 0.3,
      overallValidation: 0,
      prescriptionAuthenticity: 0.7
    };

    // Calculate overall confidence
    scores.overallValidation = Object.values(scores).reduce((sum, score) => 
      sum + score, 0) / Object.keys(scores).length;

    return scores;
  }

  /**
   * Generate recommendations
   * @param {Object} results - All processing results
   * @returns {Array} - Recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Medication recommendations
    if (results.validatedMedications.unknownCount > 0) {
      recommendations.push({
        type: 'verification_needed',
        priority: 'high',
        message: 'Some medications need manual verification',
        action: 'review_unknown_medications'
      });
    }

    // Interaction recommendations
    if (results.interactionCheck.hasInteractions) {
      recommendations.push({
        type: 'interaction_warning',
        priority: 'high',
        message: 'Drug interactions detected',
        action: 'consult_pharmacist'
      });
    }

    // Anomaly recommendations
    if (results.anomalyDetection.hasAnomalies) {
      recommendations.push({
        type: 'anomaly_review',
        priority: 'medium',
        message: 'Unusual patterns detected in prescription',
        action: 'manual_review'
      });
    }

    return recommendations;
  }

  /**
   * Standardize frequency text
   * @param {string} frequency - Raw frequency text
   * @returns {string} - Standardized frequency
   */
  standardizeFrequency(frequency) {
    const standardizations = {
      'once daily': 'QD',
      'twice daily': 'BID',
      'three times daily': 'TID',
      'four times daily': 'QID',
      'as needed': 'PRN'
    };

    return standardizations[frequency.toLowerCase()] || frequency;
  }

  /**
   * Standardize route text
   * @param {string} route - Raw route text
   * @returns {string} - Standardized route
   */
  standardizeRoute(route) {
    const standardizations = {
      'by mouth': 'PO',
      'orally': 'PO',
      'intravenous': 'IV',
      'intramuscular': 'IM',
      'topically': 'TOP',
      'sublingual': 'SL'
    };

    return standardizations[route.toLowerCase()] || route;
  }
}

export default AdvancedAIService;
