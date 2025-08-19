import { GoogleGenerativeAI } from '@google/generative-ai';
import natural from 'natural';
import compromise from 'compromise';

/**
 * Advanced Gemini-Powered AI Service for Prescription Processing
 * Uses Google's Gemini 2.5 Flash model with sophisticated prompt engineering
 */
class GeminiPrescriptionAI {
  constructor() {
    // Initialize Google Generative AI
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    
    // Initialize NLP components for preprocessing
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.sentenceTokenizer = new natural.SentenceTokenizer();
    
    // AI model configurations
    this.models = {
      analysis: {
        name: "gemini-2.5-flash",
        config: {
          temperature: 0.2, // Lower for more precise medical analysis
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      },
      enhancement: {
        name: "gemini-2.5-flash",
        config: {
          temperature: 0.1, // Very low for text correction
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: "text/plain"
        }
      },
      validation: {
        name: "gemini-2.5-flash",
        config: {
          temperature: 0.15, // Low for factual validation
          topK: 30,
          topP: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      }
    };

    // Response schemas
    this.setupResponseSchemas();
    
    console.log('✅ Gemini 2.5 Flash AI Service initialized');
    console.log('   Models configured:', Object.keys(this.models).join(', '));
    console.log('   Schemas registered:', Object.keys(this.schemas).length);
    console.log('   API Key configured:', !!process.env.GOOGLE_CLOUD_API_KEY);
  }

  /**
   * Setup JSON schemas for structured responses
   */
  setupResponseSchemas() {
    this.schemas = {
      prescriptionAnalysis: {
        type: "object",
        properties: {
          medications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                genericName: { type: "string" },
                brandName: { type: "string" },
                dosage: { type: "string" },
                strength: { type: "string" },
                frequency: { type: "string" },
                route: { type: "string" },
                duration: { type: "string" },
                instructions: { type: "string" },
                indication: { type: "string" },
                confidence: { type: "number" }
              },
              required: ["name", "confidence"]
            }
          },
          patientInfo: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "string" },
              gender: { type: "string" },
              weight: { type: "string" },
              allergies: { type: "array", items: { type: "string" } },
              medicalHistory: { type: "array", items: { type: "string" } }
            }
          },
          prescriberInfo: {
            type: "object",
            properties: {
              name: { type: "string" },
              title: { type: "string" },
              license: { type: "string" },
              hospital: { type: "string" },
              contact: { type: "string" },
              signature: { type: "boolean" }
            }
          },
          prescriptionDetails: {
            type: "object",
            properties: {
              date: { type: "string" },
              refills: { type: "string" },
              daw: { type: "boolean" },
              genericSubstitution: { type: "boolean" },
              emergencyPrescription: { type: "boolean" }
            }
          },
          qualityMetrics: {
            type: "object",
            properties: {
              legibility: { type: "number" },
              completeness: { type: "number" },
              clarity: { type: "number" },
              overallQuality: { type: "number" },
              missingFields: { type: "array", items: { type: "string" } },
              ambiguousFields: { type: "array", items: { type: "string" } }
            },
            required: ["legibility", "completeness", "clarity", "overallQuality"]
          },
          riskAssessment: {
            type: "object",
            properties: {
              riskLevel: { type: "string", enum: ["low", "moderate", "high", "critical"] },
              riskFactors: { type: "array", items: { type: "string" } },
              warnings: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } }
            },
            required: ["riskLevel"]
          }
        },
        required: ["medications", "qualityMetrics", "riskAssessment"]
      },

      drugInteractionAnalysis: {
        type: "object",
        properties: {
          interactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                medications: { type: "array", items: { type: "string" } },
                interactionType: { type: "string" },
                severity: { type: "string", enum: ["minor", "moderate", "major", "contraindicated"] },
                mechanism: { type: "string" },
                clinicalEffect: { type: "string" },
                management: { type: "string" },
                monitoring: { type: "string" },
                confidence: { type: "number" }
              },
              required: ["medications", "severity", "clinicalEffect", "confidence"]
            }
          },
          overallRisk: { type: "string", enum: ["low", "moderate", "high", "critical"] },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["interactions", "overallRisk"]
      },

      dosageValidation: {
        type: "object",
        properties: {
          validations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                medication: { type: "string" },
                prescribedDose: { type: "string" },
                standardDose: { type: "string" },
                isAppropriate: { type: "boolean" },
                ageAppropriate: { type: "boolean" },
                weightAppropriate: { type: "boolean" },
                indicationAppropriate: { type: "boolean" },
                warnings: { type: "array", items: { type: "string" } },
                adjustmentNeeded: { type: "boolean" },
                adjustmentReason: { type: "string" },
                confidence: { type: "number" }
              },
              required: ["medication", "isAppropriate", "confidence"]
            }
          },
          overallAssessment: { type: "string" },
          criticalIssues: { type: "array", items: { type: "string" } }
        },
        required: ["validations"]
      }
    };
  }

  /**
   * Main prescription processing with Gemini AI
   * @param {string} extractedText - OCR extracted text
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Comprehensive AI analysis
   */
  async processPrescriptionWithGemini(extractedText, options = {}) {
    try {
      console.log('🤖 Starting Gemini AI prescription processing...');
      
      const {
        enhanceText = true,
        validateDosages = true,
        checkInteractions = true,
        riskAssessment = true,
        includeRecommendations = true
      } = options;

      const results = {
        processingId: this.generateProcessingId(),
        timestamp: new Date().toISOString(),
        originalText: extractedText
      };

      // Step 1: Text Enhancement (if requested) - COMMENTED OUT FOR FASTER PROCESSING
      // if (enhanceText) {
      //   console.log('📝 Enhancing text with Gemini 2.5 Flash...');
      //   results.enhancedText = await this.enhanceTextWithGemini(extractedText);
      //   
      //   console.log('🔍 TEXT ENHANCEMENT RESULTS:');
      //   console.log('   Original length:', extractedText.length, 'characters');
      //   console.log('   Enhanced length:', results.enhancedText.length, 'characters');
      //   console.log('   📄 ORIGINAL TEXT:');
      //   console.log('   ----------------------------------------');
      //   console.log('   ' + extractedText.substring(0, 300) + (extractedText.length > 300 ? '...' : ''));
      //   console.log('   ----------------------------------------');
      //   console.log('   ✨ ENHANCED TEXT:');
      //   console.log('   ----------------------------------------');
      //   console.log('   ' + results.enhancedText.substring(0, 300) + (results.enhancedText.length > 300 ? '...' : ''));
      //   console.log('   ----------------------------------------');
      // } else {
        results.enhancedText = extractedText;
      // }

      // Step 2: Core Prescription Analysis
      console.log('🔍 Analyzing prescription with Gemini 2.5 Flash...');
      results.analysis = await this.analyzePrescriptionWithGemini(results.enhancedText);
      
      console.log('🏥 PRESCRIPTION ANALYSIS RESULTS:');
      console.log('   Medications found:', results.analysis.medications?.length || 0);
      console.log('   Patient info available:', !!results.analysis.patientInfo?.name);
      console.log('   Prescriber info available:', !!results.analysis.prescriberInfo?.name);
      console.log('   Overall quality score:', (results.analysis.qualityMetrics?.overallQuality * 100 || 0).toFixed(1) + '%');
      console.log('   Risk level:', results.analysis.riskAssessment?.riskLevel || 'Unknown');
      
      if (results.analysis.medications?.length > 0) {
        console.log('   💊 MEDICATIONS DETECTED:');
        results.analysis.medications.forEach((med, index) => {
          console.log(`      ${index + 1}. ${med.name || 'Unknown'} ${med.dosage || ''} ${med.frequency || ''}`);
          console.log(`         - Generic: ${med.genericName || 'N/A'}`);
          console.log(`         - Route: ${med.route || 'N/A'}`);
          console.log(`         - Duration: ${med.duration || 'N/A'}`);
          console.log(`         - Confidence: ${(med.confidence * 100 || 0).toFixed(1)}%`);
        });
      }
      
      if (results.analysis.patientInfo?.name) {
        console.log('   👤 PATIENT INFO:');
        console.log(`      - Name: ${results.analysis.patientInfo.name}`);
        console.log(`      - Age: ${results.analysis.patientInfo.age || 'N/A'}`);
        console.log(`      - Gender: ${results.analysis.patientInfo.gender || 'N/A'}`);
        console.log(`      - Allergies: ${results.analysis.patientInfo.allergies?.join(', ') || 'None specified'}`);
      }
      
      if (results.analysis.prescriberInfo?.name) {
        console.log('   👨‍⚕️ PRESCRIBER INFO:');
        console.log(`      - Name: ${results.analysis.prescriberInfo.name}`);
        console.log(`      - Title: ${results.analysis.prescriberInfo.title || 'N/A'}`);
        console.log(`      - License: ${results.analysis.prescriberInfo.license || 'N/A'}`);
        console.log(`      - Hospital: ${results.analysis.prescriberInfo.hospital || 'N/A'}`);
      }

      // Step 3: Drug Interaction Analysis
      if (checkInteractions && results.analysis.medications?.length > 1) {
        console.log('⚠️ Checking drug interactions with Gemini 2.5 Flash...');
        results.interactions = await this.checkDrugInteractionsWithGemini(results.analysis.medications);
        
        console.log('💊 DRUG INTERACTION ANALYSIS:');
        console.log('   Total interactions found:', results.interactions.interactions?.length || 0);
        console.log('   Overall interaction risk:', results.interactions.overallRisk || 'Unknown');
        
        if (results.interactions.interactions?.length > 0) {
          console.log('   ⚠️ INTERACTIONS DETECTED:');
          results.interactions.interactions.forEach((interaction, index) => {
            console.log(`      ${index + 1}. ${interaction.medications?.join(' + ')}`);
            console.log(`         - Severity: ${interaction.severity}`);
            console.log(`         - Type: ${interaction.interactionType || 'N/A'}`);
            console.log(`         - Clinical Effect: ${interaction.clinicalEffect}`);
            console.log(`         - Management: ${interaction.management || 'N/A'}`);
            console.log(`         - Confidence: ${(interaction.confidence * 100 || 0).toFixed(1)}%`);
          });
        } else {
          console.log('   ✅ No significant drug interactions detected');
        }
      }

      // Step 4: Dosage Validation
      if (validateDosages && results.analysis.medications?.length > 0) {
        console.log('💊 Validating dosages with Gemini 2.5 Flash...');
        results.dosageValidation = await this.validateDosagesWithGemini(
          results.analysis.medications,
          results.analysis.patientInfo
        );
        
        console.log('📏 DOSAGE VALIDATION RESULTS:');
        console.log('   Medications validated:', results.dosageValidation.validations?.length || 0);
        console.log('   Overall assessment:', results.dosageValidation.overallAssessment || 'N/A');
        console.log('   Critical issues:', results.dosageValidation.criticalIssues?.length || 0);
        
        if (results.dosageValidation.validations?.length > 0) {
          console.log('   💉 DOSAGE VALIDATIONS:');
          results.dosageValidation.validations.forEach((validation, index) => {
            console.log(`      ${index + 1}. ${validation.medication}`);
            console.log(`         - Prescribed: ${validation.prescribedDose || 'N/A'}`);
            console.log(`         - Standard: ${validation.standardDose || 'N/A'}`);
            console.log(`         - Appropriate: ${validation.isAppropriate ? '✅ Yes' : '❌ No'}`);
            console.log(`         - Age appropriate: ${validation.ageAppropriate ? '✅ Yes' : '❌ No'}`);
            console.log(`         - Weight appropriate: ${validation.weightAppropriate ? '✅ Yes' : '❌ No'}`);
            if (validation.warnings?.length > 0) {
              console.log(`         - Warnings: ${validation.warnings.join(', ')}`);
            }
            console.log(`         - Confidence: ${(validation.confidence * 100 || 0).toFixed(1)}%`);
          });
        }
        
        if (results.dosageValidation.criticalIssues?.length > 0) {
          console.log('   🚨 CRITICAL DOSAGE ISSUES:');
          results.dosageValidation.criticalIssues.forEach((issue, index) => {
            console.log(`      ${index + 1}. ${issue}`);
          });
        }
      }

      // Step 5: Comprehensive Risk Assessment
      if (riskAssessment) {
        console.log('🚨 Performing risk assessment with Gemini 2.5 Flash...');
        results.riskAssessment = await this.performRiskAssessmentWithGemini(results);
        
        console.log('🛡️ COMPREHENSIVE RISK ASSESSMENT:');
        console.log('   Overall risk level:', results.riskAssessment.riskLevel || 'Unknown');
        console.log('   Risk factors identified:', results.riskAssessment.riskFactors?.length || 0);
        console.log('   Warnings issued:', results.riskAssessment.warnings?.length || 0);
        console.log('   Recommendations provided:', results.riskAssessment.recommendations?.length || 0);
        
        if (results.riskAssessment.riskFactors?.length > 0) {
          console.log('   ⚠️ RISK FACTORS:');
          results.riskAssessment.riskFactors.forEach((factor, index) => {
            console.log(`      ${index + 1}. ${factor}`);
          });
        }
        
        if (results.riskAssessment.warnings?.length > 0) {
          console.log('   🚨 WARNINGS:');
          results.riskAssessment.warnings.forEach((warning, index) => {
            console.log(`      ${index + 1}. ${warning}`);
          });
        }
        
        if (results.riskAssessment.recommendations?.length > 0) {
          console.log('   💡 RISK MITIGATION RECOMMENDATIONS:');
          results.riskAssessment.recommendations.forEach((rec, index) => {
            console.log(`      ${index + 1}. ${rec}`);
          });
        }
      }

      // Step 6: Generate Recommendations
      if (includeRecommendations) {
        console.log('💡 Generating recommendations with Gemini 2.5 Flash...');
        results.recommendations = await this.generateRecommendationsWithGemini(results);
        
        console.log('🎯 INTELLIGENT RECOMMENDATIONS:');
        if (results.recommendations.immediateActions?.length > 0) {
          console.log('   🚨 IMMEDIATE ACTIONS REQUIRED:');
          results.recommendations.immediateActions.forEach((action, index) => {
            console.log(`      ${index + 1}. ${action}`);
          });
        }
        
        if (results.recommendations.pharmacistInterventions?.length > 0) {
          console.log('   💊 PHARMACIST INTERVENTIONS:');
          results.recommendations.pharmacistInterventions.forEach((intervention, index) => {
            console.log(`      ${index + 1}. ${intervention}`);
          });
        }
        
        if (results.recommendations.prescriberConsultations?.length > 0) {
          console.log('   👨‍⚕️ PRESCRIBER CONSULTATIONS NEEDED:');
          results.recommendations.prescriberConsultations.forEach((consultation, index) => {
            console.log(`      ${index + 1}. ${consultation}`);
          });
        }
        
        if (results.recommendations.patientEducation?.length > 0) {
          console.log('   👤 PATIENT EDUCATION PRIORITIES:');
          results.recommendations.patientEducation.forEach((education, index) => {
            console.log(`      ${index + 1}. ${education}`);
          });
        }
        
        if (results.recommendations.monitoring?.length > 0) {
          console.log('   🔍 MONITORING RECOMMENDATIONS:');
          results.recommendations.monitoring.forEach((monitor, index) => {
            console.log(`      ${index + 1}. ${monitor}`);
          });
        }
      }

      // Calculate overall confidence and quality scores
      results.overallMetrics = this.calculateOverallMetrics(results);
      
      console.log('📊 OVERALL PROCESSING METRICS:');
      console.log('   Overall confidence:', (results.overallMetrics.overallConfidence * 100 || 0).toFixed(1) + '%');
      console.log('   Processing quality:', (results.overallMetrics.processingQuality * 100 || 0).toFixed(1) + '%');
      console.log('   Safety score:', (results.overallMetrics.safetyScore * 100 || 0).toFixed(1) + '%');
      console.log('   Completeness score:', (results.overallMetrics.completenessScore * 100 || 0).toFixed(1) + '%');
      console.log('   Risk score:', (results.overallMetrics.riskScore * 100 || 0).toFixed(1) + '%');
      console.log('   Processing time:', (Date.now() - results.timestamp) + 'ms');

      console.log('✅ Gemini 2.5 Flash AI processing completed successfully!');
      return results;

    } catch (error) {
      console.error('❌ Gemini AI processing failed:', error.message);
      throw new Error(`Gemini AI processing failed: ${error.message}`);
    }
  }

  /**
   * Enhance OCR text using Gemini AI
   * @param {string} rawText - Raw OCR text
   * @returns {Promise<string>} - Enhanced text
   */
  async enhanceTextWithGemini(rawText) {
    try {
      console.log('🔧 Starting text enhancement with Gemini 2.5 Flash...');
      console.log('   Input text length:', rawText.length, 'characters');
      
      const model = this.genAI.getGenerativeModel({
        model: this.models.enhancement.name,
        generationConfig: this.models.enhancement.config
      });
      console.log("raw text from ocr:------------------------------------", rawText);

      const prompt = `
You are an Advanced Medical OCR Text Enhancement System with specialized expertise in:
- Medical Document Processing & Standardization
- Pharmaceutical Nomenclature & Terminology  
- Clinical Handwriting Recognition & Interpretation
- Healthcare Information Standards Compliance
- Multi-language Medical Text Processing

**MISSION:** Transform raw OCR-extracted prescription text into clinically accurate, standardized, and professionally formatted medical documentation while preserving 100% of original medical intent and information.

**RAW OCR INPUT:**
${rawText}

**🔬 ADVANCED ENHANCEMENT PROTOCOL:**

**1. INTELLIGENT OCR ERROR CORRECTION:**
Apply sophisticated pattern recognition for common OCR misinterpretations:
- **Character Confusion Matrix:**
  * Number/Letter: 0↔O, 1↔I↔l, 5↔S, 6↔G, 2↔Z, 8↔B
  * Letter Combinations: rn↔m, vv↔w, cl↔d, li↔h, nn↔m
  * Medical Context: Recognize medication names vs. common words
  * Dosing Units: mg↔mcg, ml↔μl, distinguish measurement units

**2. PHARMACEUTICAL NOMENCLATURE STANDARDIZATION:**
- **Generic Drug Names:** Apply INN (International Nonproprietary Names) standards
- **Brand Name Recognition:** Identify and properly capitalize trade names
- **Salt Form Accuracy:** Distinguish active ingredient from salt forms
- **Strength Standardization:** Normalize dosage expressions (250mg, 0.25g → 250 mg)
- **Abbreviation Expansion:** Expand standard medical abbreviations appropriately

**3. DOSAGE & FREQUENCY OPTIMIZATION:**
- **Unit Standardization:** Ensure proper pharmaceutical units (mg, mcg, mL, units, IU)
- **Frequency Clarification:** Convert to standard expressions (QD, BID, TID, QID, Q6H)
- **Decimal Precision:** Maintain appropriate decimal places for drug concentrations
- **Range Expressions:** Properly format dose ranges and PRN instructions

**4. CLINICAL INSTRUCTION ENHANCEMENT:**
- **Administration Timing:** Standardize meal-related instructions
- **Route Specification:** Ensure clear route of administration
- **Duration Formatting:** Standardize treatment duration expressions
- **Special Instructions:** Clarify administration techniques and precautions

**5. PROFESSIONAL INFORMATION FORMATTING:**
- **Prescriber Names:** Proper title and name formatting
- **License Numbers:** Maintain exact numerical sequences
- **Date Standardization:** Convert to consistent date formats
- **Contact Information:** Preserve and format phone numbers, addresses

**6. QUALITY ASSURANCE PROTOCOLS:**
- **Medical Context Validation:** Ensure corrections make clinical sense
- **Cross-Reference Checking:** Verify medication-indication appropriateness
- **Dosing Logic:** Confirm dosing calculations are medically reasonable
- **Completeness Verification:** Ensure no critical information is lost

**ENHANCEMENT RULES:**
✅ **PRESERVE COMPLETELY:**
- All numerical values (doses, quantities, dates)
- Patient identifying information
- Prescriber identification details
- Any handwritten signatures or marks
- Legal prescription elements

✅ **STANDARDIZE:**
- Medical terminology spelling
- Pharmaceutical formatting conventions
- Units of measurement
- Frequency expressions
- Route abbreviations

✅ **ENHANCE CLARITY:**
- Ambiguous abbreviations (with [?] if uncertain)
- Incomplete words (complete if context is clear)
- Formatting for professional readability

❌ **NEVER:**
- Add medications not in original
- Change dosage amounts
- Alter patient or prescriber names
- Remove any original information
- Make assumptions about missing data

**UNCERTAINTY HANDLING:**
- Mark questionable corrections with [?uncertain]
- Preserve original text alongside enhancement for unclear sections
- Indicate confidence levels for significant corrections

**OUTPUT FORMAT:**
Return the enhanced prescription text maintaining original structure while applying clinical-grade formatting and standardization.

**MEDICAL SAFETY PRIORITY:**
Any enhancement that could affect patient safety should err on the side of preserving original text rather than making potentially incorrect assumptions.

Enhanced prescription text:`;

      console.log('   📤 Sending enhancement request to Gemini 2.5 Flash...');
      const result = await model.generateContent(prompt);
      const enhancedText = result.response.text().trim();
      
      console.log('   📥 Enhancement completed');
      console.log('   Output text length:', enhancedText.length, 'characters');
      console.log('   Characters changed:', Math.abs(enhancedText.length - rawText.length));
      
      return enhancedText;

    } catch (error) {
      console.error('❌ Text enhancement failed:', error.message);
      console.error('   Falling back to original text');
      return rawText; // Return original text if enhancement fails
    }
  }

  /**
   * Analyze prescription using Gemini AI
   * @param {string} enhancedText - Enhanced prescription text
   * @returns {Promise<Object>} - Structured prescription analysis
   */
  async analyzePrescriptionWithGemini(enhancedText) {
    try {
      console.log('🔍 Starting prescription analysis with Gemini 2.5 Flash...');
      console.log('   Analyzing', enhancedText.length, 'characters of enhanced text');
      
      const model = this.genAI.getGenerativeModel({
        model: this.models.analysis.name,
        generationConfig: {
          ...this.models.analysis.config,
          responseSchema: this.schemas.prescriptionAnalysis
        }
      });

      const prompt = `
You are an AI-powered Clinical Pharmacy Expert System with specialized knowledge in:
- Advanced Pharmacokinetics & Pharmacodynamics
- Clinical Drug Interactions & Contraindications  
- Precision Medicine & Personalized Dosing
- Regulatory Compliance & Safety Protocols
- Evidence-Based Therapeutic Guidelines
- Multi-modal Prescription Analysis

**MISSION:** Perform comprehensive, multi-dimensional prescription analysis with pharmaceutical precision and clinical intelligence.

**PRESCRIPTION TEXT FOR ANALYSIS:**
${enhancedText}

**🔬 ADVANCED ANALYSIS PROTOCOL:**

**🧬 1. MOLECULAR-LEVEL MEDICATION EXTRACTION:**
For each pharmaceutical agent, provide exhaustive analysis:
- **Primary Identification:**
  * Generic name (INN - International Nonproprietary Name)
  * Brand/trade names (all known variants)
  * Chemical classification (pharmacological family)
  * Mechanism of action (brief molecular pathway)
  * Therapeutic class and sub-classification

- **Dosing Specifications:**
  * Exact dosage strength with precision units (mg, mcg, ml, IU, etc.)
  * Pharmaceutical form (tablet, capsule, suspension, injection)
  * Frequency pattern (QD, BID, TID, QID, Q6H, Q8H, PRN with exact intervals)
  * Route specificity (PO, SL, IV, IM, SC, topical, inhaled, rectal)
  * Duration with temporal precision (days, weeks, months, chronic)

- **Advanced Instructions:**
  * Timing relative to meals (fasting, with food, specific nutrient interactions)
  * Administration technique (crushing contraindications, special handling)
  * Storage requirements (temperature, light protection)
  * Monitoring parameters (labs, vitals, symptoms)

- **Clinical Context:**
  * Primary indication (evidence-based therapeutic target)
  * Off-label uses (if applicable with supporting rationale)
  * Bioequivalence considerations for generics
  * Therapeutic drug monitoring requirements
  * Confidence assessment (0.0-1.0) with uncertainty quantification

**👤 2. COMPREHENSIVE PATIENT PROFILING:**
Extract complete demographic and clinical profile:
- **Demographics:** Full name, age (exact if possible), gender, ethnicity (if mentioned)
- **Anthropometrics:** Weight, height, BMI (calculate if both available)
- **Medical History:** Comorbidities, surgical history, previous adverse reactions
- **Allergy Profile:** Drug allergies with reaction types, food allergies, environmental
- **Social History:** Smoking, alcohol use, recreational substances (if documented)
- **Pregnancy/Lactation Status:** Current status, trimester if applicable
- **Renal/Hepatic Function:** Any documented impairment or normal values
- **Insurance/Formulary:** Coverage information if available

**👨‍⚕️ 3. PRESCRIBER CREDENTIAL VERIFICATION:**
Comprehensive prescriber analysis:
- **Identity:** Full name, professional title, specialty certification
- **Licensing:** Medical license number, DEA number (for controlled substances)
- **Institution:** Hospital/clinic affiliation, department, contact details
- **Prescription Validity:** Signature verification, date currency, format compliance
- **Authority Assessment:** Prescribing scope for specific medications

**📋 4. REGULATORY & LEGAL COMPLIANCE:**
Advanced prescription validation:
- **Legal Requirements:** All mandatory fields completion assessment
- **Controlled Substances:** Schedule verification, quantity limits, refill restrictions
- **State/Federal Compliance:** Jurisdiction-specific requirements
- **Insurance/Prior Authorization:** Formulary status, PA requirements
- **Generic Substitution:** DAW codes, brand medically necessary justifications

**⚕️ 5. MULTI-DIMENSIONAL QUALITY METRICS:**
Sophisticated quality assessment algorithms:
- **Legibility Index (0.0-1.0):** Character recognition confidence, handwriting clarity
- **Completeness Score (0.0-1.0):** Required field presence, information sufficiency
- **Clinical Appropriateness (0.0-1.0):** Dosing rationality, indication matching
- **Safety Score (0.0-1.0):** Risk factor assessment, contraindication screening
- **Regulatory Compliance (0.0-1.0):** Legal requirement fulfillment

**Error Detection System:**
- **Critical Errors:** Missing essential information, dangerous dosing
- **Major Errors:** Incomplete instructions, unclear directions
- **Minor Errors:** Formatting issues, non-critical omissions
- **Recommendations:** Specific improvement suggestions

**🛡️ 6. ADVANCED RISK STRATIFICATION:**
Comprehensive safety assessment using clinical decision support:
- **Risk Classification:** LOW/MODERATE/HIGH/CRITICAL with detailed justification
- **Medication-Specific Risks:** Black box warnings, REMS requirements
- **Patient-Specific Risks:** Age-related concerns, weight-based dosing issues
- **Interaction Risks:** Preliminary drug-drug, drug-food, drug-disease screening
- **Monitoring Requirements:** Laboratory tests, vital signs, symptom tracking

**Critical Safety Flags:**
- **High-Alert Medications:** Insulin, anticoagulants, chemotherapy, opioids
- **Look-Alike/Sound-Alike (LASA):** Potential confusion with similar drugs
- **Age-Inappropriate:** Beers Criteria violations, pediatric considerations
- **Dosing Alerts:** Maximum daily dose violations, frequency errors

**🧠 7. CLINICAL INTELLIGENCE INTEGRATION:**
Evidence-based therapeutic assessment:
- **Guideline Compliance:** Adherence to clinical practice guidelines
- **Drug Utilization Review:** Appropriateness, necessity, effectiveness
- **Cost-Effectiveness:** Generic availability, therapeutic alternatives
- **Patient Adherence Factors:** Complexity, side effect profile, dosing convenience

**🔍 8. CONTEXTUAL MEDICAL REASONING:**
Advanced clinical correlation:
- **Diagnosis-Drug Matching:** Verify indication appropriateness
- **Polypharmacy Analysis:** Multiple medication interactions and redundancies
- **Therapeutic Gaps:** Missing standard-of-care medications
- **Contraindication Screening:** Absolute and relative contraindications

**📊 OUTPUT SPECIFICATIONS:**
Generate comprehensive structured JSON analysis with:
- Quantified confidence metrics for all extractions
- Detailed reasoning for risk assessments  
- Specific recommendations for optimization
- Clinical decision support alerts
- Regulatory compliance status
- Quality improvement suggestions

**⚡ PROCESSING PRIORITY:**
1. Patient safety (highest priority)
2. Clinical efficacy optimization
3. Regulatory compliance
4. Cost-effectiveness
5. Patient convenience

Execute this analysis with pharmaceutical precision, clinical wisdom, and unwavering attention to patient safety.`;

      console.log('   📤 Sending analysis request to Gemini 2.5 Flash...');
      const result = await model.generateContent(prompt);
      const analysisData = JSON.parse(result.response.text());
      
      console.log('   📥 Analysis completed successfully');
      console.log('   Response size:', result.response.text().length, 'characters');
      
      return analysisData;

    } catch (error) {
      console.error('❌ Prescription analysis failed:', error.message);
      console.error('   Error details:', error.stack);
      throw error;
    }
  }

  /**
   * Check drug interactions using Gemini AI
   * @param {Array} medications - List of medications
   * @returns {Promise<Object>} - Drug interaction analysis
   */
  async checkDrugInteractionsWithGemini(medications) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.validation.name,
        generationConfig: {
          ...this.models.validation.config,
          responseSchema: this.schemas.drugInteractionAnalysis
        }
      });

      const medicationList = medications.map(med => 
        `${med.name} ${med.dosage} ${med.frequency}`
      ).join('\n');

      const prompt = `
You are an Elite Clinical Pharmacology AI System with specialized expertise in:
- Advanced Pharmacokinetic/Pharmacodynamic Modeling
- Molecular Drug Interaction Mechanisms  
- Clinical Decision Support Systems
- Precision Medicine & Personalized Therapy
- Real-World Evidence & Outcomes Research
- Regulatory Safety Sciences

**MISSION:** Conduct comprehensive multi-dimensional drug interaction analysis using advanced pharmacological intelligence and clinical evidence.

**MEDICATION REGIMEN FOR ANALYSIS:**
${medicationList}

**🧬 MOLECULAR-LEVEL INTERACTION ANALYSIS:**

**1. ADVANCED DRUG-DRUG INTERACTION SCREENING:**
Comprehensive pharmacological interaction assessment:

**Pharmacokinetic Interactions:**
- **Absorption:** GI tract interactions, food effects, pH dependencies
- **Distribution:** Protein binding displacement, tissue distribution changes
- **Metabolism:** CYP450 enzyme systems (1A2, 2C9, 2C19, 2D6, 3A4/5), UGT conjugation
- **Elimination:** Renal transporter interactions (OCT, OAT, MATE), biliary excretion

**Pharmacodynamic Interactions:**
- **Receptor-Level:** Agonist/antagonist competition, allosteric modulation
- **Pathway Interference:** Signal transduction disruption, enzyme inhibition
- **Additive/Synergistic Effects:** Therapeutic enhancement or toxicity amplification
- **Physiological Antagonism:** Opposing physiological effects

**2. SOPHISTICATED SEVERITY STRATIFICATION:**
Evidence-based risk classification with clinical decision support:

**CRITICAL (Level 5):** Life-threatening, contraindicated
- Immediate intervention required
- Alternative therapy mandatory
- Examples: QT prolongation risk, severe hypotension, respiratory depression

**MAJOR (Level 4):** Significant clinical consequences  
- High probability of serious adverse events
- Dosage adjustment or alternative therapy recommended
- Enhanced monitoring essential

**MODERATE (Level 3):** Clinically significant
- Moderate probability of adverse events
- Monitoring and possible dosage adjustment
- Patient counseling required

**MINOR (Level 2):** Limited clinical significance
- Low probability of clinically relevant effects
- Routine monitoring sufficient

**THEORETICAL (Level 1):** Based on pharmacology but limited clinical evidence
- Monitor for unexpected effects
- Consider in vulnerable populations

**3. MOLECULAR MECHANISM ANALYSIS:**
For each interaction, provide detailed mechanistic insight:
- **Primary Mechanism:** Specific molecular pathway affected
- **Secondary Effects:** Downstream consequences and cascade effects
- **Temporal Dynamics:** Onset, peak effect, duration, offset timing
- **Dose-Response Relationship:** Linear vs. non-linear interactions
- **Genetic Polymorphisms:** CYP450 phenotype considerations
- **Reversibility:** Competitive vs. non-competitive interactions

**4. CLINICAL OUTCOME PREDICTION:**
Evidence-based clinical consequence assessment:
- **Therapeutic Efficacy Changes:** Enhanced, reduced, or altered effects
- **Adverse Event Risk:** Specific AE types and probability estimates
- **Monitoring Parameters:** Laboratory values, vital signs, symptoms
- **Patient Presentation:** Expected clinical manifestations
- **Time Course:** When effects are likely to manifest

**5. PRECISION MEDICINE CONSIDERATIONS:**
Personalized interaction risk assessment:
- **Pharmacogenomic Factors:** CYP450 metabolizer status implications
- **Age-Related Changes:** Pediatric vs. geriatric considerations
- **Organ Function:** Renal/hepatic impairment effects on interactions
- **Comorbidity Impact:** Disease state effects on drug disposition
- **Polypharmacy Complexity:** Multi-drug interaction networks

**6. EVIDENCE-BASED RISK MANAGEMENT:**
Comprehensive management strategy development:

**Immediate Actions:**
- Emergency interventions for critical interactions
- Timing modifications for moderate interactions
- Dosage adjustments with specific recommendations

**Monitoring Protocols:**
- Laboratory monitoring schedules (specific tests, frequencies)
- Clinical assessment parameters (vitals, symptoms, function)
- Patient self-monitoring instructions

**Alternative Strategies:**
- Therapeutic substitutions with rationale
- Route/formulation modifications
- Temporal separation strategies

**7. DRUG-FOOD & LIFESTYLE INTERACTIONS:**
Comprehensive lifestyle factor analysis:
- **Nutritional Interactions:** Specific foods, nutrients, supplements
- **Alcohol Interactions:** Acute vs. chronic alcohol effects
- **Smoking Interactions:** CYP1A2 induction considerations
- **Exercise Interactions:** Activity level effects on drug disposition

**8. SPECIAL POPULATION CONSIDERATIONS:**
Vulnerable population interaction assessment:
- **Pregnancy/Lactation:** Fetal/infant safety considerations
- **Pediatric Patients:** Age-specific interaction risks
- **Geriatric Patients:** Age-related pharmacokinetic changes
- **Organ Impairment:** Renal/hepatic function interaction effects

**9. REAL-WORLD CLINICAL INTELLIGENCE:**
Integration of clinical evidence and outcomes data:
- **Literature Evidence:** Peer-reviewed interaction studies
- **Case Report Analysis:** Documented clinical cases
- **Regulatory Warnings:** FDA/EMA safety communications
- **Clinical Guidelines:** Professional society recommendations

**🎯 INTERACTION RISK PRIORITIZATION:**
Rank interactions by:
1. **Life-threatening potential** (highest priority)
2. **Hospitalization risk**
3. **Treatment failure risk**  
4. **Quality of life impact**
5. **Economic consequences**

**📊 OUTPUT SPECIFICATIONS:**
Provide comprehensive structured analysis with:
- Quantified interaction probabilities
- Confidence intervals for risk estimates
- Evidence quality ratings
- Clinical decision support alerts
- Patient counseling talking points
- Healthcare provider action items

**⚡ CLINICAL DECISION SUPPORT:**
Generate actionable recommendations for:
- Immediate prescriber notifications
- Pharmacy intervention protocols  
- Patient safety communications
- Monitoring implementation strategies

Execute this analysis with pharmaceutical precision, evidence-based rigor, and unwavering commitment to patient safety optimization.`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Drug interaction analysis failed:', error.message);
      return { interactions: [], overallRisk: 'unknown', recommendations: [] };
    }
  }

  /**
   * Validate dosages using Gemini AI
   * @param {Array} medications - List of medications
   * @param {Object} patientInfo - Patient information
   * @returns {Promise<Object>} - Dosage validation results
   */
  async validateDosagesWithGemini(medications, patientInfo) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.validation.name,
        generationConfig: {
          ...this.models.validation.config,
          responseSchema: this.schemas.dosageValidation
        }
      });

      const medicationList = medications.map(med => 
        `${med.name}: ${med.dosage} ${med.frequency} (${med.route || 'PO'})`
      ).join('\n');

      const patientDetails = `
Age: ${patientInfo?.age || 'Not specified'}
Weight: ${patientInfo?.weight || 'Not specified'}
Gender: ${patientInfo?.gender || 'Not specified'}
Allergies: ${patientInfo?.allergies?.join(', ') || 'None specified'}
Medical History: ${patientInfo?.medicalHistory?.join(', ') || 'Not specified'}`;

      const prompt = `
You are a clinical pharmacist with expertise in dosage validation and therapeutic drug management. Validate the appropriateness of the prescribed dosages for the given patient.

**PATIENT INFORMATION:**
${patientDetails}

**PRESCRIBED MEDICATIONS:**
${medicationList}

**DOSAGE VALIDATION REQUIREMENTS:**

**1. DOSAGE APPROPRIATENESS:**
For each medication, assess:
- Prescribed dose vs. standard therapeutic range
- Age-appropriate dosing
- Weight-based dosing accuracy (if applicable)
- Indication-appropriate dosing
- Frequency appropriateness
- Route-specific considerations

**2. PATIENT-SPECIFIC FACTORS:**
Consider:
- Age-related dosing adjustments (pediatric/geriatric)
- Weight-based calculations
- Renal function considerations
- Hepatic function considerations
- Pregnancy/lactation safety
- Drug allergies and contraindications

**3. THERAPEUTIC CONSIDERATIONS:**
- Starting dose vs. maintenance dose appropriateness
- Dose escalation/titration needs
- Maximum safe daily doses
- Minimum effective doses
- Loading dose requirements

**4. SAFETY ASSESSMENT:**
Identify:
- Sub-therapeutic dosing risks
- Supra-therapeutic dosing risks
- Dose-dependent adverse effects
- Monitoring requirements
- Adjustment recommendations

**5. CLINICAL GUIDELINES:**
Base assessments on:
- Current prescribing guidelines
- FDA-approved dosing ranges
- Clinical practice standards
- Evidence-based recommendations

**CONFIDENCE SCORING:**
Rate confidence (0.0-1.0) based on:
- Clarity of prescribed dose
- Availability of patient parameters
- Standard of care alignment
- Clinical evidence strength

**OUTPUT:** Provide detailed dosage validation in structured JSON format with specific recommendations for any identified issues.`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Dosage validation failed:', error.message);
      return { validations: [], overallAssessment: 'Unable to validate', criticalIssues: [] };
    }
  }

  /**
   * Perform comprehensive risk assessment using Gemini AI
   * @param {Object} analysisResults - All previous analysis results
   * @returns {Promise<Object>} - Risk assessment
   */
  async performRiskAssessmentWithGemini(analysisResults) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.analysis.name,
        generationConfig: this.models.analysis.config
      });

      const prompt = `
You are an Advanced Clinical Risk Management AI System with specialized expertise in:
- Patient Safety Sciences & Medication Error Prevention
- Clinical Decision Support & Risk Stratification
- Pharmacovigilance & Adverse Event Prediction
- Healthcare Quality Assurance & Risk Mitigation
- Regulatory Compliance & Safety Standards
- Evidence-Based Risk Assessment Methodologies

**MISSION:** Conduct comprehensive multi-dimensional prescription risk assessment using advanced clinical intelligence, predictive analytics, and evidence-based safety science.

**COMPREHENSIVE ANALYSIS DATA:**
${JSON.stringify(analysisResults, null, 2)}

**🛡️ ADVANCED RISK ASSESSMENT FRAMEWORK:**

**1. CRITICAL PATIENT SAFETY RISK ANALYSIS:**
Systematic evaluation using clinical risk stratification algorithms:

**High-Alert Medication Assessment:**
- **ISMP High-Alert Drug List:** Insulin, anticoagulants, chemotherapy, opioids, sedatives
- **Look-Alike/Sound-Alike (LASA) Risks:** Medication name confusion potential
- **Narrow Therapeutic Index Drugs:** Digoxin, warfarin, phenytoin, lithium
- **Black Box Warning Medications:** FDA-mandated safety warnings compliance
- **REMS Program Requirements:** Risk Evaluation and Mitigation Strategies

**Patient-Specific Vulnerability Assessment:**
- **Age-Related Risks:** Pediatric dosing errors, Beers Criteria violations
- **Weight-Based Dosing:** BMI considerations, obesity dosing adjustments
- **Organ Function:** Renal/hepatic impairment dose modifications
- **Comorbidity Interactions:** Disease-drug interactions, contraindications
- **Polypharmacy Complexity:** Multi-drug regimen risks, pill burden

**2. PREDICTIVE ADVERSE EVENT MODELING:**
Advanced pharmacovigilance risk prediction:

**Adverse Drug Reaction (ADR) Risk Scoring:**
- **Type A Reactions:** Dose-dependent, predictable effects
- **Type B Reactions:** Idiosyncratic, unpredictable responses
- **Type C Reactions:** Chronic use complications
- **Type D Reactions:** Delayed adverse effects
- **Type E Reactions:** End-of-use withdrawal effects

**Severity Probability Matrix:**
- **Life-Threatening (Critical):** Death, permanent disability risk
- **Serious (High):** Hospitalization, significant morbidity
- **Moderate:** Discomfort, temporary impairment
- **Mild (Low):** Minimal clinical significance

**3. CLINICAL DECISION SUPPORT RISK FACTORS:**
Evidence-based risk identification and quantification:

**Prescription Quality Risks:**
- **Legibility Risk Score:** Handwriting clarity, transcription error potential
- **Completeness Risk:** Missing critical information assessment
- **Ambiguity Risk:** Unclear instructions, interpretation variability
- **Verification Risk:** Patient/prescriber identification inadequacy

**Drug Interaction Risk Network:**
- **Pharmacokinetic Interactions:** Metabolism, absorption, elimination
- **Pharmacodynamic Interactions:** Additive, synergistic, antagonistic effects
- **Drug-Disease Interactions:** Medication contraindications with comorbidities
- **Drug-Food Interactions:** Nutritional interference with efficacy/safety

**4. REGULATORY & COMPLIANCE RISK ASSESSMENT:**
Legal and regulatory compliance evaluation:

**Controlled Substance Monitoring:**
- **DEA Schedule Compliance:** Prescription authority, quantity limits
- **PDMP Integration:** Prescription drug monitoring program alerts
- **Abuse Potential Assessment:** Addiction, diversion risk factors
- **Storage/Handling Requirements:** Security protocol compliance

**Documentation & Legal Risks:**
- **Prescription Validity:** Legal requirement fulfillment
- **Informed Consent:** Patient counseling adequacy
- **Medical Liability:** Malpractice risk mitigation
- **Quality Assurance:** Standard of care compliance

**5. PREDICTIVE ANALYTICS & MACHINE LEARNING INSIGHTS:**
Advanced risk modeling using clinical intelligence:

**Outcome Prediction Models:**
- **Treatment Failure Probability:** Efficacy prediction based on patient factors
- **Hospitalization Risk:** Emergency department visit probability
- **Medication Adherence Prediction:** Compliance risk factors
- **Health Economic Impact:** Cost-effectiveness risk assessment

**Population Health Considerations:**
- **Epidemiological Risk Factors:** Disease prevalence, demographic risks
- **Social Determinants:** Access, education, socioeconomic factors
- **Cultural Competency:** Language barriers, health literacy impacts

**6. DYNAMIC RISK STRATIFICATION ALGORITHM:**
Multi-factorial risk scoring system:

**CRITICAL RISK (Level 5 - Immediate Action Required):**
- Life-threatening medication errors imminent
- Contraindicated drug combinations prescribed  
- Extreme dosing errors (>10x or <10% of recommended)
- Missing essential monitoring for high-risk drugs

**HIGH RISK (Level 4 - Urgent Intervention Needed):**
- Significant adverse event probability (>25%)
- Major drug interactions with serious consequences
- Inappropriate dosing for patient characteristics
- Missing critical prescription information

**MODERATE RISK (Level 3 - Enhanced Monitoring Required):**
- Moderate adverse event risk (10-25%)
- Minor to moderate drug interactions
- Suboptimal but acceptable dosing
- Prescription quality concerns

**LOW RISK (Level 2 - Standard Care Adequate):**
- Minimal adverse event risk (<10%)
- No significant interactions identified
- Appropriate dosing and monitoring
- Complete, clear prescription

**MINIMAL RISK (Level 1 - Routine Processing):**
- Excellent prescription quality
- Well-established therapy
- Low-risk medication profile
- Comprehensive documentation

**7. EVIDENCE-BASED RISK MITIGATION STRATEGIES:**
Comprehensive safety intervention protocols:

**Immediate Safety Actions:**
- Emergency prescriber notifications for critical risks
- Pharmacist intervention protocols for high-risk scenarios
- Patient safety alerts for serious adverse event potential
- Alternative therapy recommendations with clinical rationale

**Enhanced Monitoring Protocols:**
- Laboratory monitoring schedules with specific parameters
- Vital sign monitoring requirements and frequencies
- Symptom surveillance instructions for patients/caregivers
- Follow-up appointment scheduling recommendations

**Patient Safety Communication:**
- Risk-specific counseling talking points
- Adverse event recognition training
- Emergency contact protocols
- Medication adherence optimization strategies

**8. QUALITY IMPROVEMENT & LEARNING SYSTEM:**
Continuous improvement through risk analysis:

**Error Pattern Recognition:**
- Systematic error identification and classification
- Root cause analysis recommendations
- System-level improvement opportunities
- Provider education needs assessment

**Outcome Tracking:**
- Risk prediction accuracy monitoring
- Intervention effectiveness measurement
- Patient outcome correlation analysis
- Safety metric trend analysis

**🎯 RISK PRIORITIZATION MATRIX:**
Rank all identified risks by:
1. **Imminence of Harm:** Time-to-event criticality
2. **Severity of Consequences:** Magnitude of potential harm
3. **Probability of Occurrence:** Statistical likelihood assessment
4. **Preventability:** Intervention effectiveness potential
5. **Population Impact:** Broader safety implications

**📊 CLINICAL DECISION SUPPORT OUTPUT:**
Generate comprehensive risk assessment with:
- **Quantified Risk Scores:** Numerical risk stratification (0-100 scale)
- **Evidence Quality Ratings:** Confidence levels for risk predictions
- **Intervention Urgency Classification:** Time-sensitive action requirements
- **Stakeholder-Specific Recommendations:** Tailored guidance for each role
- **Monitoring Implementation Protocols:** Specific safety surveillance plans

**⚡ REAL-TIME RISK COMMUNICATION:**
Provide immediate alerts for:
- **Critical Safety Interventions:** Emergency prescriber notifications
- **High-Priority Pharmacy Actions:** Immediate dispensing hold recommendations
- **Patient Safety Communications:** Urgent counseling requirements
- **Healthcare System Alerts:** Quality improvement notifications

Execute this risk assessment with scientific rigor, clinical expertise, and unwavering commitment to patient safety optimization and harm prevention.`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Risk assessment failed:', error.message);
      return {
        riskLevel: 'unknown',
        riskFactors: ['Risk assessment unavailable'],
        recommendations: ['Manual review recommended']
      };
    }
  }

  /**
   * Generate recommendations using Gemini AI
   * @param {Object} analysisResults - Complete analysis results
   * @returns {Promise<Object>} - Recommendations
   */
  async generateRecommendationsWithGemini(analysisResults) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.analysis.name,
        generationConfig: this.models.analysis.config
      });

      const prompt = `
You are a clinical consultant providing comprehensive recommendations based on prescription analysis. Generate actionable, prioritized recommendations for all stakeholders.

**COMPLETE ANALYSIS:**
${JSON.stringify(analysisResults, null, 2)}

**RECOMMENDATION CATEGORIES:**

**1. IMMEDIATE ACTIONS REQUIRED:**
- Critical safety interventions
- Urgent prescriber consultations
- Immediate patient counseling needs
- Emergency protocols if needed

**2. PHARMACIST INTERVENTIONS:**
- Therapeutic substitutions
- Dosage adjustments
- Drug interaction management
- Patient counseling priorities
- Monitoring recommendations

**3. PRESCRIBER CONSULTATIONS:**
- Clarification needs
- Alternative therapy suggestions
- Dosage optimization
- Drug interaction concerns
- Patient-specific considerations

**4. PATIENT EDUCATION:**
- Medication administration instructions
- Side effect monitoring
- Drug interaction awareness
- Compliance strategies
- When to seek medical attention

**5. MONITORING PROTOCOLS:**
- Laboratory monitoring schedules
- Therapeutic level monitoring
- Side effect surveillance
- Efficacy assessment plans
- Follow-up appointments

**6. SYSTEM/PROCESS IMPROVEMENTS:**
- Documentation enhancements
- Prescription clarity improvements
- Workflow optimizations
- Technology solutions

**PRIORITIZATION:**
- **Priority 1:** Critical safety issues requiring immediate action
- **Priority 2:** Important clinical concerns requiring timely intervention
- **Priority 3:** Optimization opportunities for better outcomes
- **Priority 4:** Process improvements for future prevention

**OUTPUT FORMAT:**
Provide structured recommendations with:
- Priority level
- Responsible party
- Specific action required
- Timeline for completion
- Expected outcome
- Success metrics

Generate comprehensive, actionable recommendations in JSON format.`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Recommendation generation failed:', error.message);
      return {
        immediateActions: ['Manual review recommended'],
        pharmacistInterventions: [],
        prescriberConsultations: [],
        patientEducation: [],
        monitoring: [],
        processImprovements: []
      };
    }
  }

  /**
   * Calculate overall metrics from all analysis results
   * @param {Object} results - All analysis results
   * @returns {Object} - Overall metrics
   */
  calculateOverallMetrics(results) {
    try {
      const metrics = {
        overallConfidence: 0,
        processingQuality: 0,
        safetyScore: 0,
        completenessScore: 0,
        riskScore: 0
      };

      // Calculate overall confidence
      const confidenceScores = [];
      
      if (results.analysis?.medications?.length > 0) {
        const medConfidence = results.analysis.medications.reduce((sum, med) => sum + (med.confidence || 0), 0) / results.analysis.medications.length;
        confidenceScores.push(medConfidence);
      }

      if (results.analysis?.qualityMetrics?.overallQuality) {
        confidenceScores.push(results.analysis.qualityMetrics.overallQuality);
      }

      if (confidenceScores.length > 0) {
        metrics.overallConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
      }

      // Calculate processing quality
      if (results.analysis?.qualityMetrics) {
        const qm = results.analysis.qualityMetrics;
        metrics.processingQuality = (qm.legibility + qm.completeness + qm.clarity) / 3;
        metrics.completenessScore = qm.completeness;
      }

      // Calculate safety score based on risk assessment
      if (results.riskAssessment?.riskLevel) {
        const riskLevels = { low: 0.9, moderate: 0.7, high: 0.4, critical: 0.1 };
        metrics.safetyScore = riskLevels[results.riskAssessment.riskLevel] || 0.5;
        metrics.riskScore = 1 - metrics.safetyScore;
      }

      return metrics;

    } catch (error) {
      console.error('❌ Metrics calculation failed:', error.message);
      return {
        overallConfidence: 0.5,
        processingQuality: 0.5,
        safetyScore: 0.5,
        completenessScore: 0.5,
        riskScore: 0.5
      };
    }
  }

  /**
   * Generate unique processing ID
   * @returns {string} - Unique processing ID
   */
  generateProcessingId() {
    return `GEMINI_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Test Gemini API connection
   * @returns {Promise<boolean>} - Connection status
   */
  async testGeminiConnection() {
    try {
      console.log('🔌 Testing Gemini 2.5 Flash API connection...');
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent("Test connection. Respond with 'OK'.");
      const response = result.response.text();
      
      console.log('   📥 Response received:', response);
      const isConnected = response.includes('OK');
      console.log('   Connection status:', isConnected ? '✅ Connected' : '❌ Failed');
      
      return isConnected;
    } catch (error) {
      console.error('❌ Gemini connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get model usage statistics
   * @returns {Object} - Usage statistics
   */
  getUsageStatistics() {
    return {
      modelsAvailable: Object.keys(this.models),
      schemasRegistered: Object.keys(this.schemas).length,
      isConfigured: !!process.env.GOOGLE_CLOUD_API_KEY,
      lastUpdate: new Date().toISOString()
    };
  }
}

export default GeminiPrescriptionAI;
