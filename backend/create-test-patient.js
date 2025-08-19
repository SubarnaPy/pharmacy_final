import mongoose from 'mongoose';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';

mongoose.connect('mongodb://localhost:27017/pharmacy_marketplace');

async function createTestPatient() {
  try {
    // Check if patient already exists
    const existingPatient = await User.findOne({ email: 'patient@test.com' });
    if (existingPatient) {
      console.log('✅ Test patient already exists:', existingPatient.email);
      return existingPatient;
    }

    // Create test patient
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const patient = new User({
      email: 'patient@test.com',
      password: hashedPassword,
      role: 'patient',
      profile: {
        firstName: 'Test',
        lastName: 'Patient',
        phone: '+1234567890',
        address: {
          street: '123 Test Street',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001',
          country: 'India',
          coordinates: [77.5946, 12.9716] // Bangalore coordinates
        }
      },
      isActive: true,
      isVerified: true
    });

    await patient.save();
    console.log('✅ Created test patient:', patient.email);
    return patient;

  } catch (error) {
    console.error('❌ Error creating test patient:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

createTestPatient();