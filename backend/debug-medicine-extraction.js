import AdvancedAIService from './src/services/ai/AdvancedAIService.js';

async function debugMedicineExtraction() {
  try {
    console.log('🔍 Debugging medicine extraction with recent prescription text...');
    
    const service = new AdvancedAIService();
    
    // Use the OCR text from the recent logs - this is a real prescription
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

    console.log('📝 Testing OCR text:');
    console.log('Text length:', recentOCRText.length);
    console.log('Contains Augmentin:', recentOCRText.includes('Augmentin'));
    console.log('Contains Crocin:', recentOCRText.includes('Crocin'));
    console.log('Contains Zivinix:', recentOCRText.includes('Zivinix'));
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test the extractMedications method directly
    console.log('🔍 Testing extractMedications method...');
    const extractedMedicines = await service.extractMedications(recentOCRText, null);
    
    console.log('📊 Direct extraction results:');
    console.log('Medicines found:', extractedMedicines.length);
    console.log('Medicines:', JSON.stringify(extractedMedicines, null, 2));
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test the full parsePrescriptionComponents method
    console.log('🔍 Testing parsePrescriptionComponents method...');
    const parsedComponents = await service.parsePrescriptionComponents(recentOCRText);
    
    console.log('📊 Full parsing results:');
    console.log('Components found:', Object.keys(parsedComponents));
    console.log('Medications found:', parsedComponents.medications?.length || 0);
    console.log('Medications:', JSON.stringify(parsedComponents.medications, null, 2));
    
    if (parsedComponents.medications?.length === 0) {
      console.log('\n❌ NO MEDICINES FOUND IN PARSING');
      console.log('🔍 Let\'s debug the medication database...');
      console.log('Total medications in database:', service.allMedications.length);
      console.log('First 5 medications:', service.allMedications.slice(0, 5).map(m => m.name));
      
      // Check if our specific medicines are in the database
      const augmentinFound = service.allMedications.find(m => 
        m.name.toLowerCase().includes('augmentin') || 
        m.brandNames.some(b => b.toLowerCase().includes('augmentin'))
      );
      const crocinFound = service.allMedications.find(m => 
        m.name.toLowerCase().includes('crocin') || 
        m.brandNames.some(b => b.toLowerCase().includes('crocin'))
      );
      const zivinixFound = service.allMedications.find(m => 
        m.name.toLowerCase().includes('zivinix') || 
        m.brandNames.some(b => b.toLowerCase().includes('zivinix'))
      );
      
      console.log('Augmentin in database:', !!augmentinFound, augmentinFound?.name || 'NOT FOUND');
      console.log('Crocin in database:', !!crocinFound, crocinFound?.name || 'NOT FOUND');
      console.log('Zivinix in database:', !!zivinixFound, zivinixFound?.name || 'NOT FOUND');
    }
    
  } catch (error) {
    console.error('❌ Error debugging medicine extraction:', error.message);
    console.error(error.stack);
  }
}

debugMedicineExtraction();
