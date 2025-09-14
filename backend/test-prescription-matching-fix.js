import mongoose from 'mongoose';
import Medicine from './src/models/Medicine.js';
import Pharmacy from './src/models/Pharmacy.js';
import PrescriptionRequestMatchingService from './src/services/PrescriptionRequestMatchingService.js';

const MONGODB_URI = 'mongodb://localhost:27017/p-setup-3';

async function testPrescriptionMatching() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Initialize the service
    const matchingService = new PrescriptionRequestMatchingService();

    // Test data - same medicines from user's prescription
    const testMedications = [
      { name: 'Augmentin 625 Duo Tablet' },
      { name: 'Crocin Advance Tablet' },
      { name: 'Zivinix-C Chewable Tablet' }
    ];

    // Test patient location
    const patientLocation = {
      latitude: 22.5738752,
      longitude: 88.4539392
    };

    console.log('🔍 Testing prescription matching...');
    console.log(`📍 Patient location: ${patientLocation.latitude}, ${patientLocation.longitude}`);
    console.log(`💊 Required medicines: ${testMedications.map(m => m.name).join(', ')}`);

    // Check available medicines in database
    console.log('\n📊 Checking medicines in database:');
    const allMedicines = await Medicine.find({
      status: 'active',
      verificationStatus: 'verified'
    }).select('name brandName genericName pharmacyInventory');

    console.log(`   🧬 Total active medicines: ${allMedicines.length}`);
    allMedicines.forEach((med, idx) => {
      const inventoryCount = med.pharmacyInventory ? med.pharmacyInventory.length : 0;
      console.log(`   ${idx + 1}. "${med.name}" - ${inventoryCount} pharmacy inventories`);
      
      if (med.pharmacyInventory && med.pharmacyInventory.length > 0) {
        med.pharmacyInventory.forEach((inv, invIdx) => {
          console.log(`      Pharmacy ${inv.pharmacyId}: ${inv.quantityAvailable} units, status: ${inv.status}`);
        });
      }
    });

    // Check pharmacies
    console.log('\n🏥 Checking pharmacies:');
    const allPharmacies = await Pharmacy.find({}).select('name registrationStatus isVerified isActive location');
    console.log(`   🏪 Total pharmacies: ${allPharmacies.length}`);
    allPharmacies.forEach((pharm, idx) => {
      const hasLocation = pharm.location && pharm.location.coordinates;
      console.log(`   ${idx + 1}. "${pharm.name}" - Status: ${pharm.registrationStatus}, Verified: ${pharm.isVerified}, Active: ${pharm.isActive}, Location: ${hasLocation ? 'YES' : 'NO'}`);
    });

    // Test the matching
    console.log('\n🎯 Testing findMatchingPharmacies...');
    const matchingPharmacies = await matchingService.findMatchingPharmacies(
      testMedications,
      patientLocation,
      1000
    );

    console.log(`\n🏆 RESULTS:`);
    console.log(`   📊 Matching pharmacies found: ${matchingPharmacies.length}`);
    
    if (matchingPharmacies.length > 0) {
      console.log(`\n✅ SUCCESS! Found matching pharmacies:`);
      matchingPharmacies.forEach((pharmacy, idx) => {
        console.log(`   ${idx + 1}. ${pharmacy.name} (${pharmacy.distance}km away)`);
        console.log(`      📊 Availability: ${pharmacy.totalMedicationsMatched}/${testMedications.length} medicines`);
        console.log(`      📍 Address: ${pharmacy.address}`);
        console.log(`      📞 Phone: ${pharmacy.phoneNumber}`);
      });
    } else {
      console.log(`\n❌ No matching pharmacies found - needs investigation`);
    }

    console.log('\n✅ Test completed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testPrescriptionMatching();