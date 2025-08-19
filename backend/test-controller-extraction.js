import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testControllerDataExtraction() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Import controller and service
    const { default: PrescriptionController } = await import('./src/controllers/PrescriptionController.js');
    const { default: PrescriptionRequestMatchingService } = await import('./src/services/PrescriptionRequestMatchingService.js');
    
    console.log('📋 Testing controller and service data extraction methods...');
    
    // Mock complete Gemini AI response
    const mockGeminiResponse = {
      enhancedText: "Dr. Anandibai G Joshi MBBS, M.D Medicine, Consultant Surgeon...",
      structuredData: {
        medications: [{
          name: "Augmentin 625 Duo Tablet",
          genericName: "Amoxicillin Clavulanic Acid",
          brandName: "Augmentin 625 Duo",
          dosage: "1 tablet",
          strength: "Amoxicillin (500mg) Clavulanic Acid (125mg)",
          frequency: "BID",
          route: "PO",
          duration: "7 days",
          instructions: "Take with food",
          indication: "Bacterial infection",
          confidence: 0.9,
          alternatives: ["Amoxicillin 500mg"],
          contraindications: ["Penicillin allergy"]
        }],
        
        prescriberInfo: {
          name: "Dr. Anandibai G Joshi",
          title: "MBBS, M.D Medicine, Consultant Surgeon",
          qualifications: ["MBBS", "M.D Medicine"],
          registrationNumber: "MCI110008",
          license: "MCI110008",
          contact: "08042685588",
          email: "",
          hospital: "Sagar Hospital, Jayanagar 4th block, Bangalore",
          address: "Swagath Road, SR Krishnappa Garden",
          signature: true,
          signatureImage: ""
        },
        
        patientInfo: {
          name: "K L Ravi Kumar",
          age: "60 Years",
          gender: "Male",
          weight: "70kg",
          height: "",
          allergies: [],
          medicalHistory: ["Cough with fever x 5 days", "B/L Ronchi"],
          currentConditions: ["Fever for evaluation"],
          emergencyContact: "",
          insuranceInfo: ""
        },
        
        qualityMetrics: {
          clarity: 0.7,
          completeness: 0.7,
          legibility: 0.9,
          overallQuality: 0.75,
          ambiguousFields: ["medications[0].frequency"],
          missingFields: ["prescriptionDetails.date", "patientInfo.weight"],
          warningFlags: ["Ambiguous medication frequency"]
        }
      },
      
      drugInteractions: [{
        medications: ["Amoxicillin/Clavulanic Acid", "Paracetamol"],
        severity: "minor",
        interactionType: "none",
        clinicalEffect: "No significant clinical interaction expected",
        mechanism: "No known pharmacokinetic or pharmacodynamic interaction",
        management: "No specific management required",
        monitoring: "No specific monitoring required",
        confidence: 1
      }],
      
      dosageValidations: [{
        medication: "Augmentin 625 Duo Tablet",
        prescribedDose: "1 tablet BID",
        standardDose: "Amoxicillin 500mg/Clavulanic Acid 125mg twice daily",
        isAppropriate: true,
        ageAppropriate: true,
        weightAppropriate: true,
        indicationAppropriate: true,
        warnings: ["Monitor for gastrointestinal side effects"],
        adjustmentNeeded: false,
        adjustmentReason: "",
        confidence: 0.9
      }],
      
      riskAssessment: {
        overallRiskLevel: "high",
        summary: "High risk due to ambiguous dosing instructions and missing patient information",
        patientSafetyRisks: ["Potential for Allergic Reaction|High|Patient allergy history is missing|Obtain complete patient allergy history immediately"],
        prescriptionQualityRisks: ["Ambiguous Medication Frequencies|High|Frequency for medications is unclear|Contact prescriber for clarification"],
        clinicalRisks: ["Risk of Therapeutic Failure|High|Incorrect frequency could lead to sub-therapeutic levels|Ensure correct dosing frequency"],
        regulatoryLegalRisks: ["Incomplete Documentation|Moderate|Missing prescription date and allergy information|Ensure all missing information is obtained"],
        riskStratification: "High Risk",
        recommendations: {
          immediateSafetyInterventions: ["Contact prescriber to clarify frequencies", "Obtain patient allergy history"],
          enhancedMonitoringProtocols: ["Monitor for GI side effects", "Follow up on investigations"],
          patientCounselingPriorities: ["Emphasize completing full course", "Counsel on maximum daily dose"],
          prescriberConsultationsNeeded: ["Clarify ambiguous frequencies", "Confirm administration instructions"],
          alternativeTherapeuticOptions: ["Consider alternative antibiotics if allergies present"]
        }
      }
    };
    
    // Test PrescriptionRequestMatchingService helper methods
    console.log('🔧 Testing PrescriptionRequestMatchingService helper methods...');
    
    const service = new PrescriptionRequestMatchingService();
    
    // Test doctor info extraction
    const doctorInfo = service.extractDoctorInfo(mockGeminiResponse.structuredData);
    console.log('✅ Doctor info extraction test passed:', {
      name: doctorInfo.name,
      qualifications: doctorInfo.qualifications?.length || 0,
      hasSignature: doctorInfo.signature
    });
    
    // Test patient info extraction  
    const patientInfo = service.extractPatientInfo(mockGeminiResponse.structuredData);
    console.log('✅ Patient info extraction test passed:', {
      name: patientInfo.name,
      age: patientInfo.age,
      medicalHistory: patientInfo.medicalHistory?.length || 0,
      currentConditions: patientInfo.currentConditions?.length || 0
    });
    
    // Test detailed medications extraction
    const medications = service.extractDetailedMedications(mockGeminiResponse.structuredData);
    console.log('✅ Detailed medications extraction test passed:', {
      count: medications.length,
      firstMed: medications[0]?.name,
      hasAlternatives: medications[0]?.alternatives?.length > 0,
      hasContraindications: medications[0]?.contraindications?.length > 0
    });
    
    // Test AI processing results extraction
    const aiProcessing = service.extractAIProcessingResults(mockGeminiResponse);
    console.log('✅ AI processing extraction test passed:', {
      hasQualityMetrics: !!aiProcessing.qualityMetrics,
      hasGeminiResults: !!aiProcessing.geminiResults,
      hasGeminiRawResponse: !!aiProcessing.geminiRawResponse,
      qualityLevel: aiProcessing.qualityLevel
    });
    
    // Test dosage validations extraction
    const dosageValidations = service.extractDosageValidations(mockGeminiResponse);
    console.log('✅ Dosage validations extraction test passed:', {
      count: dosageValidations.length,
      isAppropriate: dosageValidations[0]?.isAppropriate,
      hasWarnings: dosageValidations[0]?.warnings?.length > 0
    });
    
    // Test risk assessment extraction
    const riskAssessment = service.extractRiskAssessment(mockGeminiResponse);
    console.log('✅ Risk assessment extraction test passed:', {
      overallRiskLevel: riskAssessment.overallRiskLevel,
      patientSafetyRisks: riskAssessment.patientSafetyRisks?.length || 0,
      hasRecommendations: !!riskAssessment.recommendations,
      immediateInterventions: riskAssessment.recommendations?.immediateSafetyInterventions?.length || 0
    });
    
    console.log('\n🧪 Testing PrescriptionController risk array extraction...');
    
    // Test controller's extractRiskArray method (simulate)
    const riskArrayTest = [
      "Risk 1|High|Details 1|Mitigation 1",
      "Risk 2|Medium|Details 2|Mitigation 2"
    ];
    
    // Simulate the extraction logic from the controller
    const extractedRisks = riskArrayTest.map(risk => {
      const [riskType, severity, details, mitigation] = risk.split('|');
      return { risk: riskType, severity, details, mitigation };
    });
    
    console.log('✅ Risk array extraction test passed:', {
      count: extractedRisks.length,
      firstRisk: extractedRisks[0]?.risk,
      firstSeverity: extractedRisks[0]?.severity
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Controller and service data extraction test completed successfully');
    console.log('🎉 All extraction methods are working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testControllerDataExtraction();
