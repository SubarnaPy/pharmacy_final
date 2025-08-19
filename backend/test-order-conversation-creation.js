import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from './src/models/Order.js';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import Pharmacy from './src/models/Pharmacy.js';
import User from './src/models/User.js';
import ChatRoomManager from './src/services/chat/ChatRoomManager.js';

dotenv.config();

async function testOrderConversationCreation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find a patient user
        const patient = await User.findOne({ role: 'patient' });
        if (!patient) {
            console.log('❌ No patient found');
            return;
        }

        // Find a pharmacy
        const pharmacy = await Pharmacy.findOne().populate('owner');
        if (!pharmacy || !pharmacy.owner) {
            console.log('❌ No pharmacy with owner found');
            return;
        }

        console.log(`🔍 Testing with patient: ${patient.name} (${patient._id})`);
        console.log(`🔍 Testing with pharmacy: ${pharmacy.name} (${pharmacy._id})`);
        console.log(`🔍 Pharmacy owner: ${pharmacy.owner.name} (${pharmacy.owner._id})`);

        // Create ChatRoomManager instance to check conversations
        const chatRoomManager = new ChatRoomManager();

        // Count conversations before order creation
        const conversationsBefore = await chatRoomManager.getUserRooms(patient._id);
        console.log(`📊 Conversations before: ${conversationsBefore.length}`);

        // Create a simple test order
        const orderNumber = `TEST-ORD-${Date.now()}`;
        const newOrder = new Order({
            prescriptionId: new mongoose.Types.ObjectId(), // Mock prescription ID
            patientId: patient._id,
            pharmacyId: pharmacy._id,
            orderType: 'pickup',
            items: [{
                medicationName: 'Test Medication',
                dosage: '10mg',
                quantity: 30,
                unitPrice: 1.50,
                totalPrice: 45.00
            }],
            totalAmount: 45.00,
            status: 'placed',
            orderNumber,
            placedAt: new Date(),
            paymentInfo: { method: 'card' }
        });

        await newOrder.save();
        console.log(`✅ Test order created: ${orderNumber}`);

        // Import and use ConversationController to create conversation
        const ConversationController = (await import('./src/controllers/ConversationController.js')).default;
        const conversationController = new ConversationController();
        
        console.log('🔄 Creating conversation for order...');
        await conversationController.autoCreateOrderConversation(newOrder._id, pharmacy.owner._id);
        console.log('✅ Conversation creation attempted');

        // Count conversations after order creation
        const conversationsAfter = await chatRoomManager.getUserRooms(patient._id);
        console.log(`📊 Conversations after: ${conversationsAfter.length}`);

        if (conversationsAfter.length > conversationsBefore.length) {
            console.log('🎉 SUCCESS: Conversation was created!');
            
            // Find the new conversation
            const newConversation = conversationsAfter.find(conv => 
                conv.metadata && conv.metadata.orderId && 
                conv.metadata.orderId.toString() === newOrder._id.toString()
            );

            if (newConversation) {
                console.log(`📞 New conversation ID: ${newConversation._id}`);
                console.log(`📞 Conversation type: ${newConversation.type}`);
                console.log(`📞 Participants: ${newConversation.participants.map(p => p.userId)}`);
            }
        } else {
            console.log('❌ FAILED: No conversation was created');
        }

        // Clean up - remove test order
        await Order.findByIdAndDelete(newOrder._id);
        console.log('🧹 Test order cleaned up');

    } catch (error) {
        console.error('❌ Error testing order conversation creation:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📱 Disconnected from MongoDB');
    }
}

testOrderConversationCreation();
