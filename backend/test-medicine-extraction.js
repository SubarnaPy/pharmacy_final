import AdvancedAIService from './src/services/ai/AdvancedAIService.js';

async function testMedicineExtraction() {
  try {
    console.log('🧪 Testing medicine extraction...');
    
    const service = new AdvancedAIService();
    
    // Test OCR text from the prescription
    const testText = `Dr. Mary Johnson
Date: 19/08/2024

Patient: John Doe
Age: 35 years

Rx:
1. Augmentin 625mg
   - Take twice daily after meals
   - For 7 days

2. Crocin 500mg
   - Take as needed for fever/pain
   - Maximum 4 times daily

3. Zivinix-C
   - One tablet daily
   - For 30 days

Follow up after 1 week if symptoms persist.`;

    console.log('📝 Input text:');
    console.log(testText);
    console.log('\n' + '='.repeat(50) + '\n');
    
    const extractedMedicines = await service.extractMedications(testText, null);
    
    console.log('💊 Extracted medicines:');
    console.log(JSON.stringify(extractedMedicines, null, 2));
    
    if (extractedMedicines.length > 0) {
      console.log('\n✅ SUCCESS: Found', extractedMedicines.length, 'medicines');
      extractedMedicines.forEach((med, index) => {
        console.log(`   ${index + 1}. ${med.name} (${med.brandName || 'generic'}) - Confidence: ${med.confidence}`);
      });
    } else {
      console.log('\n❌ FAILED: No medicines extracted');
    }
    
  } catch (error) {
    console.error('❌ Error testing medicine extraction:', error.message);
    console.error(error.stack);
  }
}

testMedicineExtraction();
