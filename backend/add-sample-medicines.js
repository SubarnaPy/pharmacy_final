import mongoose from 'mongoose';
import Medicine from './src/models/Medicine.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/p-setup-3', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Sample medicine data including Augmentin
const sampleMedicines = [
  {
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
  },
  {
    name: 'Paracetamol 500mg Tablet',
    brandName: 'Crocin',
    genericName: 'Paracetamol',
    alternativeNames: ['Acetaminophen', 'Crocin', 'Dolo 650'],
    composition: [{
      activeIngredient: 'Paracetamol',
      strength: { value: 500, unit: 'mg' },
      role: 'active'
    }],
    dosageForm: {
      form: 'tablet',
      route: 'oral',
      packaging: 'strip',
      unitsPerPackage: 10
    },
    manufacturer: {
      name: 'Generic Pharma',
      country: 'India',
      gmpCertified: true
    },
    regulatory: {
      approvalNumber: 'REG-PARA-500-2024',
      approvalDate: new Date('2019-01-01'),
      approvedBy: 'CDSCO',
      scheduleClass: 'OTC',
      isControlledSubstance: false
    },
    pricing: {
      mrp: 25,
      discountPercentage: 5,
      sellingPrice: 24,
      currency: 'INR'
    },
    imageData: {
      primaryImage: {
        url: '/images/paracetamol-500.jpg',
        altText: 'Paracetamol 500mg Tablet'
      },
      aiRecognitionData: {
        visualFeatures: {
          color: 'white',
          shape: 'round',
          markings: ['500']
        },
        aiConfidence: 0.90
      }
    },
    therapeutic: {
      therapeuticClass: 'Analgesic',
      pharmacologicalClass: 'Non-opioid analgesic',
      indication: {
        primary: ['Fever', 'Pain relief', 'Headache'],
        secondary: ['Post-vaccination fever']
      },
      contraindications: ['Severe liver disease'],
      sideEffects: {
        common: ['Nausea'],
        rare: ['Skin rash'],
        serious: ['Liver damage with overdose']
      }
    },
    barcodes: [{
      type: 'EAN-13',
      value: '9876543210987',
      primary: true
    }],
    searchTags: ['paracetamol', 'fever', 'pain', 'headache', 'analgesic', 'otc'],
    status: 'active',
    verificationStatus: 'verified',
    isPopular: true,
    popularityScore: 95
  },
  {
    name: 'Cetrizine 10mg Tablet',
    brandName: 'Cetrizylen',
    genericName: 'Cetirizine Hydrochloride',
    alternativeNames: ['Zyrtec', 'Alerid', 'Cetrizylen'],
    composition: [{
      activeIngredient: 'Cetirizine Hydrochloride',
      strength: { value: 10, unit: 'mg' },
      role: 'active'
    }],
    dosageForm: {
      form: 'tablet',
      route: 'oral',
      packaging: 'strip',
      unitsPerPackage: 10
    },
    manufacturer: {
      name: 'Sun Pharma',
      country: 'India',
      gmpCertified: true
    },
    regulatory: {
      approvalNumber: 'REG-CET-10-2024',
      approvalDate: new Date('2018-01-01'),
      approvedBy: 'CDSCO',
      scheduleClass: 'OTC',
      isControlledSubstance: false
    },
    pricing: {
      mrp: 30,
      discountPercentage: 8,
      sellingPrice: 28,
      currency: 'INR'
    },
    imageData: {
      primaryImage: {
        url: '/images/cetrizine-10.jpg',
        altText: 'Cetrizine 10mg Tablet'
      },
      aiRecognitionData: {
        visualFeatures: {
          color: 'white',
          shape: 'round',
          markings: ['10']
        },
        aiConfidence: 0.88
      }
    },
    therapeutic: {
      therapeuticClass: 'Antihistamine',
      pharmacologicalClass: 'H1 antihistamine',
      indication: {
        primary: ['Allergic rhinitis', 'Urticaria', 'Allergic reactions'],
        secondary: ['Seasonal allergies']
      },
      contraindications: ['Severe kidney disease'],
      sideEffects: {
        common: ['Drowsiness', 'Dry mouth'],
        rare: ['Dizziness'],
        serious: ['Severe allergic reactions']
      }
    },
    barcodes: [{
      type: 'EAN-13',
      value: '5678901234567',
      primary: true
    }],
    searchTags: ['cetrizine', 'allergy', 'antihistamine', 'rhinitis', 'urticaria', 'itching'],
    status: 'active',
    verificationStatus: 'verified',
    isPopular: true,
    popularityScore: 75
  }
];

// Add sample medicines to database
const addSampleMedicines = async () => {
  try {
    console.log('🔍 Checking existing medicines...');
    
    const existingCount = await Medicine.countDocuments();
    console.log(`📊 Found ${existingCount} existing medicines`);
    
    if (existingCount === 0) {
      console.log('📝 Adding sample medicines...');
      
      for (const medicineData of sampleMedicines) {
        try {
          // Check if medicine already exists
          const existing = await Medicine.findOne({
            $or: [
              { name: medicineData.name },
              { brandName: medicineData.brandName },
              { genericName: medicineData.genericName }
            ]
          });
          
          if (!existing) {
            const medicine = new Medicine(medicineData);
            await medicine.save();
            console.log(`✅ Added: ${medicine.name}`);
          } else {
            console.log(`⚠️ Already exists: ${medicineData.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to add ${medicineData.name}:`, error.message);
        }
      }
    } else {
      console.log('ℹ️ Database already has medicines. Skipping sample data insertion.');
    }
    
    // Show final count and samples
    const finalCount = await Medicine.countDocuments();
    const verifiedCount = await Medicine.countDocuments({ verificationStatus: 'verified' });
    
    console.log(`📊 Final status:
    - Total medicines: ${finalCount}
    - Verified medicines: ${verifiedCount}`);
    
    // Test search for Augmentin
    console.log('\n🔍 Testing search for "Augmentin"...');
    const searchResults = await Medicine.find({
      $text: { $search: 'Augmentin' },
      status: 'active',
      verificationStatus: { $in: ['verified', 'pending'] }
    }).limit(5);
    
    console.log(`📝 Search results: ${searchResults.length} found`);
    searchResults.forEach((medicine, index) => {
      console.log(`  ${index + 1}. ${medicine.name} - ${medicine.verificationStatus}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding sample medicines:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await addSampleMedicines();
  await mongoose.disconnect();
  console.log('✅ Script completed successfully');
};

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});