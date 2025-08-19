import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkRecentNotifications() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const Notification = (await import('./src/models/Notification.js')).default;
    
    // Check for recent prescription-related notifications
    const recentNotifications = await Notification.find({
      type: { $in: ['prescription_request', 'pharmacy_prescription_request', 'prescription_created'] },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log('📋 Recent prescription notifications (last 24 hours):');
    console.log('Total found:', recentNotifications.length);
    
    if (recentNotifications.length === 0) {
      console.log('❌ No recent prescription notifications found');
      
      // Check any recent notifications
      const anyRecentNotifications = await Notification.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).sort({ createdAt: -1 }).limit(5);
      
      console.log(`\n📋 Any recent notifications (last 24 hours): ${anyRecentNotifications.length}`);
      anyRecentNotifications.forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.type}: ${notification.content.title}`);
      });
    } else {
      recentNotifications.forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.type}:`);
        console.log(`   Title: ${notification.content.title}`);
        console.log(`   Recipients: ${notification.recipients.length}`);
        console.log(`   Recipient ID: ${notification.recipients[0]?.userId}`);
        console.log(`   Recipient Role: ${notification.recipients[0]?.userRole}`);
        console.log(`   Created: ${notification.createdAt}`);
        console.log('');
      });
    }
    
    // Also check for pharmacy users
    const User = (await import('./src/models/User.js')).default;
    const pharmacyUsers = await User.find({ role: 'pharmacy' }).select('_id email name');
    console.log('\n🏥 Pharmacy users in system:');
    pharmacyUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user._id})`);
    });
    
    await mongoose.disconnect();
    console.log('✅ Check completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

checkRecentNotifications();
