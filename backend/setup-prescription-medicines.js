import mongoose from 'mongoose';
import Medicine from './src/models/Medicine.js';
import Pharmacy from './src/models/Pharmacy.js';

const MONGODB_URI = 'mongodb://localhost:27017/p-setup-3';

async function addMedicinesWithInventory() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Get existing pharmacies
    const pharmacies = await Pharmacy.find({ isActive: true });
    console.log(`🏥 Found ${pharmacies.length} active pharmacies`);

    if (pharmacies.length === 0) {
      console.log('❌ No active pharmacies found. Please create pharmacies first.');
      process.exit(1);
    }

    // Use the first pharmacy for now
    const pharmacy = pharmacies[0];
    console.log(`📍 Using pharmacy: ${pharmacy.name} (ID: ${pharmacy._id})`);

    let totalMedicinesAdded = 0;

    // Define medicines that match the prescription
    const medicinesToAdd = [
      {
        name: 'Augmentin 625 Duo Tablet',
        brandName: 'Augmentin 625 Duo',
        genericName: 'Amoxicillin + Clavulanic Acid',
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
          unitsPerPackage: 10
        },
        manufacturer: {
          name: 'GlaxoSmithKline',
          country: 'India',
          gmpCertified: true
        },
        therapeutic: {
          therapeuticClass: 'Antibiotic',
          indicationsApproved: ['Bacterial infections', 'Respiratory tract infections']
        },
        pricing: {
          mrp: 180.00,
          costPrice: 150.00,
          wholesalePrice: 160.00
        }
      },
      {
        name: 'Crocin Advance Tablet',
        brandName: 'Crocin Advance',
        genericName: 'Paracetamol',
        composition: [
          {
            activeIngredient: 'Paracetamol',
            strength: { value: 500, unit: 'mg' },
            role: 'active'
          }
        ],
        dosageForm: {
          form: 'tablet',
          route: 'oral',
          unitsPerPackage: 15
        },
        manufacturer: {
          name: 'GSK Consumer Healthcare',
          country: 'India',
          gmpCertified: true
        },
        therapeutic: {
          therapeuticClass: 'Analgesic',
          indicationsApproved: ['Pain relief', 'Fever reduction']
        },
        pricing: {
          mrp: 25.00,
          costPrice: 18.00,
          wholesalePrice: 22.00
        }
      },
      {
        name: 'ZivinixC Chewable Tablet',
        brandName: 'ZivinixC',
        genericName: 'Vitamin C + Zinc Sulfate',
        composition: [
          {
            activeIngredient: 'Vitamin C',
            strength: { value: 400, unit: 'mg' },
            role: 'active'
          },
          {
            activeIngredient: 'Zinc Sulfate',
            strength: { value: 7.5, unit: 'mg' },
            role: 'active'
          }
        ],
        dosageForm: {
          form: 'chewable tablet',
          route: 'oral',
          unitsPerPackage: 20
        },
        manufacturer: {
          name: 'Zivian Healthcare',
          country: 'India',
          gmpCertified: true
        },
        therapeutic: {
          therapeuticClass: 'Vitamin Supplement',
          indicationsApproved: ['Vitamin C deficiency', 'Immune support']
        },
        pricing: {
          mrp: 85.00,
          costPrice: 65.00,
          wholesalePrice: 75.00
        }
      }
    ];

    console.log(`📝 Adding ${medicinesToAdd.length} medicines...`);

    for (const medicineData of medicinesToAdd) {
      try {
        // Check if medicine already exists
        const existingMedicine = await Medicine.findOne({
          name: medicineData.name
        });

        if (existingMedicine) {
          console.log(`   ⏭️ Medicine "${medicineData.name}" already exists`);
          continue;
        }

        // Create medicine with pharmacy reference
        const medicine = new Medicine({
          ...medicineData,
          pharmacyId: pharmacy._id, // Required field
          status: 'active',
          verificationStatus: 'verified',
          
          // Add required imageData
          imageData: {
            primaryImage: {
              url: `https://example.com/images/${medicineData.name.replace(/\s+/g, '-').toLowerCase()}.jpg`,
              altText: `${medicineData.name} package image`
            }
          },
          
          // Add required regulatory information
          regulatory: {
            approvalNumber: `IND-${Date.now()}`,
            approvalDate: new Date('2023-01-01'),
            approvedBy: 'CDSCO',
            scheduleClass: 'Prescription'
          },
          
          pharmacyInventory: [
            {
              pharmacyId: pharmacy._id,
              batchNumber: `BATCH-${Date.now()}`,
              quantityAvailable: 100,
              costPrice: medicineData.pricing.costPrice,
              sellingPrice: medicineData.pricing.mrp,
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
              manufacturingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
              status: 'available'
            }
          ]
        });

        await medicine.save();
        console.log(`   ✅ Added medicine: "${medicineData.name}"`);
        totalMedicinesAdded++;

      } catch (error) {
        console.error(`   ❌ Failed to add "${medicineData.name}":`, error.message);
      }
    }

    // Verify medicines were added
    const totalMedicines = await Medicine.countDocuments({});
    console.log(`\n📊 Final count: ${totalMedicines} medicines total (${totalMedicinesAdded} newly added)`);

    // Check if prescription medicines are available in each pharmacy
    console.log('\n🔍 Verifying prescription medicines by pharmacy:');
    const prescriptionMeds = ['Augmentin 625 Duo Tablet', 'Crocin Advance Tablet', 'ZivinixC Chewable Tablet'];
    
    for (const pharmacy of pharmacies) {
      console.log(`\n🏥 ${pharmacy.name}:`);
      for (const medName of prescriptionMeds) {
        const medicine = await Medicine.findOne({
          pharmacyId: pharmacy._id,
          name: medName
        });
        
        if (medicine) {
          console.log(`   ✅ ${medName} - Available (${medicine.pharmacyInventory[0]?.quantityAvailable || 0} units)`);
        } else {
          console.log(`   ❌ ${medName} - Not found`);
        }
      }
    }

    console.log('\n✅ Setup complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addMedicinesWithInventory();
