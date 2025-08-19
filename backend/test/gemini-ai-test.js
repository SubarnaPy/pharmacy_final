import dotenv from 'dotenv';
import GeminiPrescriptionAI from '../src/services/ai/GeminiPrescriptionAI.js';

// Load environment variables
dotenv.config();

/**
 * Test script for Gemini AI prescription processing
 */
async function testGeminiAI() {
  try {
    console.log('🧪 Testing Gemini AI Integration...\n');

    // Initialize Gemini AI service
    const geminiAI = new GeminiPrescriptionAI();

    // Test connection first
    console.log('🔌 Testing Gemini API connection...');
    const isConnected = await geminiAI.testGeminiConnection();
    console.log(`Connection status: ${isConnected ? '✅ Connected' : '❌ Failed'}\n`);

    if (!isConnected) {
      console.log('⚠️ Please set GOOGLE_CLOUD_API_KEY in your .env file');
      console.log('Get your API key from: https://aistudio.google.com/\n');
      return;
    }

    // Sample prescription text with OCR errors (simulating real OCR output)
    const samplePrescriptionText = `
Dr. Akshara SMS hospital
5/503, Business Court MG Road Pune

Patient: John Doe (45 years old)
Date: 25/01/2025

Rx:
1. Arnoxicillin 500rng - Take 1 tablet twice da1ly for 7 days
2. lbuprofen 400mg - Take 1 tablet every 6 h0urs as needed for pain
3. 0meprazole 20mg - Take 1 capsule once daily before breakfast

Instructions:
- Take with food
- Complete the full course of antibiotics
- Return if symptoms persist

Dr. A. Sharma
License: MD12345
Signature: [Present]
`;

    console.log('📄 Sample Prescription Text:');
    console.log('----------------------------------------');
    console.log(samplePrescriptionText);
    console.log('----------------------------------------\n');

    // Test text enhancement
    console.log('🔧 Testing Text Enhancement...');
    const enhancedText = await geminiAI.enhanceTextWithGemini(samplePrescriptionText);
    console.log('✅ Enhanced Text:');
    console.log('----------------------------------------');
    console.log(enhancedText);
    console.log('----------------------------------------\n');

    // Test comprehensive prescription analysis
    console.log('🔍 Testing Comprehensive Analysis...');
    const analysisResults = await geminiAI.processPrescriptionWithGemini(samplePrescriptionText, {
      enhanceText: true,
      validateDosages: true,
      checkInteractions: true,
      riskAssessment: true,
      includeRecommendations: true
    });

    console.log('✅ Analysis Results Summary:');
    console.log(`Processing ID: ${analysisResults.processingId}`);
    console.log(`Medications Found: ${analysisResults.analysis?.medications?.length || 0}`);
    console.log(`Overall Confidence: ${(analysisResults.overallMetrics?.overallConfidence * 100 || 0).toFixed(1)}%`);
    console.log(`Quality Score: ${(analysisResults.overallMetrics?.processingQuality * 100 || 0).toFixed(1)}%`);
    console.log(`Safety Score: ${(analysisResults.overallMetrics?.safetyScore * 100 || 0).toFixed(1)}%`);
    console.log(`Risk Level: ${analysisResults.analysis?.riskAssessment?.riskLevel || 'Unknown'}\n`);

    // Display medications found
    if (analysisResults.analysis?.medications?.length > 0) {
      console.log('💊 Medications Detected:');
      analysisResults.analysis.medications.forEach((med, index) => {
        console.log(`${index + 1}. ${med.name || 'Unknown'}`);
        console.log(`   - Dosage: ${med.dosage || 'Not specified'}`);
        console.log(`   - Frequency: ${med.frequency || 'Not specified'}`);
        console.log(`   - Route: ${med.route || 'Not specified'}`);
        console.log(`   - Confidence: ${(med.confidence * 100 || 0).toFixed(1)}%`);
      });
      console.log('');
    }

    // Display drug interactions if any
    if (analysisResults.interactions?.interactions?.length > 0) {
      console.log('⚠️ Drug Interactions Found:');
      analysisResults.interactions.interactions.forEach((interaction, index) => {
        console.log(`${index + 1}. ${interaction.medications?.join(' + ')}`);
        console.log(`   - Severity: ${interaction.severity}`);
        console.log(`   - Effect: ${interaction.clinicalEffect}`);
        console.log(`   - Management: ${interaction.management}`);
      });
      console.log('');
    }

    // Display risk assessment
    if (analysisResults.riskAssessment) {
      console.log('🚨 Risk Assessment:');
      console.log(`Risk Level: ${analysisResults.riskAssessment.riskLevel}`);
      if (analysisResults.riskAssessment.riskFactors?.length > 0) {
        console.log('Risk Factors:');
        analysisResults.riskAssessment.riskFactors.forEach((factor, index) => {
          console.log(`  ${index + 1}. ${factor}`);
        });
      }
      if (analysisResults.riskAssessment.recommendations?.length > 0) {
        console.log('Recommendations:');
        analysisResults.riskAssessment.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec}`);
        });
      }
      console.log('');
    }

    // Display usage statistics
    const stats = geminiAI.getUsageStatistics();
    console.log('📊 Service Statistics:');
    console.log(`Models Available: ${stats.modelsAvailable.join(', ')}`);
    console.log(`Schemas Registered: ${stats.schemasRegistered}`);
    console.log(`Is Configured: ${stats.isConfigured ? '✅ Yes' : '❌ No'}`);
    console.log('');

    console.log('🎉 Gemini AI Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testGeminiAI();
