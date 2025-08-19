import mongoose from 'mongoose';
import User from './src/models/User.js';
import Doctor from './src/models/Doctor.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const createVerifiedDoctor = async () => {
  try {
    let mongoURI = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;

    if (!mongoURI) {
      console.log('MongoDB URI not found in environment variables. Using default local URI.');
      mongoURI = 'mongodb://localhost:27017/p-setup-3';
    }
    await mongoose.connect(mongoURI);
    console.log('Connected to database');

    // Check if verified doctor exists
    let doctorUser = await User.findOne({ email: 'ubarna29@gmail.com' });
    
    if (doctorUser) {
      console.log('Doctor exists, updating verification status...');
      doctorUser.emailVerification.isVerified = true;
      doctorUser.emailVerification.verifiedAt = new Date();
      await doctorUser.save();
    } else {
      console.log('Creating new verified doctor...');
      
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      doctorUser = new User({
        email: 'ubarna29@gmail.com',
        password: hashedPassword,
        role: 'doctor',
        profile: {
          name: 'Test Doctor',
          dateOfBirth: new Date('1980-01-01'),
          gender: 'female',
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
      
      await doctorUser.save();

      const doctorProfile = new Doctor({
        user: doctorUser._id,
        medicalLicense: {
          licenseNumber: '12345',
          issueDate: new Date('2005-01-01'),
          expiryDate: new Date('2025-01-01'),
          issuingAuthority: 'Test Medical Board'
        },
        specializations: ['Cardiology'],
        qualifications: [{
          degree: 'MD',
          institution: 'Test University',
          year: 2005
        }],
        experienceYears: 15,
        consultationModes: [{
          type: 'video',
          fee: 500,
          available: true
        }],
        workingHours: {
          monday: {
            available: true,
            slots: [{ start: '09:00', end: '17:00' }]
          }
        }
      });

      await doctorProfile.save();

      doctorUser.doctorProfile = doctorProfile._id;
      await doctorUser.save();
    }
    
    console.log('Verified doctor created/updated successfully!');
    console.log('Email: ubarna29@gmail.com');
    console.log('Password: password123');
    console.log('Verified:', doctorUser.emailVerification.isVerified);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

createVerifiedDoctor();
