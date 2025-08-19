import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkPharmacyNotificationMatch() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const User = (await import('./src/models/User.js')).default;
    const Notification = (await import('./src/models/Notification.js')).default;
    
    // Get all pharmacy users
    const pharmacyUsers = await User.find({ role: 'pharmacy' }).select('_id email name profile.pharmacyName');
    console.log('🏥 All pharmacy users in system:');
    pharmacyUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user._id}) - ${user.profile?.pharmacyName || 'No pharmacy name'}`);
    });
    
    // Check notifications for each pharmacy user
    for (const pharmacyUser of pharmacyUsers) {
      console.log(`\n🔔 Checking notifications for ${pharmacyUser.email}:`);
      
      const notifications = await Notification.find({
        'recipients.userId': pharmacyUser._id,
        'recipients.userRole': 'pharmacy',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).sort({ createdAt: -1 });
      
      console.log(`   Total notifications: ${notifications.length}`);
      
      if (notifications.length > 0) {
        notifications.forEach((notification, index) => {
          console.log(`   ${index + 1}. ${notification.type}: ${notification.content.title}`);
          console.log(`      Read: ${notification.recipients[0]?.isRead || false}`);
          console.log(`      Created: ${notification.createdAt}`);
        });
      }
    }
    
    // Check for any unmatched notifications
    const unmatchedNotifications = await Notification.find({
      type: { $in: ['prescription_request', 'pharmacy_prescription_request'] },
      'recipients.userRole': 'pharmacy',
      'recipients.userId': { $nin: pharmacyUsers.map(u => u._id) }
    });
    
    if (unmatchedNotifications.length > 0) {
      console.log('\n⚠️ Found notifications for non-existent pharmacy users:');
      unmatchedNotifications.forEach((notification, index) => {
        console.log(`${index + 1}. Recipient ID: ${notification.recipients[0]?.userId} (${notification.type})`);
      });
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Check completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

checkPharmacyNotificationMatch();
