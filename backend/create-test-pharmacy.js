import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Pharmacy from './src/models/Pharmacy.js';

// Load environment variables
dotenv.config();

async function createTestPharmacy() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prescription-app');
    console.log('Connected to MongoDB');

    // Find the specific pharmacy user from the logs
    const pharmacyUser = await User.findOne({ email: 'lsubarna29@gmail.com', role: 'pharmacy' });
    
    if (!pharmacyUser) {
      console.log('No pharmacy user found. Please create a pharmacy user first.');
      return;
    }

    console.log('Found pharmacy user:', pharmacyUser.email);

    // Check if user already has a pharmacy
    const existingPharmacy = await Pharmacy.findOne({ owner: pharmacyUser._id });
    if (existingPharmacy) {
      console.log('User already has a pharmacy:', existingPharmacy.name);
      console.log('Pharmacy ID:', existingPharmacy._id);
      
      // Update user reference if missing
      if (!pharmacyUser.pharmacy) {
        await User.findByIdAndUpdate(pharmacyUser._id, { pharmacy: existingPharmacy._id });
        console.log('Updated user pharmacy reference');
      }
      
      return;
    }

    // Create pharmacy document
    const pharmacyDoc = {
      name: 'Test Pharmacy',
      owner: pharmacyUser._id,
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States'
      },
      location: {
        type: 'Point',
        coordinates: [-74.006, 40.7128] // NYC coordinates
      },
      contact: {
        phone: '+1-555-123-4567',
        email: pharmacyUser.email
      },
      licenses: [{
        licenseNumber: 'NY123456',
        licenseType: 'retail',
        issuingAuthority: 'New York State Board of Pharmacy',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year from now
        documentUrl: 'https://example.com/license.pdf',
        verificationStatus: 'verified'
      }],
      operatingHours: [
        { day: 'monday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 'friday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 'saturday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'sunday', isOpen: false, openTime: '00:00', closeTime: '00:00' }
      ],
      staff: {
        pharmacists: [{
          name: pharmacyUser.profile?.firstName + ' ' + pharmacyUser.profile?.lastName || 'Test Pharmacist',
          licenseNumber: 'NY123456',
          specializations: ['General Pharmacy'],
          yearsExperience: 5
        }],
        totalStaff: 3
      },
      registrationStatus: 'approved',
      isVerified: true,
      isActive: true
    };

    console.log('Creating pharmacy...');
    const pharmacy = await Pharmacy.create(pharmacyDoc);
    console.log('Pharmacy created successfully!');
    console.log('Pharmacy ID:', pharmacy._id);
    console.log('Pharmacy Name:', pharmacy.name);

    // Update user with pharmacy reference
    await User.findByIdAndUpdate(pharmacyUser._id, { 
      pharmacy: pharmacy._id,
      pharmacyDetails: {
        pharmacyName: pharmacy.name,
        licenseNumber: pharmacy.licenses[0].licenseNumber,
        verificationStatus: 'verified'
      }
    });
    console.log('Updated user with pharmacy reference');

    console.log('\n✅ Test pharmacy created successfully!');
    console.log('You can now use the inventory management system.');

  } catch (error) {
    console.error('❌ Error creating test pharmacy:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestPharmacy();