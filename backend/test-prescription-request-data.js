import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testPrescriptionRequestWithStructuredData() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const PrescriptionRequest = (await import('./src/models/PrescriptionRequest.js')).default;
    
    // Check recent prescription requests to see if they have structured data
    console.log('📋 Checking recent prescription requests for structured data...');
    
    const recentRequests = await PrescriptionRequest.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    console.log(`Found ${recentRequests.length} recent prescription requests`);
    
    recentRequests.forEach((request, index) => {
      console.log(`\n${index + 1}. Prescription Request ID: ${request._id}`);
      console.log(`   Created: ${request.createdAt}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   Medications: ${request.medications?.length || 0}`);
      
      // Check if new fields exist
      console.log(`   📸 Has prescription image: ${!!request.prescriptionImage}`);
      console.log(`   ☁️ Has cloudinary ID: ${!!request.cloudinaryId}`);
      console.log(`   📄 Original filename: ${request.originalFilename || 'N/A'}`);
      console.log(`   🗂️ File type: ${request.fileType || 'N/A'}`);
      console.log(`   📏 File size: ${request.fileSize || 0} bytes`);
      
      // Check structured data
      const structuredData = request.prescriptionStructuredData;
      if (structuredData) {
        console.log(`   🔬 Has structured data: ✅`);
        console.log(`     👨‍⚕️ Doctor info: ${!!structuredData.doctor}`);
        console.log(`     👤 Patient info: ${!!structuredData.patientInfo}`);
        console.log(`     💊 Detailed medications: ${structuredData.medicationsDetailed?.length || 0}`);
        console.log(`     🤖 AI processing: ${!!structuredData.aiProcessing}`);
        console.log(`     ⚡ Drug interactions: ${structuredData.drugInteractions?.length || 0}`);
        console.log(`     🚨 Risk assessment: ${!!structuredData.riskAssessment}`);
        console.log(`     📝 OCR data: ${!!structuredData.ocrData}`);
        console.log(`     🆔 Processing ID: ${structuredData.processingId || 'N/A'}`);
        
        if (structuredData.aiProcessing) {
          console.log(`     📊 AI Confidence: ${((structuredData.aiProcessing.overallConfidence || 0) * 100).toFixed(1)}%`);
          console.log(`     🏆 Quality Level: ${structuredData.aiProcessing.qualityLevel || 'unknown'}`);
        }
        
        if (structuredData.doctor) {
          console.log(`     👨‍⚕️ Doctor: ${structuredData.doctor.name || 'N/A'}`);
          console.log(`     🏥 Hospital: ${structuredData.doctor.hospital || 'N/A'}`);
        }
        
        if (structuredData.patientInfo) {
          console.log(`     👤 Patient: ${structuredData.patientInfo.name || 'N/A'}`);
          console.log(`     🎂 Age: ${structuredData.patientInfo.age || 'N/A'}`);
        }
      } else {
        console.log(`   🔬 Has structured data: ❌`);
      }
    });
    
    // Check if any prescription requests have the complete data structure
    const requestsWithStructuredData = await PrescriptionRequest.countDocuments({
      'prescriptionStructuredData': { $exists: true, $ne: null }
    });
    
    const requestsWithImages = await PrescriptionRequest.countDocuments({
      'prescriptionImage': { $exists: true, $ne: '' }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total prescription requests: ${recentRequests.length}`);
    console.log(`   Requests with structured data: ${requestsWithStructuredData}`);
    console.log(`   Requests with prescription images: ${requestsWithImages}`);
    
    await mongoose.disconnect();
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testPrescriptionRequestWithStructuredData();
