import mongoose from 'mongoose';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import Pharmacy from './src/models/Pharmacy.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pharmacy_marketplace');

async function addTestPharmacyResponse() {
  try {
    console.log('🧪 Adding Test Pharmacy Response...\n');

    // Find a prescription request that needs a response
    const request = await PrescriptionRequest.findOne({
      status: { $in: ['draft', 'submitted', 'pending'] },
      isActive: true
    });

    if (!request) {
      console.log('❌ No active prescription requests found');
      return;
    }

    console.log(`📋 Found request: ${request.requestNumber || request._id}`);
    console.log(`   Status: ${request.status}`);
    console.log(`   Current responses: ${request.pharmacyResponses.length}`);

    // Find a pharmacy to respond
    const pharmacy = await Pharmacy.findOne({ isActive: { $ne: false } });
    
    if (!pharmacy) {
      console.log('❌ No active pharmacies found');
      return;
    }

    console.log(`🏥 Using pharmacy: ${pharmacy.name} (${pharmacy._id})`);

    // Check if this pharmacy already responded
    const existingResponse = request.pharmacyResponses.find(
      r => r.pharmacyId.toString() === pharmacy._id.toString()
    );

    if (existingResponse) {
      console.log('⚠️ Pharmacy already responded, updating existing response');
      
      // Update existing response with proper price
      existingResponse.status = 'accepted';
      existingResponse.quotedPrice = {
        total: 45.99,
        subtotal: 42.99,
        tax: 3.00,
        breakdown: [
          { item: 'Medication 1', price: 25.99 },
          { item: 'Medication 2', price: 17.00 }
        ]
      };
      existingResponse.estimatedFulfillmentTime = 90; // 1.5 hours
      existingResponse.notes = 'All medications are in stock and ready for preparation.';
      existingResponse.respondedAt = new Date();
      
    } else {
      console.log('➕ Adding new pharmacy response');
      
      // Add new response
      request.pharmacyResponses.push({
        pharmacyId: pharmacy._id,
        status: 'accepted',
        quotedPrice: {
          total: 45.99,
          subtotal: 42.99,
          tax: 3.00,
          breakdown: [
            { item: 'Medication 1', price: 25.99 },
            { item: 'Medication 2', price: 17.00 }
          ]
        },
        estimatedFulfillmentTime: 90, // 1.5 hours
        notes: 'All medications are in stock and ready for preparation.',
        pharmacistNotes: 'Patient should take medications with food.',
        substitutions: [],
        detailedBill: {
          medications: [
            {
              name: 'Medication 1',
              quantity: 30,
              unitPrice: 0.87,
              totalPrice: 25.99,
              inStock: true
            },
            {
              name: 'Medication 2', 
              quantity: 20,
              unitPrice: 0.85,
              totalPrice: 17.00,
              inStock: true
            }
          ],
          summary: {
            subtotal: 42.99,
            tax: { rate: 7, amount: 3.00 },
            finalTotal: 45.99,
            patientOwes: 45.99
          }
        },
        pharmacyInfo: {
          specialInstructions: 'Please bring ID for pickup',
          pickupInstructions: 'Available for pickup Monday-Friday 9AM-6PM',
          consultationAvailable: true,
          consultationFee: 0,
          pharmacistName: 'Dr. Smith',
          contactNumber: '+1-555-0123'
        },
        respondedAt: new Date()
      });
    }

    // Update request status
    if (request.status === 'draft') {
      request.status = 'pending';
    }

    // Save the request
    await request.save();

    console.log('✅ Pharmacy response added successfully!');
    console.log(`📋 Request now has ${request.pharmacyResponses.length} responses`);

    // Show the response details
    const updatedRequest = await PrescriptionRequest.findById(request._id)
      .populate('pharmacyResponses.pharmacyId', 'name address');

    console.log('\n📋 Updated Pharmacy Responses:');
    updatedRequest.pharmacyResponses.forEach((response, index) => {
      console.log(`\n   Response ${index + 1}:`);
      console.log(`     Pharmacy: ${response.pharmacyId?.name || 'Unknown'}`);
      console.log(`     Status: ${response.status}`);
      console.log(`     Quoted Price:`, response.quotedPrice);
      console.log(`     Estimated Time: ${response.estimatedFulfillmentTime} minutes`);
      console.log(`     Notes: ${response.notes}`);
      console.log(`     Response ID: ${response._id}`);
    });

    console.log('\n✅ Test pharmacy response added successfully!');

  } catch (error) {
    console.error('❌ Failed to add test response:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
addTestPharmacyResponse();