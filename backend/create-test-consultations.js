import mongoose from 'mongoose';
import User from './src/models/User.js';
import Doctor from './src/models/Doctor.js';
import Consultation from './src/models/Consultation.js';
import { connectDatabase } from './src/config/database.js';

const createTestConsultations = async () => {
  try {
    console.log('🔄 Creating test consultations...');
    
    // Connect to database
    await connectDatabase();
    
    // Find a patient user (or any user that can be a patient)
    let patient = await User.findOne({ role: 'patient' });
    if (!patient) {
      // Try to find any user and use them as a patient
      patient = await User.findOne();
      if (!patient) {
        console.log('❌ No users found. Please create a user first.');
        return;
      }
      console.log(`⚠️ No patient found, using user as patient: ${patient.name || patient.email}`);
    }
    
    // Find a doctor
    const doctor = await Doctor.findOne().populate('user');
    if (!doctor) {
      console.log('❌ No doctor found. Please create a doctor first.');
      return;
    }
    
    console.log(`👤 Found patient: ${patient.name} (${patient.email})`);
    console.log(`👨‍⚕️ Found doctor: ${doctor.user?.name} (${doctor.user?.email})`);
    
    // Create sample consultations
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const consultations = [
      {
        doctorId: doctor._id,
        patientId: patient._id,
        slotId: `${doctor._id}_${today.toISOString().split('T')[0]}_14:00`,
        date: today.toISOString().split('T')[0],
        time: '14:00',
        endTime: '14:30',
        consultationType: 'video',
        notes: 'Regular checkup and health assessment',
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
        notes: 'Follow-up consultation',
        consultationFee: 100,
        status: 'scheduled'
      },
      {
        doctorId: doctor._id,
        patientId: patient._id,
        slotId: `${doctor._id}_2024-12-01_16:00`,
        date: '2024-12-01',
        time: '16:00',
        endTime: '16:30',
        consultationType: 'video',
        notes: 'Mental health consultation',
        consultationFee: 150,
        status: 'completed'
      }
    ];
    
    // Delete existing test consultations for this patient
    await Consultation.deleteMany({ patientId: patient._id });
    console.log('🗑️ Cleared existing consultations for patient');
    
    // Create new consultations
    const createdConsultations = await Consultation.insertMany(consultations);
    console.log(`✅ Created ${createdConsultations.length} test consultations`);
    
    // Display created consultations
    for (const consultation of createdConsultations) {
      console.log(`📅 Consultation: ${consultation.date} at ${consultation.time} - Status: ${consultation.status}`);
    }
    
    console.log('🎉 Test consultations created successfully!');
    console.log('🔗 You can now view them in the patient consultation history');
    
  } catch (error) {
    console.error('❌ Error creating test consultations:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Database connection closed');
  }
};

createTestConsultations();
