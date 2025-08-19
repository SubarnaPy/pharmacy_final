import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Doctor from './src/models/Doctor.js';

// Load environment variables
dotenv.config();

async function createMissingDoctorProfile() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy-system');
    console.log('✅ Connected to MongoDB');

    // Find the user with email ubarna29@gmail.com
    const user = await User.findOne({ email: 'ubarna29@gmail.com' });
    if (!user) {
      console.log('❌ User not found with email ubarna29@gmail.com');
      return;
    }

    console.log('✅ Found user:', {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.profile?.firstName + ' ' + user.profile?.lastName
    });

    // Check if doctor profile already exists
    let doctor = await Doctor.findOne({ user: user._id });
    if (doctor) {
      console.log('✅ Doctor profile already exists:', doctor._id);
      
      // Update user's doctorProfile reference if missing
      if (!user.doctorProfile) {
        await User.findByIdAndUpdate(user._id, { doctorProfile: doctor._id });
        console.log('✅ Updated user doctorProfile reference');
      }
      
      return;
    }

    // Create doctor profile
    console.log('🔄 Creating doctor profile...');
    doctor = await Doctor.create({
      user: user._id,
      medicalLicense: {
        licenseNumber: `DOC${Date.now()}`,
        issuingAuthority: 'Medical Board',
        issueDate: new Date('2020-01-01'),
        expiryDate: new Date('2025-12-31'),
        isVerified: false
      },
      specializations: ['General Medicine'],
      qualifications: [{
        degree: 'MBBS',
        institution: 'Medical College',
        year: 2018,
        specialization: 'General Medicine'
      }],
      consultationModes: {
        video: { available: true, fee: 100, duration: 30 },
        chat: { available: true, fee: 50, duration: 30 },
        phone: { available: true, fee: 75, duration: 30 }
      },
      workingHours: {
        monday: { start: '09:00', end: '17:00', available: true },
        tuesday: { start: '09:00', end: '17:00', available: true },
        wednesday: { start: '09:00', end: '17:00', available: true },
        thursday: { start: '09:00', end: '17:00', available: true },
        friday: { start: '09:00', end: '17:00', available: true },
        saturday: { start: '09:00', end: '13:00', available: true },
        sunday: { start: '', end: '', available: false }
      },
      bio: 'Experienced doctor providing quality healthcare services.',
      languages: ['English'],
      status: 'pending'
    });

    console.log('✅ Doctor profile created:', doctor._id);

    // Update user's doctorProfile reference
    await User.findByIdAndUpdate(user._id, { doctorProfile: doctor._id });
    console.log('✅ Updated user doctorProfile reference');

    console.log('🎉 Doctor profile setup complete!');
    console.log('Doctor ID:', doctor._id);
    console.log('User can now access profile at: /api/doctors/' + doctor._id + '/profile/full');

  } catch (error) {
    console.error('❌ Error creating doctor profile:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
createMissingDoctorProfile();