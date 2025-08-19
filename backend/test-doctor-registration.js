import mongoose from 'mongoose';
import User from './src/models/User.js';
import Doctor from './src/models/Doctor.js';
import dotenv from 'dotenv';

dotenv.config();

const testDoctorRegistration = async () => {
  try {
    console.log('Testing doctor registration integration...');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Simulate a doctor registration
    const doctorRegistrationData = {
      name: 'Dr. John Smith',
      email: `dr.test.${Date.now()}@example.com`, // Use unique email
      password: 'SecurePassword123!',
      phone: '+1234567890',
      role: 'doctor',
      doctorInfo: {
        medicalLicenseNumber: 'MD123456789',
        issueDate: new Date('2010-01-01'),
        expiryDate: new Date('2025-12-31'),
        issuingState: 'NY',
        specializations: ['Cardiology', 'Internal Medicine'],
        qualifications: ['MD', 'FACC'],
        yearsOfExperience: 12,
        consultationModes: ['inPerson', 'videoCall'],
        consultationFee: {
          inPerson: 200,
          videoCall: 150,
          chat: 50
        },
        workingHours: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' }
        },
        location: {
          address: '123 Medical Center Dr',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          coordinates: [-74.006, 40.7128]
        }
      }
    };

    // Create user account
    const user = new User({
      name: doctorRegistrationData.name,
      email: doctorRegistrationData.email,
      password: '$2b$10$' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), // Mock hashed password
      phone: doctorRegistrationData.phone,
      role: doctorRegistrationData.role,
      isActive: true,
      emailVerification: { isVerified: true }
    });

    await user.save();
    console.log('✅ User account created:', user._id);

    // Create doctor profile (simulating what happens in authController)
    const doctorProfile = new Doctor({
      user: user._id,
      medicalLicense: {
        licenseNumber: doctorRegistrationData.doctorInfo.medicalLicenseNumber,
        issuingAuthority: 'New York Medical Board',
        issueDate: doctorRegistrationData.doctorInfo.issueDate,
        expiryDate: doctorRegistrationData.doctorInfo.expiryDate,
        isVerified: false,
        documents: []
      },
      specializations: doctorRegistrationData.doctorInfo.specializations,
      qualifications: [
        {
          degree: 'MD',
          institution: 'Harvard Medical School',
          year: 2008,
          specialization: 'Internal Medicine'
        }
      ],
      experience: {
        totalYears: doctorRegistrationData.doctorInfo.yearsOfExperience,
        currentPosition: 'Senior Cardiologist',
        workplace: [
          {
            hospitalName: 'General Hospital',
            position: 'Cardiologist',
            startDate: new Date('2010-01-01'),
            isCurrent: true
          }
        ]
      },
      bio: 'Experienced cardiologist with 12+ years of practice.',
      languages: ['English'],
      consultationModes: {
        chat: { available: doctorRegistrationData.doctorInfo.consultationModes.includes('chat'), fee: doctorRegistrationData.doctorInfo.consultationFee.chat },
        phone: { available: doctorRegistrationData.doctorInfo.consultationModes.includes('phone'), fee: 100 },
        video: { available: doctorRegistrationData.doctorInfo.consultationModes.includes('videoCall'), fee: doctorRegistrationData.doctorInfo.consultationFee.videoCall },
        email: { available: false, fee: 0 }
      },
      workingHours: {
        monday: { start: '09:00', end: '17:00', available: true },
        tuesday: { start: '09:00', end: '17:00', available: true },
        wednesday: { start: '09:00', end: '17:00', available: true },
        thursday: { start: '09:00', end: '17:00', available: true },
        friday: { start: '09:00', end: '17:00', available: true },
        saturday: { start: '09:00', end: '13:00', available: false },
        sunday: { start: '', end: '', available: false }
      },
      clinic: {
        name: 'Primary Medical Clinic',
        address: {
          street: doctorRegistrationData.doctorInfo.location.address,
          city: doctorRegistrationData.doctorInfo.location.city,
          state: doctorRegistrationData.doctorInfo.location.state,
          zipCode: doctorRegistrationData.doctorInfo.location.zipCode,
          country: doctorRegistrationData.doctorInfo.location.country,
          coordinates: doctorRegistrationData.doctorInfo.location.coordinates
        },
        phone: doctorRegistrationData.phone,
        facilities: ['Consultation Room', 'ECG Machine']
      },
      ratings: {
        average: 0,
        totalReviews: 0,
        breakdown: {
          5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        }
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
    console.log('✅ Doctor profile created:', doctorProfile._id);

    // Link doctor profile to user
    user.doctorProfile = doctorProfile._id;
    await user.save();
    console.log('✅ Doctor profile linked to user');

    // Test the relationship
    const userWithDoctor = await User.findById(user._id).populate('doctorProfile');
    console.log('✅ User with doctor profile populated:');
    console.log('  - User ID:', userWithDoctor._id);
    console.log('  - User Name:', userWithDoctor.name);
    console.log('  - Role:', userWithDoctor.role);
    console.log('  - Doctor Profile ID:', userWithDoctor.doctorProfile._id);
    console.log('  - Doctor Specializations:', userWithDoctor.doctorProfile.specializations);
    console.log('  - Doctor License:', userWithDoctor.doctorProfile.medicalLicense.licenseNumber);

    // Test finding doctor by user ID
    const doctorByUserId = await Doctor.findOne({ user: user._id });
    console.log('✅ Doctor found by user ID:', doctorByUserId._id);

    // Clean up test data
    await Doctor.findByIdAndDelete(doctorProfile._id);
    await User.findByIdAndDelete(user._id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Doctor registration integration test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
};

// Run the test
testDoctorRegistration();
