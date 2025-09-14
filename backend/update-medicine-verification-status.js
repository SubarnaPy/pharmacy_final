import mongoose from 'mongoose';
import Medicine from './src/models/Medicine.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/healthcare', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Update medicines verification status
const updateMedicineVerificationStatus = async () => {
  try {
    console.log('🔍 Checking existing medicines...');
    
    // Count medicines by verification status
    const totalMedicines = await Medicine.countDocuments();
    const pendingMedicines = await Medicine.countDocuments({ verificationStatus: 'pending' });
    const verifiedMedicines = await Medicine.countDocuments({ verificationStatus: 'verified' });
    
    console.log(`📊 Current status:
    - Total medicines: ${totalMedicines}
    - Pending medicines: ${pendingMedicines}
    - Verified medicines: ${verifiedMedicines}`);
    
    if (pendingMedicines > 0) {
      console.log(`🔄 Updating ${pendingMedicines} pending medicines to verified status...`);
      
      // Update all pending medicines to verified
      const updateResult = await Medicine.updateMany(
        { verificationStatus: 'pending' },
        { 
          $set: { 
            verificationStatus: 'verified',
            verifiedAt: new Date()
          }
        }
      );
      
      console.log(`✅ Updated ${updateResult.modifiedCount} medicines to verified status`);
    } else {
      console.log('✅ No pending medicines found. All medicines are already verified or have other statuses.');
    }
    
    // Show final status
    const finalVerified = await Medicine.countDocuments({ verificationStatus: 'verified' });
    const finalPending = await Medicine.countDocuments({ verificationStatus: 'pending' });
    
    console.log(`📊 Final status:
    - Verified medicines: ${finalVerified}
    - Pending medicines: ${finalPending}`);
    
    // Show some sample medicines for verification
    if (totalMedicines > 0) {
      console.log('\n📝 Sample medicines:');
      const samples = await Medicine.find()
        .limit(5)
        .select('name brandName genericName verificationStatus status')
        .lean();
      
      samples.forEach((medicine, index) => {
        console.log(`  ${index + 1}. ${medicine.name || medicine.brandName} - Status: ${medicine.status}, Verification: ${medicine.verificationStatus}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating medicine verification status:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await updateMedicineVerificationStatus();
  await mongoose.disconnect();
  console.log('✅ Script completed successfully');
};

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});