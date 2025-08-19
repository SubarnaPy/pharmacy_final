import mongoose from 'mongoose';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const createVerifiedPatient = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthsync');
    console.log('Connected to database');

    // Check if verified patient exists
    let patient = await User.findOne({ email: 'patient@test.com' });
    
    if (patient) {
      console.log('Patient exists, updating verification status...');
      patient.emailVerification.isVerified = true;
      patient.emailVerification.verifiedAt = new Date();
      await patient.save();
    } else {
      console.log('Creating new verified patient...');
      
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      patient = new User({
        email: 'patient@test.com',
        password: hashedPassword,
        role: 'patient',
        profile: {
          name: 'Test Patient',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          contactInfo: {
            phone: '+1234567890',
            address: {
              street: '123 Test St',
              city: 'Test City',
              state: 'Test State',
              zipCode: '12345',
              country: 'Test Country'
            }
          }
        },
        emailVerification: {
          isVerified: true,
          verifiedAt: new Date()
        },
        isActive: true
      });
      
      await patient.save();
    }
    
    console.log('Verified patient created/updated successfully!');
    console.log('Email: patient@test.com');
    console.log('Password: password123');
    console.log('Verified:', patient.emailVerification.isVerified);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

createVerifiedPatient();
