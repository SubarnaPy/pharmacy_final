import mongoose from 'mongoose';
import Doctor from './src/models/Doctor.js';
import dotenv from 'dotenv';

dotenv.config();

const fixDoctorWorkingHours = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthsync');
    console.log('Connected to database');

    // Find the existing doctor
    const doctor = await Doctor.findById('68968c32e63a3edb81217733');
    
    if (!doctor) {
      console.log('Doctor not found');
      return;
    }

    console.log(`Updating working hours for doctor: ${doctor.name || 'Unnamed'}`);

    // Update working hours with proper time slots
    doctor.workingHours = {
      monday: {
        available: true,
        slots: [
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '10:30', end: '11:00' },
          { start: '11:00', end: '11:30' },
          { start: '14:00', end: '14:30' },
          { start: '14:30', end: '15:00' },
          { start: '15:00', end: '15:30' },
          { start: '15:30', end: '16:00' },
          { start: '16:00', end: '16:30' }
        ]
      },
      tuesday: {
        available: true,
        slots: [
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '10:30', end: '11:00' },
          { start: '11:00', end: '11:30' },
          { start: '14:00', end: '14:30' },
          { start: '14:30', end: '15:00' },
          { start: '15:00', end: '15:30' }
        ]
      },
      wednesday: {
        available: true,
        slots: [
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '10:30', end: '11:00' },
          { start: '14:00', end: '14:30' },
          { start: '14:30', end: '15:00' }
        ]
      },
      thursday: {
        available: true,
        slots: [
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '14:00', end: '14:30' },
          { start: '14:30', end: '15:00' },
          { start: '15:00', end: '15:30' }
        ]
      },
      friday: {
        available: true,
        slots: [
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '10:30', end: '11:00' },
          { start: '14:00', end: '14:30' }
        ]
      },
      saturday: {
        available: true,
        slots: [
          { start: '10:00', end: '10:30' },
          { start: '10:30', end: '11:00' },
          { start: '11:00', end: '11:30' }
        ]
      },
      sunday: {
        available: false,
        slots: []
      }
    };

    // Also ensure other required fields are set
    doctor.isAvailable = true;
    doctor.isAcceptingAppointments = true;
    
    // Add basic profile info if missing
    if (!doctor.name) doctor.name = 'Dr. John Smith';
    if (!doctor.specializations || doctor.specializations.length === 0) {
      doctor.specializations = ['General Medicine'];
    }
    if (!doctor.consultationFee) doctor.consultationFee = 50;
    if (!doctor.ratings) {
      doctor.ratings = {
        average: 4.5,
        totalReviews: 15
      };
    }
    if (!doctor.experience) {
      doctor.experience = {
        totalYears: 5,
        description: 'Experienced general practitioner'
      };
    }

    await doctor.save();
    console.log('Doctor working hours updated successfully!');
    
    // Verify the update
    const updatedDoctor = await Doctor.findById('68968c32e63a3edb81217733');
    console.log(`Monday slots: ${updatedDoctor.workingHours.monday.slots.length} slots`);
    console.log(`Tuesday slots: ${updatedDoctor.workingHours.tuesday.slots.length} slots`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

fixDoctorWorkingHours();
