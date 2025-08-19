import mongoose from 'mongoose';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pharmacy_marketplace');

async function debugPharmacyResponses() {
  try {
    console.log('🔍 Debugging Pharmacy Responses...\n');

    // Find prescription requests with pharmacy responses
    const requests = await PrescriptionRequest.find({
      'pharmacyResponses.0': { $exists: true }
    }).populate('pharmacyResponses.pharmacyId', 'name');

    console.log(`📋 Found ${requests.length} prescription requests with pharmacy responses`);

    for (const request of requests) {
      console.log(`\n📋 Request: ${request.requestNumber || request._id}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   Pharmacy Responses: ${request.pharmacyResponses.length}`);

      request.pharmacyResponses.forEach((response, index) => {
        console.log(`\n   Response ${index + 1}:`);
        console.log(`     Pharmacy: ${response.pharmacyId?.name || 'Unknown'} (${response.pharmacyId?._id || response.pharmacyId})`);
        console.log(`     Status: ${response.status}`);
        console.log(`     Quoted Price:`, response.quotedPrice);
        console.log(`     Price Type:`, typeof response.quotedPrice);
        
        if (typeof response.quotedPrice === 'object' && response.quotedPrice !== null) {
          console.log(`     Price Object Keys:`, Object.keys(response.quotedPrice));
          console.log(`     Price Total:`, response.quotedPrice.total);
          console.log(`     Price Total Type:`, typeof response.quotedPrice.total);
        }
        
        console.log(`     Estimated Fulfillment Time: ${response.estimatedFulfillmentTime} minutes`);
        console.log(`     Notes: ${response.notes || 'None'}`);
        console.log(`     Response ID: ${response._id}`);
        console.log(`     Responded At: ${response.respondedAt || 'Not set'}`);
      });
    }

    // Also check if there are any requests without responses
    const requestsWithoutResponses = await PrescriptionRequest.find({
      pharmacyResponses: { $size: 0 }
    });

    console.log(`\n📋 Found ${requestsWithoutResponses.length} prescription requests WITHOUT pharmacy responses`);

    if (requestsWithoutResponses.length > 0) {
      console.log('\n📋 Requests without responses:');
      requestsWithoutResponses.forEach((request, index) => {
        console.log(`   ${index + 1}. ${request.requestNumber || request._id} - Status: ${request.status}`);
        console.log(`      Target Pharmacies: ${request.targetPharmacies?.length || 0}`);
        if (request.targetPharmacies && request.targetPharmacies.length > 0) {
          request.targetPharmacies.forEach((target, idx) => {
            console.log(`        ${idx + 1}. Pharmacy ID: ${target.pharmacyId} (Priority: ${target.priority})`);
          });
        }
      });
    }

    console.log('\n✅ Debug completed!');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

// Run the debug
debugPharmacyResponses();