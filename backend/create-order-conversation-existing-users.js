import mongoose from 'mongoose';

async function createOrderConversationForExistingUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/pharmaConnect');
    console.log('🔍 Connected to MongoDB. Creating order conversation...');
    
    // Find the specific users we know exist from the UI
    const patientUser = await mongoose.connection.db.collection('users').findOne({
      email: 'mondalsubarna29@gmail.com'
    });
    
    const pharmacyUser = await mongoose.connection.db.collection('users').findOne({
      email: 'lsubarna29@gmail.com'
    });
    
    console.log('Patient user:', patientUser ? `${patientUser.name} (${patientUser._id})` : 'Not found');
    console.log('Pharmacy user:', pharmacyUser ? `${pharmacyUser.name} (${pharmacyUser._id})` : 'Not found');
    
    if (!patientUser || !pharmacyUser) {
      console.log('❌ Required users not found');
      return;
    }
    
    // Find the pharmacy document for the pharmacy user
    const pharmacy = await mongoose.connection.db.collection('pharmacies').findOne({
      owner: pharmacyUser._id
    });
    
    console.log('Pharmacy:', pharmacy ? `${pharmacy.name} (${pharmacy._id})` : 'Not found');
    
    if (!pharmacy) {
      console.log('❌ Pharmacy not found for pharmacy user');
      return;
    }
    
    // Create a test order
    const orderNumber = `ORD-${Date.now()}`;
    const testOrder = {
      orderNumber: orderNumber,
      patientId: patientUser._id,
      pharmacyId: pharmacy._id,
      status: 'confirmed',
      items: [{
        name: 'Test Medicine for Chat',
        quantity: 1,
        price: 15.00
      }],
      totalAmount: 15.00,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const orderResult = await mongoose.connection.db.collection('orders').insertOne(testOrder);
    console.log(`✅ Created test order: ${orderNumber} (${orderResult.insertedId})`);
    
    // Create the order conversation with proper participant structure
    const room = {
      name: `Order ${orderNumber}`,
      type: 'order',
      createdBy: patientUser._id,
      participants: [
        {
          userId: patientUser._id,
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
          userId: pharmacyUser._id,
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
      senderId: patientUser._id,
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
    console.log(`💬 Conversation ID: ${roomResult.insertedId}`);
    console.log(`👤 Patient: ${patientUser.name} (${patientUser._id})`);
    console.log(`🏪 Pharmacy User: ${pharmacyUser.name} (${pharmacyUser._id})`);
    console.log(`🏥 Pharmacy: ${pharmacy.name} (${pharmacy._id})`);
    
    console.log('\n📝 Now you can:');
    console.log('1. Go to the OrderManagement page as the patient');
    console.log('2. Click "Chat with Pharmacy" for this order');
    console.log('3. Test sending messages between patient and pharmacy');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

createOrderConversationForExistingUsers();
