import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testPrescriptionRequestSchema() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const PrescriptionRequest = (await import('./src/models/PrescriptionRequest.js')).default;
    
    // Test creating a prescription request with the new fields
    const testData = {
      patient: new mongoose.Types.ObjectId(),
      medications: [{
        name: 'Test Medicine',
        quantity: 30,
        dosage: '500mg',
        instructions: 'Take twice daily'
      }],
      status: 'draft',
      
      // New fields for prescription image and structured data
      prescriptionImage: 'https://cloudinary.com/test-image.jpg',
      cloudinaryId: 'test_cloudinary_id',
      originalFilename: 'prescription.jpg',
      fileType: 'image/jpeg',
      fileSize: 1024000,
      
      prescriptionStructuredData: {
        doctor: {
          name: 'Dr. Test Doctor',
          title: 'MBBS, MD',
          registrationNumber: 'TEST123',
          license: 'TEST123',
          contact: '9876543210',
          hospital: 'Test Hospital',
          signature: true
        },
        patientInfo: {
          name: 'Test Patient',
          age: '30 Years',
          gender: 'Male',
          weight: '70kg',
          allergies: ['None'],
          medicalHistory: ['Hypertension']
        },
        medicationsDetailed: [{
          name: 'Test Medicine',
          genericName: 'Test Generic',
          brandName: 'Test Brand',
          dosage: '500mg',
          strength: '500mg',
          frequency: 'BID',
          route: 'PO',
          duration: '7 days',
          instructions: 'Take with food',
          indication: 'Infection',
          confidence: 0.95
        }],
        aiProcessing: {
          medicationsFound: 1,
          validMedications: 1,
          unknownMedications: 0,
          hasInteractions: false,
          hasAnomalies: false,
          overallConfidence: 0.95,
          qualityLevel: 'high',
          geminiResults: { test: 'data' },
          processingMethod: 'gemini_2.5_flash_enhanced'
        },
        drugInteractions: [],
        riskAssessment: {
          riskLevel: 'low',
          riskFactors: [],
          warnings: [],
          recommendations: ['Complete the full course']
        },
        ocrData: {
          engine: 'tesseract',
          confidence: 0.85,
          rawText: 'Test prescription text',
          textLength: 100,
          wordsFound: 20,
          linesFound: 5
        },
        processingId: 'TEST_123',
        processingTime: 5000,
        processingStatus: 'completed'
      },
      
      metadata: {
        geoLocation: [77.5946, 12.9716], // Bangalore coordinates
        source: 'prescription_upload'
      }
    };
    
    console.log('📝 Testing PrescriptionRequest schema with new fields...');
    
    // Validate the data against the schema
    const prescriptionRequest = new PrescriptionRequest(testData);
    const validationError = prescriptionRequest.validateSync();
    
    if (validationError) {
      console.error('❌ Schema validation failed:');
      Object.keys(validationError.errors).forEach(key => {
        console.error(`   - ${key}: ${validationError.errors[key].message}`);
      });
    } else {
      console.log('✅ Schema validation passed');
      console.log('📋 Fields tested:');
      console.log('   - prescriptionImage:', !!testData.prescriptionImage);
      console.log('   - cloudinaryId:', !!testData.cloudinaryId);
      console.log('   - originalFilename:', !!testData.originalFilename);
      console.log('   - fileType:', !!testData.fileType);
      console.log('   - fileSize:', !!testData.fileSize);
      console.log('   - prescriptionStructuredData.doctor:', !!testData.prescriptionStructuredData.doctor);
      console.log('   - prescriptionStructuredData.patientInfo:', !!testData.prescriptionStructuredData.patientInfo);
      console.log('   - prescriptionStructuredData.medicationsDetailed:', testData.prescriptionStructuredData.medicationsDetailed.length);
      console.log('   - prescriptionStructuredData.aiProcessing:', !!testData.prescriptionStructuredData.aiProcessing);
      console.log('   - prescriptionStructuredData.drugInteractions:', testData.prescriptionStructuredData.drugInteractions.length);
      console.log('   - prescriptionStructuredData.riskAssessment:', !!testData.prescriptionStructuredData.riskAssessment);
      console.log('   - prescriptionStructuredData.ocrData:', !!testData.prescriptionStructuredData.ocrData);
      
      // Try to save temporarily (will rollback)
      try {
        const saved = await prescriptionRequest.save();
        console.log('✅ Database save test passed - ID:', saved._id);
        
        // Clean up test record
        await PrescriptionRequest.findByIdAndDelete(saved._id);
        console.log('🧹 Test record cleaned up');
      } catch (saveError) {
        console.error('❌ Database save test failed:', saveError.message);
      }
    }
    
    await mongoose.disconnect();
    console.log('✅ Schema test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testPrescriptionRequestSchema();
