import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

async function testAPIEndpoint() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const User = (await import('./src/models/User.js')).default;
    
    // Get pharmacy user
    const pharmacyUser = await User.findOne({ email: 'lsubarna29@gmail.com' });
    console.log('🏥 Found pharmacy user:', pharmacyUser.email);
    
    // Create a test JWT token for this user
    const token = jwt.sign(
      { userId: pharmacyUser._id, _id: pharmacyUser._id, role: pharmacyUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('🎫 Generated test token');
    
    // Import notification controller and test it directly
    const NotificationController = (await import('./src/controllers/NotificationController.js')).default;
    const notificationController = new NotificationController();
    
    // Create mock request and response objects
    const req = {
      user: pharmacyUser,
      query: {}
    };
    
    const res = {
      json: (data) => {
        console.log('📤 API Response:');
        console.log('Success:', data.success);
        if (data.data) {
          console.log('Notifications count:', data.data.notifications?.length || 0);
          console.log('Unread count:', data.data.summary?.unreadCount || 0);
          
          if (data.data.notifications?.length > 0) {
            console.log('\n📋 First few notifications:');
            data.data.notifications.slice(0, 3).forEach((notification, index) => {
              console.log(`${index + 1}. ${notification.type}: ${notification.title}`);
              console.log(`   Read: ${notification.isRead}`);
              console.log(`   Created: ${notification.createdAt}`);
            });
          }
        }
        return res;
      },
      status: (code) => {
        console.log('Status code:', code);
        return res;
      }
    };
    
    console.log('\n🧪 Testing getUserNotifications method...');
    await notificationController.getUserNotifications(req, res);
    
    await mongoose.disconnect();
    console.log('\n✅ API test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testAPIEndpoint();
