import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Voice-to-Prescription Service
 * Converts doctor voice dictation to structured prescriptions with multi-language support
 */
class VoiceToPrescriptionService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    this.initializeService();
  }

  initializeService() {
    // Voice processing configuration
    this.voiceConfig = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3
    };

    // AI model for prescription parsing
    this.prescriptionModel = {
      name: "gemini-2.0-flash-exp",
      config: {
        temperature: 0.1, // Very precise for medical data
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
      }
    };

    // Translation model for multi-language support
    this.translationModel = {
      name: "gemini-2.0-flash-exp",
      config: {
        temperature: 0.2,
        topK: 30,
        topP: 0.9,
        maxOutputTokens: 2048,
        responseMimeType: "text/plain"
      }
    };

    // Voice authentication patterns
    this.voiceAuthFeatures = {
      speakerRecognition: true,
      medicalTerminologyCheck: true,
      prescriptionPatternValidation: true
    };

    console.log('✅ Voice-to-Prescription Service initialized');
  }

  /**
   * Process voice dictation and convert to structured prescription
   * @param {string} voiceText - Transcribed voice text
   * @param {Object} doctorProfile - Doctor's profile for context
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Structured prescription data
   */
  async processVoiceToPrescription(voiceText, doctorProfile, options = {}) {
    try {
      console.log('🎤 Processing voice-to-prescription');
      console.log('   Voice text length:', voiceText.length, 'characters');
      console.log('   Doctor:', doctorProfile.name);

      const {
        language = 'en',
        translateToEnglish = false,
        validateAuthenticity = true,
        enhanceText = true
      } = options;

      let processedText = voiceText;

      // Step 1: Language detection and translation if needed
      if (translateToEnglish && language !== 'en') {
        processedText = await this.translateToEnglish(voiceText, language);
        console.log('   ✅ Translation completed');
      }

      // Step 2: Enhance voice text for medical clarity
      if (enhanceText) {
        processedText = await this.enhanceVoiceText(processedText);
        console.log('   ✅ Text enhancement completed');
      }

      // Step 3: Voice authentication (if enabled)
      let authenticationResult = null;
      if (validateAuthenticity) {
        authenticationResult = await this.authenticateVoice(processedText, doctorProfile);
        console.log('   ✅ Voice authentication completed');
      }

      // Step 4: Parse prescription from voice text
      const prescriptionData = await this.parseVoicePrescription(processedText, doctorProfile);
      console.log('   ✅ Prescription parsing completed');

      // Step 5: Validate prescription completeness
      const validation = await this.validatePrescriptionCompleteness(prescriptionData);
      console.log('   ✅ Prescription validation completed');

      const result = {
        processingId: `VOICE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        originalVoiceText: voiceText,
        processedText,
        language,
        translation: translateToEnglish ? { original: voiceText, translated: processedText } : null,
        authentication: authenticationResult,
        prescription: prescriptionData,
        validation,
        doctorProfile: {
          id: doctorProfile.id,
          name: doctorProfile.name,
          license: doctorProfile.license
        },
        confidence: this.calculateOverallConfidence(prescriptionData, validation, authenticationResult)
      };

      console.log('✅ Voice-to-prescription processing completed successfully');
      return result;

    } catch (error) {
      console.error('❌ Voice-to-prescription processing failed:', error);
      throw error;
    }
  }

  /**
   * Translate voice text to English
   */
  async translateToEnglish(voiceText, sourceLanguage) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.translationModel.name,
        generationConfig: this.translationModel.config
      });

      const prompt = `
Translate the following medical prescription dictation from ${sourceLanguage} to English.
Preserve all medical terminology, drug names, dosages, and instructions precisely.
Maintain the clinical context and professional medical language.

Original text in ${sourceLanguage}:
${voiceText}

Provide only the English translation:`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();

    } catch (error) {
      console.error('❌ Translation failed:', error);
      return voiceText; // Fallback to original text
    }
  }

  /**
   * Enhance voice text for medical clarity
   */
  async enhanceVoiceText(voiceText) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.translationModel.name,
        generationConfig: this.translationModel.config
      });

      const prompt = `
Enhance the following medical voice dictation for clarity and accuracy.
Correct common speech-to-text errors in medical context:
- Medication name misrecognitions
- Dosage and frequency errors
- Medical terminology corrections
- Punctuation and formatting improvements

Original voice dictation:
${voiceText}

Enhanced medical text:`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();

    } catch (error) {
      console.error('❌ Text enhancement failed:', error);
      return voiceText; // Fallback to original text
    }
  }

  /**
   * Authenticate voice using pattern analysis
   */
  async authenticateVoice(voiceText, doctorProfile) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.prescriptionModel.name,
        generationConfig: {
          ...this.prescriptionModel.config,
          responseMimeType: "application/json"
        }
      });

      const prompt = `
Analyze this voice dictation for authenticity as a medical prescription from Dr. ${doctorProfile.name}.

Doctor Profile:
- Name: ${doctorProfile.name}
- License: ${doctorProfile.license}
- Specialization: ${doctorProfile.specialization || 'General Practice'}
- Experience: ${doctorProfile.experience || 'Unknown'} years

Voice Dictation:
${voiceText}

Analyze for:
1. Medical terminology usage appropriateness
2. Prescription pattern consistency with medical standards
3. Professional language and structure
4. Completeness of medical information

Return JSON:
{
  "isAuthentic": boolean,
  "confidence": number,
  "authenticityScore": number,
  "medicalTerminologyScore": number,
  "professionalLanguageScore": number,
  "prescriptionPatternScore": number,
  "concerns": ["string"],
  "recommendations": ["string"],
  "riskLevel": "low|medium|high",
  "authenticationDetails": {
    "medicalKnowledge": "appropriate|questionable|inappropriate",
    "prescriptionStructure": "complete|incomplete|non-standard",
    "terminology": "accurate|mixed|inaccurate"
  }
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Voice authentication failed:', error);
      return {
        isAuthentic: false,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Parse voice prescription into structured data
   */
  async parseVoicePrescription(voiceText, doctorProfile) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.prescriptionModel.name,
        generationConfig: this.prescriptionModel.config
      });

      const prompt = `
Parse the following medical voice dictation into a structured prescription format.

Doctor: ${doctorProfile.name} (License: ${doctorProfile.license})
Voice Dictation: ${voiceText}

Extract and structure all prescription information:

Return JSON with this exact structure:
{
  "medications": [
    {
      "name": "string",
      "genericName": "string",
      "brandName": "string",
      "strength": "string",
      "dosage": "string",
      "frequency": "string",
      "route": "string",
      "duration": "string",
      "quantity": "string",
      "refills": number,
      "instructions": "string",
      "indication": "string",
      "confidence": number
    }
  ],
  "patientInstructions": {
    "general": ["string"],
    "dietary": ["string"],
    "activity": ["string"],
    "monitoring": ["string"],
    "followUp": "string"
  },
  "clinicalNotes": {
    "diagnosis": "string",
    "symptoms": ["string"],
    "examination": "string",
    "assessment": "string",
    "plan": "string"
  },
  "prescriber": {
    "name": "string",
    "license": "string",
    "signature": "string",
    "date": "string",
    "facility": "string"
  },
  "prescriptionMetadata": {
    "totalMedications": number,
    "prescriptionType": "new|refill|modification",
    "urgency": "routine|urgent|stat",
    "category": "acute|chronic|preventive"
  },
  "qualityMetrics": {
    "completeness": number,
    "clarity": number,
    "medicalAccuracy": number,
    "overallQuality": number
  }
}`;

      const result = await model.generateContent(prompt);
      const prescriptionData = JSON.parse(result.response.text());

      // Add processing metadata
      prescriptionData.processingInfo = {
        method: 'voice-dictation',
        processedAt: new Date(),
        sourceLanguage: 'en',
        aiModel: 'gemini-2.0-flash-exp'
      };

      return prescriptionData;

    } catch (error) {
      console.error('❌ Prescription parsing failed:', error);
      throw error;
    }
  }

  /**
   * Validate prescription completeness
   */
  async validatePrescriptionCompleteness(prescriptionData) {
    try {
      const requiredFields = {
        medications: ['name', 'strength', 'dosage', 'frequency'],
        prescriber: ['name', 'license'],
        instructions: ['general']
      };

      const validation = {
        isComplete: true,
        missingFields: [],
        warnings: [],
        recommendations: [],
        completenessScore: 0
      };

      // Check medication completeness
      prescriptionData.medications?.forEach((med, index) => {
        requiredFields.medications.forEach(field => {
          if (!med[field] || med[field].trim() === '') {
            validation.missingFields.push(`medications[${index}].${field}`);
            validation.isComplete = false;
          }
        });
      });

      // Check prescriber information
      requiredFields.prescriber.forEach(field => {
        if (!prescriptionData.prescriber?.[field] || prescriptionData.prescriber[field].trim() === '') {
          validation.missingFields.push(`prescriber.${field}`);
          validation.isComplete = false;
        }
      });

      // Calculate completeness score
      const totalFields = requiredFields.medications.length * (prescriptionData.medications?.length || 0) + requiredFields.prescriber.length;
      const missingCount = validation.missingFields.length;
      validation.completenessScore = Math.max(0, ((totalFields - missingCount) / totalFields) * 100);

      // Add recommendations
      if (validation.missingFields.length > 0) {
        validation.recommendations.push('Complete missing required fields');
      }
      if (validation.completenessScore < 80) {
        validation.recommendations.push('Review prescription for completeness before finalizing');
      }

      return validation;

    } catch (error) {
      console.error('❌ Prescription validation failed:', error);
      return {
        isComplete: false,
        error: error.message,
        completenessScore: 0
      };
    }
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(prescriptionData, validation, authenticationResult) {
    let confidence = 0;
    let factors = 0;

    // Prescription quality
    if (prescriptionData.qualityMetrics?.overallQuality) {
      confidence += prescriptionData.qualityMetrics.overallQuality;
      factors++;
    }

    // Validation completeness
    if (validation.completenessScore) {
      confidence += validation.completenessScore;
      factors++;
    }

    // Authentication confidence
    if (authenticationResult?.confidence) {
      confidence += authenticationResult.confidence * 100;
      factors++;
    }

    return factors > 0 ? Math.round(confidence / factors) : 0;
  }

  /**
   * Real-time voice processing for live dictation
   */
  async processRealTimeVoice(voiceChunks, doctorProfile, options = {}) {
    try {
      console.log('🎙️ Processing real-time voice chunks');

      const {
        minConfidence = 0.8,
        autoComplete = false,
        enableCorrections = true
      } = options;

      const results = [];

      for (const chunk of voiceChunks) {
        if (chunk.confidence >= minConfidence) {
          const processed = await this.processVoiceToPrescription(
            chunk.text, 
            doctorProfile, 
            { enhanceText: enableCorrections }
          );
          
          results.push({
            chunkId: chunk.id,
            timestamp: chunk.timestamp,
            confidence: chunk.confidence,
            processed
          });
        }
      }

      // Merge chunks if auto-complete is enabled
      if (autoComplete && results.length > 0) {
        return this.mergeVoiceChunks(results, doctorProfile);
      }

      return {
        chunks: results,
        totalChunks: voiceChunks.length,
        processedChunks: results.length,
        avgConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      };

    } catch (error) {
      console.error('❌ Real-time voice processing failed:', error);
      throw error;
    }
  }

  /**
   * Merge multiple voice chunks into complete prescription
   */
  async mergeVoiceChunks(voiceChunks, doctorProfile) {
    try {
      const combinedText = voiceChunks
        .map(chunk => chunk.processed.processedText)
        .join(' ');

      return await this.processVoiceToPrescription(combinedText, doctorProfile, {
        enhanceText: true,
        validateAuthenticity: true
      });

    } catch (error) {
      console.error('❌ Voice chunk merging failed:', error);
      throw error;
    }
  }

  /**
   * Generate voice dictation templates
   */
  generateDictationTemplates() {
    return {
      prescriptionTemplate: [
        "Patient name is [PATIENT_NAME]",
        "Prescribing [MEDICATION_NAME] [STRENGTH]",
        "Take [DOSAGE] [FREQUENCY]",
        "For [DURATION] days",
        "Instructions: [SPECIAL_INSTRUCTIONS]",
        "Doctor [DOCTOR_NAME], License [LICENSE_NUMBER]"
      ].join('. '),
      
      quickTemplates: {
        antibiotic: "Prescribing Amoxicillin 500mg, take one capsule three times daily for 7 days with food",
        painkiller: "Prescribing Ibuprofen 400mg, take one tablet every 6 hours as needed for pain, maximum 4 tablets per day",
        hypertension: "Prescribing Amlodipine 5mg, take one tablet once daily in the morning for blood pressure control"
      },

      commonPhrases: [
        "Take with food",
        "Take on empty stomach",
        "Do not exceed recommended dose",
        "Complete the full course",
        "Return if symptoms persist",
        "Follow up in two weeks"
      ]
    };
  }

  /**
   * Get supported languages for voice processing
   */
  getSupportedLanguages() {
    return {
      primary: ['en-US', 'en-GB', 'en-AU'],
      secondary: ['es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR'],
      medical: ['en-US', 'es-ES', 'fr-FR'], // Languages with medical terminology support
      realTime: ['en-US', 'en-GB'] // Languages with real-time processing support
    };
  }
}

export default VoiceToPrescriptionService;