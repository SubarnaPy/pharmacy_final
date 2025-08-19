import mongoose from 'mongoose';
import ChatRoomManager from './src/services/chat/ChatRoomManager.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pharmaConnect')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Known user IDs from the logs
const PATIENT_ID = '688b92ead99cdb72d8b85adb';
const PHARMACY_USER_ID = '688ce86d06e7ab24eb3de122'; // This is the pharmacy user ID from the logs

async function fixConversationParticipants() {
  try {
    console.log('🔧 Fixing conversation participants...');
    
    const chatRoomManager = new ChatRoomManager();
    
    // Find the order conversation by conversation ID directly
    const conversation = await chatRoomManager.ChatRoom.findById('68a3cd9c741eaf996110da81');
    
    if (!conversation) {
      console.log('❌ Conversation not found');
      return;
    }
    
    console.log('✅ Found conversation:', conversation._id);
    console.log('📋 Current participants:', conversation.participants.length);
    
    // Check if pharmacy user is already a participant
    const pharmacyParticipant = conversation.participants.find(p => 
      p.userId.toString() === PHARMACY_USER_ID
    );
    
    if (pharmacyParticipant) {
      console.log('✅ Pharmacy user is already a participant');
    } else {
      console.log('🔧 Adding pharmacy user as participant...');
      
      // Add the pharmacy user as a participant
      conversation.participants.push({
        userId: PHARMACY_USER_ID,
        role: 'member',
        joinedAt: new Date(),
        permissions: {
          canSendMessages: true,
          canShareFiles: true,
          canInitiateCalls: true,
          canInviteUsers: false,
          canManageRoom: false
        }
      });
      
      await conversation.save();
      console.log('✅ Added pharmacy user to conversation');
    }
    
    // Display final participants
    console.log('\n📋 Final participants:');
    conversation.participants.forEach((participant, index) => {
      console.log(`  ${index + 1}. User ID: ${participant.userId}, Role: ${participant.role}`);
    });
    
    console.log('\n✅ Conversation participants fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing conversation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

fixConversationParticipants();
