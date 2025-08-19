import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Pharmacy from './src/models/Pharmacy.js';

// Load environment variables
dotenv.config();

async function testRegistration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prescription-app');
    console.log('Connected to MongoDB');

    // Clean up any existing test data first
    await User.deleteMany({ email: { $regex: /^test-pharmacy.*@example\.com$/ } });
    await Pharmacy.deleteMany({ name: { $regex: /^Test Pharmacy/ } });
    console.log('Cleaned up any existing test data');

    // Test pharmacy user creation
    const uniqueEmail = `test-pharmacy-${Date.now()}@example.com`;
    const pharmacyUserData = {
      email: uniqueEmail,
      password: 'TestPassword123!',
      role: 'pharmacy',
      profile: {
        firstName: 'John',
        lastName: 'Pharmacist',
        phone: '+1-555-123-4567'
      }
    };

    // Generate verification token
    const tempUser = new User();
    const emailVerificationToken = tempUser.generateEmailVerificationToken();
    const hashedToken = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');

    const userData = {
      ...pharmacyUserData,
      emailVerification: {
        isVerified: false,
        token: hashedToken,
        verificationExpires: tempUser.emailVerification.verificationExpires
      },
      pharmacyDetails: {
        pharmacyName: 'Test Pharmacy',
        licenseNumber: 'TEST123',
        verificationStatus: 'pending'
      }
    };

    console.log('Creating user...');
    const user = await User.create(userData);
    console.log('User created:', user._id);

    // Create pharmacy document
    const pharmacyDoc = {
      name: 'Test Pharmacy',
      owner: user._id,
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'United States'
      },
      location: {
        type: 'Point',
        coordinates: [-74.006, 40.7128]
      },
      contact: {
        phone: '+1-555-123-4567',
        email: user.email
      },
      licenses: [{
        licenseNumber: 'TEST123',
        licenseType: 'retail',
        issuingAuthority: 'State Board of Pharmacy',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)),
        documentUrl: 'pending-upload',
        verificationStatus: 'pending'
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
          name: 'John Pharmacist',
          licenseNumber: 'TEST123',
          specializations: [],
          yearsExperience: 0
        }],
        totalStaff: 1
      },
      registrationStatus: 'draft'
    };

    console.log('Creating pharmacy...');
    const pharmacy = await Pharmacy.create(pharmacyDoc);
    console.log('Pharmacy created:', pharmacy._id);

    // Update user with pharmacy reference
    user.pharmacy = pharmacy._id;
    await user.save();
    console.log('User updated with pharmacy reference');

    // Test finding user with pharmacy details
    const userWithPharmacy = await User.findById(user._id).populate('pharmacy');
    console.log('User with pharmacy found:', !!userWithPharmacy.pharmacy);

    console.log('Test completed successfully!');

    // Cleanup
    await User.findByIdAndDelete(user._id);
    await Pharmacy.findByIdAndDelete(pharmacy._id);
    console.log('Test data cleaned up');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testRegistration();
