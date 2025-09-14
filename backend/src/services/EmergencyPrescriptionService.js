import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Emergency Prescription Network Service
 * Emergency medication access, travel prescriptions, and disaster response
 */
class EmergencyPrescriptionService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLOUD_API_KEY);
    this.initializeService();
  }

  initializeService() {
    this.models = {
      emergency: {
        name: "gemini-2.0-flash-exp",
        config: {
          temperature: 0.2,
          topK: 30,
          topP: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      }
    };

    this.emergencyConfig = {
      priorities: ['life_threatening', 'urgent', 'important', 'routine'],
      responseTimeTargets: {
        life_threatening: 30, // minutes
        urgent: 120,
        important: 360,
        routine: 1440
      },
      emergencyTypes: [
        'medical_emergency',
        'natural_disaster',
        'travel_emergency',
        'pharmacy_closure',
        'supply_shortage',
        'insurance_issue'
      ]
    };

    console.log('✅ Emergency Prescription Service initialized');
  }

  /**
   * Handle emergency medication requests
   */
  async handleEmergencyRequest(emergencyData, patientProfile) {
    try {
      console.log('🚨 Processing emergency prescription request');

      const {
        emergencyType,
        medication,
        location,
        urgency,
        circumstances
      } = emergencyData;

      // Assess emergency priority
      const priorityAssessment = await this.assessEmergencyPriority(
        emergencyData, 
        patientProfile
      );

      // Find available emergency pharmacies
      const availablePharmacies = await this.findEmergencyPharmacies(
        location, 
        medication,
        urgency
      );

      // Generate emergency prescription
      const emergencyPrescription = await this.generateEmergencyPrescription(
        medication,
        patientProfile,
        emergencyType
      );

      // Create emergency authorization
      const authorization = await this.createEmergencyAuthorization(
        emergencyPrescription,
        priorityAssessment,
        circumstances
      );

      const result = {
        emergencyId: `EMRG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        priority: priorityAssessment.priority,
        expectedResponseTime: this.emergencyConfig.responseTimeTargets[priorityAssessment.priority],
        availablePharmacies,
        emergencyPrescription,
        authorization,
        instructions: this.generateEmergencyInstructions(priorityAssessment, emergencyType),
        followUpRequired: this.determineFollowUpNeeds(emergencyData, patientProfile)
      };

      console.log('✅ Emergency request processed successfully');
      return result;

    } catch (error) {
      console.error('❌ Emergency request processing failed:', error);
      throw error;
    }
  }

  /**
   * Assess emergency priority using AI
   */
  async assessEmergencyPriority(emergencyData, patientProfile) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.emergency.name,
        generationConfig: this.models.emergency.config
      });

      const prompt = `
Assess emergency priority for prescription request:

Emergency Details:
- Type: ${emergencyData.emergencyType}
- Medication: ${emergencyData.medication?.name || 'Unknown'}
- Patient Age: ${patientProfile.age}
- Medical Conditions: ${patientProfile.conditions?.join(', ') || 'None'}
- Circumstances: ${emergencyData.circumstances}

Assess priority level and provide reasoning:

Return JSON:
{
  "priority": "life_threatening|urgent|important|routine",
  "riskLevel": "critical|high|moderate|low",
  "timeWindow": "time_until_critical",
  "justification": "medical_reasoning",
  "riskFactors": ["contributing_factors"],
  "mitigatingFactors": ["reducing_factors"],
  "alternativeOptions": ["possible_alternatives"],
  "monitoringNeeded": ["what_to_watch"]
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Priority assessment failed:', error);
      return {
        priority: 'urgent',
        riskLevel: 'moderate',
        justification: 'Unable to assess, defaulting to urgent priority'
      };
    }
  }

  /**
   * Find emergency pharmacies
   */
  async findEmergencyPharmacies(location, medication, urgency) {
    try {
      // This would integrate with pharmacy networks and location services
      // For now, return mock data structure
      return [
        {
          id: 'emergency_pharmacy_1',
          name: '24/7 Emergency Pharmacy',
          address: '123 Emergency St, City, State',
          distance: '2.3 miles',
          estimatedWaitTime: '15 minutes',
          hasStock: true,
          emergencyCapable: true,
          contact: '+1-555-EMERGENCY',
          specialServices: ['24hour', 'emergency_authorization', 'delivery']
        },
        {
          id: 'emergency_pharmacy_2',
          name: 'Hospital Pharmacy',
          address: '456 Hospital Ave, City, State',
          distance: '3.1 miles',
          estimatedWaitTime: '30 minutes',
          hasStock: true,
          emergencyCapable: true,
          contact: '+1-555-HOSPITAL',
          specialServices: ['hospital_based', 'urgent_care', 'specialist_access']
        }
      ];

    } catch (error) {
      console.error('❌ Find emergency pharmacies failed:', error);
      return [];
    }
  }

  /**
   * Generate emergency prescription authorization
   */
  async generateEmergencyPrescription(medication, patientProfile, emergencyType) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.models.emergency.name,
        generationConfig: this.models.emergency.config
      });

      const prompt = `
Generate emergency prescription for:
Medication: ${medication?.name || 'Unknown'}
Patient: Age ${patientProfile.age}, Conditions: ${patientProfile.conditions?.join(', ') || 'None'}
Emergency Type: ${emergencyType}

Provide emergency prescription details with appropriate quantities and instructions:

Return JSON:
{
  "medication": {
    "name": "medication_name",
    "genericName": "generic_equivalent",
    "strength": "dosage_strength",
    "form": "tablet|capsule|liquid|injection",
    "quantity": "emergency_quantity",
    "daysSupply": "number_of_days",
    "instructions": "dosing_instructions"
  },
  "emergencyJustification": "reason_for_emergency_access",
  "restrictions": ["limitations_on_use"],
  "followUpRequired": "when_to_follow_up",
  "alternativeOptions": ["backup_medications"],
  "safetyInstructions": ["important_safety_notes"],
  "monitoringRequirements": ["monitoring_needed"]
}`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());

    } catch (error) {
      console.error('❌ Emergency prescription generation failed:', error);
      throw error;
    }
  }

  /**
   * Create emergency authorization
   */
  async createEmergencyAuthorization(prescription, priorityAssessment, circumstances) {
    try {
      const authorizationCode = `EMRG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      return {
        authorizationCode,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        issuedBy: 'Emergency Prescription Network',
        issuedAt: new Date(),
        priority: priorityAssessment.priority,
        circumstances: circumstances,
        restrictions: [
          'One-time emergency use only',
          'Follow-up with primary care physician required',
          'Valid for 24 hours only'
        ],
        verificationRequired: priorityAssessment.priority === 'life_threatening' ? false : true,
        pharmacistOverride: priorityAssessment.riskLevel === 'critical'
      };

    } catch (error) {
      console.error('❌ Authorization creation failed:', error);
      throw error;
    }
  }

  /**
   * Handle travel prescription requests
   */
  async handleTravelPrescription(travelData, patientProfile) {
    try {
      console.log('✈️ Processing travel prescription request');

      const {
        destination,
        travelDuration,
        departureDate,
        medications,
        travelType
      } = travelData;

      // Generate travel prescription recommendations
      const recommendations = await this.generateTravelRecommendations(
        travelData,
        patientProfile
      );

      // Check international regulations
      const regulatoryInfo = await this.checkInternationalRegulations(
        destination,
        medications
      );

      // Calculate medication quantities needed
      const quantityCalculations = this.calculateTravelQuantities(
        medications,
        travelDuration
      );

      return {
        travelId: `TRAVEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        destination,
        recommendations,
        regulatoryInfo,
        quantityCalculations,
        travelTips: this.generateTravelTips(travelData),
        emergencyContacts: this.getEmergencyContacts(destination),
        documentationNeeded: this.getRequiredDocumentation(destination, medications)
      };

    } catch (error) {
      console.error('❌ Travel prescription processing failed:', error);
      throw error;
    }
  }

  /**
   * Activate disaster response mode
   */
  async activateDisasterResponse(disasterData, affectedArea) {
    try {
      console.log('🌪️ Activating disaster response mode');

      const {
        disasterType,
        severity,
        estimatedDuration,
        affectedPopulation
      } = disasterData;

      // Assess medication needs in disaster area
      const medicationNeeds = await this.assessDisasterMedicationNeeds(
        disasterData,
        affectedArea
      );

      // Coordinate with emergency services
      const emergencyCoordination = await this.coordinateEmergencyServices(
        disasterData,
        medicationNeeds
      );

      // Set up mobile pharmacy services
      const mobileServices = await this.deployMobilePharmacyServices(
        affectedArea,
        medicationNeeds
      );

      return {
        disasterResponseId: `DISASTER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        activatedAt: new Date(),
        disasterType,
        affectedArea,
        medicationNeeds,
        emergencyCoordination,
        mobileServices,
        specialProtocols: this.getDisasterProtocols(disasterType),
        resourceAllocation: this.allocateDisasterResources(medicationNeeds),
        communicationPlan: this.createCommunicationPlan(affectedArea)
      };

    } catch (error) {
      console.error('❌ Disaster response activation failed:', error);
      throw error;
    }
  }

  // Helper methods for emergency prescription processing

  generateEmergencyInstructions(priorityAssessment, emergencyType) {
    const baseInstructions = [
      'Present emergency authorization code to pharmacist',
      'Provide valid ID and insurance information if available',
      'Explain emergency circumstances clearly'
    ];

    if (priorityAssessment.priority === 'life_threatening') {
      baseInstructions.unshift('URGENT: Seek immediate medical attention if symptoms worsen');
    }

    return baseInstructions;
  }

  determineFollowUpNeeds(emergencyData, patientProfile) {
    return {
      required: true,
      timeframe: '24-48 hours',
      type: 'primary_care_physician',
      reason: 'Emergency prescription follow-up and ongoing care assessment',
      urgentSigns: [
        'Worsening symptoms',
        'New side effects',
        'No improvement in 24 hours'
      ]
    };
  }

  calculateTravelQuantities(medications, travelDuration) {
    return medications.map(med => ({
      medication: med.name,
      dailyDose: med.dailyDose || 1,
      travelDays: travelDuration,
      recommendedQuantity: Math.ceil(travelDuration * (med.dailyDose || 1) * 1.5), // 50% extra
      emergencySupply: Math.ceil(travelDuration * (med.dailyDose || 1) * 0.3) // 30% emergency
    }));
  }

  generateTravelTips(travelData) {
    return [
      'Pack medications in carry-on luggage',
      'Keep medications in original containers',
      'Bring prescription documentation',
      'Consider time zone changes for dosing',
      'Research local pharmacy options at destination'
    ];
  }

  getEmergencyContacts(destination) {
    // This would return actual emergency contacts for the destination
    return {
      emergency: '911 (US) / 112 (EU) / local emergency number',
      poisonControl: 'Local poison control center',
      embassy: 'US Embassy/Consulate if traveling internationally',
      insurance: 'Travel insurance emergency line'
    };
  }

  getRequiredDocumentation(destination, medications) {
    return [
      'Valid prescription from licensed physician',
      'Medical necessity letter for controlled substances',
      'Translation of prescriptions if traveling internationally',
      'Insurance documentation',
      'Emergency contact information'
    ];
  }

  getDisasterProtocols(disasterType) {
    const protocols = {
      hurricane: [
        'Pre-position emergency supplies',
        'Activate mobile pharmacy units',
        'Coordinate with FEMA and local emergency services'
      ],
      earthquake: [
        'Rapid assessment of pharmacy damage',
        'Emergency supply deployment',
        'Alternative distribution points'
      ],
      flood: [
        'Waterproof medication storage',
        'Boat/helicopter delivery if needed',
        'Contamination prevention protocols'
      ]
    };

    return protocols[disasterType] || protocols.hurricane;
  }

  allocateDisasterResources(medicationNeeds) {
    return {
      criticalMedications: medicationNeeds.critical || [],
      emergencySupplies: medicationNeeds.emergency || [],
      mobileUnits: Math.ceil((medicationNeeds.affectedPopulation || 1000) / 500),
      personnel: Math.ceil((medicationNeeds.affectedPopulation || 1000) / 200),
      transportationNeeded: this.calculateTransportationNeeds(medicationNeeds)
    };
  }

  calculateTransportationNeeds(medicationNeeds) {
    return {
      vehicles: Math.ceil((medicationNeeds.affectedPopulation || 1000) / 1000),
      helicopters: medicationNeeds.accessDifficulty === 'high' ? 2 : 0,
      boats: medicationNeeds.floodAffected ? 1 : 0
    };
  }

  createCommunicationPlan(affectedArea) {
    return {
      channels: ['radio', 'social_media', 'local_news', 'emergency_alerts'],
      frequency: 'Every 4 hours',
      keyMessages: [
        'Emergency prescription services available',
        'Mobile pharmacy locations and schedules',
        'How to access emergency medications',
        'Safety information and precautions'
      ],
      languages: ['English', 'Spanish', 'Local languages as needed']
    };
  }

  // Placeholder methods for complex integrations
  async generateTravelRecommendations(travelData, patientProfile) {
    return {
      vaccinations: ['Travel-specific vaccinations needed'],
      medications: ['Medication adjustments for travel'],
      precautions: ['Health precautions for destination']
    };
  }

  async checkInternationalRegulations(destination, medications) {
    return {
      controlled: ['Medications requiring special documentation'],
      prohibited: ['Medications not allowed in destination'],
      requirements: ['Documentation and declaration requirements']
    };
  }

  async assessDisasterMedicationNeeds(disasterData, affectedArea) {
    return {
      critical: ['Life-saving medications needed'],
      chronic: ['Chronic disease medications'],
      emergency: ['Emergency treatment supplies'],
      affectedPopulation: disasterData.affectedPopulation || 1000
    };
  }

  async coordinateEmergencyServices(disasterData, medicationNeeds) {
    return {
      fema: 'Coordinated with FEMA for resource allocation',
      localEMS: 'Local emergency medical services notified',
      hospitals: 'Hospital pharmacies coordinated for supply sharing',
      redCross: 'Red Cross coordination for distribution points'
    };
  }

  async deployMobilePharmacyServices(affectedArea, medicationNeeds) {
    return {
      units: 2,
      locations: ['Central evacuation center', 'Secondary relief site'],
      schedule: '24/7 operation during emergency',
      staffing: 'Licensed pharmacists and technicians',
      supplies: 'Emergency medication stockpile deployed'
    };
  }
}

export default EmergencyPrescriptionService;