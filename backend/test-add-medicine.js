const mongoose = require('mongoose');
const Medicine = require('./src/models/Medicine.js').default;

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/healthcare');
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Sample medicine - Augmentin 625 Duo Tablet
const sampleMedicine = {
  name: 'Augmentin 625 Duo Tablet',
  brandName: 'Augmentin 625 Duo Tablet',
  genericName: 'Amoxicillin + Clavulanic Acid',
  alternativeNames: ['Augmentin', 'Amoxyclav 625', 'Augmentin Duo'],
  composition: [
    {
      activeIngredient: 'Amoxicillin',
      strength: { value: 500, unit: 'mg' },
      role: 'active'
    },
    {
      activeIngredient: 'Clavulanic Acid',
      strength: { value: 125, unit: 'mg' },
      role: 'active'
    }
  ],
  dosageForm: {
    form: 'tablet',
    route: 'oral',
    packaging: 'strip',
    unitsPerPackage: 10
  },
  manufacturer: {
    name: 'GlaxoSmithKline',
    country: 'India',
    gmpCertified: true
  },
  regulatory: {
    approvalNumber: 'REG-AUG-625-2024',
    approvalDate: new Date('2020-01-01'),
    approvedBy: 'CDSCO',
    scheduleClass: 'Prescription',
    isControlledSubstance: false
  },
  pricing: {
    mrp: 200,
    discountPercentage: 10,
    sellingPrice: 180,
    currency: 'INR'
  },
  imageData: {
    primaryImage: {
      url: '/images/augmentin-625.jpg',
      altText: 'Augmentin 625 Duo Tablet'
    },
    aiRecognitionData: {
      visualFeatures: {
        color: 'white',
        shape: 'oval',
        markings: ['GSK', '625']
      },
      aiConfidence: 0.95
    }
  },
  therapeutic: {
    therapeuticClass: 'Antibiotic',
    pharmacologicalClass: 'Beta-lactam antibiotic',
    indication: {
      primary: ['Respiratory tract infections', 'Urinary tract infections', 'Skin infections'],
      secondary: ['Post-operative infections']
    },
    contraindications: ['Penicillin allergy', 'Severe hepatic impairment'],
    sideEffects: {
      common: ['Nausea', 'Diarrhea', 'Abdominal pain'],
      rare: ['Allergic reactions'],
      serious: ['Severe liver problems']
    }
  },
  barcodes: [{
    type: 'EAN-13',
    value: '1234567890123',
    primary: true
  }],
  searchTags: ['antibiotic', 'amoxicillin', 'clavulanic acid', 'infection', 'respiratory', 'urinary'],
  status: 'active',
  verificationStatus: 'verified',
  isPopular: true,
  popularityScore: 85
};

// Add sample medicine to database
const addSampleMedicine = async () => {
  try {
    console.log('🔍 Checking for existing Augmentin...');
    
    const existing = await Medicine.findOne({
      $or: [
        { name: /Augmentin.*625/i },
        { brandName: /Augmentin.*625/i },
        { genericName: /Amoxicillin.*Clavulanic/i }
      ]
    });
    
    if (existing) {
      console.log('⚠️ Augmentin 625 already exists:', existing.name);
      console.log('Verification Status:', existing.verificationStatus);
      return existing;
    }
    
    console.log('📝 Adding Augmentin 625 Duo Tablet...');
    const medicine = new Medicine(sampleMedicine);
    await medicine.save();
    console.log('✅ Added:', medicine.name);
    console.log('Verification Status:', medicine.verificationStatus);
    
    return medicine;
  } catch (error) {
    console.error('❌ Error adding medicine:', error.message);
    throw error;
  }
};

// Test search functionality
const testSearch = async () => {
  try {
    console.log('\n🔍 Testing search for "Augmentin"...');
    
    // Text search
    const textResults = await Medicine.find({
      $text: { $search: 'Augmentin' },
      status: 'active',
      verificationStatus: { $in: ['verified', 'pending'] }
    }).limit(5);
    
    console.log(`📝 Text search results: ${textResults.length} found`);
    textResults.forEach((medicine, index) => {
      console.log(`  ${index + 1}. ${medicine.name} - Status: ${medicine.verificationStatus}`);
    });
    
    // Alternative search by name
    console.log('\n🔍 Testing name-based search...');
    const nameResults = await Medicine.find({
      $or: [
        { name: { $regex: 'Augmentin', $options: 'i' } },
        { brandName: { $regex: 'Augmentin', $options: 'i' } },
        { genericName: { $regex: 'Augmentin', $options: 'i' } }
      ],
      status: 'active',
      verificationStatus: { $in: ['verified', 'pending'] }
    });
    
    console.log(`📝 Name search results: ${nameResults.length} found`);
    nameResults.forEach((medicine, index) => {
      console.log(`  ${index + 1}. ${medicine.name} - Status: ${medicine.verificationStatus}`);
    });
    
  } catch (error) {
    console.error('❌ Search test failed:', error.message);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await addSampleMedicine();
  await testSearch();
  
  // Final count
  const totalCount = await Medicine.countDocuments();
  const verifiedCount = await Medicine.countDocuments({ verificationStatus: 'verified' });
  
  console.log(`\n📊 Final database status:
  - Total medicines: ${totalCount}
  - Verified medicines: ${verifiedCount}`);
  
  await mongoose.disconnect();
  console.log('✅ Script completed successfully');
};

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});