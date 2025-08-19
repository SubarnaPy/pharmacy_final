import mongoose from 'mongoose';

async function checkOrderConversations() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/pharmaConnect');
    console.log('🔍 Connected to MongoDB. Checking order conversations...');
    
    // Get all order type conversations
    const conversations = await mongoose.connection.db.collection('chatrooms').find({
      type: 'order'
    }).toArray();
    
    console.log(`📋 Found ${conversations.length} order conversations:`);
    
    for (const conv of conversations) {
      console.log(`\n💬 Conversation: ${conv.name}`);
      console.log(`   ID: ${conv._id}`);
      console.log(`   Type: ${conv.type}`);
      console.log(`   Order ID: ${conv.metadata?.orderId}`);
      console.log(`   Order Number: ${conv.metadata?.orderNumber}`);
      console.log(`   Participants: ${conv.participants?.length || 0}`);
      
      if (conv.participants && conv.participants.length > 0) {
        console.log('   👥 Participants details:');
        conv.participants.forEach((p, index) => {
          console.log(`      ${index + 1}. User ID: ${p.userId || p}`);
          console.log(`         Role: ${p.role || 'unknown'}`);
          console.log(`         Joined: ${p.joinedAt || 'unknown'}`);
        });
      }
      
      // Get messages for this conversation
      const messages = await mongoose.connection.db.collection('messages').find({
        roomId: conv._id
      }).toArray();
      
      console.log(`   📝 Messages: ${messages.length}`);
      if (messages.length > 0) {
        messages.forEach((msg, index) => {
          console.log(`      ${index + 1}. From: ${msg.senderId}, Type: ${msg.type}, Content: ${msg.content?.substring(0, 50)}...`);
        });
      }
    }
    
    // Also check orders to see which ones exist
    console.log('\n📦 Checking orders...');
    const orders = await mongoose.connection.db.collection('orders').find({}).toArray();
    console.log(`Found ${orders.length} orders:`);
    
    orders.forEach((order, index) => {
      console.log(`${index + 1}. Order ${order.orderNumber} (${order._id})`);
      console.log(`   Patient: ${order.patientId}`);
      console.log(`   Pharmacy: ${order.pharmacyId}`);
      console.log(`   Status: ${order.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkOrderConversations();
