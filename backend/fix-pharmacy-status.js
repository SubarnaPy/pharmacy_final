import mongoose from 'mongoose';
import Pharmacy from './src/models/Pharmacy.js';

const MONGODB_URI = 'mongodb://localhost:27017/p-setup-3';

async function fixPharmacyStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Get all pharmacies
    const pharmacies = await Pharmacy.find({});
    console.log(`🏥 Found ${pharmacies.length} total pharmacies`);

    for (const pharmacy of pharmacies) {
      console.log(`\n📋 Pharmacy: ${pharmacy.name}`);
      console.log(`   ID: ${pharmacy._id}`);
      console.log(`   Registration Status: ${pharmacy.registrationStatus}`);
      console.log(`   Is Verified: ${pharmacy.isVerified}`);
      console.log(`   Is Active: ${pharmacy.isActive}`);

      // Update pharmacy to be active, verified, and approved
      const updated = await Pharmacy.findByIdAndUpdate(
        pharmacy._id,
        {
          registrationStatus: 'approved',
          isVerified: true,
          isActive: true
        },
        { new: true }
      );

      console.log(`   ✅ Updated pharmacy status:`);
      console.log(`      Registration Status: ${updated.registrationStatus}`);
      console.log(`      Is Verified: ${updated.isVerified}`);
      console.log(`      Is Active: ${updated.isActive}`);
    }

    console.log('\n✅ All pharmacies updated successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPharmacyStatus();
