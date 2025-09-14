import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Medicine from './src/models/Medicine.js';
import Pharmacy from './src/models/Pharmacy.js';
import User from './src/models/User.js';

// Load environment variables
dotenv.config();

async function checkDatabaseState() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prescription-app');
    console.log('Connected to MongoDB');

    console.log('\n📊 DATABASE STATE REPORT');
    console.log('========================\n');

    // Check Users
    const totalUsers = await User.countDocuments();
    const pharmacyUsers = await User.countDocuments({ role: 'pharmacy' });
    console.log(`👥 USERS:`);
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Pharmacy users: ${pharmacyUsers}`);

    // Check Pharmacies
    const totalPharmacies = await Pharmacy.countDocuments();
    const approvedPharmacies = await Pharmacy.countDocuments({ registrationStatus: 'approved' });
    const verifiedPharmacies = await Pharmacy.countDocuments({ isVerified: true });
    const activePharmacies = await Pharmacy.countDocuments({ isActive: true });

    console.log(`\n🏥 PHARMACIES:`);
    console.log(`   Total pharmacies: ${totalPharmacies}`);
    console.log(`   Approved pharmacies: ${approvedPharmacies}`);
    console.log(`   Verified pharmacies: ${verifiedPharmacies}`);
    console.log(`   Active pharmacies: ${activePharmacies}`);

    if (totalPharmacies > 0) {
      console.log(`\n   📋 Pharmacy Details:`);
      const pharmacies = await Pharmacy.find({}).select('name registrationStatus isVerified isActive owner');
      pharmacies.forEach((pharmacy, index) => {
        console.log(`     ${index + 1}. ${pharmacy.name}`);
        console.log(`        Status: ${pharmacy.registrationStatus}`);
        console.log(`        Verified: ${pharmacy.isVerified}`);
        console.log(`        Active: ${pharmacy.isActive}`);
        console.log(`        Owner: ${pharmacy.owner}`);
      });
    }

    // Check Inventory
    const totalInventory = await InventoryItem.countDocuments();
    const availableInventory = await InventoryItem.countDocuments({ 
      quantityAvailable: { $gt: 0 },
      status: { $in: ['available', 'low-stock'] }
    });

    console.log(`\n📦 INVENTORY:`);
    console.log(`   Total inventory items: ${totalInventory}`);
    console.log(`   Available items: ${availableInventory}`);

    if (totalInventory > 0) {
      // Group by pharmacy
      const inventoryByPharmacy = await InventoryItem.aggregate([
        {
          $group: {
            _id: '$pharmacyId',
            count: { $sum: 1 },
            availableCount: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gt: ['$quantityAvailable', 0] },
                    { $in: ['$status', ['available', 'low-stock']] }
                  ]},
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      console.log(`\n   📊 Inventory by Pharmacy:`);
      for (const inv of inventoryByPharmacy) {
        const pharmacy = await Pharmacy.findById(inv._id).select('name');
        const pharmacyName = pharmacy ? pharmacy.name : 'Unknown Pharmacy';
        console.log(`     ${pharmacyName}: ${inv.availableCount}/${inv.count} items available`);
      }

      // Show some sample inventory items
      const sampleItems = await InventoryItem.find({}).limit(5).select('medicineName pharmacyId quantityAvailable status');
      console.log(`\n   📋 Sample Inventory Items:`);
      for (const item of sampleItems) {
        const pharmacy = await Pharmacy.findById(item.pharmacyId).select('name');
        const pharmacyName = pharmacy ? pharmacy.name : 'Unknown';
        console.log(`     "${item.medicineName}" at ${pharmacyName} (Qty: ${item.quantityAvailable}, Status: ${item.status})`);
      }
    }

    // Check for common test medicines
    console.log(`\n🔍 CHECKING FOR COMMON MEDICINES:`);
    const commonMedicines = ['paracetamol', 'amoxicillin', 'vitamin c', 'augmentin', 'crocin'];
    
    for (const medicine of commonMedicines) {
      const count = await InventoryItem.countDocuments({
        medicineName: new RegExp(medicine, 'i'),
        quantityAvailable: { $gt: 0 }
      });
      console.log(`   ${medicine}: ${count} items found`);
    }

    console.log(`\n✅ Database state check complete!`);

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (totalPharmacies === 0) {
      console.log(`   - Create a test pharmacy using: node backend/create-test-pharmacy.js`);
    }
    if (totalInventory === 0) {
      console.log(`   - Add test inventory using: node backend/add-test-inventory.js`);
    }
    if (approvedPharmacies === 0 && totalPharmacies > 0) {
      console.log(`   - Update pharmacy status to 'approved' and set isVerified to true`);
    }

  } catch (error) {
    console.error('❌ Error checking database state:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkDatabaseState();