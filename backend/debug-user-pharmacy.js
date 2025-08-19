import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Pharmacy from './src/models/Pharmacy.js';

dotenv.config();

async function debugUserPharmacy() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prescription-app');
    console.log('Connected to MongoDB');

    // Find the user from the logs
    const userEmail = 'lsubarna29@gmail.com';
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.log('❌ User not found:', userEmail);
      return;
    }

    console.log('👤 User found:');
    console.log('  ID:', user._id);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Pharmacy ref:', user.pharmacy);

    // Check if user has pharmacy reference
    if (user.pharmacy) {
      const pharmacy = await Pharmacy.findById(user.pharmacy);
      console.log('🏥 Pharmacy from reference:');
      if (pharmacy) {
        console.log('  ID:', pharmacy._id);
        console.log('  Name:', pharmacy.name);
        console.log('  Owner:', pharmacy.owner);
        console.log('  Status:', pharmacy.registrationStatus);
        console.log('  Active:', pharmacy.isActive);
      } else {
        console.log('  ❌ Pharmacy not found with ID:', user.pharmacy);
      }
    }

    // Check if user owns a pharmacy
    const ownedPharmacy = await Pharmacy.findOne({ owner: user._id });
    console.log('🏥 Pharmacy owned by user:');
    if (ownedPharmacy) {
      console.log('  ID:', ownedPharmacy._id);
      console.log('  Name:', ownedPharmacy.name);
      console.log('  Owner:', ownedPharmacy.owner);
      console.log('  Status:', ownedPharmacy.registrationStatus);
      console.log('  Active:', ownedPharmacy.isActive);
      
      // Update user reference if missing
      if (!user.pharmacy) {
        await User.findByIdAndUpdate(user._id, { pharmacy: ownedPharmacy._id });
        console.log('✅ Updated user with pharmacy reference');
      }
    } else {
      console.log('  ❌ No pharmacy owned by this user');
      
      // Check all pharmacies
      const allPharmacies = await Pharmacy.find({});
      console.log('📋 All pharmacies in database:');
      allPharmacies.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.name} (Owner: ${p.owner}, Status: ${p.registrationStatus})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugUserPharmacy();