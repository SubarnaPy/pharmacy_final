/**
 * Debug script for pharmacy response issue
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PrescriptionRequest from './src/models/PrescriptionRequest.js';
import Pharmacy from './src/models/Pharmacy.js';

dotenv.config();

async function debugPharmacyResponse() {
  try {
    console.log('🔍 === DEBUGGING PHARMACY RESPONSE ISSUE ===');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check the specific request that's failing
    const requestId = '688d1774de907604f0ee27bd';
    const pharmacyId = '688ce86e06e7ab24eb3de126';

    console.log(`\n🔍 Checking request: ${requestId}`);
    console.log(`🏥 Pharmacy: ${pharmacyId}`);

    const request = await PrescriptionRequest.findById(requestId);
    
    if (!request) {
      console.log('❌ Request not found');
      return;
    }

    console.log('\n📋 Request Details:');
    console.log(`  - Status: ${request.status}`);
    console.log(`  - Created: ${request.createdAt}`);
    console.log(`  - Target Pharmacies: ${request.targetPharmacies?.length || 0}`);
    console.log(`  - Existing Responses: ${request.pharmacyResponses?.length || 0}`);

    // Check if pharmacy is in target list
    const isTargetPharmacy = request.targetPharmacies?.some(
      tp => tp.pharmacyId.toString() === pharmacyId.toString()
    );
    console.log(`  - Is Target Pharmacy: ${isTargetPharmacy}`);

    // List target pharmacies
    if (request.targetPharmacies) {
      console.log('\n🎯 Target Pharmacies:');
      request.targetPharmacies.forEach((tp, index) => {
        console.log(`  ${index + 1}. ${tp.pharmacyId} (Priority: ${tp.priority})`);
      });
    }

    // List existing responses
    if (request.pharmacyResponses && request.pharmacyResponses.length > 0) {
      console.log('\n💬 Existing Responses:');
      request.pharmacyResponses.forEach((resp, index) => {
        console.log(`  ${index + 1}. Pharmacy: ${resp.pharmacyId} - Status: ${resp.status}`);
      });
    }

    // Check pharmacy details
    const pharmacy = await Pharmacy.findById(pharmacyId);
    if (pharmacy) {
      console.log(`\n🏥 Pharmacy Details:`);
      console.log(`  - Name: ${pharmacy.name}`);
      console.log(`  - Active: ${pharmacy.isActive}`);
    } else {
      console.log('❌ Pharmacy not found');
    }

    // Check what statuses should be allowed
    const allowedStatuses = ['draft', 'pending', 'submitted', 'active'];
    const blockedStatuses = ['completed', 'cancelled', 'expired', 'fulfilled', 'declined_all'];
    
    console.log(`\n🔒 Status Check:`);
    console.log(`  - Current Status: ${request.status}`);
    console.log(`  - Is Allowed: ${!blockedStatuses.includes(request.status)}`);
    console.log(`  - Blocked Statuses: ${blockedStatuses.join(', ')}`);

    // Try to simulate the fix
    if (!blockedStatuses.includes(request.status)) {
      console.log('\n✅ Request should accept responses with the fix');
    } else {
      console.log('\n❌ Request is blocked from accepting responses');
    }

  } catch (error) {
    console.error('❌ Error debugging:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

debugPharmacyResponse();