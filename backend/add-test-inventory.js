import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { InventoryItem } from './src/models/Inventory.js';
import Pharmacy from './src/models/Pharmacy.js';

// Load environment variables
dotenv.config();

async function addTestInventory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prescription-app');
    console.log('Connected to MongoDB');

    // Find any pharmacy to add inventory to
    const pharmacy = await Pharmacy.findOne({ isActive: true });
    
    if (!pharmacy) {
      console.log('❌ No pharmacy found. Please create a pharmacy first.');
      return;
    }

    console.log(`📋 Adding test inventory to pharmacy: ${pharmacy.name} (ID: ${pharmacy._id})`);

    // Common medicines to add
    const testMedicines = [
      {
        medicineName: 'Paracetamol 500mg Tablet',
        brandName: 'Crocin Advance Tablet',
        batchNumber: 'PAR001',
        dosageForm: 'Tablet',
        strength: '500mg',
        quantityAvailable: 100,
        pricePerUnit: 2.50,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        manufacturer: 'GSK',
        requiresPrescription: false,
        status: 'available'
      },
      {
        medicineName: 'Amoxicillin 500mg Capsule',
        brandName: 'Augmentin 625 Duo Tablet',
        batchNumber: 'AMX001',
        dosageForm: 'Tablet',
        strength: 'Amoxicillin 500mg, Clavulanic Acid 125mg',
        quantityAvailable: 50,
        pricePerUnit: 15.00,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        manufacturer: 'GSK',
        requiresPrescription: true,
        status: 'available'
      },
      {
        medicineName: 'Vitamin C 500mg Tablet',
        brandName: 'Zivinix-C Chewable Tablet',
        batchNumber: 'VTC001',
        dosageForm: 'Chewable Tablet',
        strength: 'Vitamin C 400mg, Zinc Sulfate 75mg',
        quantityAvailable: 75,
        pricePerUnit: 8.00,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        manufacturer: 'Cipla',
        requiresPrescription: false,
        status: 'available'
      },
      {
        medicineName: 'Ibuprofen 400mg Tablet',
        brandName: 'Brufen',
        batchNumber: 'IBU001',
        dosageForm: 'Tablet',
        strength: '400mg',
        quantityAvailable: 80,
        pricePerUnit: 3.50,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        manufacturer: 'Abbott',
        requiresPrescription: false,
        status: 'available'
      },
      {
        medicineName: 'Azithromycin 500mg Tablet',
        brandName: 'Azithral',
        batchNumber: 'AZI001',
        dosageForm: 'Tablet',
        strength: '500mg',
        quantityAvailable: 30,
        pricePerUnit: 25.00,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        manufacturer: 'Alembic',
        requiresPrescription: true,
        status: 'available'
      }
    ];

    // Remove existing inventory for this pharmacy to avoid duplicates
    await InventoryItem.deleteMany({ pharmacyId: pharmacy._id });
    console.log('🗑️ Cleared existing inventory');

    // Add test medicines
    const inventoryItems = testMedicines.map(medicine => ({
      ...medicine,
      pharmacyId: pharmacy._id,
      lastUpdated: new Date()
    }));

    const result = await InventoryItem.insertMany(inventoryItems);
    
    console.log(`✅ Successfully added ${result.length} test medicines to inventory:`);
    result.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.medicineName} (${item.brandName}) - Qty: ${item.quantityAvailable}`);
    });

    console.log(`\n🎯 Test inventory is now ready for prescription matching!`);
    console.log(`📋 Pharmacy: ${pharmacy.name}`);
    console.log(`📦 Total items: ${result.length}`);

  } catch (error) {
    console.error('❌ Error adding test inventory:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addTestInventory();