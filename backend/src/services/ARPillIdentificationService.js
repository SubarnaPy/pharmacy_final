import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AR Pill Identification Service
 * Camera-based pill scanning, identification, and drug interaction visualization
 */
class ARPillIdentificationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    this.initializeService();
    this.initializePillDatabase();
  }

  initializeService() {
    // AI model configurations
    this.models = {
      pillIdentification: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.2, // Low temperature for accurate identification
          topK: 30,
          topP: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      },
      drugInteraction: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 6144,
          responseMimeType: "application/json"
        }
      },
      dosageAnalysis: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.1,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      }
    };

    // AR overlay configurations
    this.arConfig = {
      confidenceThreshold: 0.75,
      maxPillsPerScan: 10,
      interactionWarningLevels: ['minor', 'moderate', 'major', 'contraindicated'],
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp']
    };

    console.log('✅ AR Pill Identification Service initialized');
  }

  initializePillDatabase() {
    // Initialize comprehensive pill database with physical characteristics
    this.pillDatabase = {
      shapes: ['round', 'oval', 'capsule', 'square', 'diamond', 'triangle', 'oblong'],
      colors: ['white', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'orange', 'brown', 'black', 'gray'],
      imprints: [], // Will be populated with known imprints
      sizes: ['small', 'medium', 'large'],
      scoringPatterns: ['none', 'single_score', 'cross_score', 'multiple_score']
    };
  }

  /**
   * Identify pills from camera image using AI vision
   * @param {string} imageData - Base64 encoded image data
   * @param {Object} options - Identification options
   * @returns {Promise<Object>} - Pill identification results
   */
  async identifyPillsFromImage(imageData, options = {}) {
    try {
      console.log('📸 Starting AR pill identification');

      const {
        includeInteractions = true,
        includeDosageInfo = true,
        userMedications = [],
        confidenceThreshold = 0.75
      } = options;

      // Step 1: Analyze image for pill characteristics
      const pillAnalysis = await this.analyzePillCharacteristics(imageData);
      console.log('   ✅ Pill characteristics analyzed');

      // Step 2: Identify medications based on characteristics
      const identifiedPills = await this.identifyMedicationsFromCharacteristics(pillAnalysis);
      console.log('   ✅ Medications identified');

      // Step 3: Get detailed medication information
      const detailedInfo = await this.getDetailedMedicationInfo(identifiedPills);
      console.log('   ✅ Detailed medication info retrieved');

      // Step 4: Check drug interactions if enabled
      let interactionAnalysis = null;
      if (includeInteractions) {
        interactionAnalysis = await this.analyzeDrugInteractions(identifiedPills, userMedications);
        console.log('   ✅ Drug interactions analyzed');
      }

      // Step 5: Generate AR overlay data
      const arOverlayData = this.generateAROverlayData(
        identifiedPills, 
        detailedInfo, 
        interactionAnalysis,
        pillAnalysis.pillLocations
      );

      const result = {
        scanId: `PILL_SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        imageAnalysis: pillAnalysis,
        identifiedPills,
        detailedInfo,
        interactionAnalysis,
        arOverlayData,
        summary: {
          totalPillsDetected: identifiedPills.length,
          highConfidenceIdentifications: identifiedPills.filter(p => p.confidence >= confidenceThreshold).length,
          interactionWarnings: interactionAnalysis?.warnings?.length || 0,
          highRiskInteractions: interactionAnalysis?.highRiskInteractions?.length || 0
        }
      };

      console.log('✅ AR pill identification completed successfully');
      return result;

    } catch (error) {
      console.error('❌ AR pill identification failed:', error);
      throw error;
    }
  }

  /**
   * Analyze pill physical characteristics from image
   */
  async analyzePillCharacteristics(imageData) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.pillIdentification.name,
        generationConfig: this.models.pillIdentification.config
      });

      // Convert base64 to image part
      const imagePart = {
        inlineData: {
          data: imageData.split(',')[1], // Remove data:image/jpeg;base64, prefix
          mimeType: 'image/jpeg'
        }
      };

      const prompt = `
Analyze this image to identify and characterize all pills/tablets/capsules present.

For each pill detected, provide detailed physical characteristics:

Return JSON with this structure:
{
  "pillsDetected": number,
  "pills": [
    {
      "pillId": "string",
      "location": {
        "x": number,
        "y": number,
        "width": number,
        "height": number
      },
      "physicalCharacteristics": {
        "shape": "round|oval|capsule|square|diamond|triangle|oblong",
        "color": "primary_color",
        "secondaryColor": "secondary_color_if_any",
        "size": "small|medium|large",
        "estimatedDiameter": "string_with_mm",
        "thickness": "thin|medium|thick",
        "surface": "smooth|textured|coated",
        "scoring": "none|single_score|cross_score|multiple_score",
        "imprint": "visible_text_or_numbers",
        "imprintSide1": "front_imprint",
        "imprintSide2": "back_imprint",
        "specialFeatures": ["string"]
      },
      "imageQuality": {
        "clarity": number,
        "lighting": "good|fair|poor",
        "angle": "frontal|angled|side",
        "obstruction": "none|partial|significant"
      },
      "confidence": number
    }
  ],
  "imageAnalysis": {
    "overallQuality": number,
    "lighting": "good|fair|poor",
    "background": "clean|cluttered|medical_surface",
    "resolution": "high|medium|low",
    "recommendedImprovements": ["string"]
  }
}`;

      const result = await model.generateContent([imagePart, { text: prompt }]);
      const analysis = JSON.parse(result.response.text());

      return {
        ...analysis,
        pillLocations: analysis.pills?.map(pill => ({
          id: pill.pillId,
          bounds: pill.location,
          confidence: pill.confidence
        })) || []
      };

    } catch (error) {
      console.error('❌ Pill characteristics analysis failed:', error);
      throw error;
    }
  }

  /**
   * Identify medications from physical characteristics
   */
  async identifyMedicationsFromCharacteristics(pillAnalysis) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.pillIdentification.name,
        generationConfig: this.models.pillIdentification.config
      });

      const pillsData = JSON.stringify(pillAnalysis.pills);

      const prompt = `
Based on the following pill characteristics, identify the most likely medications.
Use your knowledge of pharmaceutical databases, pill identification resources, and common medications.

Pill characteristics:
${pillsData}

For each pill, provide medication identification:

Return JSON:
{
  "identifications": [
    {
      "pillId": "string",
      "possibleMedications": [
        {
          "name": "medication_name",
          "genericName": "generic_name",
          "brandNames": ["brand_names"],
          "strength": "dosage_strength",
          "manufacturer": "manufacturer_name",
          "ndc": "national_drug_code",
          "confidence": number,
          "matchingFeatures": ["characteristic_matches"],
          "conflictingFeatures": ["characteristic_conflicts"]
        }
      ],
      "bestMatch": {
        "name": "most_likely_medication",
        "confidence": number,
        "reason": "why_this_is_best_match"
      },
      "identificationStatus": "confirmed|likely|uncertain|unknown",
      "requiresVerification": boolean,
      "warnings": ["string"]
    }
  ],
  "overallConfidence": number,
  "identificationSummary": {
    "totalPills": number,
    "identifiedPills": number,
    "uncertainPills": number,
    "unknownPills": number
  }
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Medication identification failed:', error);
      return { identifications: [] };
    }
  }

  /**
   * Get detailed medication information
   */
  async getDetailedMedicationInfo(identifiedPills) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.pillIdentification.name,
        generationConfig: this.models.pillIdentification.config
      });

      const medications = identifiedPills.identifications?.map(id => id.bestMatch?.name).filter(Boolean) || [];

      const prompt = `
Provide comprehensive medication information for these identified pills:
${medications.join(', ')}

For each medication, provide:

Return JSON:
{
  "medications": [
    {
      "name": "medication_name",
      "genericName": "generic_name",
      "brandNames": ["brand_names"],
      "drugClass": "therapeutic_class",
      "indication": "primary_use",
      "commonDosages": ["available_strengths"],
      "administrationRoute": "oral|topical|injection|etc",
      "dosageInstructions": {
        "typical": "usual_dosing",
        "maximum": "max_daily_dose",
        "frequency": "how_often",
        "timing": "with_food|empty_stomach|anytime"
      },
      "sideEffects": {
        "common": ["frequent_side_effects"],
        "serious": ["serious_side_effects"],
        "rare": ["rare_side_effects"]
      },
      "contraindications": ["conditions_to_avoid"],
      "interactions": {
        "drugInteractions": ["interacting_medications"],
        "foodInteractions": ["food_restrictions"],
        "supplementInteractions": ["supplement_interactions"]
      },
      "warnings": ["important_warnings"],
      "storageInstructions": "storage_requirements",
      "pregnancyCategory": "FDA_pregnancy_category",
      "controlledSubstance": "schedule_if_controlled"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Detailed medication info failed:', error);
      return { medications: [] };
    }
  }

  /**
   * Analyze drug interactions
   */
  async analyzeDrugInteractions(identifiedPills, userMedications = []) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.drugInteraction.name,
        generationConfig: this.models.drugInteraction.config
      });

      const scannedMedications = identifiedPills.identifications?.map(id => id.bestMatch?.name).filter(Boolean) || [];
      const allMedications = [...scannedMedications, ...userMedications];

      const prompt = `
Analyze potential drug interactions for this medication combination:

Scanned medications: ${scannedMedications.join(', ')}
User's current medications: ${userMedications.join(', ')}

Provide comprehensive interaction analysis:

Return JSON:
{
  "interactions": [
    {
      "medication1": "drug_name_1",
      "medication2": "drug_name_2", 
      "interactionType": "pharmacokinetic|pharmacodynamic|additive|antagonistic",
      "severity": "minor|moderate|major|contraindicated",
      "mechanism": "how_interaction_occurs",
      "clinicalEffects": "what_happens_to_patient",
      "management": "how_to_manage_interaction",
      "monitoring": "what_to_monitor",
      "timeframe": "when_interaction_occurs",
      "documentation": "well_documented|suspected|theoretical",
      "riskLevel": number
    }
  ],
  "foodInteractions": [
    {
      "medication": "drug_name",
      "food": "food_or_nutrient",
      "effect": "interaction_effect",
      "recommendation": "dietary_advice",
      "severity": "minor|moderate|major"
    }
  ],
  "warnings": [
    {
      "type": "interaction|contraindication|warning",
      "message": "warning_message",
      "severity": "low|medium|high|critical",
      "medications": ["affected_drugs"],
      "action": "recommended_action"
    }
  ],
  "overallRisk": {
    "level": "low|moderate|high|critical",
    "score": number,
    "majorInteractions": number,
    "contraindicatedCombinations": number,
    "recommendation": "overall_recommendation"
  },
  "monitoringRecommendations": ["monitoring_suggestions"],
  "alternativeOptions": ["safer_alternatives"]
}`;

      const result = await model.generateContent(prompt);
      const analysis = JSON.parse(result.response.text());

      // Add high-risk interactions for quick access
      analysis.highRiskInteractions = analysis.interactions?.filter(
        interaction => interaction.severity === 'major' || interaction.severity === 'contraindicated'
      ) || [];

      return analysis;

    } catch (error) {
      console.error('❌ Drug interaction analysis failed:', error);
      return { interactions: [], warnings: [] };
    }
  }

  /**
   * Generate AR overlay data for visualization
   */
  generateAROverlayData(identifiedPills, detailedInfo, interactionAnalysis, pillLocations) {
    const overlayData = {
      pills: [],
      interactions: [],
      warnings: [],
      globalAlerts: []
    };

    // Generate pill overlays
    identifiedPills.identifications?.forEach((identification, index) => {
      const pillLocation = pillLocations[index];
      const medication = detailedInfo.medications?.find(med => 
        med.name === identification.bestMatch?.name
      );

      if (pillLocation && medication) {
        overlayData.pills.push({
          id: identification.pillId,
          bounds: pillLocation.bounds,
          medication: {
            name: medication.name,
            genericName: medication.genericName,
            strength: identification.bestMatch?.name,
            confidence: identification.bestMatch?.confidence || 0
          },
          overlay: {
            label: medication.name,
            confidence: `${Math.round((identification.bestMatch?.confidence || 0) * 100)}%`,
            color: this.getConfidenceColor(identification.bestMatch?.confidence || 0),
            icon: this.getMedicationIcon(medication.drugClass),
            dosageInfo: medication.dosageInstructions?.typical || '',
            warnings: medication.warnings?.slice(0, 2) || []
          }
        });
      }
    });

    // Generate interaction overlays
    interactionAnalysis?.interactions?.forEach(interaction => {
      if (interaction.severity === 'major' || interaction.severity === 'contraindicated') {
        overlayData.interactions.push({
          medications: [interaction.medication1, interaction.medication2],
          severity: interaction.severity,
          warning: interaction.clinicalEffects,
          color: this.getSeverityColor(interaction.severity),
          icon: 'warning',
          action: interaction.management
        });
      }
    });

    // Generate warning overlays
    interactionAnalysis?.warnings?.forEach(warning => {
      if (warning.severity === 'high' || warning.severity === 'critical') {
        overlayData.warnings.push({
          type: warning.type,
          message: warning.message,
          severity: warning.severity,
          medications: warning.medications,
          color: this.getSeverityColor(warning.severity),
          icon: 'alert',
          action: warning.action
        });
      }
    });

    // Global alerts for critical issues
    if (interactionAnalysis?.overallRisk?.level === 'critical') {
      overlayData.globalAlerts.push({
        type: 'critical_risk',
        message: 'Critical drug interactions detected!',
        recommendation: interactionAnalysis.overallRisk.recommendation,
        color: '#DC2626', // Red
        icon: 'exclamation'
      });
    }

    return overlayData;
  }

  /**
   * Get confidence color for visualization
   */
  getConfidenceColor(confidence) {
    if (confidence >= 0.9) return '#10B981'; // Green
    if (confidence >= 0.75) return '#F59E0B'; // Yellow
    if (confidence >= 0.5) return '#F97316'; // Orange
    return '#EF4444'; // Red
  }

  /**
   * Get severity color for warnings
   */
  getSeverityColor(severity) {
    const colors = {
      minor: '#10B981',      // Green
      moderate: '#F59E0B',   // Yellow
      major: '#F97316',      // Orange
      contraindicated: '#DC2626', // Red
      low: '#10B981',
      medium: '#F59E0B',
      high: '#F97316',
      critical: '#DC2626'
    };
    return colors[severity] || '#6B7280';
  }

  /**
   * Get medication icon based on drug class
   */
  getMedicationIcon(drugClass) {
    const icons = {
      'antibiotic': 'bacteria',
      'analgesic': 'pain-relief',
      'cardiovascular': 'heart',
      'diabetes': 'glucose',
      'mental-health': 'brain',
      'respiratory': 'lungs',
      'gastrointestinal': 'stomach'
    };
    return icons[drugClass?.toLowerCase()] || 'pill';
  }

  /**
   * Process multiple pills in real-time (for continuous scanning)
   */
  async processRealTimePillScanning(imageStream, options = {}) {
    try {
      const {
        scanInterval = 2000,
        confidenceThreshold = 0.8,
        trackChanges = true
      } = options;

      const results = [];
      let previousScan = null;

      for await (const frame of imageStream) {
        const scanResult = await this.identifyPillsFromImage(frame, options);
        
        if (trackChanges && previousScan) {
          scanResult.changes = this.detectChanges(previousScan, scanResult);
        }

        if (scanResult.summary.highConfidenceIdentifications > 0) {
          results.push(scanResult);
        }

        previousScan = scanResult;
        
        // Wait for next scan interval
        await new Promise(resolve => setTimeout(resolve, scanInterval));
      }

      return {
        totalScans: results.length,
        scans: results,
        summary: this.summarizeRealTimeResults(results)
      };

    } catch (error) {
      console.error('❌ Real-time pill scanning failed:', error);
      throw error;
    }
  }

  /**
   * Detect changes between scans
   */
  detectChanges(previousScan, currentScan) {
    const changes = {
      newPills: [],
      removedPills: [],
      movedPills: [],
      identificationChanges: []
    };

    // Compare pill counts and positions
    const prevPills = previousScan.identifiedPills.identifications || [];
    const currPills = currentScan.identifiedPills.identifications || [];

    // Detect new and removed pills
    const prevIds = prevPills.map(p => p.pillId);
    const currIds = currPills.map(p => p.pillId);

    changes.newPills = currPills.filter(p => !prevIds.includes(p.pillId));
    changes.removedPills = prevPills.filter(p => !currIds.includes(p.pillId));

    return changes;
  }

  /**
   * Summarize real-time scanning results
   */
  summarizeRealTimeResults(results) {
    const allMedications = new Set();
    const allInteractions = [];
    let totalPills = 0;

    results.forEach(result => {
      result.identifiedPills.identifications?.forEach(id => {
        if (id.bestMatch?.name) {
          allMedications.add(id.bestMatch.name);
        }
      });
      
      totalPills += result.summary.totalPillsDetected;
      
      if (result.interactionAnalysis?.interactions) {
        allInteractions.push(...result.interactionAnalysis.interactions);
      }
    });

    return {
      uniqueMedicationsDetected: allMedications.size,
      totalPillsScanned: totalPills,
      totalInteractions: allInteractions.length,
      highRiskInteractions: allInteractions.filter(i => 
        i.severity === 'major' || i.severity === 'contraindicated'
      ).length,
      scanAccuracy: results.reduce((sum, r) => sum + r.summary.highConfidenceIdentifications, 0) / totalPills,
      medicationsList: Array.from(allMedications)
    };
  }
}

export default ARPillIdentificationService;