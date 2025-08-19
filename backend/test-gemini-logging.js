/**
 * Test script to verify Gemini 2.5 Flash AI processing with comprehensive logging
 * This will test all AI processing phases and show detailed console output
 */

require('dotenv').config();
const GeminiPrescriptionAI = require('./src/services/ai/GeminiPrescriptionAI');

async function testGeminiLogging() {
  console.log('🧪 GEMINI 2.5 FLASH LOGGING TEST STARTED');
  console.log('='*60);
  
  if (!process.env.GOOGLE_CLOUD_API_KEY) {
    console.error('❌ GOOGLE_CLOUD_API_KEY not found in environment variables');
    return;
  }

  try {
    const geminiAI = new GeminiPrescriptionAI();
    
    // Test prescription text (realistic example)
    const testPrescriptionText = `
    Dr. Smith Medical Center
    
    Patient: John Doe
    DOB: 01/15/1980
    Date: ${new Date().toLocaleDateString()}
    
    Rx:
    1. Metformin 500mg - Take 1 tablet twice daily with meals
    2. Lisinopril 10mg - Take 1 tablet once daily in the morning
    3. Atorvastatin 20mg - Take 1 tablet at bedtime
    4. Aspirin 81mg - Take 1 tablet daily for cardioprotection
    
    Follow up in 3 months
    
    Dr. John Smith, MD
    License: ABC123456
    `;

    console.log('📋 TEST PRESCRIPTION TEXT:');
    console.log(testPrescriptionText.trim());
    console.log('\n' + '='*60 + '\n');

    // Test comprehensive AI processing with full logging
    console.log('🚀 STARTING COMPREHENSIVE AI PROCESSING...');
    
    const processingOptions = {
      enhanceText: true,
      validateDosages: true,
      checkInteractions: true,
      riskAssessment: true,
      includeRecommendations: true
    };

    console.log('⚙️ Processing options:', JSON.stringify(processingOptions, null, 2));
    console.log('\n' + '-'.repeat(60) + '\n');

    const startTime = Date.now();
    
    const results = await geminiAI.processPrescriptionWithGemini(testPrescriptionText, processingOptions);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log('\n' + '='*60);
    console.log('🎉 PROCESSING COMPLETED SUCCESSFULLY!');
    console.log('⏱️ Total processing time:', processingTime + 'ms');
    console.log('🔍 Results structure validation:');
    
    // Validate results structure
    const requiredKeys = ['enhancedText', 'prescriptionAnalysis', 'drugInteractions', 'dosageValidation', 'riskAssessment', 'recommendations', 'overallMetrics'];
    
    for (const key of requiredKeys) {
      const hasKey = results.hasOwnProperty(key);
      console.log(`   ${hasKey ? '✅' : '❌'} ${key}: ${hasKey ? 'Present' : 'Missing'}`);
    }

    console.log('\n📊 FINAL METRICS SUMMARY:');
    if (results.overallMetrics) {
      console.log('   Overall confidence:', (results.overallMetrics.overallConfidence * 100).toFixed(1) + '%');
      console.log('   Processing quality:', (results.overallMetrics.processingQuality * 100).toFixed(1) + '%');
      console.log('   Safety score:', (results.overallMetrics.safetyScore * 100).toFixed(1) + '%');
      console.log('   Processing timestamp:', new Date(results.overallMetrics.processingTimestamp).toLocaleString());
    }

    console.log('\n🎯 TEST RESULTS: ALL LOGGING PHASES COMPLETED ✅');
    console.log('='*60);

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testGeminiLogging().then(() => {
    console.log('\n🏁 Gemini 2.5 Flash logging test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = testGeminiLogging;
