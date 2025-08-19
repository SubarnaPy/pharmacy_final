import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medicalhub');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Doctor schema (simplified for update)
const doctorSchema = new mongoose.Schema({}, { strict: false });
const Doctor = mongoose.model('Doctor', doctorSchema);

const fixDoctorWorkingHours = async () => {
  try {
    await connectDB();
    
    // Find the doctor by ID
    const doctorId = '68968c32e63a3edb81217733';
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      console.log('❌ Doctor not found');
      return;
    }
    
    console.log('📋 Current working hours:');
    console.log(JSON.stringify(doctor.workingHours, null, 2));
    
    // Fix working hours with proper time slots
    const fixedWorkingHours = {
      monday: {
        available: true,
        slots: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '17:00' }
        ],
        breaks: []
      },
      tuesday: {
        available: true,
        slots: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '17:00' }
        ],
        breaks: []
      },
      wednesday: {
        available: true,
        slots: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '17:00' },
          { start: '18:00', end: '20:00' }
        ],
        breaks: []
      },
      thursday: {
        available: true,
        slots: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '17:00' }
        ],
        breaks: []
      },
      friday: {
        available: true,
        slots: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '17:00' }
        ],
        breaks: []
      },
      saturday: {
        available: true,
        slots: [
          { start: '10:00', end: '13:00' }
        ],
        breaks: []
      },
      sunday: {
        available: false,
        slots: [],
        breaks: []
      }
    };
    
    // Update doctor with fixed working hours
    const updateResult = await Doctor.findByIdAndUpdate(
      doctorId,
      {
        workingHours: fixedWorkingHours,
        timeSlotDuration: 30,
        breakBetweenSlots: 10,
        maxAdvanceBookingDays: 30
      },
      { new: true }
    );
    
    console.log('✅ Doctor working hours updated successfully!');
    console.log('📋 New working hours:');
    console.log(JSON.stringify(updateResult.workingHours, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating doctor working hours:', error);
    process.exit(1);
  }
};

fixDoctorWorkingHours();
