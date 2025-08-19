import mongoose from 'mongoose';
import Doctor from './src/models/Doctor.js';
import dotenv from 'dotenv';

dotenv.config();

const testDoctorSlots = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthsync');
    console.log('Connected to database');

    // Find all doctors
    const doctors = await Doctor.find({});
    console.log(`Found ${doctors.length} doctors`);

    if (doctors.length === 0) {
      console.log('No doctors found in database. Creating a test doctor...');
      
      // Create a test doctor with working hours
      const testDoctor = new Doctor({
        name: 'Dr. Test Doctor',
        specialty: 'General Medicine',
        experience: '5 years',
        location: 'Test City',
        consultationFee: 50,
        rating: 4.5,
        available: true,
        isAvailable: true,
        isAcceptingAppointments: true,
        workingHours: {
          monday: {
            available: true,
            slots: [
              { start: '09:00', end: '09:30' },
              { start: '09:30', end: '10:00' },
              { start: '10:00', end: '10:30' },
              { start: '10:30', end: '11:00' },
              { start: '14:00', end: '14:30' },
              { start: '14:30', end: '15:00' },
              { start: '15:00', end: '15:30' }
            ]
          },
          tuesday: {
            available: true,
            slots: [
              { start: '09:00', end: '09:30' },
              { start: '09:30', end: '10:00' },
              { start: '10:00', end: '10:30' },
              { start: '10:30', end: '11:00' }
            ]
          },
          wednesday: {
            available: true,
            slots: [
              { start: '09:00', end: '09:30' },
              { start: '09:30', end: '10:00' },
              { start: '10:00', end: '10:30' }
            ]
          },
          thursday: {
            available: true,
            slots: [
              { start: '09:00', end: '09:30' },
              { start: '09:30', end: '10:00' }
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
            available: false,
            slots: []
          },
          sunday: {
            available: false,
            slots: []
          }
        }
      });

      await testDoctor.save();
      console.log('Test doctor created successfully');
    } else {
      // Check existing doctors' working hours
      for (const doctor of doctors) {
        console.log(`\nDoctor: ${doctor.name || 'Unnamed'}`);
        console.log(`ID: ${doctor._id}`);
        console.log(`Available: ${doctor.isAvailable}`);
        console.log(`Accepting Appointments: ${doctor.isAcceptingAppointments}`);
        
        if (doctor.workingHours) {
          const daysWithSlots = Object.keys(doctor.workingHours).filter(day => 
            doctor.workingHours[day]?.available && 
            doctor.workingHours[day]?.slots?.length > 0
          );
          console.log(`Working days: ${daysWithSlots.join(', ')}`);
          
          // Show Monday slots as example
          if (doctor.workingHours.monday?.available && doctor.workingHours.monday.slots?.length > 0) {
            console.log(`Monday slots: ${doctor.workingHours.monday.slots.map(s => `${s.start}-${s.end}`).join(', ')}`);
          }
        } else {
          console.log('No working hours defined');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

testDoctorSlots();
