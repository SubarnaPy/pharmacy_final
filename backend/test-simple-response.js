/**
 * Simple test for pharmacy response
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PrescriptionRequestService from './src/services/PrescriptionRequestService.js';

dotenv.config();

async function testSimpleResponse() {
  try {
    console.log('🧪 Testing simple pharmacy response...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const service = new PrescriptionRequestService();
    
    // Test with a new request ID
    const requestId = '688e7dc20a96e842f1fb8d70';
    const pharmacyId = '688ce86e06e7ab24eb3de126';
    
    const responseData = {
      estimatedFulfillmentTime: 90,
      quotedPrice: { total: 15.99 },
      pharmacistNotes: 'Simple test response'
    };

    console.log('📤 Testing pharmacy response...');
    const result = await service.handlePharmacyResponse(
      requestId,
      pharmacyId,
      'accept',
      responseData
    );

    if (result) {
      console.log('✅ Response successful!');
      console.log('📋 Request status:', result.status);
      console.log('💬 Total responses:', result.pharmacyResponses?.length || 0);
    } else {
      console.log('❌ No result returned');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testSimpleResponse();