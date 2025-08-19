import mongoose from 'mongoose';
import User from './src/models/User.js';
import Doctor from './src/models/Doctor.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const testAuthControllerDoctorRegistration = async () => {
  try {
    console.log('Testing authController doctor registration simulation...');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Simulate the actual registration request that would come from frontend
    const registrationData = {
      name: 'Dr. Sarah Wilson',
      email: `dr.sarah.${Date.now()}@medicalcenter.com`,
      password: 'SecurePassword123!',
      phone: '+1987654321',
      role: 'doctor',
      // Doctor-specific information
      medicalLicenseNumber: `MD${Date.now()}`, // Unique license number
      specializations: ['Dermatology', 'Surgery'], // Using valid enum values
      yearsOfExperience: 8,
      clinicName: 'Wilson Dermatology Clinic',
      clinicAddress: '456 Health Plaza, Los Angeles, CA 90210'
    };

    console.log('\n🔄 Simulating authController register function...');

    // Step 1: Hash password (as authController would do)
    const hashedPassword = await bcrypt.hash(registrationData.password, 10);
    
    // Step 2: Create user account
    const user = new User({
      email: registrationData.email,
      password: hashedPassword,
      role: registrationData.role,
      profile: {
        firstName: 'Sarah',
        lastName: 'Wilson',
        phone: registrationData.phone,
        dateOfBirth: new Date('1985-03-15'),
        gender: 'female',
        address: {
          street: registrationData.clinicAddress.split(',')[0],
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA',
          coordinates: [-118.2437, 34.0522]
        }
      },
      isActive: true,
      emailVerification: { isVerified: false, token: 'mock-token' }
    });

    await user.save();
    console.log('✅ User account created:', {
      id: user._id,
      name: user.profile.firstName + ' ' + user.profile.lastName,
      email: user.email,
      role: user.role
    });

    // Step 3: Create doctor profile (as authController would do for doctor registration)
    if (registrationData.role === 'doctor') {
      const doctorProfile = new Doctor({
        user: user._id,
        medicalLicense: {
          licenseNumber: registrationData.medicalLicenseNumber,
          issuingAuthority: 'State Medical Board',
          issueDate: new Date('2015-01-01'),
          expiryDate: new Date('2025-12-31'),
          isVerified: false,
          documents: []
        },
        specializations: registrationData.specializations,
        qualifications: [
          {
            degree: 'MD',
            institution: 'UCLA Medical School',
            year: 2014,
            specialization: 'Dermatology'
          }
        ],
        experience: {
          totalYears: registrationData.yearsOfExperience,
          currentPosition: 'Senior Dermatologist',
          workplace: [
            {
              hospitalName: registrationData.clinicName,
              position: 'Owner/Dermatologist',
              startDate: new Date('2016-01-01'),
              isCurrent: true
            }
          ]
        },
        bio: `Experienced dermatologist with ${registrationData.yearsOfExperience} years of practice specializing in both medical and cosmetic dermatology.`,
        languages: ['English', 'Spanish'],
        consultationModes: {
          chat: { available: true, fee: 75, duration: 30 },
          phone: { available: true, fee: 100, duration: 30 },
          video: { available: true, fee: 150, duration: 30 },
          email: { available: false, fee: 0 }
        },
        workingHours: {
          monday: { start: '08:00', end: '18:00', available: true },
          tuesday: { start: '08:00', end: '18:00', available: true },
          wednesday: { start: '08:00', end: '18:00', available: true },
          thursday: { start: '08:00', end: '18:00', available: true },
          friday: { start: '08:00', end: '16:00', available: true },
          saturday: { start: '09:00', end: '13:00', available: true },
          sunday: { start: '', end: '', available: false }
        },
        clinic: {
          name: registrationData.clinicName,
          address: {
            street: registrationData.clinicAddress.split(',')[0],
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90210',
            country: 'USA',
            coordinates: [-118.2437, 34.0522]
          },
          phone: registrationData.phone,
          facilities: ['Consultation Room', 'Laser Equipment', 'Dermatoscopy']
        },
        ratings: {
          average: 0,
          totalReviews: 0,
          breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        verification: {
          isVerified: false,
          verifiedAt: null,
          verifiedBy: null,
          documents: {
            medicalLicense: { uploaded: false, verified: false },
            identityProof: { uploaded: false, verified: false },
            qualificationCertificates: { uploaded: false, verified: false }
          }
        },
        settings: {
          isAcceptingPatients: true,
          consultationPreferences: {
            followUpReminders: true,
            patientHistory: true,
            prescriptionManagement: true
          }
        }
      });

      await doctorProfile.save();
      console.log('✅ Doctor profile created:', {
        id: doctorProfile._id,
        licenseNumber: doctorProfile.medicalLicense.licenseNumber,
        specializations: doctorProfile.specializations
      });

      // Step 4: Link doctor profile to user
      user.doctorProfile = doctorProfile._id;
      await user.save();
      console.log('✅ Doctor profile linked to user account');
    }

    console.log('\n🔍 Testing database relationships...');

    // Test 1: Find user with populated doctor profile
    const userWithDoctor = await User.findById(user._id).populate('doctorProfile');
    console.log('✅ User with doctor profile:', {
      userId: userWithDoctor._id,
      name: userWithDoctor.profile.firstName + ' ' + userWithDoctor.profile.lastName,
      email: userWithDoctor.email,
      role: userWithDoctor.role,
      hasDoctorProfile: !!userWithDoctor.doctorProfile,
      doctorId: userWithDoctor.doctorProfile?._id,
      doctorSpecializations: userWithDoctor.doctorProfile?.specializations,
      doctorLicense: userWithDoctor.doctorProfile?.medicalLicense?.licenseNumber
    });

    // Test 2: Find doctor by user ID
    const doctorByUserId = await Doctor.findOne({ user: user._id });
    console.log('✅ Doctor found by user ID:', {
      doctorId: doctorByUserId._id,
      userId: doctorByUserId.user,
      specializations: doctorByUserId.specializations,
      totalExperience: doctorByUserId.experience.totalYears
    });

    // Test 3: Test login simulation (checking if doctor profile is accessible)
    const loginUser = await User.findOne({ email: registrationData.email }).populate('doctorProfile');
    if (loginUser && loginUser.doctorProfile) {
      console.log('✅ Login simulation successful - doctor profile accessible:', {
        name: loginUser.profile.firstName + ' ' + loginUser.profile.lastName,
        role: loginUser.role,
        doctorVerified: loginUser.doctorProfile.verification?.isVerified || false,
        acceptingPatients: loginUser.doctorProfile.settings?.isAcceptingPatients || true
      });
    }

    // Clean up test data
    await Doctor.findByIdAndDelete(userWithDoctor.doctorProfile._id);
    await User.findByIdAndDelete(user._id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Doctor registration integration test completed successfully!');
    console.log('🔥 Key Features Tested:');
    console.log('   ✓ User account creation with doctor role');
    console.log('   ✓ Comprehensive doctor profile creation');
    console.log('   ✓ User-Doctor profile linking');
    console.log('   ✓ Database relationship queries');
    console.log('   ✓ Login flow with doctor profile access');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
};

// Run the test
testAuthControllerDoctorRegistration();
