import mongoose from 'mongoose';
import User from './src/models/User.js';

mongoose.connect('mongodb://localhost:27017/pharmacy_marketplace');

try {
  const users = await User.find({}).select('email role');
  console.log('Users in database:');
  users.forEach(user => console.log(`- ${user.email} (${user.role})`));
} catch (error) {
  console.error('Error:', error.message);
} finally {
  mongoose.connection.close();
}