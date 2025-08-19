import mongoose from 'mongoose';

async function createTestOrderAndConversation() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/pharmaConnect');
    console.log('🔍 Connected to MongoDB. Creating test data...');
    
    // First check if we have users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users:`);
    
    let patientUser = null;
    let pharmacyUser = null;
    
    for (const user of users) {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
      if (user.role === 'patient') {
        patientUser = user;
      } else if (user.role === 'pharmacy') {
        pharmacyUser = user;
      }
    }
    
    if (!patientUser || !pharmacyUser) {
      console.log('❌ Need both patient and pharmacy users to create test order');
      return;
    }
    
    // Check if we have pharmacies
    const pharmacies = await mongoose.connection.db.collection('pharmacies').find({}).toArray();
    console.log(`Found ${pharmacies.length} pharmacies:`);
    
    let pharmacy = null;
    for (const p of pharmacies) {
      console.log(`- ${p.name} (Owner: ${p.owner})`);
      if (p.owner.toString() === pharmacyUser._id.toString()) {
        pharmacy = p;
        break;
      }
    }
    
    if (!pharmacy) {
      console.log('❌ No pharmacy found for pharmacy user');
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
        name: 'Test Medicine',
        quantity: 1,
        price: 10.00
      }],
      totalAmount: 10.00,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const orderResult = await mongoose.connection.db.collection('orders').insertOne(testOrder);
    console.log(`✅ Created test order: ${orderNumber} (${orderResult.insertedId})`);
    
    // Now create an order conversation manually using the same logic as the backend
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
        allowCalls: false,
        messageRetentionDays: 90
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
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const messageResult = await mongoose.connection.db.collection('messages').insertOne(welcomeMessage);
    console.log(`✅ Created welcome message: ${messageResult.insertedId}`);
    
    console.log('\n🎉 Test data created successfully!');
    console.log(`📦 Order ID: ${orderResult.insertedId}`);
    console.log(`💬 Conversation ID: ${roomResult.insertedId}`);
    console.log(`👥 Patient: ${patientUser.name} (${patientUser._id})`);
    console.log(`🏪 Pharmacy User: ${pharmacyUser.name} (${pharmacyUser._id})`);
    console.log(`🏥 Pharmacy: ${pharmacy.name} (${pharmacy._id})`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestOrderAndConversation();
