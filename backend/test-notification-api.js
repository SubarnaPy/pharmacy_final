import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testNotificationAPI() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const User = (await import('./src/models/User.js')).default;
    const Notification = (await import('./src/models/Notification.js')).default;
    
    // Get the pharmacy user who should have notifications
    const pharmacyUser = await User.findOne({ email: 'lsubarna29@gmail.com' });
    if (!pharmacyUser) {
      console.log('❌ Pharmacy user not found');
      return;
    }
    
    console.log('🏥 Found pharmacy user:', pharmacyUser.email, '- ID:', pharmacyUser._id);
    
    // Test the same query that the API uses
    const query = {
      $or: [
        { userId: pharmacyUser._id },
        { 'recipients.userId': pharmacyUser._id }
      ]
    };
    
    console.log('\n🔍 Testing API query structure...');
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    console.log('📋 Query results:');
    console.log(`Total notifications found: ${notifications.length}`);
    
    if (notifications.length > 0) {
      notifications.forEach((notification, index) => {
        console.log(`\n${index + 1}. ${notification.type}:`);
        console.log(`   Title: ${notification.content?.title}`);
        console.log(`   Created: ${notification.createdAt}`);
        console.log(`   Recipients array:`, notification.recipients?.map(r => ({
          userId: r.userId,
          userRole: r.userRole,
          readAt: r.readAt
        })));
        
        // Check if this notification should show up for the user
        const userRecipient = notification.recipients?.find(r => 
          r.userId.toString() === pharmacyUser._id.toString()
        );
        console.log(`   User recipient found:`, !!userRecipient);
        if (userRecipient) {
          console.log(`   Read status:`, !!userRecipient.readAt);
        }
      });
    }
    
    // Check unread count
    const unreadCount = await Notification.countDocuments({
      'recipients.userId': pharmacyUser._id,
      'recipients.readAt': { $exists: false }
    });
    
    console.log(`\n📊 Unread count: ${unreadCount}`);
    
    // Check user ID type consistency
    console.log('\n🔍 Checking ID type consistency:');
    console.log('User ID type:', typeof pharmacyUser._id);
    console.log('User ID value:', pharmacyUser._id.toString());
    
    const sampleNotification = await Notification.findOne({
      'recipients.userId': pharmacyUser._id
    });
    
    if (sampleNotification) {
      console.log('Sample notification recipient userId type:', typeof sampleNotification.recipients[0].userId);
      console.log('Sample notification recipient userId value:', sampleNotification.recipients[0].userId.toString());
      console.log('IDs match:', pharmacyUser._id.toString() === sampleNotification.recipients[0].userId.toString());
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testNotificationAPI();
