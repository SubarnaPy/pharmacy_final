/**
 * Test script specifically for order creation from prescription
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Pharmacy from './src/models/Pharmacy.js';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import {Order} from './src/models/Order.js';

// Load environment variables
dotenv.config();

async function testOrderCreation() {
    console.log('🚀 === TESTING ORDER CREATION ===');
    
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find existing user
        const patient = await User.findOne({ email: 'mondalsubarna29@gmail.com' });
        if (!patient) {
            throw new Error('Patient not found');
        }
        console.log('✅ Found patient:', patient.email);

        // Find existing pharmacy
        const pharmacy = await Pharmacy.findOne();
        if (!pharmacy) {
            throw new Error('No pharmacy found');
        }
        console.log('✅ Found pharmacy:', pharmacy.name);

        // Create a simple prescription request with fixed data structure
        const prescriptionRequest = new PrescriptionRequest({
            patient: patient._id,
            medications: [
                {
                    name: 'Metformin 500mg',
                    quantity: 30, // Simple number
                    dosage: '1 tablet twice daily'
                }
            ],
            status: 'pending',
            preferences: {
                deliveryMethod: 'pickup',
                deliveryAddress: 'Test Address'
            },
            pharmacyResponses: [
                {
                    pharmacyId: pharmacy._id,
                    status: 'accepted',
                    quotedPrice: 25.99,
                    estimatedFulfillmentTime: 120,
                    notes: 'Ready for pickup'
                }
            ]
        });

        await prescriptionRequest.save();
        console.log('✅ Created prescription request:', prescriptionRequest._id);

        // Test order creation data
        const orderData = {
            prescriptionRequestId: prescriptionRequest._id.toString(),
            selectedPharmacyId: pharmacy._id.toString(),
            pharmacyResponseId: prescriptionRequest.pharmacyResponses[0]._id.toString(),
            quotedPrice: { total: 25.99, breakdown: [] },
            estimatedFulfillmentTime: 120,
            notes: 'Test order'
        };

        // Mock request and response objects
        const req = {
            body: orderData,
            user: { 
                id: patient._id.toString(), 
                role: 'patient' 
            }
        };

        const res = {
            status: (code) => ({
                json: (data) => {
                    console.log(`Response ${code}:`, JSON.stringify(data, null, 2));
                    return data;
                }
            })
        };

        // Import and test the controller
        const { default: OrderController } = await import('./src/controllers/OrderController.js');
        const controller = new OrderController();
        
        console.log('🧪 Testing order creation...');
        await controller.createFromPrescription(req, res);

        console.log('✅ Order creation test completed');

    } catch (error) {
        console.error('❌ Error testing order creation:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

testOrderCreation();
