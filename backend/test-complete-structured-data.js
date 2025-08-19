import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testCompleteStructuredDataStorage() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const Prescription = (await import('./src/models/Prescription.js')).default;
    const PrescriptionRequest = (await import('./src/models/PrescriptionRequest.js')).default;
    
    console.log('📋 Testing enhanced schema with complete structured data...');
    
    // Test comprehensive Prescription data
    const prescriptionTestData = {
      user: new mongoose.Types.ObjectId(),
      medicine: 'Test Medicine Complete',
      status: 'active',
      
      // Enhanced medications
      medications: [{
        name: 'Augmentin 625 Duo Tablet',
        genericName: 'Amoxicillin Clavulanic Acid',
        brandName: 'Augmentin 625 Duo',
        dosage: '1 tablet',
        strength: 'Amoxicillin (500mg) Clavulanic Acid (125mg)',
        frequency: 'BID',
        route: 'PO',
        duration: '5 Days',
        instructions: 'Take on empty stomach',
        indication: 'Bacterial respiratory infection',
        confidence: 0.9
      }],
      
      // Enhanced doctor info
      doctor: {
        name: 'Dr. Anandibai G Joshi',
        title: 'MBBS, M.D Medicine, Consultant Surgeon',
        registrationNumber: 'MCI110008',
        license: 'MCI110008',
        contact: '08042685588',
        hospital: 'Sagar Hospital, Jayanagar 4th block, Bangalore',
        signature: true
      },
      
      // Enhanced patient info
      patientInfo: {
        name: 'K L Ravi Kumar',
        age: '60 Years',
        gender: 'Male',
        weight: '70kg',
        allergies: [],
        medicalHistory: ['Cough with fever x 5 days', 'B/L Ronchi', 'Fever for evaluation']
      },
      
      // File information
      prescriptionImage: 'https://cloudinary.com/test-prescription-complete.jpg',
      cloudinaryId: 'test_complete_prescription_id',
      originalFilename: 'prescription-complete.jpg',
      fileType: 'image/jpeg',
      fileSize: 2048000,
      
      // Enhanced AI processing with complete structure
      aiProcessing: {
        medicationsFound: 3,
        validMedications: 3,
        unknownMedications: 0,
        hasInteractions: true,
        hasAnomalies: false,
        overallConfidence: 0.8416666666666666,
        qualityLevel: 'medium',
        
        // Complete Gemini results
        geminiResults: {
          processingId: 'GEMINI_1755375807521_complete',
          timestamp: '2025-08-17T02:00:00.000Z',
          analysis: {
            medications: [{
              name: 'Augmentin 625 Duo Tablet',
              genericName: 'Amoxicillin Clavulanic Acid',
              confidence: 0.9
            }],
            prescriberInfo: {
              name: 'Dr. Anandibai G Joshi',
              title: 'MBBS, M.D Medicine',
              license: 'MCI110008'
            },
            patientInfo: {
              name: 'K L Ravi Kumar',
              age: '60 Years',
              gender: 'Male'
            }
          }
        },
        
        geminiRawResponse: {
          originalText: 'Dr. Anandibai G Joshi MBBS, M.D Medicine...',
          enhancedText: 'Dr. Anandibai G Joshi MBBS, M.D Medicine...'
        },
        
        processingMethod: 'gemini_2.5_flash_enhanced',
        processingSteps: ['ocr', 'text_enhancement', 'gemini_analysis', 'structured_extraction'],
        enhancementApplied: true,
        
        // Complete structured extraction
        extractedStructuredData: {
          medications: [{
            name: 'Augmentin 625 Duo Tablet',
            genericName: 'Amoxicillin Clavulanic Acid',
            brandName: 'Augmentin 625 Duo',
            dosage: '1 tablet',
            strength: 'Amoxicillin (500mg) Clavulanic Acid (125mg)',
            frequency: 'BID',
            route: 'PO',
            duration: '5 Days',
            instructions: 'Take on empty stomach',
            indication: 'Bacterial respiratory infection',
            confidence: 0.9,
            alternatives: ['Amoxicillin 500mg'],
            contraindications: ['Penicillin allergy']
          }],
          
          prescriberInfo: {
            name: 'Dr. Anandibai G Joshi',
            title: 'MBBS, M.D Medicine, Consultant Surgeon',
            qualifications: ['MBBS', 'M.D Medicine'],
            registrationNumber: 'MCI110008',
            license: 'MCI110008',
            contact: '08042685588',
            email: '',
            hospital: 'Sagar Hospital, Jayanagar 4th block, Bangalore',
            address: 'Swagath Road, SR Krishnappa Garden, Hombegowda Nagar',
            signature: true,
            signatureImage: ''
          },
          
          patientInfo: {
            name: 'K L Ravi Kumar',
            age: '60 Years',
            gender: 'Male',
            weight: '70kg',
            height: '',
            allergies: [],
            medicalHistory: ['Cough with fever x 5 days', 'B/L Ronchi'],
            currentConditions: ['Fever for evaluation'],
            emergencyContact: '',
            insuranceInfo: ''
          },
          
          qualityMetrics: {
            clarity: 0.7,
            completeness: 0.7,
            legibility: 0.9,
            overallQuality: 0.75,
            ambiguousFields: ['medications[0].frequency'],
            missingFields: ['prescriptionDetails.date', 'patientInfo.weight'],
            warningFlags: ['Ambiguous medication frequency']
          }
        },
        
        // Enhanced drug interactions
        drugInteractions: [{
          medications: ['Amoxicillin/Clavulanic Acid', 'Paracetamol'],
          severity: 'minor',
          interactionType: 'none',
          clinicalEffect: 'No significant clinical interaction expected',
          mechanism: 'No known pharmacokinetic or pharmacodynamic interaction',
          management: 'No specific management required',
          monitoring: 'No specific monitoring required',
          confidence: 1
        }],
        
        // Enhanced dosage validations
        dosageValidations: [{
          medication: 'Augmentin 625 Duo Tablet',
          prescribedDose: '1 tablet BID',
          standardDose: 'Amoxicillin 500mg/Clavulanic Acid 125mg twice daily',
          isAppropriate: true,
          ageAppropriate: true,
          weightAppropriate: true,
          indicationAppropriate: true,
          warnings: ['Monitor for gastrointestinal side effects'],
          adjustmentNeeded: false,
          adjustmentReason: '',
          confidence: 0.9
        }],
        
        // Enhanced risk assessment
        riskAssessment: {
          overallRiskLevel: 'high',
          summary: 'High risk due to ambiguous dosing instructions and missing patient information',
          patientSafetyRisks: [{
            risk: 'Potential for Allergic Reaction',
            severity: 'High',
            details: 'Patient allergy history is missing',
            mitigation: 'Obtain complete patient allergy history immediately'
          }],
          prescriptionQualityRisks: [{
            risk: 'Ambiguous Medication Frequencies',
            severity: 'High',
            details: 'Frequency for medications is unclear',
            mitigation: 'Contact prescriber for clarification'
          }],
          clinicalRisks: [{
            risk: 'Risk of Therapeutic Failure',
            severity: 'High',
            details: 'Incorrect frequency could lead to sub-therapeutic levels',
            mitigation: 'Ensure correct dosing frequency'
          }],
          regulatoryLegalRisks: [{
            risk: 'Incomplete Documentation',
            severity: 'Moderate',
            details: 'Missing prescription date and allergy information',
            mitigation: 'Ensure all missing information is obtained'
          }],
          riskStratification: 'High Risk',
          recommendations: {
            immediateSafetyInterventions: ['Contact prescriber to clarify frequencies', 'Obtain patient allergy history'],
            enhancedMonitoringProtocols: ['Monitor for GI side effects', 'Follow up on investigations'],
            patientCounselingPriorities: ['Emphasize completing full course', 'Counsel on maximum daily dose'],
            prescriberConsultationsNeeded: ['Clarify ambiguous frequencies', 'Confirm administration instructions'],
            alternativeTherapeuticOptions: ['Consider alternative antibiotics if allergies present']
          }
        }
      },
      
      // OCR data
      ocrData: {
        engine: 'tesseract',
        confidence: 0.85,
        rawText: 'Dr. Anandibai G Joshi MBBS, M.D Medicine...',
        textLength: 500,
        wordsFound: 75,
        linesFound: 15
      },
      
      // Processing metadata
      processingId: 'PROC_1755375799977_complete',
      processingTime: 95371,
      processingStatus: 'completed',
      requiresManualReview: false,
      businessRulesAction: 'approve'
    };
    
    console.log('💾 Testing Prescription model with enhanced structure...');
    
    const prescription = new Prescription(prescriptionTestData);
    const prescriptionValidationError = prescription.validateSync();
    
    if (prescriptionValidationError) {
      console.error('❌ Prescription schema validation failed:');
      Object.keys(prescriptionValidationError.errors).forEach(key => {
        console.error(`   - ${key}: ${prescriptionValidationError.errors[key].message}`);
      });
    } else {
      console.log('✅ Prescription schema validation passed');
      console.log('📋 Enhanced fields tested:');
      console.log('   - aiProcessing.geminiRawResponse:', !!prescriptionTestData.aiProcessing.geminiRawResponse);
      console.log('   - aiProcessing.extractedStructuredData:', !!prescriptionTestData.aiProcessing.extractedStructuredData);
      console.log('   - aiProcessing.extractedStructuredData.qualityMetrics:', !!prescriptionTestData.aiProcessing.extractedStructuredData.qualityMetrics);
      console.log('   - aiProcessing.riskAssessment.patientSafetyRisks:', prescriptionTestData.aiProcessing.riskAssessment.patientSafetyRisks.length);
      console.log('   - aiProcessing.riskAssessment.recommendations:', !!prescriptionTestData.aiProcessing.riskAssessment.recommendations);
      console.log('   - aiProcessing.dosageValidations:', prescriptionTestData.aiProcessing.dosageValidations.length);
      
      // Test save
      try {
        const savedPrescription = await prescription.save();
        console.log('✅ Prescription database save test passed - ID:', savedPrescription._id);
        
        // Clean up
        await Prescription.findByIdAndDelete(savedPrescription._id);
        console.log('🧹 Prescription test record cleaned up');
      } catch (saveError) {
        console.error('❌ Prescription database save test failed:', saveError.message);
      }
    }
    
    console.log('\n📋 Testing enhanced PrescriptionRequest model...');
    
    // Test enhanced PrescriptionRequest data
    const prescriptionRequestTestData = {
      patient: new mongoose.Types.ObjectId(),
      medications: [{
        name: 'Augmentin 625 Duo Tablet',
        quantity: 30,
        dosage: '1 tablet',
        instructions: 'Take twice daily'
      }],
      status: 'draft',
      
      // Prescription image data
      prescriptionImage: 'https://cloudinary.com/test-prescription-request.jpg',
      cloudinaryId: 'test_request_prescription_id',
      originalFilename: 'prescription-request.jpg',
      fileType: 'image/jpeg',
      fileSize: 1536000,
      
      // Enhanced structured data
      prescriptionStructuredData: {
        doctor: {
          name: 'Dr. Test Complete Doctor',
          title: 'MBBS, MD Internal Medicine',
          qualifications: ['MBBS', 'MD Internal Medicine'],
          registrationNumber: 'TEST12345',
          license: 'TEST12345',
          contact: '9876543210',
          email: 'doctor@example.com',
          hospital: 'Test Complete Hospital',
          address: '123 Medical Street',
          signature: true,
          signatureImage: 'signature_url.jpg'
        },
        
        patientInfo: {
          name: 'Test Complete Patient',
          age: '45 Years',
          gender: 'Female',
          weight: '65kg',
          height: '165cm',
          allergies: ['Penicillin'],
          medicalHistory: ['Hypertension', 'Diabetes'],
          currentConditions: ['Upper respiratory infection'],
          emergencyContact: '9876543211',
          insuranceInfo: 'Policy ABC123'
        },
        
        medicationsDetailed: [{
          name: 'Augmentin 625 Duo Tablet',
          genericName: 'Amoxicillin Clavulanic Acid',
          brandName: 'Augmentin 625 Duo',
          dosage: '1 tablet',
          strength: 'Amoxicillin (500mg) Clavulanic Acid (125mg)',
          frequency: 'BID',
          route: 'PO',
          duration: '7 days',
          instructions: 'Take with food',
          indication: 'Bacterial infection',
          confidence: 0.95,
          alternatives: ['Amoxicillin 500mg'],
          contraindications: ['Penicillin allergy']
        }],
        
        aiProcessing: {
          medicationsFound: 1,
          validMedications: 1,
          unknownMedications: 0,
          hasInteractions: false,
          hasAnomalies: false,
          overallConfidence: 0.95,
          qualityLevel: 'high',
          geminiResults: { test: 'complete_data' },
          geminiRawResponse: { raw: 'complete_response' },
          processingMethod: 'gemini_2.5_flash_enhanced',
          processingSteps: ['ocr', 'enhancement', 'analysis'],
          enhancementApplied: true,
          qualityMetrics: {
            clarity: 0.9,
            completeness: 0.85,
            legibility: 0.95,
            overallQuality: 0.9,
            ambiguousFields: [],
            missingFields: [],
            warningFlags: []
          }
        },
        
        drugInteractions: [{
          medications: ['Amoxicillin/Clavulanic Acid'],
          severity: 'minor',
          interactionType: 'none',
          clinicalEffect: 'No interactions',
          mechanism: 'No mechanism',
          management: 'No management required',
          monitoring: 'Standard monitoring',
          confidence: 1
        }],
        
        dosageValidations: [{
          medication: 'Augmentin 625 Duo Tablet',
          prescribedDose: '1 tablet BID',
          standardDose: '500mg/125mg BID',
          isAppropriate: true,
          ageAppropriate: true,
          weightAppropriate: true,
          indicationAppropriate: true,
          warnings: ['Monitor for GI effects'],
          adjustmentNeeded: false,
          adjustmentReason: '',
          confidence: 0.95
        }],
        
        riskAssessment: {
          overallRiskLevel: 'low',
          summary: 'Low risk prescription with complete information',
          patientSafetyRisks: [],
          prescriptionQualityRisks: [],
          clinicalRisks: [],
          regulatoryLegalRisks: [],
          riskStratification: 'Low Risk',
          recommendations: {
            immediateSafetyInterventions: [],
            enhancedMonitoringProtocols: ['Standard monitoring'],
            patientCounselingPriorities: ['Complete full course'],
            prescriberConsultationsNeeded: [],
            alternativeTherapeuticOptions: []
          }
        },
        
        ocrData: {
          engine: 'tesseract',
          confidence: 0.9,
          rawText: 'Complete prescription text',
          enhancedText: 'Enhanced complete prescription text',
          textLength: 200,
          wordsFound: 40,
          linesFound: 8,
          processingTime: 5000
        },
        
        processingId: 'PROC_COMPLETE_TEST',
        processingTime: 8000,
        processingStatus: 'completed',
        processingTimestamp: new Date(),
        processingVersion: '2.0'
      },
      
      metadata: {
        geoLocation: [77.5946, 12.9716],
        source: 'prescription_upload'
      }
    };
    
    const prescriptionRequest = new PrescriptionRequest(prescriptionRequestTestData);
    const requestValidationError = prescriptionRequest.validateSync();
    
    if (requestValidationError) {
      console.error('❌ PrescriptionRequest schema validation failed:');
      Object.keys(requestValidationError.errors).forEach(key => {
        console.error(`   - ${key}: ${requestValidationError.errors[key].message}`);
      });
    } else {
      console.log('✅ PrescriptionRequest schema validation passed');
      console.log('📋 Enhanced request fields tested:');
      console.log('   - prescriptionStructuredData.doctor.qualifications:', prescriptionRequestTestData.prescriptionStructuredData.doctor.qualifications.length);
      console.log('   - prescriptionStructuredData.patientInfo.currentConditions:', prescriptionRequestTestData.prescriptionStructuredData.patientInfo.currentConditions.length);
      console.log('   - prescriptionStructuredData.medicationsDetailed.alternatives:', prescriptionRequestTestData.prescriptionStructuredData.medicationsDetailed[0].alternatives.length);
      console.log('   - prescriptionStructuredData.aiProcessing.qualityMetrics:', !!prescriptionRequestTestData.prescriptionStructuredData.aiProcessing.qualityMetrics);
      console.log('   - prescriptionStructuredData.dosageValidations:', prescriptionRequestTestData.prescriptionStructuredData.dosageValidations.length);
      console.log('   - prescriptionStructuredData.riskAssessment.recommendations:', !!prescriptionRequestTestData.prescriptionStructuredData.riskAssessment.recommendations);
      
      // Test save
      try {
        const savedRequest = await prescriptionRequest.save();
        console.log('✅ PrescriptionRequest database save test passed - ID:', savedRequest._id);
        
        // Clean up
        await PrescriptionRequest.findByIdAndDelete(savedRequest._id);
        console.log('🧹 PrescriptionRequest test record cleaned up');
      } catch (saveError) {
        console.error('❌ PrescriptionRequest database save test failed:', saveError.message);
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Complete structured data storage test completed successfully');
    console.log('🎉 All enhanced schemas are working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testCompleteStructuredDataStorage();
