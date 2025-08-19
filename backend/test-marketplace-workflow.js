/**
 * Test script to verify the marketplace workflow
 * This script tests the complete flow from prescription request to order creation
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Pharmacy from './src/models/Pharmacy.js';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import Order from './src/models/Order.js';

// Load environment variables
dotenv.config();

async function testMarketplaceWorkflow() {
  try {
    console.log('🚀 === TESTING MARKETPLACE WORKFLOW ===');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Find or create a patient
    let patient = await User.findOne({ role: 'patient' });
    if (!patient) {
      patient = new User({
        email: 'patient@test.com',
        password: 'password123',
        role: 'patient',
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        },
        contact: {
          phone: '+1-555-0123'
        }
      });
      await patient.save();
      console.log('✅ Created test patient:', patient.email);
    } else {
      console.log('✅ Found existing patient:', patient.email);
    }

    // 2. Find pharmacies
    const pharmacies = await Pharmacy.find({ isActive: true }).limit(3);
    if (pharmacies.length === 0) {
      console.log('❌ No pharmacies found. Please create pharmacies first.');
      return;
    }
    console.log('✅ Found pharmacies:', pharmacies.length);

    // 3. Create a prescription request
    const prescriptionRequest = new PrescriptionRequest({
      patient: patient._id,
      prescriber: {
        name: 'Dr. Test Smith',
        npiNumber: '1234567890',
        contactInfo: {
          phone: '+1-555-0123',
          email: 'dr.smith@test.com'
        }
      },
      medications: [
        {
          name: 'Metformin 500mg',
          genericName: 'Metformin',
          brandName: 'Glucophage',
          dosage: {
            form: 'tablet',
            instructions: '1 tablet twice daily with meals',
            frequency: 'BID',
            duration: '30 days'
          },
          quantity: {
            prescribed: 60,
            unit: 'tablets'
          },
          isGenericAcceptable: true
        }
      ],
      preferences: {
        deliveryMethod: 'pickup',
        urgency: 'routine'
      },
      targetPharmacies: pharmacies.map((pharmacy, index) => ({
        pharmacyId: pharmacy._id,
        notifiedAt: new Date(),
        priority: index + 1
      })),
      status: 'submitted'
    });

    await prescriptionRequest.save();
    console.log('✅ Created prescription request:', prescriptionRequest.requestNumber);

    // 4. Simulate pharmacy responses
    const responses = [];
    for (let i = 0; i < Math.min(2, pharmacies.length); i++) {
      const pharmacy = pharmacies[i];
      const response = {
        pharmacy: pharmacy._id,
        status: 'accepted',
        quotedPrice: {
          subtotal: 25.99 + (i * 5),
          tax: 2.08 + (i * 0.4),
          total: 28.07 + (i * 5.4)
        },
        estimatedFulfillmentTime: 30 + (i * 15), // 30, 45 minutes
        notes: `Response from ${pharmacy.name}. Ready for pickup in ${30 + (i * 15)} minutes.`,
        deliveryOptions: ['pickup'],
        respondedAt: new Date()
      };
      responses.push(response);
    }

    prescriptionRequest.pharmacyResponses = responses;
    await prescriptionRequest.save();
    console.log('✅ Added pharmacy responses:', responses.length);

    // 5. Test the marketplace selection workflow
    console.log('\n🛒 === TESTING MARKETPLACE SELECTION ===');
    
    // Simulate patient selecting the first pharmacy
    const selectedResponse = responses[0];
    const selectedPharmacy = pharmacies[0];

    console.log('📋 Available responses:');
    responses.forEach((resp, index) => {
      console.log(`  ${index + 1}. ${pharmacies[index].name}: $${resp.quotedPrice.total} in ${resp.estimatedFulfillmentTime}min`);
    });

    console.log(`\n✅ Patient selected: ${selectedPharmacy.name} ($${selectedResponse.quotedPrice.total})`);

    // 6. Create order from selected pharmacy
    const orderData = {
      patient: patient._id,
      pharmacy: selectedPharmacy._id,
      prescriptionRequest: prescriptionRequest._id,
      pharmacyResponse: selectedResponse._id || new mongoose.Types.ObjectId(),
      medications: prescriptionRequest.medications.map(med => ({
        name: med.name,
        genericName: med.genericName,
        brandName: med.brandName,
        quantity: med.quantity,
        dosage: med.dosage.instructions,
        frequency: med.dosage.frequency,
        price: {
          unit: selectedResponse.quotedPrice.total / med.quantity.prescribed,
          total: selectedResponse.quotedPrice.total
        }
      })),
      pricing: {
        subtotal: selectedResponse.quotedPrice.subtotal,
        tax: selectedResponse.quotedPrice.tax,
        deliveryFee: 0,
        discount: 0,
        total: selectedResponse.quotedPrice.total
      },
      fulfillment: {
        method: 'pickup',
        estimatedTime: selectedResponse.estimatedFulfillmentTime
      },
      status: 'pending',
      notes: {
        patient: 'Please prepare for pickup',
        pharmacy: selectedResponse.notes
      },
      metadata: {
        source: 'test',
        estimatedValue: selectedResponse.quotedPrice.subtotal
      }
    };

    const order = new Order(orderData);
    await order.save();

    // Update prescription request
    prescriptionRequest.status = 'accepted';
    prescriptionRequest.selectedPharmacy = selectedPharmacy._id;
    prescriptionRequest.selectedAt = new Date();
    await prescriptionRequest.save();

    console.log('✅ Order created successfully:', order.orderNumber);
    console.log('✅ Prescription request updated to accepted status');

    // 7. Verify the complete workflow
    console.log('\n📊 === WORKFLOW VERIFICATION ===');
    
    const finalPrescriptionRequest = await PrescriptionRequest.findById(prescriptionRequest._id)
      .populate('pharmacyResponses.pharmacyId', 'name')
      .populate('selectedPharmacy', 'name');

    const finalOrder = await Order.findById(order._id)
      .populate('pharmacy', 'name')
      .populate('patient', 'profile.firstName profile.lastName');

    console.log('📋 Final Prescription Request:');
    console.log(`  - Status: ${finalPrescriptionRequest.status}`);
    console.log(`  - Selected Pharmacy: ${finalPrescriptionRequest.selectedPharmacy?.name}`);
    console.log(`  - Pharmacy Responses: ${finalPrescriptionRequest.pharmacyResponses.length}`);

    console.log('\n📦 Final Order:');
    console.log(`  - Order Number: ${finalOrder.orderNumber}`);
    console.log(`  - Status: ${finalOrder.status}`);
    console.log(`  - Patient: ${finalOrder.patient.profile.firstName} ${finalOrder.patient.profile.lastName}`);
    console.log(`  - Pharmacy: ${finalOrder.pharmacy.name}`);
    console.log(`  - Total: $${finalOrder.pricing.total}`);
    console.log(`  - Estimated Time: ${finalOrder.fulfillment.estimatedTime} minutes`);

    console.log('\n🎉 === MARKETPLACE WORKFLOW TEST COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('❌ Error testing marketplace workflow:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testMarketplaceWorkflow();