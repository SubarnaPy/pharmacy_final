/**
 * Test the pharmacy response fix
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PrescriptionRequestService from './src/services/PrescriptionRequestService.js';

dotenv.config();

async function testPharmacyResponseFix() {
  try {
    console.log('🧪 === TESTING PHARMACY RESPONSE FIX ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const service = new PrescriptionRequestService();
    
    // Test with the specific IDs from the error
    const requestId = '688d1774de907604f0ee27bd';
    const pharmacyId = '688ce86e06e7ab24eb3de126';
    
    const responseData = {
      estimatedFulfillmentTime: 60, // 1 hour
      quotedPrice: {
        total: 45.99
      },
      pharmacistNotes: 'Test response - medication available',
      detailedBill: {
        medications: [{
          name: 'Test Medication',
          pricing: {
            unitPrice: 1.50,
            totalPrice: 45.99,
            insuranceCoverage: 0,
            patientPay: 45.99
          }
        }],
        summary: {
          subtotal: 45.99,
          tax: { amount: 0, rate: 0 },
          finalTotal: 45.99,
          patientOwes: 45.99
        }
      },
      pharmacyMessage: {
        title: 'Test Message',
        content: 'This is a test message from the pharmacy.',
        priority: 'normal',
        messageType: 'info'
      }
    };

    console.log('📤 Testing pharmacy response...');
    
    const result = await service.handlePharmacyResponse(
      requestId,
      pharmacyId,
      'accept',
      responseData
    );

    console.log('✅ Pharmacy response successful!');
    console.log('📋 Updated request status:', result.status);
    console.log('💬 Total responses:', result.pharmacyResponses.length);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testPharmacyResponseFix();