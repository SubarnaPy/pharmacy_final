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

const updateDoctorAvailability = async () => {
  try {
    await connectDB();
    
    // Find the doctor by ID
    const doctorId = '68968c32e63a3edb81217733';
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      console.log('❌ Doctor not found');
      return;
    }
    
    console.log('📋 Current doctor status:');
    console.log('- isAvailable:', doctor.isAvailable);
    console.log('- status:', doctor.status);
    console.log('- isAcceptingAppointments:', doctor.isAcceptingAppointments);
    
    // Update doctor to be available for booking
    const updateResult = await Doctor.findByIdAndUpdate(
      doctorId,
      {
        isAvailable: true,
        status: 'verified',
        isAcceptingAppointments: true,
        // Ensure consultation modes are properly set with in-person
        'consultationModes.video.available': true,
        'consultationModes.video.fee': doctor.consultationModes?.video?.fee || 100,
        'consultationModes.video.duration': 30,
        'consultationModes.inPerson.available': true,
        'consultationModes.inPerson.fee': doctor.consultationModes?.inPerson?.fee || 150,
        'consultationModes.inPerson.duration': 60,
        'consultationModes.phone.available': true,
        'consultationModes.phone.fee': doctor.consultationModes?.phone?.fee || 75,
        'consultationModes.phone.duration': 30,
        'consultationModes.chat.available': true,
        'consultationModes.chat.fee': doctor.consultationModes?.chat?.fee || 45,
        'consultationModes.chat.duration': 30,
        'consultationModes.email.available': true,
        'consultationModes.email.fee': doctor.consultationModes?.email?.fee || 50,
        'consultationModes.email.responseTime': 24,
        // Fix working hours
        'workingHours.monday': {
          available: true,
          slots: [{ start: '09:00', end: '17:00' }],
          breaks: []
        },
        'workingHours.tuesday': {
          available: true,
          slots: [
            { start: '09:00', end: '12:00' },
            { start: '14:00', end: '17:00' }
          ],
          breaks: []
        },
        'workingHours.wednesday': {
          available: true,
          slots: [
            { start: '09:00', end: '12:00' },
            { start: '14:00', end: '17:00' }
          ],
          breaks: []
        },
        'workingHours.thursday': {
          available: true,
          slots: [
            { start: '09:00', end: '12:00' },
            { start: '14:00', end: '17:00' }
          ],
          breaks: []
        },
        'workingHours.friday': {
          available: true,
          slots: [
            { start: '09:00', end: '12:00' },
            { start: '14:00', end: '17:00' }
          ],
          breaks: []
        },
        'workingHours.saturday': {
          available: true,
          slots: [{ start: '10:00', end: '13:00' }],
          breaks: []
        },
        'workingHours.sunday': {
          available: false,
          slots: [],
          breaks: []
        }
      },
      { new: true }
    );
    
    console.log('✅ Doctor updated successfully!');
    console.log('📋 New doctor status:');
    console.log('- isAvailable:', updateResult.isAvailable);
    console.log('- status:', updateResult.status);
    console.log('- isAcceptingAppointments:', updateResult.isAcceptingAppointments);
    console.log('- consultationModes:', updateResult.consultationModes);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating doctor:', error);
    process.exit(1);
  }
};

updateDoctorAvailability();
