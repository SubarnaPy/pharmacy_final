/**
 * Test script to verify database saving of prescription data
 * This will check if medication details are properly stored
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Prescription from './src/models/Prescription.js';

async function testDatabaseQuery() {
  try {
    console.log('🔍 TESTING DATABASE PRESCRIPTION STORAGE');
    console.log('='.repeat(60));
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy');
    
    console.log('✅ Connected to MongoDB');
    
    // Find the most recent prescription
    const recentPrescription = await Prescription.findOne()
      .sort({ createdAt: -1 })
      .exec();
    
    if (!recentPrescription) {
      console.log('❌ No prescriptions found in database');
      return;
    }
    
    console.log('\n📋 MOST RECENT PRESCRIPTION DATA:');
    console.log('='.repeat(60));
    
    console.log('🆔 Prescription ID:', recentPrescription._id);
    console.log('👤 User ID:', recentPrescription.user || 'Unknown');
    console.log('📅 Created:', recentPrescription.createdAt.toLocaleString());
    console.log('🎯 Processing Method:', recentPrescription.aiProcessing?.processingMethod || 'Unknown');
    
    console.log('\n💊 MEDICATION INFORMATION:');
    console.log('-'.repeat(40));
    console.log('Primary Medicine:', recentPrescription.medicine);
    
    if (recentPrescription.medications && recentPrescription.medications.length > 0) {
      console.log('📊 Detailed Medications Found:', recentPrescription.medications.length);
      
      recentPrescription.medications.forEach((med, index) => {
        console.log(`\n   ${index + 1}. ${med.name || 'Unknown'}`);
        console.log(`      - Generic: ${med.genericName || 'N/A'}`);
        console.log(`      - Brand: ${med.brandName || 'N/A'}`);
        console.log(`      - Dosage: ${med.dosage || 'N/A'}`);
        console.log(`      - Strength: ${med.strength || 'N/A'}`);
        console.log(`      - Frequency: ${med.frequency || 'N/A'}`);
        console.log(`      - Route: ${med.route || 'N/A'}`);
        console.log(`      - Duration: ${med.duration || 'N/A'}`);
        console.log(`      - Instructions: ${med.instructions || 'N/A'}`);
        console.log(`      - Confidence: ${((med.confidence || 0) * 100).toFixed(1)}%`);
      });
    } else {
      console.log('⚠️ No detailed medications found');
    }
    
    console.log('\n👤 PATIENT INFORMATION:');
    console.log('-'.repeat(40));
    if (recentPrescription.patientInfo && recentPrescription.patientInfo.name) {
      console.log('Name:', recentPrescription.patientInfo.name);
      console.log('Age:', recentPrescription.patientInfo.age || 'N/A');
      console.log('Gender:', recentPrescription.patientInfo.gender || 'N/A');
      console.log('Weight:', recentPrescription.patientInfo.weight || 'N/A');
      console.log('Allergies:', recentPrescription.patientInfo.allergies?.join(', ') || 'None specified');
    } else {
      console.log('⚠️ No patient information found');
    }
    
    console.log('\n👨‍⚕️ DOCTOR INFORMATION:');
    console.log('-'.repeat(40));
    if (recentPrescription.doctor && recentPrescription.doctor.name) {
      console.log('Name:', recentPrescription.doctor.name);
      console.log('Title:', recentPrescription.doctor.title || 'N/A');
      console.log('License:', recentPrescription.doctor.license || recentPrescription.doctor.registrationNumber || 'N/A');
      console.log('Hospital:', recentPrescription.doctor.hospital || 'N/A');
      console.log('Contact:', recentPrescription.doctor.contact || 'N/A');
    } else {
      console.log('⚠️ No doctor information found');
    }
    
    console.log('\n🤖 AI PROCESSING RESULTS:');
    console.log('-'.repeat(40));
    if (recentPrescription.aiProcessing) {
      const ai = recentPrescription.aiProcessing;
      console.log('Medications Found:', ai.medicationsFound || 0);
      console.log('Valid Medications:', ai.validMedications || 0);
      console.log('Unknown Medications:', ai.unknownMedications || 0);
      console.log('Has Interactions:', ai.hasInteractions ? 'Yes' : 'No');
      console.log('Has Anomalies:', ai.hasAnomalies ? 'Yes' : 'No');
      console.log('Overall Confidence:', ((ai.overallConfidence || 0) * 100).toFixed(1) + '%');
      console.log('Quality Level:', ai.qualityLevel || 'Unknown');
      console.log('Processing Method:', ai.processingMethod || 'Unknown');
      
      if (ai.drugInteractions && ai.drugInteractions.length > 0) {
        console.log('\n⚠️ DRUG INTERACTIONS:');
        ai.drugInteractions.forEach((interaction, index) => {
          console.log(`   ${index + 1}. ${interaction.medications?.join(' + ') || 'Unknown'}`);
          console.log(`      - Severity: ${interaction.severity || 'Unknown'}`);
          console.log(`      - Clinical Effect: ${interaction.clinicalEffect || 'N/A'}`);
          console.log(`      - Confidence: ${((interaction.confidence || 0) * 100).toFixed(1)}%`);
        });
      }
      
      if (ai.riskAssessment && ai.riskAssessment.riskLevel) {
        console.log('\n🚨 RISK ASSESSMENT:');
        console.log('Risk Level:', ai.riskAssessment.riskLevel);
        console.log('Risk Factors:', ai.riskAssessment.riskFactors?.join(', ') || 'None');
        console.log('Warnings:', ai.riskAssessment.warnings?.join(', ') || 'None');
      }
    } else {
      console.log('⚠️ No AI processing results found');
    }
    
    console.log('\n📄 OCR DATA:');
    console.log('-'.repeat(40));
    if (recentPrescription.ocrData) {
      const ocr = recentPrescription.ocrData;
      console.log('Engine:', ocr.engine || 'Unknown');
      console.log('Confidence:', (ocr.confidence || 0) + '%');
      console.log('Text Length:', ocr.textLength || 0, 'characters');
      console.log('Words Found:', ocr.wordsFound || 0);
      console.log('Lines Found:', ocr.linesFound || 0);
      
      if (ocr.rawText) {
        console.log('\n📝 OCR Text Preview:');
        console.log(ocr.rawText.substring(0, 200) + (ocr.rawText.length > 200 ? '...' : ''));
      }
    } else {
      console.log('⚠️ No OCR data found');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE TEST COMPLETED');
    
    // Count total prescriptions
    const totalCount = await Prescription.countDocuments();
    console.log(`📊 Total prescriptions in database: ${totalCount}`);
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDatabaseQuery().then(() => {
  console.log('\n🏁 Database test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
