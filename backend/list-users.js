import mongoose from 'mongoose';
import User from './src/models/User.js';
import Doctor from './src/models/Doctor.js';
import { connectDatabase } from './src/config/database.js';

const listUsers = async () => {
  try {
    console.log('🔄 Checking database users...');
    
    // Connect to database
    await connectDatabase();
    
    // Find all users
    const users = await User.find().select('name email role createdAt');
    console.log(`👥 Found ${users.length} users:`);
    
    for (const user of users) {
      console.log(`  - ${user.name || 'No name'} (${user.email}) - Role: ${user.role}`);
    }
    
    // Find all doctors
    const doctors = await Doctor.find().populate('user', 'name email');
    console.log(`👨‍⚕️ Found ${doctors.length} doctors:`);
    
    for (const doctor of doctors) {
      console.log(`  - ${doctor.user?.name || 'No name'} (${doctor.user?.email || 'No email'})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Database connection closed');
  }
};

listUsers();
