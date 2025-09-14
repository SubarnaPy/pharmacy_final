import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Smart Symptom Checker Service
 * AI-powered symptom analysis, treatment mapping, and preventive care recommendations
 */
class SmartSymptomCheckerService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    this.initializeService();
    this.initializeSymptomDatabase();
  }

  initializeService() {
    // AI model configurations
    this.models = {
      symptomAnalysis: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.3, // Balanced for medical reasoning
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      },
      treatmentMapping: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.2, // Lower for precise treatment recommendations
          topK: 30,
          topP: 0.9,
          maxOutputTokens: 6144,
          responseMimeType: "application/json"
        }
      },
      preventiveCare: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.4, // Higher for creative preventive suggestions
          topK: 50,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      }
    };

    // Analysis configuration
    this.analysisConfig = {
      urgencyLevels: ['low', 'moderate', 'high', 'emergency'],
      confidenceThreshold: 0.7,
      maxConditions: 10,
      emergencyKeywords: [
        'chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious',
        'stroke symptoms', 'heart attack', 'severe allergic reaction', 'overdose'
      ]
    };

    console.log('✅ Smart Symptom Checker Service initialized');
  }

  initializeSymptomDatabase() {
    // Initialize comprehensive symptom categories
    this.symptomCategories = {
      general: ['fever', 'fatigue', 'weight loss', 'weight gain', 'night sweats', 'chills'],
      respiratory: ['cough', 'shortness of breath', 'chest pain', 'wheezing', 'sore throat'],
      cardiovascular: ['chest pain', 'palpitations', 'dizziness', 'swelling', 'fainting'],
      gastrointestinal: ['nausea', 'vomiting', 'diarrhea', 'constipation', 'abdominal pain'],
      neurological: ['headache', 'dizziness', 'confusion', 'seizures', 'numbness'],
      musculoskeletal: ['joint pain', 'muscle aches', 'stiffness', 'swelling', 'weakness'],
      dermatological: ['rash', 'itching', 'swelling', 'discoloration', 'lesions'],
      psychological: ['anxiety', 'depression', 'mood changes', 'sleep issues', 'stress']
    };

    // Common condition patterns
    this.conditionPatterns = {
      'common cold': ['runny nose', 'sneezing', 'mild cough', 'low fever'],
      'flu': ['high fever', 'body aches', 'fatigue', 'cough'],
      'migraine': ['severe headache', 'nausea', 'light sensitivity', 'aura'],
      'hypertension': ['headache', 'dizziness', 'chest pain', 'vision changes'],
      'diabetes': ['increased thirst', 'frequent urination', 'fatigue', 'blurred vision']
    };
  }

  /**
   * Analyze symptoms and provide comprehensive assessment
   * @param {Object} symptomData - Patient symptoms and information
   * @param {Object} patientProfile - Patient medical history and demographics
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Comprehensive symptom analysis
   */
  async analyzeSymptoms(symptomData, patientProfile, options = {}) {
    try {
      console.log('🔍 Starting smart symptom analysis');

      const {
        includeUrgency = true,
        includeTreatmentOptions = true,
        includePreventiveCare = true,
        trackOutcomes = true
      } = options;

      // Step 1: Analyze symptom patterns and urgency
      const symptomAnalysis = await this.performSymptomAnalysis(symptomData, patientProfile);
      console.log('   ✅ Symptom pattern analysis completed');

      // Step 2: Generate possible conditions and differential diagnosis
      const possibleConditions = await this.generateDifferentialDiagnosis(symptomAnalysis, patientProfile);
      console.log('   ✅ Differential diagnosis completed');

      // Step 3: Map symptoms to treatment options
      let treatmentMapping = null;
      if (includeTreatmentOptions) {
        treatmentMapping = await this.mapSymptomsToTreatments(possibleConditions, patientProfile);
        console.log('   ✅ Treatment mapping completed');
      }

      // Step 4: Generate preventive care recommendations
      let preventiveCare = null;
      if (includePreventiveCare) {
        preventiveCare = await this.generatePreventiveCareRecommendations(symptomAnalysis, patientProfile);
        console.log('   ✅ Preventive care recommendations completed');
      }

      // Step 5: Assess urgency and next steps
      const urgencyAssessment = this.assessUrgency(symptomAnalysis, possibleConditions);

      const result = {
        analysisId: `SYMPTOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        patientId: patientProfile.id,
        symptomInput: symptomData,
        analysis: {
          symptomAnalysis,
          possibleConditions,
          urgencyAssessment,
          treatmentMapping,
          preventiveCare
        },
        recommendations: {
          immediateActions: this.generateImmediateActions(urgencyAssessment, possibleConditions),
          followUpCare: this.generateFollowUpRecommendations(possibleConditions, patientProfile),
          lifestyleModifications: preventiveCare?.lifestyleRecommendations || [],
          monitoringNeeded: this.generateMonitoringRecommendations(possibleConditions)
        },
        warnings: this.generateWarnings(symptomAnalysis, possibleConditions),
        confidence: this.calculateOverallConfidence(symptomAnalysis, possibleConditions)
      };

      console.log('✅ Smart symptom analysis completed successfully');
      return result;

    } catch (error) {
      console.error('❌ Symptom analysis failed:', error);
      throw error;
    }
  }

  /**
   * Perform detailed symptom analysis
   */
  async performSymptomAnalysis(symptomData, patientProfile) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.symptomAnalysis.name,
        generationConfig: this.models.symptomAnalysis.config
      });

      const prompt = `
Perform comprehensive medical symptom analysis as an expert physician.

**Patient Profile:**
- Age: ${patientProfile.age || 'Unknown'}
- Gender: ${patientProfile.gender || 'Unknown'}
- Medical History: ${JSON.stringify(patientProfile.medicalHistory || {})}
- Current Medications: ${patientProfile.currentMedications?.join(', ') || 'None'}
- Allergies: ${patientProfile.allergies?.join(', ') || 'None'}

**Reported Symptoms:**
- Primary Symptoms: ${symptomData.primarySymptoms?.join(', ') || 'None specified'}
- Secondary Symptoms: ${symptomData.secondarySymptoms?.join(', ') || 'None'}
- Duration: ${symptomData.duration || 'Unknown'}
- Severity (1-10): ${symptomData.severity || 'Unknown'}
- Onset: ${symptomData.onset || 'Unknown'}
- Triggers: ${symptomData.triggers?.join(', ') || 'None identified'}
- Relieving Factors: ${symptomData.relievingFactors?.join(', ') || 'None identified'}
- Associated Symptoms: ${symptomData.associatedSymptoms?.join(', ') || 'None'}

**Analysis Requirements:**
1. Categorize symptoms by system involvement
2. Identify symptom patterns and clustering
3. Assess symptom progression and timeline
4. Evaluate severity and impact on daily life
5. Consider patient-specific risk factors

Return JSON:
{
  "symptomCategorization": {
    "primary": ["most_significant_symptoms"],
    "secondary": ["supporting_symptoms"],
    "systemsInvolved": ["affected_body_systems"],
    "redFlags": ["concerning_symptoms"]
  },
  "symptomPatterns": {
    "clustering": "symptom_relationship_analysis",
    "progression": "how_symptoms_evolved",
    "timeline": "symptom_development_pattern",
    "severity": "overall_severity_assessment"
  },
  "riskFactors": {
    "patientSpecific": ["individual_risk_factors"],
    "demographic": ["age_gender_related_risks"],
    "medical": ["existing_condition_risks"],
    "medication": ["drug_related_considerations"]
  },
  "symptomAssessment": {
    "overallSeverity": "mild|moderate|severe|critical",
    "functionalImpact": "minimal|moderate|significant|severe",
    "progressionConcern": "stable|improving|worsening|rapidly_declining",
    "emergencyIndicators": ["emergency_warning_signs"]
  },
  "confidence": number,
  "analysisQuality": {
    "dataCompleteness": number,
    "symptomClarity": number,
    "patientHistoryRelevance": number
  }
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Symptom analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate differential diagnosis
   */
  async generateDifferentialDiagnosis(symptomAnalysis, patientProfile) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.symptomAnalysis.name,
        generationConfig: this.models.symptomAnalysis.config
      });

      const prompt = `
Generate a comprehensive differential diagnosis based on the symptom analysis.

**Symptom Analysis:**
${JSON.stringify(symptomAnalysis)}

**Patient Context:**
- Age: ${patientProfile.age}
- Gender: ${patientProfile.gender}
- Medical History: ${JSON.stringify(patientProfile.medicalHistory)}

**Differential Diagnosis Requirements:**
1. List possible conditions in order of likelihood
2. Provide clinical reasoning for each condition
3. Identify supporting and contradicting evidence
4. Assess probability and confidence for each diagnosis
5. Highlight conditions requiring immediate attention

Return JSON:
{
  "possibleConditions": [
    {
      "condition": "medical_condition_name",
      "category": "infectious|inflammatory|metabolic|neoplastic|vascular|degenerative|other",
      "probability": number,
      "confidence": number,
      "supportingEvidence": ["symptoms_supporting_diagnosis"],
      "contradictingEvidence": ["symptoms_against_diagnosis"],
      "clinicalReasoning": "medical_reasoning_for_diagnosis",
      "typicalPresentation": "how_condition_usually_presents",
      "atypicalFeatures": ["unusual_aspects_in_this_case"],
      "riskFactors": ["patient_specific_risk_factors"],
      "urgency": "low|moderate|high|emergency",
      "nextSteps": ["recommended_diagnostic_steps"]
    }
  ],
  "differentialSummary": {
    "mostLikely": "top_diagnosis",
    "emergencyConditions": ["conditions_needing_immediate_care"],
    "commonConditions": ["frequent_causes_of_symptoms"],
    "rareConditions": ["less_common_possibilities"]
  },
  "diagnosticUncertainty": {
    "keyQuestions": ["questions_to_clarify_diagnosis"],
    "missingInformation": ["needed_additional_data"],
    "diagnosticTests": ["recommended_tests"]
  },
  "overallAssessment": {
    "diagnosticConfidence": number,
    "clinicalConcern": "low|moderate|high|critical",
    "recommendedAction": "self_care|primary_care|urgent_care|emergency_care"
  }
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Differential diagnosis failed:', error);
      return { possibleConditions: [] };
    }
  }

  /**
   * Map symptoms to treatment options
   */
  async mapSymptomsToTreatments(possibleConditions, patientProfile) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.treatmentMapping.name,
        generationConfig: this.models.treatmentMapping.config
      });

      const conditions = possibleConditions.possibleConditions?.slice(0, 5) || []; // Top 5 conditions

      const prompt = `
Map possible conditions to appropriate treatment options and management strategies.

**Possible Conditions:**
${JSON.stringify(conditions)}

**Patient Profile:**
- Age: ${patientProfile.age}
- Allergies: ${patientProfile.allergies?.join(', ') || 'None'}
- Current Medications: ${patientProfile.currentMedications?.join(', ') || 'None'}
- Medical History: ${JSON.stringify(patientProfile.medicalHistory)}

**Treatment Mapping Requirements:**
1. Provide treatment options for each possible condition
2. Include both pharmacological and non-pharmacological approaches
3. Consider patient-specific contraindications
4. Suggest symptom management strategies
5. Recommend monitoring and follow-up

Return JSON:
{
  "treatmentOptions": [
    {
      "condition": "condition_name",
      "treatments": {
        "firstLine": [
          {
            "type": "medication|therapy|procedure|lifestyle",
            "treatment": "specific_treatment",
            "dosage": "if_applicable",
            "duration": "treatment_duration",
            "mechanism": "how_it_helps",
            "effectiveness": "expected_improvement",
            "contraindications": ["patient_specific_concerns"],
            "sideEffects": ["potential_side_effects"]
          }
        ],
        "secondLine": ["alternative_treatments"],
        "adjunctive": ["supportive_treatments"]
      },
      "symptomManagement": {
        "pain": ["pain_management_strategies"],
        "nausea": ["nausea_management"],
        "fever": ["fever_management"],
        "anxiety": ["anxiety_management"]
      },
      "nonPharmacological": {
        "lifestyle": ["lifestyle_modifications"],
        "dietary": ["dietary_recommendations"],
        "physical": ["physical_therapy_exercises"],
        "behavioral": ["behavioral_interventions"]
      },
      "monitoring": {
        "parameters": ["what_to_monitor"],
        "frequency": "monitoring_schedule",
        "warningSigns": ["when_to_seek_help"]
      }
    }
  ],
  "generalRecommendations": {
    "selfCare": ["home_care_measures"],
    "avoidance": ["things_to_avoid"],
    "warning": ["red_flag_symptoms"],
    "followUp": "when_to_follow_up"
  },
  "prescriptionConsiderations": {
    "drugInteractions": ["potential_interactions"],
    "allergies": ["allergy_considerations"],
    "contraindications": ["patient_specific_contraindications"]
  }
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Treatment mapping failed:', error);
      return { treatmentOptions: [] };
    }
  }

  /**
   * Generate preventive care recommendations
   */
  async generatePreventiveCareRecommendations(symptomAnalysis, patientProfile) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.preventiveCare.name,
        generationConfig: this.models.preventiveCare.config
      });

      const prompt = `
Generate comprehensive preventive care recommendations based on symptom patterns and patient profile.

**Symptom Analysis:**
${JSON.stringify(symptomAnalysis)}

**Patient Profile:**
- Age: ${patientProfile.age}
- Gender: ${patientProfile.gender}
- Medical History: ${JSON.stringify(patientProfile.medicalHistory)}
- Family History: ${JSON.stringify(patientProfile.familyHistory || {})}
- Lifestyle: ${JSON.stringify(patientProfile.lifestyle || {})}

**Preventive Care Focus:**
1. Risk factor modification
2. Lifestyle interventions
3. Screening recommendations
4. Health maintenance
5. Future health optimization

Return JSON:
{
  "riskFactorModification": {
    "modifiableRisks": ["identified_modifiable_risks"],
    "interventions": [
      {
        "riskFactor": "specific_risk",
        "intervention": "recommended_action",
        "timeline": "implementation_schedule",
        "expectedBenefit": "health_improvement",
        "monitoring": "how_to_track_progress"
      }
    ]
  },
  "lifestyleRecommendations": {
    "nutrition": {
      "dietary": ["dietary_modifications"],
      "hydration": "fluid_recommendations",
      "supplements": ["beneficial_supplements"],
      "restrictions": ["foods_to_limit"]
    },
    "exercise": {
      "cardiovascular": ["cardio_recommendations"],
      "strength": ["strength_training"],
      "flexibility": ["flexibility_exercises"],
      "limitations": ["exercise_precautions"]
    },
    "sleep": {
      "hygiene": ["sleep_improvement_tips"],
      "schedule": "optimal_sleep_pattern",
      "environment": ["sleep_environment_optimization"]
    },
    "stress": {
      "management": ["stress_reduction_techniques"],
      "relaxation": ["relaxation_methods"],
      "mindfulness": ["mindfulness_practices"]
    }
  },
  "screeningRecommendations": {
    "ageAppropriate": ["recommended_screenings"],
    "riskBased": ["additional_screenings_for_risks"],
    "timeline": "screening_schedule",
    "priority": ["high_priority_screenings"]
  },
  "healthMaintenance": {
    "vaccinations": ["recommended_vaccines"],
    "checkups": "routine_checkup_schedule",
    "monitoring": ["parameters_to_track"],
    "education": ["health_education_topics"]
  },
  "futureHealthOptimization": {
    "longTermGoals": ["health_goals"],
    "prevention": ["disease_prevention_strategies"],
    "wellness": ["wellness_enhancement"],
    "ageingWell": ["healthy_aging_strategies"]
  }
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Preventive care recommendations failed:', error);
      return { lifestyleRecommendations: {} };
    }
  }

  /**
   * Assess urgency level
   */
  assessUrgency(symptomAnalysis, possibleConditions) {
    let urgencyLevel = 'low';
    let urgencyScore = 0;
    const emergencyIndicators = [];

    // Check for emergency symptoms
    const redFlags = symptomAnalysis.symptomCategorization?.redFlags || [];
    redFlags.forEach(flag => {
      if (this.analysisConfig.emergencyKeywords.some(keyword => 
        flag.toLowerCase().includes(keyword.toLowerCase())
      )) {
        urgencyLevel = 'emergency';
        urgencyScore = 10;
        emergencyIndicators.push(flag);
      }
    });

    // Check emergency conditions
    const emergencyConditions = possibleConditions.possibleConditions?.filter(
      condition => condition.urgency === 'emergency'
    ) || [];

    if (emergencyConditions.length > 0) {
      urgencyLevel = 'emergency';
      urgencyScore = 10;
    }

    // Check severity assessment
    if (symptomAnalysis.symptomAssessment?.overallSeverity === 'critical') {
      urgencyLevel = 'emergency';
      urgencyScore = 10;
    } else if (symptomAnalysis.symptomAssessment?.overallSeverity === 'severe') {
      urgencyLevel = 'high';
      urgencyScore = Math.max(urgencyScore, 7);
    }

    return {
      level: urgencyLevel,
      score: urgencyScore,
      indicators: emergencyIndicators,
      recommendation: this.getUrgencyRecommendation(urgencyLevel),
      timeframe: this.getTimeframe(urgencyLevel)
    };
  }

  /**
   * Generate immediate actions based on urgency
   */
  generateImmediateActions(urgencyAssessment, possibleConditions) {
    const actions = [];

    switch (urgencyAssessment.level) {
      case 'emergency':
        actions.push('Call 911 or go to emergency room immediately');
        actions.push('Do not drive yourself - have someone else drive or call ambulance');
        actions.push('Bring list of current medications and medical history');
        break;
      
      case 'high':
        actions.push('Contact your doctor immediately or go to urgent care');
        actions.push('Monitor symptoms closely');
        actions.push('Avoid activities that worsen symptoms');
        break;
      
      case 'moderate':
        actions.push('Schedule appointment with healthcare provider within 24-48 hours');
        actions.push('Monitor symptoms and note any changes');
        actions.push('Follow home care measures as appropriate');
        break;
      
      default:
        actions.push('Monitor symptoms over next few days');
        actions.push('Try home care measures');
        actions.push('Schedule routine appointment if symptoms persist');
    }

    return actions;
  }

  /**
   * Generate follow-up recommendations
   */
  generateFollowUpRecommendations(possibleConditions, patientProfile) {
    const followUp = [];

    // Based on top conditions
    const topCondition = possibleConditions.possibleConditions?.[0];
    if (topCondition) {
      if (topCondition.nextSteps) {
        followUp.push(...topCondition.nextSteps);
      }
    }

    // General follow-up based on patient profile
    if (patientProfile.age >= 65) {
      followUp.push('Consider comprehensive geriatric assessment');
    }

    if (patientProfile.medicalHistory?.conditions?.length > 0) {
      followUp.push('Review with specialists managing existing conditions');
    }

    return followUp;
  }

  /**
   * Generate monitoring recommendations
   */
  generateMonitoringRecommendations(possibleConditions) {
    const monitoring = [];

    possibleConditions.possibleConditions?.forEach(condition => {
      if (condition.monitoring) {
        monitoring.push({
          condition: condition.condition,
          parameters: condition.monitoring.parameters || [],
          frequency: condition.monitoring.frequency || 'as needed'
        });
      }
    });

    return monitoring;
  }

  /**
   * Generate warnings and precautions
   */
  generateWarnings(symptomAnalysis, possibleConditions) {
    const warnings = [];

    // Emergency warnings
    if (symptomAnalysis.symptomAssessment?.emergencyIndicators?.length > 0) {
      warnings.push({
        type: 'emergency',
        message: 'Emergency symptoms detected - seek immediate medical attention',
        indicators: symptomAnalysis.symptomAssessment.emergencyIndicators
      });
    }

    // High-risk condition warnings
    const highRiskConditions = possibleConditions.possibleConditions?.filter(
      condition => condition.urgency === 'high' || condition.urgency === 'emergency'
    ) || [];

    if (highRiskConditions.length > 0) {
      warnings.push({
        type: 'urgent',
        message: 'Potentially serious conditions identified - prompt medical evaluation needed',
        conditions: highRiskConditions.map(c => c.condition)
      });
    }

    return warnings;
  }

  /**
   * Calculate overall confidence in analysis
   */
  calculateOverallConfidence(symptomAnalysis, possibleConditions) {
    let confidence = 0;
    let factors = 0;

    // Symptom analysis confidence
    if (symptomAnalysis.confidence) {
      confidence += symptomAnalysis.confidence;
      factors++;
    }

    // Diagnostic confidence
    if (possibleConditions.overallAssessment?.diagnosticConfidence) {
      confidence += possibleConditions.overallAssessment.diagnosticConfidence;
      factors++;
    }

    // Data completeness factor
    if (symptomAnalysis.analysisQuality?.dataCompleteness) {
      confidence += symptomAnalysis.analysisQuality.dataCompleteness;
      factors++;
    }

    return factors > 0 ? Math.round(confidence / factors) : 0;
  }

  /**
   * Get urgency recommendation
   */
  getUrgencyRecommendation(urgencyLevel) {
    const recommendations = {
      emergency: 'Seek emergency medical care immediately',
      high: 'Contact healthcare provider urgently',
      moderate: 'Schedule medical appointment soon',
      low: 'Monitor symptoms and consider routine medical care'
    };
    return recommendations[urgencyLevel] || recommendations.low;
  }

  /**
   * Get timeframe for medical attention
   */
  getTimeframe(urgencyLevel) {
    const timeframes = {
      emergency: 'Immediately',
      high: 'Within hours',
      moderate: 'Within 1-2 days',
      low: 'Within 1-2 weeks if symptoms persist'
    };
    return timeframes[urgencyLevel] || timeframes.low;
  }

  /**
   * Track prescription outcomes (for learning and improvement)
   */
  async trackPrescriptionOutcome(analysisId, prescriptionData, outcomeData) {
    try {
      // This would typically store outcome data for ML model improvement
      console.log('📊 Tracking prescription outcome for analysis:', analysisId);
      
      return {
        tracked: true,
        analysisId,
        prescription: prescriptionData.medications?.[0]?.name || 'Unknown',
        outcome: outcomeData.effectiveness || 'Unknown',
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Outcome tracking failed:', error);
      return { tracked: false, error: error.message };
    }
  }
}

export default SmartSymptomCheckerService;