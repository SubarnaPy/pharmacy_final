import AdvancedAIService from './src/services/ai/AdvancedAIService.js';

async function debugAIProcessing() {
  try {
    console.log('🔍 Debugging AI processing structure...');
    
    const service = new AdvancedAIService();
    
    // Use the OCR text from the recent prescription
    const recentOCRText = `Dr. Anandibai G Joshi
MBBS, M.D Medicine

Consultant Surgeon
Sagar Hospital, Jayanagar 4th block, Bangalore - Swagath Road, SR Krishnappa Garden,
Hombegowda Nagar Get Directions ♦

✆ 08042888888 ◷ Next: Mon 8:00 AM ∨
.........................................................................................................
K L Ravi Kumar • 60 Years • Male

Complaints Cough with fever x 5 days

Vitals
Pulse Rate: 90 bpm                       Pulse Pattern: Regular
BP: 146/88 mmHg                         Resp Rate: 22 cycles/min
Resp Pattern: Regular                   Temp: 38 Celsius
SpO2: 90 %                              RBS: 110 %

Examination B/L Ronchi +

Diagnosis Fever for evaluation

℞

1. Augmentin 625 Duo Tablet
   Amoxycillin (500mg) + Clavulanic Acid (125mg)
   1 tablet - 0 - 1 tablet for 5 Days
   Instructions: Take on empty stomach

2. Crocin Advance Tablet
   Paracetamol (500mg)
   1 tablet when required for 5 Days
   Instructions: After food

3. Zivinix-C Chewable Tablet
   Vitamin C (400mg) + Zinc Sulfate (7.5mg)
   1 tablet - 0 - 0 for 14 Days

Investigations
1. CXR P/A View

2. CBC, LFT, RFT, Urine routine & microscopy
   Components: Complete Blood Counts, Liver Funtion Tests, Renal Function Tests, Urine
   routine & microscopy
   Instructions: Empty stomach sample is not necessary.

3. COVID-19 RT PCR

Advice Review with reports

.........................................................................................................
                                                   Dr. Anandibai G Joshi
                                                   MBBS, MD Medicine
                                                   MCI 110008

.........................................................................................................

                                                   Prescription generate with STAT
                                                   Terms & Conditions • Privacy Policy`;

    console.log('🔍 Testing AI processing...');
    
    const aiResult = await service.processPrescription(recentOCRText, {
      validateDosages: true,
      checkInteractions: true,
      detectAnomalies: true,
      enhanceText: true
    });
    
    console.log('📊 AI Processing Result Structure:');
    console.log('Top-level keys:', Object.keys(aiResult));
    console.log('\n🔍 Full result:');
    console.log(JSON.stringify(aiResult, null, 2));
    
    console.log('\n🔍 Checking for medications in different locations:');
    console.log('1. aiResult.medications:', aiResult.medications ? 'FOUND' : 'NOT FOUND');
    console.log('2. aiResult.geminiResults:', aiResult.geminiResults ? 'FOUND' : 'NOT FOUND');
    console.log('3. aiResult.geminiResults?.analysis:', aiResult.geminiResults?.analysis ? 'FOUND' : 'NOT FOUND');
    console.log('4. aiResult.geminiResults?.analysis?.medications:', aiResult.geminiResults?.analysis?.medications ? 'FOUND' : 'NOT FOUND');
    console.log('5. aiResult.parsed?.medications:', aiResult.parsed?.medications ? 'FOUND' : 'NOT FOUND');
    
    if (aiResult.medications) {
      console.log('\n💊 Found medications in aiResult.medications:');
      console.log('Type:', typeof aiResult.medications);
      console.log('Count:', Array.isArray(aiResult.medications?.medications) ? aiResult.medications.medications.length : 'Not an array');
      console.log('Structure:', JSON.stringify(aiResult.medications, null, 2));
    }
    
    if (aiResult.geminiResults?.analysis?.medications) {
      console.log('\n💊 Found medications in aiResult.geminiResults.analysis.medications:');
      console.log('Count:', aiResult.geminiResults.analysis.medications.length);
      console.log('First medication:', JSON.stringify(aiResult.geminiResults.analysis.medications[0], null, 2));
    }
    
    if (aiResult.parsed?.medications) {
      console.log('\n💊 Found medications in aiResult.parsed.medications:');
      console.log('Count:', aiResult.parsed.medications.length);
      console.log('First medication:', JSON.stringify(aiResult.parsed.medications[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error debugging AI processing:', error.message);
    console.error(error.stack);
  }
}

debugAIProcessing();
