import mongoose from 'mongoose';

async function createOrderConversationWithKnownUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/pharmaConnect');
    console.log('🔍 Connected to MongoDB. Creating order conversation...');
    
    // Use the user IDs we know from the backend logs
    const patientUserId = new mongoose.Types.ObjectId('688b92ead99cdb72d8b85adb');
    const pharmacyUserId = new mongoose.Types.ObjectId('688ce86d06e7ab24eb3de122');
    
    // Let's first verify these users exist
    const patientUser = await mongoose.connection.db.collection('users').findOne({
      _id: patientUserId
    });
    
    const pharmacyUser = await mongoose.connection.db.collection('users').findOne({
      _id: pharmacyUserId
    });
    
    console.log('Patient user:', patientUser ? `${patientUser.name || 'No name'} (${patientUser.email || 'No email'})` : 'Not found');
    console.log('Pharmacy user:', pharmacyUser ? `${pharmacyUser.name || 'No name'} (${pharmacyUser.email || 'No email'})` : 'Not found');
    
    if (!patientUser || !pharmacyUser) {
      console.log('❌ Required users not found');
      
      // Let's see what collections and data we actually have
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('\nAvailable collections:');
      collections.forEach(col => console.log(`- ${col.name}`));
      
      const allUsers = await mongoose.connection.db.collection('users').find({}).toArray();
      console.log(`\nAll users (${allUsers.length}):`);
      allUsers.forEach(user => {
        console.log(`- ID: ${user._id}, Email: ${user.email || 'No email'}, Role: ${user.role || 'No role'}`);
      });
      
      return;
    }
    
    // Find a pharmacy owned by the pharmacy user
    const pharmacy = await mongoose.connection.db.collection('pharmacies').findOne({
      owner: pharmacyUserId
    });
    
    if (!pharmacy) {
      console.log('❌ No pharmacy found for pharmacy user');
      
      // Show available pharmacies
      const allPharmacies = await mongoose.connection.db.collection('pharmacies').find({}).toArray();
      console.log(`\nAll pharmacies (${allPharmacies.length}):`);
      allPharmacies.forEach(p => {
        console.log(`- Name: ${p.name}, Owner: ${p.owner}, ID: ${p._id}`);
      });
      
      return;
    }
    
    console.log(`✅ Found pharmacy: ${pharmacy.name} (${pharmacy._id})`);
    
    // Create a test order
    const orderNumber = `ORD-${Date.now()}`;
    const testOrder = {
      orderNumber: orderNumber,
      patientId: patientUserId,
      pharmacyId: pharmacy._id,
      status: 'confirmed',
      items: [{
        name: 'Test Medicine for Chat Testing',
        quantity: 1,
        price: 25.00
      }],
      totalAmount: 25.00,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const orderResult = await mongoose.connection.db.collection('orders').insertOne(testOrder);
    console.log(`✅ Created test order: ${orderNumber} (${orderResult.insertedId})`);
    
    // Create the order conversation with proper participant structure
    const room = {
      name: `Order ${orderNumber}`,
      type: 'order',
      createdBy: patientUserId,
      participants: [
        {
          userId: patientUserId,
          role: 'member',
          joinedAt: new Date(),
          permissions: {
            canSendMessages: true,
            canShareFiles: true,
            canInitiateCalls: true,
            canInviteUsers: false,
            canManageRoom: false
          }
        },
        {
          userId: pharmacyUserId,
          role: 'member', 
          joinedAt: new Date(),
          permissions: {
            canSendMessages: true,
            canShareFiles: true,
            canInitiateCalls: true,
            canInviteUsers: false,
            canManageRoom: false
          }
        }
      ],
      description: `Chat for order ${orderNumber}`,
      settings: {
        isPrivate: true,
        requireApproval: false,
        allowFileSharing: true,
        allowCalls: false,
        messageRetentionDays: 90,
        maxParticipants: 100
      },
      metadata: {
        orderId: orderResult.insertedId,
        orderNumber: orderNumber,
        pharmacyId: pharmacy._id
      },
      isActive: true,
      participantCount: 2,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const roomResult = await mongoose.connection.db.collection('chatrooms').insertOne(room);
    console.log(`✅ Created order conversation: ${roomResult.insertedId}`);
    
    // Create a welcome message
    const welcomeMessage = {
      roomId: roomResult.insertedId,
      senderId: patientUserId,
      content: `Order ${orderNumber} confirmed! You can track your order and ask any questions here.`,
      type: 'system',
      metadata: {
        systemAction: 'order_conversation_started',
        orderData: {
          orderId: orderResult.insertedId,
          orderNumber: orderNumber
        }
      },
      timestamp: new Date(),
      status: 'sent',
      isEdited: false,
      readBy: [],
      reactions: [],
      isEncrypted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const messageResult = await mongoose.connection.db.collection('messages').insertOne(welcomeMessage);
    console.log(`✅ Created welcome message: ${messageResult.insertedId}`);
    
    console.log('\n🎉 Test order conversation created successfully!');
    console.log(`📦 Order ID: ${orderResult.insertedId}`);
    console.log(`📦 Order Number: ${orderNumber}`);
    console.log(`💬 Conversation ID: ${roomResult.insertedId}`);
    console.log(`👤 Patient ID: ${patientUserId}`);
    console.log(`🏪 Pharmacy User ID: ${pharmacyUserId}`);
    console.log(`🏥 Pharmacy ID: ${pharmacy._id}`);
    
    console.log('\n📝 Now you can:');
    console.log('1. Refresh the OrderManagement page as the patient');
    console.log('2. Look for the new order and click "Chat with Pharmacy"');
    console.log('3. Test sending messages between patient and pharmacy');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

createOrderConversationWithKnownUsers();
