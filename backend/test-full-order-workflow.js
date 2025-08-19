import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from './src/models/Order.js';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import Pharmacy from './src/models/Pharmacy.js';
import User from './src/models/User.js';
import ChatRoomManager from './src/services/chat/ChatRoomManager.js';

dotenv.config();

async function testFullOrderWorkflow() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find a patient user and pharmacy
        const patient = await User.findOne({ role: 'patient' });
        const pharmacy = await Pharmacy.findOne().populate('owner');

        if (!patient || !pharmacy || !pharmacy.owner) {
            console.log('❌ Missing required users');
            return;
        }

        console.log(`🔍 Patient: ${patient.name} (${patient._id})`);
        console.log(`🔍 Pharmacy: ${pharmacy.name} (${pharmacy._id})`);
        console.log(`🔍 Pharmacy Owner: ${pharmacy.owner.name} (${pharmacy.owner._id})`);

        // Create a prescription request first
        const prescriptionRequest = new PrescriptionRequest({
            patient: patient._id,
            medications: [{
                name: 'Test Medication',
                dosage: '10mg',
                quantity: { prescribed: 30, unit: 'tablets' },
                frequency: 'Once daily',
                duration: '30 days'
            }],
            preferences: {
                deliveryMethod: 'pickup'
            },
            status: 'pending'
        });

        await prescriptionRequest.save();
        console.log(`✅ Prescription request created: ${prescriptionRequest._id}`);

        // Add a pharmacy response to the prescription request
        prescriptionRequest.pharmacyResponses.push({
            pharmacyId: pharmacy._id,
            status: 'accepted',
            quotedPrice: {
                subtotal: 45.00,
                deliveryFee: 0,
                total: 45.00
            },
            estimatedFulfillmentTime: 30,
            notes: 'Medication available for pickup'
        });

        await prescriptionRequest.save();
        console.log(`✅ Pharmacy response added`);

        // Count conversations before order creation
        const chatRoomManager = new ChatRoomManager();
        const conversationsBefore = await chatRoomManager.getUserRooms(patient._id);
        console.log(`📊 Conversations before: ${conversationsBefore.length}`);

        // Create the order through the API endpoint simulation
        const OrderController = (await import('./src/controllers/OrderController.js')).default;
        const orderController = new OrderController();

        // Mock request and response objects
        const mockReq = {
            body: {
                prescriptionRequestId: prescriptionRequest._id,
                selectedPharmacyId: pharmacy._id,
                pharmacyResponseId: prescriptionRequest.pharmacyResponses[0]._id,
                quotedPrice: { total: 45.00 },
                estimatedFulfillmentTime: 30,
                notes: 'Test order creation'
            },
            user: { id: patient._id }
        };

        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    console.log(`📝 Response (${code}):`, data.message);
                    return data;
                }
            })
        };

        console.log('🔄 Creating order through OrderController...');
        await orderController.createFromPrescription(mockReq, mockRes);

        // Wait a bit for async operations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Count conversations after order creation
        const conversationsAfter = await chatRoomManager.getUserRooms(patient._id);
        console.log(`📊 Conversations after: ${conversationsAfter.length}`);

        if (conversationsAfter.length > conversationsBefore.length) {
            console.log('🎉 SUCCESS: Conversation was automatically created!');
            
            // Find the new conversation
            const newConversation = conversationsAfter.find(conv => 
                conv.metadata && conv.metadata.orderId && 
                !conversationsBefore.some(beforeConv => 
                    beforeConv._id.toString() === conv._id.toString()
                )
            );

            if (newConversation) {
                console.log(`📞 New conversation ID: ${newConversation._id}`);
                console.log(`📞 Conversation type: ${newConversation.type}`);
                console.log(`📞 Order ID: ${newConversation.metadata.orderId}`);
                console.log(`📞 Participants: ${newConversation.participants.map(p => p.userId)}`);
            }
        } else {
            console.log('❌ FAILED: No conversation was created automatically');
        }

        // Clean up - remove test data
        await PrescriptionRequest.findByIdAndDelete(prescriptionRequest._id);
        console.log('🧹 Prescription request cleaned up');

    } catch (error) {
        console.error('❌ Error testing full order workflow:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📱 Disconnected from MongoDB');
    }
}

testFullOrderWorkflow();
