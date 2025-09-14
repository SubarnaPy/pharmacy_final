// Script to check users in the database
import mongoose from 'mongoose';
import User from './backend/src/models/User.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({}, '_id email name role').limit(10);
    console.log('\n📋 Users in database:');
    users.forEach(user => {
      console.log(`- ID: ${user._id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}`);
    });

    // Check specifically for the user that's trying to authenticate
    const specificUser = await User.findOne({ email: 'mondalsubarna29@gmail.com' });
    if (specificUser) {
      console.log('\n✅ Found user mondalsubarna29@gmail.com:');
      console.log(`- ID: ${specificUser._id}`);
      console.log(`- Email: ${specificUser.email}`);
      console.log(`- Name: ${specificUser.name}`);
      console.log(`- Role: ${specificUser.role}`);
      console.log(`- Health History Count: ${specificUser.healthHistory?.length || 0}`);
    } else {
      console.log('\n❌ User mondalsubarna29@gmail.com not found in database');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkUsers();
