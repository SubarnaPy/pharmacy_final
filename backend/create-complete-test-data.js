import mongoose from 'mongoose';
import User from './src/models/User.js';
import Doctor from './src/models/Doctor.js';
import Consultation from './src/models/Consultation.js';
import { connectDatabase } from './src/config/database.js';

const createCompleteTestData = async () => {
  try {
    console.log('🔄 Creating complete test data...');
    
    // Connect to database
    await connectDatabase();
    
    // Get existing users
    const existingUsers = await User.find();
    console.log(`👥 Found ${existingUsers.length} existing users`);
    
    let patient, doctorUser, doctor;
    
    // Use first user as patient if no patient exists
    patient = await User.findOne({ role: 'patient' });
    if (!patient && existingUsers.length > 0) {
      patient = existingUsers.find(u => u.role !== 'doctor') || existingUsers[0];
      // Update the user to be a patient
      await User.findByIdAndUpdate(patient._id, { 
        role: 'patient',
        name: patient.name || 'Test Patient'
      });
      console.log(`✅ Updated user ${patient.email} to be a patient`);
    }
    
    // Get or create doctor user
    doctorUser = await User.findOne({ role: 'doctor' });
    if (!doctorUser && existingUsers.length > 1) {
      doctorUser = existingUsers.find(u => u.role === 'doctor') || existingUsers[1];
      await User.findByIdAndUpdate(doctorUser._id, { 
        role: 'doctor',
        name: doctorUser.name || 'Dr. Smith'
      });
      console.log(`✅ Updated user ${doctorUser.email} to be a doctor`);
    }
    
    if (!patient || !doctorUser) {
      console.log('❌ Need at least 2 users to create test data');
      return;
    }
    
    // Create or get doctor profile
    doctor = await Doctor.findOne({ user: doctorUser._id });
    if (!doctor) {
      doctor = new Doctor({
        user: doctorUser._id,
        specializations: ['General Medicine', 'Internal Medicine'],
        medicalLicense: {
          licenseNumber: 'MD123456789',
          issuingAuthority: 'Medical Board of Health',
          issueDate: new Date('2015-01-01'),
          expiryDate: new Date('2025-12-31'),
          isVerified: true
        },
        experience: {
          totalYears: 10,
          currentPosition: 'Senior Consultant',
          previousPositions: []
        },
        consultationModes: {
          video: { available: true, fee: 100, duration: 30 },
          chat: { available: true, fee: 50, duration: 30 },
          phone: { available: true, fee: 75, duration: 30 }
        },
        ratings: {
          average: 4.8,
          totalReviews: 125
        },
        bio: 'Experienced healthcare professional with 10+ years in general medicine.',
        isAvailable: true,
        isAcceptingAppointments: true
      });
      await doctor.save();
      console.log(`✅ Created doctor profile for ${doctorUser.email}`);
    }
    
    console.log(`👤 Using patient: ${patient.name || patient.email}`);
    console.log(`👨‍⚕️ Using doctor: ${doctorUser.name || doctorUser.email}`);
    
    // Create sample consultations
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const consultations = [
      {
        doctorId: doctor._id,
        patientId: patient._id,
        slotId: `${doctor._id}_${today.toISOString().split('T')[0]}_14:00`,
        date: today.toISOString().split('T')[0],
        time: '14:00',
        endTime: '14:30',
        consultationType: 'video',
        notes: 'Regular health checkup and general consultation',
        consultationFee: 100,
        status: 'confirmed'
      },
      {
        doctorId: doctor._id,
        patientId: patient._id,
        slotId: `${doctor._id}_${tomorrow.toISOString().split('T')[0]}_10:00`,
        date: tomorrow.toISOString().split('T')[0],
        time: '10:00',
        endTime: '10:30',
        consultationType: 'video',
        notes: 'Follow-up consultation for previous appointment',
        consultationFee: 100,
        status: 'scheduled'
      },
      {
        doctorId: doctor._id,
        patientId: patient._id,
        slotId: `${doctor._id}_${lastWeek.toISOString().split('T')[0]}_16:00`,
        date: lastWeek.toISOString().split('T')[0],
        time: '16:00',
        endTime: '16:30',
        consultationType: 'video',
        notes: 'Completed consultation for health assessment',
        consultationFee: 100,
        status: 'completed'
      }
    ];
    
    // Delete existing consultations for this patient
    await Consultation.deleteMany({ patientId: patient._id });
    console.log('🗑️ Cleared existing consultations');
    
    // Create new consultations
    const createdConsultations = await Consultation.insertMany(consultations);
    console.log(`✅ Created ${createdConsultations.length} test consultations`);
    
    // Display created consultations
    for (const consultation of createdConsultations) {
      console.log(`📅 ${consultation.date} at ${consultation.time} - ${consultation.status}`);
    }
    
    console.log('🎉 Complete test data created successfully!');
    console.log(`👤 Patient ID: ${patient._id}`);
    console.log(`👨‍⚕️ Doctor ID: ${doctor._id}`);
    console.log('🔗 You can now view consultations in the patient dashboard');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Database connection closed');
  }
};

createCompleteTestData();
