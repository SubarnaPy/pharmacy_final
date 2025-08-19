import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChatRoomManager from './src/services/chat/ChatRoomManager.js';
import MessageService from './src/services/chat/MessageService.js';

dotenv.config();

async function cleanupDuplicateRooms() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medlink');
    console.log('✅ Connected to MongoDB');

    const chatRoomManager = new ChatRoomManager();
    const messageService = new MessageService();

    // Find duplicate order rooms for the specific order
    const orderNumber = 'ORD-1755560736237';
    
    const duplicateRooms = await chatRoomManager.ChatRoom.find({
      type: 'order',
      isActive: true,
      'metadata.orderNumber': orderNumber
    }).sort({ createdAt: 1 }); // Oldest first

    console.log(`Found ${duplicateRooms.length} rooms for order ${orderNumber}`);
    
    if (duplicateRooms.length <= 1) {
      console.log('No duplicates to clean up');
      return;
    }

    // Keep the oldest room (first one) and consolidate others into it
    const mainRoom = duplicateRooms[0];
    const roomsToConsolidate = duplicateRooms.slice(1);

    console.log(`Main room: ${mainRoom._id}`);
    console.log(`Rooms to consolidate: ${roomsToConsolidate.map(r => r._id).join(', ')}`);

    // Move messages from duplicate rooms to the main room
    for (const dupRoom of roomsToConsolidate) {
      console.log(`Processing room ${dupRoom._id}...`);
      
      const messages = await messageService.getRoomMessages(dupRoom._id);
      console.log(`Found ${messages.length} messages to move`);
      
      for (const message of messages) {
        // Update the message's roomId to point to the main room
        await messageService.Message.findByIdAndUpdate(message._id, {
          roomId: mainRoom._id
        });
        console.log(`Moved message ${message._id} to main room`);
      }
      
      // Deactivate the duplicate room
      await chatRoomManager.ChatRoom.findByIdAndUpdate(dupRoom._id, {
        isActive: false
      });
      console.log(`Deactivated duplicate room ${dupRoom._id}`);
    }

    console.log('✅ Successfully consolidated duplicate rooms');
    console.log(`Main room ${mainRoom._id} now contains all messages`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the cleanup
cleanupDuplicateRooms();
