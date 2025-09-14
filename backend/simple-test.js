import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple test framework
class SimpleTest {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, testFn) {
    console.log(`\n🧪 Running test: ${name}`);
    try {
      await testFn();
      console.log(`✅ PASSED: ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
      this.failed++;
    }
  }

  summary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📊 Total: ${this.passed + this.failed}`);
    
    if (this.failed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
    } else {
      console.log('⚠️  Some tests failed. Check the details above.');
    }
  }
}

// Test suite
async function runTests() {
  const test = new SimpleTest();
  
  console.log('🚀 Starting Prescription Processing Test Suite');
  console.log('=' .repeat(50));

  // Test 1: Medicine Database
  await test.test('Medicine Database Contains Required Medicines', async () => {
    const { default: AdvancedAIService } = await import('./src/services/ai/AdvancedAIService.js');
    const service = new AdvancedAIService();
    
    // Check if our required medicines are in the database
    const augmentinFound = service.allMedications.find(m => 
      m.brandNames.includes('Augmentin')
    );
    const crocinFound = service.allMedications.find(m => 
      m.brandNames.includes('Crocin')
    );
    const zivinixFound = service.allMedications.find(m => 
      m.brandNames.includes('Zivinix-C')
    );
    
    if (!augmentinFound) throw new Error('Augmentin not found in medicine database');
    if (!crocinFound) throw new Error('Crocin not found in medicine database');
    if (!zivinixFound) throw new Error('Zivinix-C not found in medicine database');
    
    console.log('   ✓ Augmentin found as brand name for:', augmentinFound.name);
    console.log('   ✓ Crocin found as brand name for:', crocinFound.name);
    console.log('   ✓ Zivinix-C found as brand name for:', zivinixFound.name);
  });

  // Test 2: Medicine Extraction
  await test.test('Medicine Extraction from Sample Prescription', async () => {
    const { default: AdvancedAIService } = await import('./src/services/ai/AdvancedAIService.js');
    const service = new AdvancedAIService();
    
    const samplePrescription = `
Dr. Anandibai G Joshi
MBBS, M.D Medicine

℞
1. Augmentin 625 Duo Tablet
   Amoxycillin (500mg) + Clavulanic Acid (125mg)
   1 tablet - 0 - 1 tablet for 5 Days

2. Crocin Advance Tablet
   Paracetamol (500mg)
   1 tablet when required for 5 Days

3. Zivinix-C Chewable Tablet
   Vitamin C (400mg) + Zinc Sulfate (7.5mg)
   1 tablet - 0 - 0 for 14 Days
    `;

    const extractedMedicines = await service.extractMedications(samplePrescription, null);
    
    if (extractedMedicines.length === 0) {
      throw new Error('No medicines extracted from sample prescription');
    }
    
    const medicineNames = extractedMedicines.map(m => m.name.toLowerCase());
    const hasAugmentin = extractedMedicines.some(m => 
      m.brandName && m.brandName.toLowerCase().includes('augmentin')
    );
    const hasCrocin = extractedMedicines.some(m => 
      m.brandName && m.brandName.toLowerCase().includes('crocin')
    );
    const hasZivinix = extractedMedicines.some(m => 
      m.brandName && m.brandName.toLowerCase().includes('zivinix')
    );
    
    if (!hasAugmentin) throw new Error('Augmentin not extracted from prescription');
    if (!hasCrocin) throw new Error('Crocin not extracted from prescription');
    if (!hasZivinix) throw new Error('Zivinix-C not extracted from prescription');
    
    console.log(`   ✓ Extracted ${extractedMedicines.length} medicines successfully`);
    console.log('   ✓ All required medicines found in extraction');
  });

  // Test 3: AI Processing Structure
  await test.test('AI Processing Returns Correct Structure', async () => {
    const { default: AdvancedAIService } = await import('./src/services/ai/AdvancedAIService.js');
    const service = new AdvancedAIService();
    
    const sampleText = `
℞
1. Augmentin 625 Duo Tablet
2. Crocin Advance Tablet  
3. Zivinix-C Chewable Tablet
    `;

    const aiResult = await service.processPrescription(sampleText, {
      validateDosages: true,
      checkInteractions: true,
      detectAnomalies: true,
      enhanceText: true
    });
    
    // Check expected structure
    if (!aiResult.success) throw new Error('AI processing did not succeed');
    if (!aiResult.geminiResults) throw new Error('Missing geminiResults in AI response');
    if (!aiResult.geminiResults.analysis) throw new Error('Missing analysis in geminiResults');
    if (!aiResult.geminiResults.analysis.medications) throw new Error('Missing medications in analysis');
    
    const medications = aiResult.geminiResults.analysis.medications;
    if (!Array.isArray(medications)) throw new Error('Medications is not an array');
    if (medications.length === 0) throw new Error('No medications found in AI processing result');
    
    console.log(`   ✓ AI processing structure is correct`);
    console.log(`   ✓ Found ${medications.length} medications in AI result`);
    console.log(`   ✓ Confidence: ${(aiResult.confidence * 100).toFixed(1)}%`);
  });

  // Test 4: Prescription Processing Service
  await test.test('Prescription Processing Service Integration', async () => {
    // Create a simple test image path (we'll simulate this)
    const testImagePath = path.join(__dirname, 'test-prescription.txt');
    
    // Create a mock prescription file
    const mockPrescriptionContent = `
Dr. Test Doctor
MBBS, MD

Patient: Test Patient
Age: 30 years

℞
1. Augmentin 625 Duo Tablet
   Amoxycillin (500mg) + Clavulanic Acid (125mg)
   1 tablet twice daily for 5 days

2. Crocin Advance Tablet
   Paracetamol (500mg)
   1 tablet when required for fever

3. Zivinix-C Chewable Tablet
   Vitamin C (400mg) + Zinc Sulfate (7.5mg)
   1 tablet daily for 14 days
    `;
    
    // Write mock file
    fs.writeFileSync(testImagePath, mockPrescriptionContent);
    
    try {
      const { default: PrescriptionProcessingService } = await import('./src/services/PrescriptionProcessingService.js');
      const service = new PrescriptionProcessingService();
      
      // Test with text processing (bypass image processing)
      const result = await service.processPrescription(testImagePath, {
        skipImageProcessing: true,
        useMultipleOCREngines: false,
        validateMedications: true,
        checkInteractions: true,
        detectAnomalies: true,
        saveToDatabase: false
      });
      
      // Check result structure
      if (!result.success && result.status !== 'completed') {
        throw new Error(`Processing failed: ${result.error?.message || 'Unknown error'}`);
      }
      
      if (!result.ai) throw new Error('Missing AI results in processing result');
      
      console.log('   ✓ Prescription processing service works correctly');
      console.log('   ✓ AI integration successful');
      console.log(`   ✓ Processing time: ${result.processingTime}ms`);
      
    } finally {
      // Cleanup test file
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    }
  });

  // Test 5: Database Connection
  await test.test('Database Models Available', async () => {
    try {
      const { default: mongoose } = await import('mongoose');
      
      // Check if we can import the models
      const { default: Medicine } = await import('./src/models/Medicine.js');
      const { default: Pharmacy } = await import('./src/models/Pharmacy.js');
      const { default: Prescription } = await import('./src/models/Prescription.js');
      
      if (!Medicine) throw new Error('Medicine model not available');
      if (!Pharmacy) throw new Error('Pharmacy model not available');
      if (!Prescription) throw new Error('Prescription model not available');
      
      console.log('   ✓ All required models are available');
      console.log('   ✓ Database models loaded successfully');
      
    } catch (error) {
      throw new Error(`Database model error: ${error.message}`);
    }
  });

  // Test 6: Environment Configuration
  await test.test('Environment Configuration', async () => {
    const requiredEnvVars = [
      'GOOGLE_CLOUD_API_KEY',
      'MONGODB_URI',
      'JWT_SECRET'
    ];
    
    const missing = [];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    console.log('   ✓ All required environment variables are set');
    console.log('   ✓ Google Cloud API key configured');
    console.log('   ✓ MongoDB URI configured');
    console.log('   ✓ JWT secret configured');
  });

  // Summary
  test.summary();
  
  return test.failed === 0;
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test suite failed to run:', error.message);
  process.exit(1);
});
