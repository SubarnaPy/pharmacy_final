import mongoose from 'mongoose';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pharmacy_marketplace');

async function fixPharmacyResponsePrices() {
  try {
    console.log('🔧 Fixing Pharmacy Response Prices...\n');

    // Find prescription requests with pharmacy responses that have zero or invalid prices
    const requests = await PrescriptionRequest.find({
      'pharmacyResponses.0': { $exists: true }
    });

    console.log(`📋 Found ${requests.length} prescription requests with pharmacy responses`);

    let updatedCount = 0;

    for (const request of requests) {
      let requestUpdated = false;

      for (let i = 0; i < request.pharmacyResponses.length; i++) {
        const response = request.pharmacyResponses[i];
        
        // Check if price needs fixing
        let needsUpdate = false;
        let newPrice = null;

        if (!response.quotedPrice) {
          needsUpdate = true;
          newPrice = { total: 25.99, subtotal: 23.99, tax: 2.00 };
        } else if (typeof response.quotedPrice === 'object' && response.quotedPrice.total === 0) {
          needsUpdate = true;
          newPrice = { total: 25.99, subtotal: 23.99, tax: 2.00 };
        } else if (typeof response.quotedPrice === 'number' && response.quotedPrice === 0) {
          needsUpdate = true;
          newPrice = { total: 25.99, subtotal: 23.99, tax: 2.00 };
        }

        if (needsUpdate) {
          console.log(`🔧 Updating price for response ${response._id}`);
          console.log(`   Old price:`, response.quotedPrice);
          console.log(`   New price:`, newPrice);
          
          request.pharmacyResponses[i].quotedPrice = newPrice;
          
          // Also ensure other required fields are set
          if (!request.pharmacyResponses[i].estimatedFulfillmentTime) {
            request.pharmacyResponses[i].estimatedFulfillmentTime = 120; // 2 hours
          }
          
          if (!request.pharmacyResponses[i].notes) {
            request.pharmacyResponses[i].notes = 'All medications available and ready for fulfillment.';
          }
          
          requestUpdated = true;
        }
      }

      if (requestUpdated) {
        await request.save();
        updatedCount++;
        console.log(`✅ Updated request ${request.requestNumber || request._id}`);
      }
    }

    console.log(`\n✅ Fixed prices for ${updatedCount} prescription requests`);

    // Show updated responses
    console.log('\n📋 Updated Pharmacy Responses:');
    const updatedRequests = await PrescriptionRequest.find({
      'pharmacyResponses.0': { $exists: true }
    }).populate('pharmacyResponses.pharmacyId', 'name');

    for (const request of updatedRequests) {
      console.log(`\n📋 Request: ${request.requestNumber || request._id}`);
      request.pharmacyResponses.forEach((response, index) => {
        console.log(`   Response ${index + 1}:`);
        console.log(`     Pharmacy: ${response.pharmacyId?.name || 'Unknown'}`);
        console.log(`     Status: ${response.status}`);
        console.log(`     Quoted Price:`, response.quotedPrice);
        console.log(`     Estimated Time: ${response.estimatedFulfillmentTime} minutes`);
      });
    }

    console.log('\n✅ Price fixing completed!');

  } catch (error) {
    console.error('❌ Failed to fix prices:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixPharmacyResponsePrices();